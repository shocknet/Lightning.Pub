import fs, { watchFile } from "fs";
import crypto from 'crypto'
import { ERROR, getLogger } from "../helpers/logger.js";
import { MainSettings, getDataPath } from "./settings.js";
import Storage from "../storage/index.js";
import * as Types from '../../../proto/autogenerated/ts/types.js'
import LND from "../lnd/lnd.js";
export class AdminManager {





    storage: Storage
    log = getLogger({ component: "adminManager" })
    adminNpub = ""
    dataDir: string
    adminNpubPath: string
    adminEnrollTokenPath: string
    adminConnectPath: string
    appNprofilePath: string
    interval: NodeJS.Timer
    appNprofile: string
    lnd: LND
    constructor(mainSettings: MainSettings, storage: Storage) {
        this.storage = storage
        this.dataDir = mainSettings.storageSettings.dataDir
        this.adminNpubPath = getDataPath(this.dataDir, 'admin.npub')
        this.adminEnrollTokenPath = getDataPath(this.dataDir, 'admin.enroll')
        this.adminConnectPath = getDataPath(this.dataDir, 'admin.connect')
        this.appNprofilePath = getDataPath(this.dataDir, 'app.nprofile')
        this.start()
    }

    setLND = (lnd: LND) => {
        this.lnd = lnd
    }

    setAppNprofile = (nprofile: string) => {
        this.appNprofile = nprofile
        const enrollToken = this.ReadAdminEnrollToken()
        fs.writeFileSync(this.appNprofilePath, this.appNprofile)
        if (enrollToken) {
            const connectString = `${this.appNprofile}:${enrollToken}`
            fs.writeFileSync(this.adminConnectPath, connectString)
        }
    }
    Stop = () => {
        clearInterval(this.interval)
    }

    GenerateAdminEnrollToken = async () => {
        const token = crypto.randomBytes(32).toString('hex')
        fs.writeFileSync(this.adminEnrollTokenPath, token)
        const connectString = `${this.appNprofile}:${token}`
        fs.writeFileSync(this.adminConnectPath, connectString)
        return token
    }

    start = () => {
        const adminNpub = this.ReadAdminNpub()
        if (adminNpub) {
            this.adminNpub = adminNpub
        } else if (!fs.existsSync(this.adminEnrollTokenPath)) {
            this.GenerateAdminEnrollToken()
        }
        this.interval = setInterval(() => {
            if (!this.adminNpub) {
                return
            }
            const deleted = !fs.existsSync(this.adminNpubPath)
            if (deleted) {
                this.adminNpub = ""
                this.log("admin npub file deleted")
                this.GenerateAdminEnrollToken()
            }
        })
    }

    ReadAdminEnrollToken = () => {
        try {
            return fs.readFileSync(this.adminEnrollTokenPath, 'utf8').trim()
        } catch (err: any) {
            return ""
        }
    }

    ReadAdminNpub = () => {
        try {
            return fs.readFileSync(this.adminNpubPath, 'utf8').trim()
        } catch (err: any) {
            return ""
        }
    }

    GetAdminNpub = () => {
        return this.adminNpub
    }

    ClearExistingAdmin = () => {
        try {
            fs.unlinkSync(this.adminNpubPath)
        } catch (err: any) { }
    }

    PromoteUserToAdmin = async (appId: string, appUserId: string, token: string) => {
        const app = await this.storage.applicationStorage.GetApplication(appId)
        const appUser = await this.storage.applicationStorage.GetApplicationUser(app, appUserId)
        const npub = appUser.nostr_public_key
        if (!npub) {
            throw new Error("no npub found for user")
        }
        let actualToken
        try {
            actualToken = fs.readFileSync(this.adminEnrollTokenPath, 'utf8').trim()
        } catch (err: any) {
            throw new Error("invalid enroll token")
        }
        if (token !== actualToken) {
            throw new Error("invalid enroll token")
        }
        fs.writeFileSync(this.adminNpubPath, npub)
        fs.unlinkSync(this.adminEnrollTokenPath)
        fs.unlinkSync(this.adminConnectPath)
        this.adminNpub = npub
    }

