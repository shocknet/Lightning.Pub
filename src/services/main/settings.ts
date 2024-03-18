import { StorageSettings } from '../storage/index.js'
import { LndSettings } from '../lnd/settings.js'
export type MainSettings = {
    storageSettings: StorageSettings,
    lndSettings: LndSettings,
    jwtSecret: string
    incomingTxFee: number
    outgoingTxFee: number
    incomingAppInvoiceFee: number
    incomingAppUserInvoiceFee: number
    outgoingAppInvoiceFee: number
    outgoingAppUserInvoiceFee: number
    userToUserFee: number
    appToUserFee: number
    serviceUrl: string
    servicePort: number
    recordPerformance: boolean
    skipSanityCheck: boolean
    disableExternalPayments: boolean

}