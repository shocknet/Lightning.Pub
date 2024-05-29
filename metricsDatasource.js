import { DataSource } from "typeorm"
import { ChannelRouting } from "./build/src/services/storage/entity/ChannelRouting.js"



export default new DataSource({
    type: "sqlite",
    database: "metrics.sqlite",
    entities: [ChannelRouting],
});