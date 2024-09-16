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
import { TrackedProvider } from "./build/src/services/storage/entity/TrackedProvider.js"
import { InviteToken } from "./build/src/services/storage/entity/InviteToken.js"
import { DebitAccess } from "./build/src/services/storage/entity/DebitAccess.js"

import { Initial1703170309875 } from './build/src/services/storage/migrations/1703170309875-initial.js'
import { LspOrder1718387847693 } from './build/src/services/storage/migrations/1718387847693-lsp_order.js'
import { LndNodeInfo1720187506189 } from './build/src/services/storage/migrations/1720187506189-lnd_node_info.js'
import { LiquidityProvider1719335699480 } from './build/src/services/storage/migrations/1719335699480-liquidity_provider.js'
import { CreateInviteTokenTable1721751414878 } from './build/src/services/storage/migrations/1721751414878-create_invite_token_table.js'
import { PaymentIndex1721760297610 } from './build/src/services/storage/migrations/1721760297610-payment_index.js'
import { DebitAccess1726496225078 } from './build/src/services/storage/migrations/1726496225078-debit_access.js'
export default new DataSource({
    type: "sqlite",
    database: "db.sqlite",
    // logging: true,
    migrations: [Initial1703170309875, LspOrder1718387847693, LiquidityProvider1719335699480, LndNodeInfo1720187506189, CreateInviteTokenTable1721751414878, PaymentIndex1721760297610, DebitAccess1726496225078],
    entities: [User, UserReceivingInvoice, UserReceivingAddress, AddressReceivingTransaction, UserInvoicePayment, UserTransactionPayment,
        UserBasicAuth, UserEphemeralKey, Product, UserToUserPayment, Application, ApplicationUser, UserToUserPayment, LspOrder, LndNodeInfo, TrackedProvider, InviteToken, DebitAccess],
    // synchronize: true,
})
//npx typeorm migration:generate ./src/services/storage/migrations/debit_access -d ./datasource.js