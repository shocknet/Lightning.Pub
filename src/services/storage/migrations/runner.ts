import { PubLogger } from '../../helpers/logger.js'
import { DbSettings, runFakeMigration } from '../db.js'
import Storage, { StorageSettings } from '../index.js'
import { Initial1703170309875 } from './1703170309875-initial.js'
import { LndMetrics1703170330183 } from './1703170330183-lnd_metrics.js'
import { ChannelRouting1709316653538 } from './1709316653538-channel_routing.js'
import { LspOrder1718387847693 } from './1718387847693-lsp_order.js'
const allMigrations = [Initial1703170309875, LspOrder1718387847693]
const allMetricsMigrations = [LndMetrics1703170330183, ChannelRouting1709316653538]
export const TypeOrmMigrationRunner = async (log: PubLogger, storageManager: Storage, settings: DbSettings, arg: string | undefined): Promise<boolean> => {
    if (arg === 'fake_initial_migration') {
        runFakeMigration(settings.databaseFile, [Initial1703170309875])
        return true
    }
    await connectAndMigrate(log, storageManager, allMigrations, allMetricsMigrations)
    return false
}

const connectAndMigrate = async (log: PubLogger, storageManager: Storage, migrations: Function[], metricsMigrations: Function[]) => {
    const { executedMigrations, executedMetricsMigrations } = await storageManager.Connect(migrations, metricsMigrations)
    if (migrations.length > 0) {
        log(executedMigrations.length, "of", migrations.length, "migrations were executed correctly")
        log(executedMigrations)
        log("-------------------")

    } if (metricsMigrations.length > 0) {
        log(executedMetricsMigrations.length, "of", metricsMigrations.length, "metrics migrations were executed correctly")
        log(executedMetricsMigrations)
    }
}