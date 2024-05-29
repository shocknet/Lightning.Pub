import { DataSource } from "typeorm"
import { User } from "./build/src/services/storage/entity/User.js"
import { UserReceivingInvoice } from "./build/src/services/storage/entity/UserReceivingInvoice.js"
import { AddressReceivingTransaction } from "./build/src/services/storage/entity/AddressReceivingTransaction.js"
import { Application } from "./build/src/services/storage/entity/Application.js"
import { ApplicationUser } from "./build/src/services/storage/entity/ApplicationUser.js"
import { BalanceEvent } from "./build/src/services/storage/entity/BalanceEvent.js"
import { ChannelBalanceEvent } from "./build/src/services/storage/entity/ChannelsBalanceEvent.js"
import { Product } from "./build/src/services/storage/entity/Product.js"
import { RoutingEvent } from "./build/src/services/storage/entity/RoutingEvent.js"
import { UserBasicAuth } from "./build/src/services/storage/entity/UserBasicAuth.js"
import { UserEphemeralKey } from "./build/src/services/storage/entity/UserEphemeralKey.js"
import { UserInvoicePayment } from "./build/src/services/storage/entity/UserInvoicePayment.js"
import { UserReceivingAddress } from "./build/src/services/storage/entity/UserReceivingAddress.js"
import { UserToUserPayment } from "./build/src/services/storage/entity/UserToUserPayment.js"
import { UserTransactionPayment } from "./build/src/services/storage/entity/UserTransactionPayment.js"

export default new DataSource({
    type: "sqlite",
    database: "source.sqlite",
    // logging: true,
    entities: [User, UserReceivingInvoice, UserReceivingAddress, AddressReceivingTransaction, UserInvoicePayment, UserTransactionPayment,
        UserBasicAuth, UserEphemeralKey, Product, UserToUserPayment, Application, ApplicationUser, UserToUserPayment, RoutingEvent, BalanceEvent, ChannelBalanceEvent],
    // synchronize: true,
})