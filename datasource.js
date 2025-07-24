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
import { UserOffer } from "./build/src/services/storage/entity/UserOffer.js"
import { ManagementGrant } from "./build/src/services/storage/entity/ManagementGrant.js"

import { Initial1703170309875 } from './build/src/services/storage/migrations/1703170309875-initial.js'
import { LspOrder1718387847693 } from './build/src/services/storage/migrations/1718387847693-lsp_order.js'
import { LndNodeInfo1720187506189 } from './build/src/services/storage/migrations/1720187506189-lnd_node_info.js'
import { LiquidityProvider1719335699480 } from './build/src/services/storage/migrations/1719335699480-liquidity_provider.js'
import { CreateInviteTokenTable1721751414878 } from './build/src/services/storage/migrations/1721751414878-create_invite_token_table.js'
import { PaymentIndex1721760297610 } from './build/src/services/storage/migrations/1721760297610-payment_index.js'
import { DebitAccess1726496225078 } from './build/src/services/storage/migrations/1726496225078-debit_access.js'
import { DebitAccessFixes1726685229264 } from './build/src/services/storage/migrations/1726685229264-debit_access_fixes.js'
import { DebitToPub1727105758354 } from './build/src/services/storage/migrations/1727105758354-debit_to_pub.js'
import { UserCbUrl1727112281043 } from './build/src/services/storage/migrations/1727112281043-user_cb_url.js'
import { UserOffer1733502626042 } from './build/src/services/storage/migrations/1733502626042-user_offer.js'
import { ManagementGrant1751307732346 } from './build/src/services/storage/migrations/1751307732346-management_grant.js'
import { InvoiceCallbackUrls1752425992291 } from './build/src/services/storage/migrations/1752425992291-invoice_callback_urls.js'
import { OldSomethingLeftover1753106599604 } from './build/src/services/storage/migrations/1753106599604-old_something_leftover.js'
import { UserReceivingInvoiceIdx1753109184611 } from './build/src/services/storage/migrations/1753109184611-user_receiving_invoice_idx.js'

export default new DataSource({
    type: "sqlite",
    database: "db.sqlite",
    // logging: true,
    migrations: [Initial1703170309875, LspOrder1718387847693, LiquidityProvider1719335699480, LndNodeInfo1720187506189, CreateInviteTokenTable1721751414878,
        PaymentIndex1721760297610, DebitAccess1726496225078, DebitAccessFixes1726685229264, DebitToPub1727105758354, UserCbUrl1727112281043,
        UserOffer1733502626042, ManagementGrant1751307732346, InvoiceCallbackUrls1752425992291, OldSomethingLeftover1753106599604, UserReceivingInvoiceIdx1753109184611],
    entities: [User, UserReceivingInvoice, UserReceivingAddress, AddressReceivingTransaction, UserInvoicePayment, UserTransactionPayment,
        UserBasicAuth, UserEphemeralKey, Product, UserToUserPayment, Application, ApplicationUser, UserToUserPayment, LspOrder, LndNodeInfo, TrackedProvider, InviteToken, DebitAccess, UserOffer, ManagementGrant],
    // synchronize: true,
})
//npx typeorm migration:generate ./src/services/storage/migrations/management_grant_banned -d ./datasource.js