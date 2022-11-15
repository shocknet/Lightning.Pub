import "reflect-metadata"
import { DataSource } from "typeorm"
import { AddressReceivingTransaction } from "./entity/AddressReceivingTransaction.js"
import { User } from "./entity/User.js"
import { UserReceivingAddress } from "./entity/UserReceivingAddress.js"
import { UserReceivingInvoice } from "./entity/UserReceivingInvoice.js"
import { UserInvoicePayment } from "./entity/UserInvoicePayment.js"
import { EnvMustBeNonEmptyString } from "../helpers/envParser.js"
import { UserTransactionPayment } from "./entity/UserTransactionPayment.js"
export type DbSettings = {
    databaseFile: string
}
export const LoadDbSettingsFromEnv = (test = false): DbSettings => {
    return { databaseFile: test ? ":memory:" : EnvMustBeNonEmptyString("DATABASE_FILE") }
}
export default async (settings: DbSettings) => {
    return new DataSource({
        type: "sqlite",
        database: settings.databaseFile,
        //logging: true,
        entities: [User, UserReceivingInvoice, UserReceivingAddress, AddressReceivingTransaction, UserInvoicePayment, UserTransactionPayment],
        synchronize: true
    }).initialize()
} 