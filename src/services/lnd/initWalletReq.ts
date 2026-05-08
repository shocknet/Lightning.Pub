import { InitWalletRequest } from "../../../proto/lnd/walletunlocker";


export const InitWalletReq = (walletPw: Buffer, cipherSeedMnemonic: string[], recoveryWindow: number): InitWalletRequest => ({
    aezeedPassphrase: Buffer.alloc(0),
    walletPassword: walletPw,
    cipherSeedMnemonic,
    extendedMasterKey: "",
    extendedMasterKeyBirthdayTimestamp: 0n,
    macaroonRootKey: Buffer.alloc(0),
    recoveryWindow: recoveryWindow,
    statelessInit: false,
    channelBackups: undefined,
    watchOnly: undefined,
})