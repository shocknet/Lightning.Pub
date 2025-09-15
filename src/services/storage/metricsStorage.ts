import { Between, DataSource, EntityManager, FindManyOptions, FindOperator, LessThanOrEqual, MoreThanOrEqual } from "typeorm"
import { BalanceEvent } from "./entity/BalanceEvent.js"
import { ChannelBalanceEvent } from "./entity/ChannelsBalanceEvent.js"
import TransactionsQueue from "./db/transactionsQueue.js";
import { StorageSettings } from "./index.js";
import { newMetricsDb } from "./db/db.js";
import { ChannelRouting } from "./entity/ChannelRouting.js";
import { RootOperation } from "./entity/RootOperation.js";
import { StorageInterface } from "./db/storageInterface.js";
import { Utils } from "../helpers/utilsWrapper.js";
import { Channel, ChannelEventUpdate } from "../../../proto/lnd/lightning.js";
import { ChannelEvent } from "./entity/ChannelEvent.js";
export default class {
    //DB: DataSource | EntityManager
    settings: StorageSettings
    dbs: StorageInterface
    utils: Utils
    //txQueue: TransactionsQueue
    constructor(settings: StorageSettings, utils: Utils) {
        this.settings = settings;
        this.utils = utils
    }
    async Connect() {
        //const { source, executedMigrations } = await newMetricsDb(this.settings.dbSettings, metricsMigrations)
        //this.DB = source;
        //this.txQueue = new TransactionsQueue("metrics", this.DB)
        this.dbs = new StorageInterface(this.utils)
        await this.dbs.Connect(this.settings.dbSettings, 'metrics')
        //return executedMigrations;
    }

    async FlagActiveChannel(chanId: string) {
        const existing = await this.dbs.FindOne<ChannelEvent>('ChannelEvent', { where: { channel_id: chanId, event_type: 'activity' } })
        if (!existing) {
            await this.dbs.CreateAndSave<ChannelEvent>('ChannelEvent', { channel_id: chanId, event_type: 'activity', inactive_since_unix: 0 })
            return
        }

        if (existing.inactive_since_unix > 0) {
            await this.dbs.Update<ChannelEvent>('ChannelEvent', existing.serial_id, { inactive_since_unix: 0 })
            return
        }
        return
    }

    async FlagInactiveChannel(chanId: string) {
        const existing = await this.dbs.FindOne<ChannelEvent>('ChannelEvent', { where: { channel_id: chanId, event_type: 'activity' } })
        if (!existing) {
            await this.dbs.CreateAndSave<ChannelEvent>('ChannelEvent', { channel_id: chanId, event_type: 'activity', inactive_since_unix: Math.floor(Date.now() / 1000) })
            return
        }
        if (existing.inactive_since_unix > 0) {
            return
        }
        await this.dbs.Update<ChannelEvent>('ChannelEvent', existing.serial_id, { inactive_since_unix: Math.floor(Date.now() / 1000) })
        return
    }

    async GetChannelsActivity(): Promise<Record<string, number>> {
        const events = await this.dbs.Find<ChannelEvent>('ChannelEvent', { where: { event_type: 'activity' } })
        const activityMap: Record<string, number> = {}
        events.forEach(e => {
            activityMap[e.channel_id] = e.inactive_since_unix
        })
        return activityMap
    }

    async SaveBalanceEvents(balanceEvent: Partial<BalanceEvent>, channelBalanceEvents: Partial<ChannelBalanceEvent>[]) {
        //const blanceEventEntry = this.DB.getRepository(BalanceEvent).create(balanceEvent)
        //const balanceEntry = await this.txQueue.PushToQueue<BalanceEvent>({ exec: async db => db.getRepository(BalanceEvent).save(blanceEventEntry), dbTx: false })

        const balanceEntry = await this.dbs.CreateAndSave<BalanceEvent>('BalanceEvent', balanceEvent)

        //const channelsEntry = this.DB.getRepository(ChannelBalanceEvent).create(channelBalanceEvents.map(e => ({ ...e, balance_event: balanceEntry })))
        //const channelsEntries = await this.txQueue.PushToQueue<ChannelBalanceEvent[]>({ exec: async db => db.getRepository(ChannelBalanceEvent).save(channelsEntry), dbTx: false })

        const channelsEntries = await this.dbs.CreateAndSave<ChannelBalanceEvent[]>('ChannelBalanceEvent', channelBalanceEvents.map(e => ({ ...e, balance_event: balanceEntry })))

        return { balanceEntry, channelsEntries }
    }

    async GetBalanceEvents({ from, to }: { from?: number, to?: number }, txId?: string) {
        const q = getTimeQuery({ from, to })
        const chainBalanceEvents = await this.dbs.Find<BalanceEvent>('BalanceEvent', q, txId)
        return { chainBalanceEvents }
    }

