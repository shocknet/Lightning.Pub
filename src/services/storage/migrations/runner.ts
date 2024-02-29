import { PubLogger } from '../../helpers/logger.js'
import { DbSettings } from '../db.js'
import Storage, { StorageSettings } from '../index.js'
import { Initial1703170309875 } from './1703170309875-initial.js'
import { LndMetrics1703170330183 } from './1703170330183-lnd_metrics.js'
import { HtlcErrors1709149327598 } from './1709149327598-htlc_errors.js'
const allMigrations = [LndMetrics1703170330183, HtlcErrors1709149327598]
export const TypeOrmMigrationRunner = async (log: PubLogger, storageManager: Storage, settings: DbSettings, arg: string | undefined): Promise<boolean> => {
    if (arg === 'initial_migration') {
        await connectAndMigrate(log, storageManager, true, settings, [Initial1703170309875], [])
        return true
    } else if (arg === 'lnd_metrics_migration') {
        await connectAndMigrate(log, storageManager, true, settings, [], [LndMetrics1703170330183])
        return true
    } else if (arg === 'htlc_errors_migration') {
        await connectAndMigrate(log, storageManager, true, settings, [], [HtlcErrors1709149327598])
        return true
    } else if (arg === 'all_migrations') {
        await connectAndMigrate(log, storageManager, true, settings, [], allMigrations)
        return true
    } else if (settings.migrate) {
        await connectAndMigrate(log, storageManager, false, settings, [], allMigrations)
        return false
    }
    await connectAndMigrate(log, storageManager, false, settings, [], [])
    return false
}

const connectAndMigrate = async (log: PubLogger, storageManager: Storage, manual: boolean, settings: DbSettings, migrations: Function[], metricsMigrations: Function[]) => {
    if (manual && settings.migrate) {
        throw new Error("auto migration is enabled, no need to run manual migration")
    }
    if (migrations.length > 0) {
        log("will add", migrations.length, "typeorm migrations...")
    }
    const { executedMigrations, executedMetricsMigrations } = await storageManager.Connect(migrations, metricsMigrations)
    if (migrations.length > 0) {
        log(executedMigrations.length, "of", migrations.length, "migrations were executed correctly")
        log(executedMigrations)
        log("-------------------")

    } if (metricsMigrations.length > 0) {
        log(executedMetricsMigrations.length, "of", migrations.length, "metrics migrations were executed correctly")
        log(executedMetricsMigrations)
    }

}