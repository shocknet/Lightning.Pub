import { InitWalletRequest } from "../../../proto/lnd/walletunlocker";


export const InitWalletReq = (secret: Buffer, cipherSeedMnemonic: string[]): InitWalletRequest => ({
    aezeedPassphrase: Buffer.alloc(0),
    walletPassword: secret,
    cipherSeedMnemonic,
    extendedMasterKey: "",
    extendedMasterKeyBirthdayTimestamp: 0n,
    macaroonRootKey: Buffer.alloc(0),
    recoveryWindow: 0,
    statelessInit: false,
    channelBackups: undefined,
    watchOnly: undefined,
})