    async initChannelRoutingEvent(dayUnix: number, channelId: string) {
        const existing = await this.dbs.FindOne<ChannelRouting>('ChannelRouting', { where: { day_unix: dayUnix, channel_id: channelId } })
        if (!existing) {
            return this.dbs.CreateAndSave<ChannelRouting>('ChannelRouting', { day_unix: dayUnix, channel_id: channelId })
        }
        return existing
    }

    GetChannelRouting({ from, to }: { from?: number, to?: number }, txId?: string) {
        const q = getTimeQuery({ from, to })
        return this.dbs.Find<ChannelRouting>('ChannelRouting', q, txId)
    }

    async GetLatestForwardingIndexOffset() {
        const latestIndex = await this.dbs.Find<ChannelRouting>('ChannelRouting', { order: { latest_index_offset: "DESC" }, take: 1 })
        if (latestIndex.length > 0) {
            return latestIndex[0].latest_index_offset
        }
        return 0
    }

    async IncrementChannelRouting(channelId: string, event: Partial<ChannelRouting>) {
        const dayUnix = getTodayUnix()
        const existing = await this.initChannelRoutingEvent(dayUnix, channelId)
        //const repo = this.DB.getRepository(ChannelRouting)
        if (event.send_errors) {
            await this.dbs.Increment<ChannelRouting>('ChannelRouting', { day_unix: dayUnix, channel_id: channelId }, "send_errors", event.send_errors)
        }
        if (event.receive_errors) {
            await this.dbs.Increment<ChannelRouting>('ChannelRouting', { day_unix: dayUnix, channel_id: channelId }, "receive_errors", event.receive_errors)
        }
        if (event.forward_errors_as_input) {
            await this.dbs.Increment<ChannelRouting>('ChannelRouting', { day_unix: dayUnix, channel_id: channelId }, "forward_errors_as_input", event.forward_errors_as_input)
        }
        if (event.forward_errors_as_output) {
            await this.dbs.Increment<ChannelRouting>('ChannelRouting', { day_unix: dayUnix, channel_id: channelId }, "forward_errors_as_output", event.forward_errors_as_output)
        }
        if (event.missed_forward_fee_as_input) {
            await this.dbs.Increment<ChannelRouting>('ChannelRouting', { day_unix: dayUnix, channel_id: channelId }, "missed_forward_fee_as_input", event.missed_forward_fee_as_input)
        }
        if (event.missed_forward_fee_as_output) {
            await this.dbs.Increment<ChannelRouting>('ChannelRouting', { day_unix: dayUnix, channel_id: channelId }, "missed_forward_fee_as_output", event.missed_forward_fee_as_output)
        }
        if (event.forward_fee_as_input) {
            await this.dbs.Increment<ChannelRouting>('ChannelRouting', { day_unix: dayUnix, channel_id: channelId }, "forward_fee_as_input", event.forward_fee_as_input)
        }
        if (event.forward_fee_as_output) {
            await this.dbs.Increment<ChannelRouting>('ChannelRouting', { day_unix: dayUnix, channel_id: channelId }, "forward_fee_as_output", event.forward_fee_as_output)
        }
        if (event.events_as_input) {
            await this.dbs.Increment<ChannelRouting>('ChannelRouting', { day_unix: dayUnix, channel_id: channelId }, "events_as_input", event.events_as_input)
        }
        if (event.events_as_output) {
            await this.dbs.Increment<ChannelRouting>('ChannelRouting', { day_unix: dayUnix, channel_id: channelId }, "events_as_output", event.events_as_output)
        }
        if (event.latest_index_offset) {
            await this.dbs.Update<ChannelRouting>('ChannelRouting', existing.serial_id, { latest_index_offset: event.latest_index_offset })
        }
    }

    async AddRootOperation(opType: string, id: string, amount: number, txId?: string) {
        return this.dbs.CreateAndSave<RootOperation>('RootOperation', { operation_type: opType, operation_amount: amount, operation_identifier: id, at_unix: Math.floor(Date.now() / 1000) }, txId)
    }

    async GetRootOperations({ from, to }: { from?: number, to?: number }, txId?: string) {
        const q = getTimeQuery({ from, to })
        return this.dbs.Find<RootOperation>('RootOperation', q, txId)
    }
}

const getTimeQuery = ({ from, to }: { from?: number, to?: number }): FindManyOptions<{ created_at: Date }> => {
    if (!!from && !!to) {
        const fromDate = new Date(from * 1000)
        const toDate = new Date(to * 1000)
        return { where: { created_at: Between<Date>(fromDate, toDate) }, order: { created_at: 'ASC' } }
    } else if (!!from) {
        const fromDate = new Date(from * 1000)
        return { where: { created_at: MoreThanOrEqual<Date>(fromDate) }, order: { created_at: 'ASC' } }
    } else if (!!to) {
        const toDate = new Date(to * 1000)
        return { where: { created_at: LessThanOrEqual<Date>(toDate) }, order: { created_at: 'ASC' } }
    }
    return {}
}

const getTodayUnix = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000
}