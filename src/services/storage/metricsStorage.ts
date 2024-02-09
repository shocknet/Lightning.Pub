import { Between, DataSource, EntityManager, FindOperator, LessThanOrEqual, MoreThanOrEqual } from "typeorm"
import { RoutingEvent } from "./entity/RoutingEvent.js"
import { BalanceEvent } from "./entity/BalanceEvent.js"
import { ChannelBalanceEvent } from "./entity/ChannelsBalanceEvent.js"
import TransactionsQueue, { TX } from "./transactionsQueue.js";
export default class {
    DB: DataSource | EntityManager
    txQueue: TransactionsQueue
    constructor(DB: DataSource | EntityManager, txQueue: TransactionsQueue) {
        this.DB = DB
        this.txQueue = txQueue
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
}