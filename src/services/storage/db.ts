import "reflect-metadata"
import { DataSource } from "typeorm"
import { AddressTransaction } from "./entity/AddressTransaction"
import { User } from "./entity/User"
import { UserAddress } from "./entity/UserAddress"
import { UserInvoice } from "./entity/UserInvoice"
import { UserPayment } from "./entity/UserPayment"
export type DbSettings = {
    databaseFile: string
}
export const LoadDbSettingsFromEnv = (test = false): DbSettings => {
    const databaseFile = process.env.DATABASE_FILE
    if (!databaseFile) throw new Error(`missing env for DATABASE_FILE`)
    return { databaseFile: test ? ":memory:" : databaseFile }
}
export default async (settings: DbSettings) => {
    return new DataSource({
        type: "sqlite",
        database: settings.databaseFile,
        //logging: true,
        entities: [User, UserInvoice, UserAddress, AddressTransaction, UserPayment],
        synchronize: true
    }).initialize()
} 