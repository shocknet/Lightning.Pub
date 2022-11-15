import { OpenChannelRequest } from "../../../proto/lnd/lightning";

export const OpenChannelReq = (destination: string, closeAddress: string, fundingAmount: number, pushSats: number): OpenChannelRequest => ({
    nodePubkey: Buffer.from(destination, 'hex'),
    closeAddress: closeAddress,
    localFundingAmount: fundingAmount,
    pushSat: pushSats,

    satPerVbyte: 0, // TBD
    private: false,
    minConfs: 0, // TBD
    baseFee: 0, // TBD
    feeRate: 0, // TBD
    targetConf: 0,
    zeroConf: false,
    maxLocalCsv: 0,
    remoteCsvDelay: 0,
    spendUnconfirmed: false,
    minHtlcMsat: 0,
    remoteChanReserveSat: 0,
    remoteMaxHtlcs: 0,
    remoteMaxValueInFlightMsat: 0,
    useBaseFee: false,
    useFeeRate: false,

    // Default stuff
    commitmentType: 0,
    scidAlias: false,
    nodePubkeyString: "",
    satPerByte: 0,

    fundingShim: undefined
})