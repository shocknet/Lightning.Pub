import { DataSource } from "typeorm"
import { BalanceEvent } from "./build/src/services/storage/entity/BalanceEvent.js"
import { ChannelBalanceEvent } from "./build/src/services/storage/entity/ChannelsBalanceEvent.js"
import { ChannelRouting } from "./build/src/services/storage/entity/ChannelRouting.js"
import { RootOperation } from "./build/src/services/storage/entity/RootOperation.js"
import { ChannelEvent } from "./build/src/services/storage/entity/ChannelEvent.js"
import { LndMetrics1703170330183 } from './build/src/services/storage/migrations/1703170330183-lnd_metrics.js'
import { ChannelRouting1709316653538 } from './build/src/services/storage/migrations/1709316653538-channel_routing.js'
import { HtlcCount1724266887195 } from './build/src/services/storage/migrations/1724266887195-htlc_count.js'
import { BalanceEvents1724860966825 } from './build/src/services/storage/migrations/1724860966825-balance_events.js'
import { RootOps1732566440447 } from './build/src/services/storage/migrations/1732566440447-root_ops.js'
import { RootOpsTime1745428134124 } from './build/src/services/storage/migrations/1745428134124-root_ops_time.js'
import { ChannelEvents1750777346411 } from './build/src/services/storage/migrations/1750777346411-channel_events.js'

export default new DataSource({
    type: "better-sqlite3",
    database: "metrics.sqlite",
    entities: [BalanceEvent, ChannelBalanceEvent, ChannelRouting, RootOperation, ChannelEvent],
    migrations: [LndMetrics1703170330183, ChannelRouting1709316653538, HtlcCount1724266887195, BalanceEvents1724860966825,
        RootOps1732566440447, RootOpsTime1745428134124, ChannelEvents1750777346411]
});

//npx typeorm migration:generate ./src/services/storage/migrations/root_op_pending -d ./metricsDatasource.js