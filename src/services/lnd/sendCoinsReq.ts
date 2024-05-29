import { SendCoinsRequest } from "../../../proto/lnd/lightning";

export const SendCoinsReq = (address: string, amount: number, satPerVByte: number, label = ""): SendCoinsRequest => ({
    addr: address,
    amount: BigInt(amount),
    label: label,
    satPerVbyte: BigInt(satPerVByte),
    targetConf: 0,
    minConfs: 1,
    sendAll: false,
    spendUnconfirmed: false,
    satPerByte: BigInt(0)
})