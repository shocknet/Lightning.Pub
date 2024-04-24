import { OpenChannelRequest } from "../../../proto/lnd/lightning";

export const OpenChannelReq = (destination: string, closeAddress: string, fundingAmount: number, pushSats: number): OpenChannelRequest => ({
    nodePubkey: Buffer.from(destination, 'hex'),
    closeAddress: closeAddress,
    localFundingAmount: BigInt(fundingAmount),
    pushSat: BigInt(pushSats),

    satPerVbyte: 0n, // TBD
    private: false,
    minConfs: 0, // TBD
    baseFee: 1n, // TBD
    feeRate: 1n, // TBD
    targetConf: 0,
    zeroConf: false,
    maxLocalCsv: 0,
    remoteCsvDelay: 0,
    spendUnconfirmed: false,
    minHtlcMsat: 0n,
    remoteChanReserveSat: 0n,
    remoteMaxHtlcs: 0,
    remoteMaxValueInFlightMsat: 0n,
    useBaseFee: false,
    useFeeRate: false,

    // Default stuff
    commitmentType: 0,
    scidAlias: false,
    nodePubkeyString: "",
    satPerByte: 0n,

    fundingShim: undefined
})