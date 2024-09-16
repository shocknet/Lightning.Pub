import "reflect-metadata"
import { DataSource, Migration } from "typeorm"
import { AddressReceivingTransaction } from "./entity/AddressReceivingTransaction.js"
import { User } from "./entity/User.js"
import { UserReceivingAddress } from "./entity/UserReceivingAddress.js"
import { UserReceivingInvoice } from "./entity/UserReceivingInvoice.js"
import { UserInvoicePayment } from "./entity/UserInvoicePayment.js"
import { EnvMustBeNonEmptyString } from "../helpers/envParser.js"
import { UserTransactionPayment } from "./entity/UserTransactionPayment.js"
import { UserBasicAuth } from "./entity/UserBasicAuth.js"
import { UserEphemeralKey } from "./entity/UserEphemeralKey.js"
import { UserToUserPayment } from "./entity/UserToUserPayment.js"
import { Application } from "./entity/Application.js"
import { ApplicationUser } from "./entity/ApplicationUser.js"
import { BalanceEvent } from "./entity/BalanceEvent.js"
import { ChannelBalanceEvent } from "./entity/ChannelsBalanceEvent.js"
import { getLogger } from "../helpers/logger.js"
import { ChannelRouting } from "./entity/ChannelRouting.js"
import { LspOrder } from "./entity/LspOrder.js"
import { Product } from "./entity/Product.js"
import { LndNodeInfo } from "./entity/LndNodeInfo.js"
import { TrackedProvider } from "./entity/TrackedProvider.js"
import { InviteToken } from "./entity/InviteToken.js"
import { DebitAccess } from "./entity/DebitAccess.js"


export type DbSettings = {
    databaseFile: string
    migrate: boolean
    metricsDatabaseFile: string
}
export const LoadDbSettingsFromEnv = (): DbSettings => {
    return {
        databaseFile: process.env.DATABASE_FILE || "db.sqlite",
        migrate: process.env.MIGRATE_DB === 'true' || false,
        metricsDatabaseFile: process.env.METRICS_DATABASE_FILE || "metrics.sqlite"
    }
}

export const newMetricsDb = async (settings: DbSettings, metricsMigrations: Function[]): Promise<{ source: DataSource, executedMigrations: Migration[] }> => {
    const source = await new DataSource({
        type: "sqlite",
        database: settings.metricsDatabaseFile,
        entities: [BalanceEvent, ChannelBalanceEvent, ChannelRouting],
        migrations: metricsMigrations
    }).initialize();
    const log = getLogger({});
    const pendingMigrations = await source.showMigrations()
    if (pendingMigrations) {
        log("Migrations found, migrating...")
        const executedMigrations = await source.runMigrations({ transaction: 'all' })
        return { source, executedMigrations }
    }
    return { source, executedMigrations: [] }

}

export default async (settings: DbSettings, migrations: Function[]): Promise<{ source: DataSource, executedMigrations: Migration[] }> => {
    const source = await new DataSource({
        type: "sqlite",
        database: settings.databaseFile,
        // logging: true,
        entities: [User, UserReceivingInvoice, UserReceivingAddress, AddressReceivingTransaction, UserInvoicePayment, UserTransactionPayment,
            UserBasicAuth, UserEphemeralKey, Product, UserToUserPayment, Application, ApplicationUser, UserToUserPayment, LspOrder, LndNodeInfo, TrackedProvider,
            InviteToken, DebitAccess
        ],
        //synchronize: true,
        migrations
    }).initialize()
    const log = getLogger({})
    const pendingMigrations = await source.showMigrations()
    if (pendingMigrations) {
        log("migrations found, migrating...")
        const executedMigrations = await source.runMigrations({ transaction: 'all' })
        return { source, executedMigrations }
    }
    return { source, executedMigrations: [] }
}

export const runFakeMigration = async (databaseFile: string, migrations: Function[]) => {
    const source = await new DataSource({
        type: "sqlite",
        database: databaseFile,
        // logging: true,
        entities: [User, UserReceivingInvoice, UserReceivingAddress, AddressReceivingTransaction, UserInvoicePayment, UserTransactionPayment,
            UserBasicAuth, UserEphemeralKey, Product, UserToUserPayment, Application, ApplicationUser, UserToUserPayment],
        //synchronize: true,
        migrations
    }).initialize()
    return source.runMigrations({ fake: true })
}