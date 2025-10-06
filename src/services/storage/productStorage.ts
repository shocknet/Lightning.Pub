import { Product } from "./entity/Product.js"
import { User } from "./entity/User.js"
import { StorageInterface } from "./db/storageInterface.js";
export default class {
    dbs: StorageInterface
    constructor(dbs: StorageInterface) {
        this.dbs = dbs
    }
    async AddProduct(name: string, priceSats: number, user: User): Promise<Product> {
        return this.dbs.CreateAndSave<Product>('Product', {
            name: name, price_sats: priceSats, owner: user
        })
    }

    async GetProduct(id: string, txId?: string): Promise<Product> {
        const product = await this.dbs.FindOne<Product>('Product', { where: { product_id: id } }, txId)
        if (!product) {
            throw new Error("product not found")
        }
        return product
    }

    async RemoveUserProducts(userId: string, txId?: string) {
        return this.dbs.Delete<Product>('Product', { owner: { user_id: userId } }, txId)
    }
}