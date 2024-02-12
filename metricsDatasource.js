import { DataSource } from "typeorm"
import { BalanceEvent } from "./build/src/services/storage/entity/BalanceEvent.js"
import { ChannelBalanceEvent } from "./build/src/services/storage/entity/ChannelsBalanceEvent.js"
import { RoutingEvent } from "./build/src/services/storage/entity/RoutingEvent.js"



export default new DataSource({
    type: "sqlite",
    database: "metrics.sqlite",
    entities: [ RoutingEvent, BalanceEvent, ChannelBalanceEvent],
});