    CreateInviteLink = async (adminNpub: string, sats?: number): Promise<Types.CreateOneTimeInviteLinkResponse> => {
        const adminAppUser = await this.storage.applicationStorage.FindNostrAppUser(adminNpub)
        if (!adminAppUser) {
            throw new Error("Admin user expected but not found!!!");
        }
        const newInviteToken = await this.storage.applicationStorage.AddInviteToken(adminAppUser.application, sats);
        return {
            invitation_link: newInviteToken.inviteToken
        }
    }

    async GetInviteTokenState(ctx: Types.AdminContext, req: Types.GetInviteTokenStateRequest): Promise<Types.GetInviteTokenStateResponse> {
        const inviteToken = await this.storage.applicationStorage.FindInviteToken(req.invite_token);
        if (!inviteToken) {
            throw new Error("Invite token not found");
        }
        return {
            used: inviteToken.used
        }
    }

    async LndGetInfo(): Promise<Types.LndGetInfoResponse> {
        const info = await this.lnd.GetInfo()
        return {
            alias: info.alias,
            synced_to_chain: info.syncedToChain,
            synced_to_graph: info.syncedToGraph,
            watchdog_barking: this.lnd.outgoingOpsLocked

        }
    }

    ListChannels = async (): Promise<Types.LndChannels> => {
        const { channels } = await this.lnd.ListChannels(true)
        const { identityPubkey } = await this.lnd.GetInfo()
        const activity = await this.storage.metricsStorage.GetChannelsActivity()
        const openChannels = await Promise.all(channels.map(async c => {
            const info = await this.lnd.GetChannelInfo(c.chanId)
            const policies = [{ pub: info.node1Pub, policy: info.node1Policy }, { pub: info.node2Pub, policy: info.node2Policy }]
            const myPolicy = policies.find(p => p.pub === identityPubkey)?.policy
            const policy: Types.ChannelPolicy | undefined = myPolicy ? {
                base_fee_msat: Number(myPolicy.feeBaseMsat),
                fee_rate_ppm: Number(myPolicy.feeRateMilliMsat),
                timelock_delta: Number(myPolicy.timeLockDelta),
                max_htlc_msat: Number(myPolicy.maxHtlcMsat),
                min_htlc_msat: Number(myPolicy.minHtlc),

            } : undefined
            return {
                channel_point: c.channelPoint,
                active: c.active,
                capacity: Number(c.capacity),
                local_balance: Number(c.localBalance),
                remote_balance: Number(c.remoteBalance),
                channel_id: c.chanId,
                label: c.peerAlias || c.remotePubkey,
                lifetime: Number(c.lifetime),
                policy,
                inactive_since_unix: activity[c.chanId] || 0
            }
        }))
        return {
            open_channels: openChannels
        }
    }

    async UpdateChannelPolicy(req: Types.UpdateChannelPolicyRequest): Promise<void> {
        const chanPoint = req.update.type === Types.UpdateChannelPolicyRequest_update_type.CHANNEL_POINT ? req.update.channel_point : ""
        const res = await this.lnd.UpdateChannelPolicy(chanPoint, req.policy)
        if (res.failedUpdates.length > 0) {
            this.log(ERROR, "failed to update policy", res.failedUpdates)
            throw new Error("failed to update policy")
        }
    }


    async AddPeer(req: Types.AddPeerRequest) {
        await this.lnd.AddPeer(req.pubkey, req.host, req.port)
    }

    async OpenChannel(req: Types.OpenChannelRequest): Promise<Types.OpenChannelResponse> {
        let closeAddr = req.close_address
        if (!closeAddr) {
            const addr = await this.lnd.NewAddress(Types.AddressType.WITNESS_PUBKEY_HASH, { useProvider: false, from: 'system' })
            closeAddr = addr.address
        }
        const res = await this.lnd.OpenChannel(req.node_pubkey, closeAddr, req.local_funding_amount, req.push_sat || 0, req.sat_per_v_byte)
        return {
            channel_id: Buffer.from(res.pendingChanId).toString('hex')
        }
    }

    async CloseChannel(req: Types.CloseChannelRequest): Promise<Types.CloseChannelResponse> {
        const res = await this.lnd.CloseChannel(req.funding_txid, req.output_index, req.force, req.sat_per_v_byte)
        return {
            closing_txid: Buffer.from(res.txid).toString('hex')
        }
    }
}