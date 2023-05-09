import { StorageSettings } from '../storage/index.js'
import { LndSettings } from '../lnd/settings.js'
export type MainSettings = {
    storageSettings: StorageSettings,
    lndSettings: LndSettings,
    jwtSecret: string
    incomingTxFee: number
    outgoingTxFee: number
    incomingInvoiceFee: number
    outgoingInvoiceFee: number
    userToUserFee: number
    serviceUrl: string
    servicePort: number

}