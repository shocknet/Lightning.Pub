import { DataSource } from "typeorm"
import { BalanceEvent } from "./build/src/services/storage/entity/BalanceEvent.js"
import { ChannelBalanceEvent } from "./build/src/services/storage/entity/ChannelsBalanceEvent.js"
import { ChannelRouting } from "./build/src/services/storage/entity/ChannelRouting.js"
import { LndMetrics1703170330183 } from './build/src/services/storage/migrations/1703170330183-lnd_metrics.js'
import { ChannelRouting1709316653538 } from './build/src/services/storage/migrations/1709316653538-channel_routing.js'

export default new DataSource({
    type: "sqlite",
    database: "metrics.sqlite",
    entities: [BalanceEvent, ChannelBalanceEvent, ChannelRouting],
    migrations: [LndMetrics1703170330183, ChannelRouting1709316653538]
});

//npx typeorm migration:generate ./src/services/storage/migrations/htlc_count -d ./metricsDatasource.js