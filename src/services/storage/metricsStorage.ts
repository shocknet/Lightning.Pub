import { Between, DataSource, EntityManager, FindOperator, LessThanOrEqual, MoreThanOrEqual } from "typeorm"
import { RoutingEvent } from "./entity/RoutingEvent.js"
import { BalanceEvent } from "./entity/BalanceEvent.js"
import { ChannelBalanceEvent } from "./entity/ChannelsBalanceEvent.js"
import TransactionsQueue, { TX } from "./transactionsQueue.js";
import { StorageSettings } from "./index.js";
import { newMetricsDb } from "./db.js";
import { HtlcFailures } from "./entity/HtlcFailures.js";
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
    async SaveRoutingEvent(event: Partial<RoutingEvent>) {
        const entry = this.DB.getRepository(RoutingEvent).create(event)
        return this.txQueue.PushToQueue<RoutingEvent>({ exec: async db => db.getRepository(RoutingEvent).save(entry), dbTx: false })
    }

    async SaveBalanceEvents(balanceEvent: Partial<BalanceEvent>, channelBalanceEvents: Partial<ChannelBalanceEvent>[]) {
        const blanceEventEntry = this.DB.getRepository(BalanceEvent).create(balanceEvent)
        const balanceEntry = await this.txQueue.PushToQueue<BalanceEvent>({ exec: async db => db.getRepository(BalanceEvent).save(blanceEventEntry), dbTx: false })

        const channelsEntry = this.DB.getRepository(ChannelBalanceEvent).create(channelBalanceEvents.map(e => ({ ...e, balance_event: balanceEntry })))
        const channelsEntries = await this.txQueue.PushToQueue<ChannelBalanceEvent[]>({ exec: async db => db.getRepository(ChannelBalanceEvent).save(channelsEntry), dbTx: false })
        return { balanceEntry, channelsEntries }
    }

    async GetRoutingEvents({ from, to }: { from?: number, to?: number }, entityManager = this.DB) {
        let q: { where: { created_at: FindOperator<Date> } } | {} = {}
        if (!!from && !!to) {
            q = { where: { created_at: Between<Date>(new Date(from * 1000), new Date(to * 1000)) } }
        } else if (!!from) {
            q = { where: { created_at: MoreThanOrEqual<Date>(new Date(from * 1000)) } }
        } else if (!!to) {
            q = { where: { created_at: LessThanOrEqual<Date>(new Date(to * 1000)) } }
        }
        return entityManager.getRepository(RoutingEvent).find(q)
    }

    async GetBalanceEvents({ from, to }: { from?: number, to?: number }, entityManager = this.DB) {
        let q: { where: { created_at: FindOperator<Date> } } | {} = {}
        if (!!from && !!to) {
            q = { where: { created_at: Between<Date>(new Date(from * 1000), new Date(to * 1000)) } }
        } else if (!!from) {
            q = { where: { created_at: MoreThanOrEqual<Date>(new Date(from * 1000)) } }
        } else if (!!to) {
            q = { where: { created_at: LessThanOrEqual<Date>(new Date(to * 1000)) } }
        }

        const [chainBalanceEvents, channelsBalanceEvents] = await Promise.all([
            entityManager.getRepository(BalanceEvent).find(q),
            entityManager.getRepository(ChannelBalanceEvent).find(q),
        ])
        return { chainBalanceEvents, channelsBalanceEvents }
    }

    updateHtlcErrors = async (key: string, update: (d: TMPHtlcFailureData) => TMPHtlcFailureData, entityManager = this.DB) => {
        const existing = await entityManager.getRepository(HtlcFailures).findOne({ where: { key } })
        if (existing) {
            const data = update(existing.value as TMPHtlcFailureData)
            await entityManager.getRepository(HtlcFailures).update({ key }, { value: data })
            return
        }
        const data = update(newTMPHtlcFailureData())
        await entityManager.getRepository(HtlcFailures).save({ key, value: data })

    }
}
const newTMPHtlcFailureData = () => {
    return {
        send_failures: 0,
        receive_failures: 0,
        forward_failures: 0,
        forward_failures_amt: 0,
        failed_sources: {},
        failed_destinations: {},
        errors: {}
    }
}
type TMPHtlcFailureData = { // TODO: move to a file with versions and stuff
    send_failures: number
    receive_failures: number
    forward_failures: number
    forward_failures_amt: number
    failed_sources: Record<number, number>
    failed_destinations: Record<number, number>
    errors: Record<string, number>
}