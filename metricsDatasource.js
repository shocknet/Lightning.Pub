import { DataSource } from "typeorm"
import { LspOrder } from "./build/src/services/storage/entity/LspOrder.js"



export default new DataSource({
    type: "sqlite",
    database: "db.sqlite",
    entities: [LspOrder],
});