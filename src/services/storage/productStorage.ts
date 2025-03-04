import { DataSource, EntityManager } from "typeorm"
import { Product } from "./entity/Product.js"
import { User } from "./entity/User.js"
import TransactionsQueue, { TX } from "./transactionsQueue.js";
import { IDbOperations } from './dbProxy.js';

type DbType = DataSource | EntityManager | IDbOperations;

export default class {
    DB: DbType
    txQueue: TransactionsQueue
    constructor(DB: DbType, txQueue: TransactionsQueue) {
        this.DB = DB
        this.txQueue = txQueue
    }
    async AddProduct(name: string, priceSats: number, user: User): Promise<Product> {
        const newProduct = this.DB.getRepository(Product).create({
            name: name, price_sats: priceSats, owner: user
        })
        return this.txQueue.PushToQueue<Product>({ exec: async db => db.getRepository(Product).save(newProduct), dbTx: false })
    }

    async GetProduct(id: string, entityManager: DbType = this.DB): Promise<Product> {
        const product = await entityManager.getRepository(Product).findOne({ where: { product_id: id } })
        if (!product) {
            throw new Error("product not found")
        }
        return product
    }
}