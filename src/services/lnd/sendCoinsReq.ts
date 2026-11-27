import { CoinSelectionStrategy, OutPoint, SendCoinsRequest } from "../../../proto/lnd/lightning.js";

export const SendCoinsReq = (address: string, amount: number, satPerVByte: number, label = "", sendAll = false, outpoints: OutPoint[] = []): SendCoinsRequest => ({
    addr: address,
    amount: BigInt(sendAll ? 0 : amount),
    label: label,
    satPerVbyte: BigInt(satPerVByte),
    targetConf: 0,
    minConfs: 1,
    sendAll,
    spendUnconfirmed: false,
    satPerByte: BigInt(0),
    coinSelectionStrategy: CoinSelectionStrategy.STRATEGY_LARGEST,
    outpoints,
})
