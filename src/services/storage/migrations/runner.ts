import { Initial1703170309875 } from './1703170309875-initial.js'
import { LndMetrics1703170330183 } from './1703170330183-lnd_metrics.js'
import { ChannelRouting1709316653538 } from './1709316653538-channel_routing.js'
import { LspOrder1718387847693 } from './1718387847693-lsp_order.js'
import { LiquidityProvider1719335699480 } from './1719335699480-liquidity_provider.js'
import { LndNodeInfo1720187506189 } from './1720187506189-lnd_node_info.js'
import { TrackedProvider1720814323679 } from './1720814323679-tracked_provider.js'
import { CreateInviteTokenTable1721751414878 } from "./1721751414878-create_invite_token_table.js"
import { PaymentIndex1721760297610 } from './1721760297610-payment_index.js'
import { HtlcCount1724266887195 } from './1724266887195-htlc_count.js'
import { BalanceEvents1724860966825 } from './1724860966825-balance_events.js'
import { DebitAccess1726496225078 } from './1726496225078-debit_access.js'
import { DebitAccessFixes1726685229264 } from './1726685229264-debit_access_fixes.js'
import { DebitToPub1727105758354 } from './1727105758354-debit_to_pub.js'
import { UserCbUrl1727112281043 } from './1727112281043-user_cb_url.js'
import { RootOps1732566440447 } from './1732566440447-root_ops.js'
import { UserOffer1733502626042 } from './1733502626042-user_offer.js'
import { RootOpsTime1745428134124 } from './1745428134124-root_ops_time.js'
import { ChannelEvents1750777346411 } from './1750777346411-channel_events.js'
import { ManagementGrant1751307732346 } from './1751307732346-management_grant.js'
import { ManagementGrantBanned1751989251513 } from './1751989251513-management_grant_banned.js'
import { InvoiceCallbackUrls1752425992291 } from './1752425992291-invoice_callback_urls.js'
import { AppUserDevice1753285173175 } from './1753285173175-app_user_device.js'
import { OldSomethingLeftover1753106599604 } from './1753106599604-old_something_leftover.js'
import { UserReceivingInvoiceIdx1753109184611 } from './1753109184611-user_receiving_invoice_idx.js'
import { UserAccess1759426050669 } from './1759426050669-user_access.js'
import { AddBlindToUserOffer1760000000000 } from './1760000000000-add_blind_to_user_offer.js'
import { ApplicationAvatarUrl1761000001000 } from './1761000001000-application_avatar_url.js'
import { AdminSettings1761683639419 } from './1761683639419-admin_settings.js'
import { TxSwap1762890527098 } from './1762890527098-tx_swap.js'
import { TxSwapAddress1764779178945 } from './1764779178945-tx_swap_address.js'


export const allMigrations = [Initial1703170309875, LspOrder1718387847693, LiquidityProvider1719335699480, LndNodeInfo1720187506189,
    TrackedProvider1720814323679, CreateInviteTokenTable1721751414878, PaymentIndex1721760297610, DebitAccess1726496225078, DebitAccessFixes1726685229264,
    DebitToPub1727105758354, UserCbUrl1727112281043, UserOffer1733502626042, ManagementGrant1751307732346, ManagementGrantBanned1751989251513,
    InvoiceCallbackUrls1752425992291, OldSomethingLeftover1753106599604, UserReceivingInvoiceIdx1753109184611, AppUserDevice1753285173175,
    UserAccess1759426050669, AddBlindToUserOffer1760000000000, ApplicationAvatarUrl1761000001000, AdminSettings1761683639419, TxSwap1762890527098, TxSwapAddress1764779178945]

export const allMetricsMigrations = [LndMetrics1703170330183, ChannelRouting1709316653538, HtlcCount1724266887195, BalanceEvents1724860966825, RootOps1732566440447, RootOpsTime1745428134124, ChannelEvents1750777346411]
/* export const TypeOrmMigrationRunner = async (log: PubLogger, storageManager: Storage, settings: DbSettings, arg: string | undefined): Promise<boolean> => {
    await connectAndMigrate(log, storageManager, allMigrations, allMetricsMigrations)
    return false
}

const connectAndMigrate = async (log: PubLogger, storageManager: Storage, migrations: Function[], metricsMigrations: Function[]) => {
    const { executedMigrations, executedMetricsMigrations } = await storageManager.Connect(migrations, metricsMigrations)
    if (executedMigrations.length > 0) {
        log(executedMigrations.length, "new migrations executed")
        log("-------------------")

    } if (executedMetricsMigrations.length > 0) {
        log(executedMetricsMigrations.length, "new metrics migrations executed")
        log("-------------------")
    }
} */