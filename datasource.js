import { DataSource } from "typeorm"
import { User } from "./build/src/services/storage/entity/User.js"
import { UserReceivingInvoice } from "./build/src/services/storage/entity/UserReceivingInvoice.js"
import { AddressReceivingTransaction } from "./build/src/services/storage/entity/AddressReceivingTransaction.js"
import { Application } from "./build/src/services/storage/entity/Application.js"
import { ApplicationUser } from "./build/src/services/storage/entity/ApplicationUser.js"
import { Product } from "./build/src/services/storage/entity/Product.js"
import { UserBasicAuth } from "./build/src/services/storage/entity/UserBasicAuth.js"
import { UserEphemeralKey } from "./build/src/services/storage/entity/UserEphemeralKey.js"
import { UserInvoicePayment } from "./build/src/services/storage/entity/UserInvoicePayment.js"
import { UserReceivingAddress } from "./build/src/services/storage/entity/UserReceivingAddress.js"
import { UserToUserPayment } from "./build/src/services/storage/entity/UserToUserPayment.js"
import { UserTransactionPayment } from "./build/src/services/storage/entity/UserTransactionPayment.js"
import { LspOrder } from "./build/src/services/storage/entity/LspOrder.js"
import { LndNodeInfo } from "./build/src/services/storage/entity/LndNodeInfo.js"
import { Initial1703170309875 } from './build/src/services/storage/migrations/1703170309875-initial.js'
import { LspOrder1718387847693 } from './build/src/services/storage/migrations/1718387847693-lsp_order.js'
import { LiquidityProvider1719335699480 } from './build/src/services/storage/migrations/1719335699480-liquidity_provider.js'
export default new DataSource({
    type: "sqlite",
    database: "db.sqlite",
    // logging: true,
    migrations: [Initial1703170309875, LspOrder1718387847693, LiquidityProvider1719335699480],
    entities: [User, UserReceivingInvoice, UserReceivingAddress, AddressReceivingTransaction, UserInvoicePayment, UserTransactionPayment,
        UserBasicAuth, UserEphemeralKey, Product, UserToUserPayment, Application, ApplicationUser, UserToUserPayment, LspOrder, LndNodeInfo],
    // synchronize: true,
})
//npx typeorm migration:generate ./src/services/storage/migrations/lnd_node_info -d ./datasource.js