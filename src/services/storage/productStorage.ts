import { Product } from "./entity/Product.js"
import { User } from "./entity/User.js"
import { StorageInterface } from "./db/storageInterface.js";
import { mapProductBackupRow, ProductRow } from "../backup/segments.js";
import UserStorage from "./userStorage.js";
import { getLogger } from "../helpers/logger.js";
export default class {
    dbs: StorageInterface
    userStorage: UserStorage
    constructor(dbs: StorageInterface, userStorage: UserStorage) {
        this.dbs = dbs
        this.userStorage = userStorage
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
        const products = await this.dbs.Find<Product>('Product', { where: { owner: { user_id: userId } } }, txId)
        if (products.length === 0) {
            return 0
        }
        let deleted = 0
        for (const product of products) {
            deleted += await this.dbs.Delete<Product>('Product', { product_id: product.product_id }, txId)
        }
        return deleted
    }
    async GetAllProducts(txId?: string) {
        return this.dbs.Find<Product>('Product', {}, txId)
    }

    async ExportProducts(): Promise<ProductRow[]> {
        const products = await this.GetAllProducts()
        return products.map(mapProductBackupRow)
    }

    async RestoreProducts(products: ProductRow[], txId: string): Promise<number> {
        let restoredProducts = 0;
        for (const product of products) {
            try {
                const owner = await this.userStorage.GetUser(product.owner_user_id, txId)
                await this.dbs.CreateAndSave<Product>('Product', {
                    product_id: product.product_id,
                    owner,
                    name: product.name,
                    price_sats: product.price_sats,
                }, txId)
                restoredProducts++;
            } catch (error: any) {
                getLogger({ component: "backupRestore" })("error restoring product", error.message)
            }
        }
        return restoredProducts;
    }
}