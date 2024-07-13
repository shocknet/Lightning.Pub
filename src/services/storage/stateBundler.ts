import { getLogger } from "../helpers/logger.js"

const transactionStatePointTypes = ['addedInvoice', 'invoiceWasPaid', 'paidAnInvoice', 'addedAddress', 'addressWasPaid', 'paidAnAddress', 'user2user'] as const
const balanceStatePointTypes = ['providerBalance', 'providerMaxWithdrawable', 'walletBalance', 'channelBalance', 'usersBalance', 'feesPaidForLiquidity', 'totalLndBalance', 'accumulatedHtlcFees', 'deltaUsers', 'deltaExternal'] as const
const maxStatePointTypes = ['maxProviderRespTime'] as const
export type TransactionStatePointType = typeof transactionStatePointTypes[number]
export type BalanceStatePointType = typeof balanceStatePointTypes[number]
export type MaxStatePointType = typeof maxStatePointTypes[number]
/*export type TransactionStatePoint = {
    type: typeof TransactionStatePointTypes[number]
    with: 'lnd' | 'internal' | 'provider'
    by: 'user' | 'system'
    amount: number
    success: boolean
    networkFee?: number
    serviceFee?: number
    liquidtyFee?: number
}*/

type StateBundle = Record<string, number>
export type TxPointSettings = {
    used: 'lnd' | 'internal' | 'provider' | 'unknown'
    from: 'user' | 'system'
    meta?: string[]
    timeDiscount?: true
}
export class StateBundler {
    sinceStart: StateBundle = {}
    lastReport: StateBundle = {}
    sinceLatestReport: StateBundle = {}
    reportPeriod = 1000 * 60 * 60 * 12 //12h
    satsPer1SecondDiscount = 1
    totalSatsForDiscount = 0
    latestReport = Date.now()
    reportLog = getLogger({ component: 'stateBundlerReport' })
    constructor() {
        process.on('exit', () => {
            this.Report()
        });

        // catch ctrl+c event and exit normally
        process.on('SIGINT', () => {
            console.log('Ctrl-C...');
            process.exit(2);
        });

        //catch uncaught exceptions, trace, then exit normally
        process.on('uncaughtException', (e) => {
            console.log('Uncaught Exception...');
            console.log(e.stack);
            process.exit(99);
        });
    }

    increment = (key: string, value: number) => {
        this.sinceStart[key] = (this.sinceStart[key] || 0) + value
        this.sinceLatestReport[key] = (this.sinceLatestReport[key] || 0) + value
        this.triggerReportCheck()
    }
    set = (key: string, value: number) => {
        this.sinceStart[key] = value
        this.sinceLatestReport[key] = value
        this.triggerReportCheck()
    }
    max = (key: string, value: number) => {
        this.sinceStart[key] = Math.max(this.sinceStart[key] || 0, value)
        this.sinceLatestReport[key] = Math.max(this.sinceLatestReport[key] || 0, value)
        this.triggerReportCheck()
    }

    AddTxPoint = (actionName: TransactionStatePointType, v: number, settings: TxPointSettings) => {
        const { used, from, timeDiscount } = settings
        const meta = settings.meta || []
        const key = [actionName, from, used, ...meta].join('_')
        if (timeDiscount) {
            this.totalSatsForDiscount += v
        }
        this.increment(key, v)
        //this.smallLogEvent(actionName, from)
    }

    AddTxPointFailed = (actionName: TransactionStatePointType, v: number, settings: TxPointSettings) => {
        const { used, from } = settings
        const meta = settings.meta || []
        const key = [actionName, from, used, ...meta, 'failed'].join('_')
        this.increment(key, v)
    }

    AddBalancePoint = (actionName: BalanceStatePointType, v: number, meta = []) => {
        const key = [actionName, ...meta].join('_')
        this.set(key, v)
    }

    AddMaxPoint = (actionName: MaxStatePointType, v: number, meta = []) => {
        const key = [actionName, ...meta].join('_')
        this.max(key, v)
    }

    triggerReportCheck = () => {
        const discountSeconds = Math.floor(this.totalSatsForDiscount / this.satsPer1SecondDiscount)
        const totalElapsed = Date.now() - this.latestReport
        const elapsedWithDiscount = totalElapsed + discountSeconds * 1000
        if (elapsedWithDiscount > this.reportPeriod) {
            this.Report()
        }
    }

    smallLogEvent(event: TransactionStatePointType, from: 'user' | 'system') {
        const char = from === 'user' ? 'U' : 'S'
        switch (event) {
            case 'addedAddress':
            case 'addedInvoice':
                process.stdout.write(`${char}+,`)
                return
            case 'addressWasPaid':
            case 'invoiceWasPaid':
                process.stdout.write(`${char}>,`)
                return
            case 'paidAnAddress':
            case 'paidAnInvoice':
                process.stdout.write(`${char}<,`)
                return
            case 'user2user':
                process.stdout.write(`UU`)
        }
    }

    Report = () => {
        this.totalSatsForDiscount = 0
        this.latestReport = Date.now()
        this.reportLog("+++++ since last report:")
        Object.entries(this.sinceLatestReport).forEach(([key, value]) => {
            this.reportLog(key, value)
        })
        this.reportLog("+++++ since start:")
        Object.entries(this.sinceStart).forEach(([key, value]) => {
            this.reportLog(key, value)
        })
        this.lastReport = { ...this.sinceLatestReport }
        this.sinceLatestReport = {}
    }
}