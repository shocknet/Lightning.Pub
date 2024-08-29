import { Between, DataSource, EntityManager, FindManyOptions, FindOperator, LessThanOrEqual, MoreThanOrEqual } from "typeorm"
import { BalanceEvent } from "./entity/BalanceEvent.js"
import { ChannelBalanceEvent } from "./entity/ChannelsBalanceEvent.js"
import TransactionsQueue, { TX } from "./transactionsQueue.js";
import { StorageSettings } from "./index.js";
import { newMetricsDb } from "./db.js";
import { ChannelRouting } from "./entity/ChannelRouting.js";
export default class {

    DB: DataSource | EntityManager
    settings: StorageSettings
    txQueue: TransactionsQueue
    constructor(settings: StorageSettings) {
        this.settings = settings;
    }
    async Connect(metricsMigrations: Function[]) {
        const { source, executedMigrations } = await newMetricsDb(this.settings.dbSettings, metricsMigrations)
        this.DB = source;
        this.txQueue = new TransactionsQueue("metrics", this.DB)
        return executedMigrations;
    }

    async SaveBalanceEvents(balanceEvent: Partial<BalanceEvent>, channelBalanceEvents: Partial<ChannelBalanceEvent>[]) {
        const blanceEventEntry = this.DB.getRepository(BalanceEvent).create(balanceEvent)
        const balanceEntry = await this.txQueue.PushToQueue<BalanceEvent>({ exec: async db => db.getRepository(BalanceEvent).save(blanceEventEntry), dbTx: false })

        const channelsEntry = this.DB.getRepository(ChannelBalanceEvent).create(channelBalanceEvents.map(e => ({ ...e, balance_event: balanceEntry })))
        const channelsEntries = await this.txQueue.PushToQueue<ChannelBalanceEvent[]>({ exec: async db => db.getRepository(ChannelBalanceEvent).save(channelsEntry), dbTx: false })
        return { balanceEntry, channelsEntries }
    }

    async GetBalanceEvents({ from, to }: { from?: number, to?: number }, entityManager = this.DB) {
        const q = getTimeQuery({ from, to })

        const [chainBalanceEvents] = await Promise.all([
            entityManager.getRepository(BalanceEvent).find(q),
        ])
        return { chainBalanceEvents }
    }

    async initChannelRoutingEvent(dayUnix: number, channelId: string) {
        const existing = await this.DB.getRepository(ChannelRouting).findOne({ where: { day_unix: dayUnix, channel_id: channelId } })
        if (!existing) {
            const entry = this.DB.getRepository(ChannelRouting).create({ day_unix: dayUnix, channel_id: channelId })
            return this.txQueue.PushToQueue<ChannelRouting>({ exec: async db => db.getRepository(ChannelRouting).save(entry), dbTx: false })
        }
        return existing
    }

    GetChannelRouting({ from, to }: { from?: number, to?: number }, entityManager = this.DB) {
        const q = getTimeQuery({ from, to })
        return entityManager.getRepository(ChannelRouting).find(q)
    }

    async GetLatestForwardingIndexOffset() {
        const latestIndex = await this.DB.getRepository(ChannelRouting).find({ order: { latest_index_offset: "DESC" }, take: 1 })
        if (latestIndex.length > 0) {
            return latestIndex[0].latest_index_offset
        }
        return 0
    }

    async IncrementChannelRouting(channelId: string, event: Partial<ChannelRouting>) {
        const dayUnix = getTodayUnix()
        const existing = await this.initChannelRoutingEvent(dayUnix, channelId)
        const repo = this.DB.getRepository(ChannelRouting)
        if (event.send_errors) {
            await repo.increment({ day_unix: dayUnix, channel_id: channelId }, "send_errors", event.send_errors)
        }
        if (event.receive_errors) {
            await repo.increment({ day_unix: dayUnix, channel_id: channelId }, "receive_errors", event.receive_errors)
        }
        if (event.forward_errors_as_input) {
            await repo.increment({ day_unix: dayUnix, channel_id: channelId }, "forward_errors_as_input", event.forward_errors_as_input)
        }
        if (event.forward_errors_as_output) {
            await repo.increment({ day_unix: dayUnix, channel_id: channelId }, "forward_errors_as_output", event.forward_errors_as_output)
        }
        if (event.missed_forward_fee_as_input) {
            await repo.increment({ day_unix: dayUnix, channel_id: channelId }, "missed_forward_fee_as_input", event.missed_forward_fee_as_input)
        }
        if (event.missed_forward_fee_as_output) {
            await repo.increment({ day_unix: dayUnix, channel_id: channelId }, "missed_forward_fee_as_output", event.missed_forward_fee_as_output)
        }
        if (event.forward_fee_as_input) {
            await repo.increment({ day_unix: dayUnix, channel_id: channelId }, "forward_fee_as_input", event.forward_fee_as_input)
        }
        if (event.forward_fee_as_output) {
            await repo.increment({ day_unix: dayUnix, channel_id: channelId }, "forward_fee_as_output", event.forward_fee_as_output)
        }
        if (event.events_as_input) {
            await repo.increment({ day_unix: dayUnix, channel_id: channelId }, "events_as_input", event.events_as_input)
        }
        if (event.events_as_output) {
            await repo.increment({ day_unix: dayUnix, channel_id: channelId }, "events_as_output", event.events_as_output)
        }
        if (event.latest_index_offset) {
            await repo.update(existing.serial_id, { latest_index_offset: event.latest_index_offset })
        }
    }
}

const getTimeQuery = ({ from, to }: { from?: number, to?: number }): FindManyOptions<{ created_at: Date }> => {
    if (!!from && !!to) {
        return { where: { created_at: Between<Date>(new Date(from * 1000), new Date(to * 1000)) }, order: { created_at: 'ASC' } }
    } else if (!!from) {
        return { where: { created_at: MoreThanOrEqual<Date>(new Date(from * 1000)) }, order: { created_at: 'ASC' } }
    } else if (!!to) {
        return { where: { created_at: LessThanOrEqual<Date>(new Date(to * 1000)) }, order: { created_at: 'ASC' } }
    }
    return {}
}

const getTodayUnix = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000
}