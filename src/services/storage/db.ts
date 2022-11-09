import "reflect-metadata"
import { DataSource } from "typeorm"
import { AddressReceivingTransaction } from "./entity/AddressReceivingTransaction"
import { User } from "./entity/User"
import { UserReceivingAddress } from "./entity/UserReceivingAddress"
import { UserReceivingInvoice } from "./entity/UserReceivingInvoice"
import { UserInvoicePayment } from "./entity/UserInvoicePayment"
import { EnvMustBeNonEmptyString } from "../helpers/envParser"
import { UserTransactionPayment } from "./entity/UserTransactionPayment"
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