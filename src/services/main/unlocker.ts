import fs from 'fs'
import crypto from 'crypto'
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import { credentials, Metadata } from '@grpc/grpc-js'
import { getLogger } from '../helpers/logger.js';
import { WalletUnlockerClient } from '../../../proto/lnd/walletunlocker.client.js';
import { MainSettings } from '../main/settings.js';
import { InitWalletReq } from '../lnd/initWalletReq.js';
import Storage from '../storage/index.js'
import { LightningClient } from '../../../proto/lnd/lightning.client.js';
const DeadLineMetadata = (deadline = 10 * 1000) => ({ deadline: Date.now() + deadline })
export class Unlocker {
    settings: MainSettings
    storage: Storage
    abortController = new AbortController()
    log = getLogger({ component: "unlocker" })
    constructor(settings: MainSettings, storage: Storage) {
        this.settings = settings
        this.storage = storage
    }

    Stop = () => {
        this.abortController.abort()
    }

    Unlock = async () => {
        const macroonPath = this.settings.lndSettings.mainNode.lndMacaroonPath
        const certPath = this.settings.lndSettings.mainNode.lndCertPath
        let macaroon = ""
        let lndCert: Buffer
        try {
            lndCert = fs.readFileSync(certPath)
        } catch (err: any) {
            throw new Error("failed to access lnd cert, make sure to set LND_CERT_PATH in .env, that the path is correct, and that lnd is running")
        }
        try {
            macaroon = fs.readFileSync(macroonPath).toString('hex');
        } catch (err: any) {
            if (err.code !== 'ENOENT') {
                throw err
            }
        }
        const { ln, pub } = macaroon === "" ? await this.InitFlow(lndCert) : await this.UnlockFlow(lndCert, macaroon)
        this.subscribeToBackups(ln, pub)
    }

    UnlockFlow = async (lndCert: Buffer, macaroon: string) => {
        const ln = this.GetLightningClient(lndCert, macaroon)
        const info = await this.GetLndInfo(ln)
        if (info.ok) {
            this.log("the wallet is already unlocked with pub:", info.pub)
            return { ln, pub: info.pub }
        }
        if (info.failure !== 'locked') {
            throw new Error("failed to get lnd info for reason: " + info.failure)
        }
        this.log("wallet is locked, unlocking...")
        const unlocker = this.GetUnlockerClient(lndCert)
        const walletPassword = this.GetWalletPassword()
        await unlocker.unlockWallet({ walletPassword, recoveryWindow: 0, statelessInit: false, channelBackups: undefined }, DeadLineMetadata())
        const infoAfter = await this.GetLndInfo(ln)
        if (!infoAfter.ok) {
            throw new Error("failed to init lnd wallet " + infoAfter.failure)
        }
        this.log("unlocked wallet with pub:", infoAfter.pub)
        return { ln, pub: infoAfter.pub }
    }

    InitFlow = async (lndCert: Buffer) => {
        this.log("macaroon not found, creating wallet...")
        const unlocker = this.GetUnlockerClient(lndCert)
        const entropy = crypto.randomBytes(16)
        const seedRes = await unlocker.genSeed({
            aezeedPassphrase: Buffer.alloc(0),
            seedEntropy: entropy
        }, DeadLineMetadata())
        console.log(seedRes.response.cipherSeedMnemonic)
        console.log(seedRes.response.encipheredSeed)
        this.log("seed created, encrypting and saving...")
        const { encryptedData } = this.EncryptWalletSeed(seedRes.response.cipherSeedMnemonic)
        const walletPw = this.GetWalletPassword()
        const req = InitWalletReq(walletPw, seedRes.response.cipherSeedMnemonic)
        const initRes = await unlocker.initWallet(req, DeadLineMetadata(60 * 1000))
        const adminMacaroon = Buffer.from(initRes.response.adminMacaroon).toString('hex')
        const ln = this.GetLightningClient(lndCert, adminMacaroon)
        const info = await this.GetLndInfo(ln)
        if (!info.ok) {
            throw new Error("failed to init lnd wallet " + info.failure)
        }
        await this.storage.liquidityStorage.SaveNodeSeed(info.pub, JSON.stringify(encryptedData))
        this.log("created wallet with pub:", info.pub)
        return { ln, pub: info.pub }
    }

    GetLndInfo = async (ln: LightningClient): Promise<{ ok: false, failure: 'locked' | 'unknown' } | { ok: true, pub: string }> => {
        while (true) {
            try {
                const info = await ln.getInfo({}, DeadLineMetadata())
                return { ok: true, pub: info.response.identityPubkey }
            } catch (err: any) {
                if (err.message === '2 UNKNOWN: wallet locked, unlock it to enable full RPC access') {
                    this.log("wallet is locked")
                    return { ok: false, failure: 'locked' }
                } else if (err.message === '2 UNKNOWN: the RPC server is in the process of starting up, but not yet ready to accept calls') {
                    this.log("lnd is not ready yet, waiting...")
                    await new Promise((res) => setTimeout(res, 1000))
                } else {
                    this.log("failed to get lnd info", err.message)
                    return { ok: false, failure: 'unknown' }
                }
            }
        }
    }

