import { getLogger } from "../helpers/logger.js"
import { Gauge, Counter } from 'prom-client'
const transactionStatePointTypes = ['addedInvoice', 'invoiceWasPaid', 'paidAnInvoice', 'addedAddress', 'addressWasPaid', 'paidAnAddress', 'user2user'] as const
const balanceStatePointTypes = ['providerBalance', 'providerMaxWithdrawable', 'walletBalance', 'channelBalance', 'usersBalance', 'feesPaidForLiquidity', 'totalLndBalance', 'accumulatedHtlcFees', 'deltaUsers', 'deltaExternal'] as const
const maxStatePointTypes = ['maxProviderRespTime'] as const
export type TransactionStatePointType = typeof transactionStatePointTypes[number]
export type BalanceStatePointType = typeof balanceStatePointTypes[number]
export type MaxStatePointType = typeof maxStatePointTypes[number]
const reports = {
    'addedInvoice': new Counter({ name: 'addedInvoice', help: 'addedInvoice', labelNames: ['user', 'system', 'lnd', 'internal', 'provider', 'unknown'] }),
    'invoiceWasPaid': new Counter({ name: 'invoiceWasPaid', help: 'invoiceWasPaid', labelNames: ['user', 'system', 'lnd', 'internal', 'provider', 'unknown'] }),
    'paidAnInvoice': new Counter({ name: 'paidAnInvoice', help: 'paidAnInvoice', labelNames: ['user', 'system', 'lnd', 'internal', 'provider', 'unknown'] }),
    'addedAddress': new Counter({ name: 'addedAddress', help: 'addedAddress', labelNames: ['user', 'system', 'lnd', 'internal', 'provider', 'unknown'] }),
    'addressWasPaid': new Counter({ name: 'addressWasPaid', help: 'addressWasPaid', labelNames: ['user', 'system', 'lnd', 'internal', 'provider', 'unknown'] }),
    'paidAnAddress': new Counter({ name: 'paidAnAddress', help: 'paidAnAddress', labelNames: ['user', 'system', 'lnd', 'internal', 'provider', 'unknown'] }),
    'user2user': new Counter({ name: 'user2user', help: 'user2user', labelNames: ['user', 'system', 'lnd', 'internal', 'provider', 'unknown'] }),

    'providerBalance': new Gauge({ name: 'providerBalance', help: 'providerBalance' }),
    'providerMaxWithdrawable': new Gauge({ name: 'providerMaxWithdrawable', help: 'providerMaxWithdrawable' }),
    'walletBalance': new Gauge({ name: 'walletBalance', help: 'walletBalance' }),
    'channelBalance': new Gauge({ name: 'channelBalance', help: 'channelBalance' }),
    'usersBalance': new Gauge({ name: 'usersBalance', help: 'usersBalance' }),
    'feesPaidForLiquidity': new Gauge({ name: 'feesPaidForLiquidity', help: 'feesPaidForLiquidity' }),
    'totalLndBalance': new Gauge({ name: 'totalLndBalance', help: 'totalLndBalance' }),
    'accumulatedHtlcFees': new Gauge({ name: 'accumulatedHtlcFees', help: 'accumulatedHtlcFees' }),
    'deltaUsers': new Gauge({ name: 'deltaUsers', help: 'deltaUsers' }),
    'deltaExternal': new Gauge({ name: 'deltaExternal', help: 'deltaExternal' }),
    'maxProviderRespTime': new Gauge({ name: 'maxProviderRespTime', help: 'maxProviderRespTime' }),
}
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

    increment = (actionName: TransactionStatePointType, labels: string[], value: number) => {
        reports[actionName].labels(...labels).inc(value)
        const key = [actionName, ...labels].join('_')
        this.sinceStart[key] = (this.sinceStart[key] || 0) + value
        this.sinceLatestReport[key] = (this.sinceLatestReport[key] || 0) + value
        this.triggerReportCheck()
    }
    set = (actionName: BalanceStatePointType, labels: string[], value: number) => {
        reports[actionName].labels(...labels).set(value)
        const key = [actionName, ...labels].join('_')
        this.sinceStart[key] = value
        this.sinceLatestReport[key] = value
        this.triggerReportCheck()
    }
    max = (actionName: MaxStatePointType, labels: string[], value: number) => {
        reports[actionName].labels(...labels).set(value)
        const key = [actionName, ...labels].join('_')
        this.sinceStart[key] = Math.max(this.sinceStart[key] || 0, value)
        this.sinceLatestReport[key] = Math.max(this.sinceLatestReport[key] || 0, value)
        this.triggerReportCheck()
    }

    AddTxPoint = (actionName: TransactionStatePointType, v: number, settings: TxPointSettings) => {
        const { used, from, timeDiscount } = settings
        const labels = [from, used]
        if (timeDiscount) {
            this.totalSatsForDiscount += v
        }
        this.increment(actionName, labels, v)
        //this.smallLogEvent(actionName, from)
    }

    AddTxPointFailed = (actionName: TransactionStatePointType, v: number, settings: TxPointSettings) => {
        const { used, from } = settings
        const labels = [from, used, 'failed']
        this.increment(actionName, labels, v)
    }

    AddBalancePoint = (actionName: BalanceStatePointType, v: number) => {
        this.set(actionName, [], v)
    }

    AddMaxPoint = (actionName: MaxStatePointType, v: number) => {
        this.max(actionName, [], v)
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