import { DataSource } from "typeorm"
import { HtlcFailures } from "./build/src/services/storage/entity/HtlcFailures.js"



export default new DataSource({
    type: "sqlite",
    database: "metrics.sqlite",
    entities: [HtlcFailures],
});