    EncryptWalletSeed = (seed: string[]) => {
        return this.encrypt(seed.join('+'), true)
    }

    DecryptWalletSeed = (data: { iv: string, encrypted: string }) => {
        return this.decrypt(data).split('+')
    }
    EncryptBackup = (backup: Buffer) => {
        return this.encrypt(backup.toString('hex'))
    }

    DecryptBackup = (data: { iv: string, encrypted: string }) => {
        return Buffer.from(this.decrypt(data), 'hex')
    }

    encrypt = (text: string, must = false) => {
        const sec = this.GetWalletSecret(must)
        if (!sec) {
            throw new Error("wallet secret not found to encrypt")
        }
        const secret = Buffer.from(sec, 'hex')
        const iv = crypto.randomBytes(16)
        const cipher = crypto.createCipheriv('aes-256-cbc', secret, iv)
        const rawData = Buffer.from(text, 'utf-8')
        const cyData = cipher.update(rawData)
        const encrypted = Buffer.concat([cyData, cipher.final()])
        const encryptedData = { iv: iv.toString('hex'), encrypted: encrypted.toString('hex') }
        return { encryptedData }
    }

    decrypt = (data: { iv: string, encrypted: string }) => {
        const sec = this.GetWalletSecret(false)
        if (!sec) {
            throw new Error("wallet secret not found to decrypt")
        }
        const secret = Buffer.from(sec, 'hex')
        const iv = Buffer.from(data.iv, 'hex')
        const encrypted = Buffer.from(data.encrypted, 'hex')
        const decipher = crypto.createDecipheriv('aes-256-cbc', secret, iv)
        const decrypted = decipher.update(encrypted)
        const raw = Buffer.concat([decrypted, decipher.final()])
        return raw.toString('utf-8')
    }

    GetWalletSecret = (create: boolean) => {
        const path = this.settings.walletSecretPath
        let secret = ""
        try {
            secret = fs.readFileSync(path, 'utf-8')
        } catch {
            this.log("the wallet secret file was not found")
        }
        if (secret === "" && create) {
            this.log("creating wallet secret file")
            secret = crypto.randomBytes(32).toString('hex')
            fs.writeFileSync(path, secret)
        }
        return secret
    }

    GetWalletPassword = () => {
        const path = this.settings.walletPasswordPath
        let password = Buffer.alloc(0)
        try {
            password = fs.readFileSync(path)
        } catch {
        }
        if (password.length === 0) {
            this.log("no wallet password configured, using wallet secret")
            const secret = this.GetWalletSecret(false)
            if (secret === "") {
                throw new Error("no usable password found")
            }
            password = Buffer.from(secret, 'hex')
        }
        return password
    }

    subscribeToBackups = async (ln: LightningClient, pub: string) => {
        this.log("subscribing to channel backups for: ", pub)
        const stream = ln.subscribeChannelBackups({}, { abort: this.abortController.signal })
        stream.responses.onMessage(async (msg) => {
            if (msg.multiChanBackup) {
                this.log("received backup, saving")
                try {
                    const { encryptedData } = this.EncryptBackup(Buffer.from(msg.multiChanBackup.multiChanBackup))
                    await this.storage.liquidityStorage.SaveNodeBackup(pub, JSON.stringify(encryptedData))
                } catch (err: any) {
                    this.log("failed to save backup", err.message)
                }
            }
        })
    }

    GetUnlockerClient = (cert: Buffer) => {
        const host = this.settings.lndSettings.mainNode.lndAddr
        const channelCredentials = credentials.createSsl(cert)
        const transport = new GrpcTransport({ host, channelCredentials })
        const client = new WalletUnlockerClient(transport)
        return client
    }
    GetLightningClient = (cert: Buffer, macaroon: string) => {
        const host = this.settings.lndSettings.mainNode.lndAddr
        const sslCreds = credentials.createSsl(cert)
        const macaroonCreds = credentials.createFromMetadataGenerator(
            function (args: any, callback: any) {
                let metadata = new Metadata();
                metadata.add('macaroon', macaroon);
                callback(null, metadata);
            },
        );
        const channelCredentials = credentials.combineChannelCredentials(
            sslCreds,
            macaroonCreds,
        );
        const transport = new GrpcTransport({ host, channelCredentials })
        const client = new LightningClient(transport)
        return client
    }
}