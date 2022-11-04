import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "./entity/User"

const AppDataSource = new DataSource({
    type: "sqlite",
    database: `db.sqlite`,
    logging: true,
    entities: [User],
})
export default async () => {
    return AppDataSource.initialize()
}