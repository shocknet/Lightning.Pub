import { DataSource, EntityManager } from "typeorm"
import { Product } from "./entity/Product.js"
import { User } from "./entity/User.js"
export default class {
    DB: DataSource | EntityManager
    constructor(DB: DataSource | EntityManager) {
        this.DB = DB
    }
    async AddProduct(name: string, priceSats: number, user: User, entityManager = this.DB): Promise<Product> {
        const newProduct = entityManager.getRepository(Product).create({
            name: name, price_sats: priceSats, owner: user
        })
        return entityManager.getRepository(Product).save(newProduct)
    }

    async GetProduct(id: string, entityManager = this.DB): Promise<Product> {
        const product = await entityManager.getRepository(Product).findOne({ where: { product_id: id } })
        if (!product) {
            throw new Error("product not found")
        }
        return product
    }
}