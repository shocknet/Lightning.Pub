import { Between, DataSource, EntityManager, FindOperator, LessThanOrEqual, MoreThanOrEqual } from "typeorm"
import { RoutingEvent } from "./entity/RoutingEvent.js"
import { BalanceEvent } from "./entity/BalanceEvent.js"
import { ChannelBalanceEvent } from "./entity/ChannelsBalanceEvent.js"
export default class {
    DB: DataSource | EntityManager
    constructor(DB: DataSource | EntityManager) {
        this.DB = DB
    }
    async SaveRoutingEvent(event: Partial<RoutingEvent>, entityManager = this.DB) {
        const entry = entityManager.getRepository(RoutingEvent).create(event)
        return entityManager.getRepository(RoutingEvent).save(entry)
    }

    async SaveBalanceEvents(balanceEvent: Partial<BalanceEvent>, channelBalanceEvents: Partial<ChannelBalanceEvent>[], entityManager = this.DB) {
        const blanceEventEntry = entityManager.getRepository(BalanceEvent).create(balanceEvent)
        const balanceEntry = await entityManager.getRepository(BalanceEvent).save(blanceEventEntry)
        const channelsEntry = entityManager.getRepository(ChannelBalanceEvent).create(channelBalanceEvents.map(e => ({ ...e, balance_event: balanceEntry })))
        const channelsEntries = await entityManager.getRepository(ChannelBalanceEvent).save(channelsEntry)
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