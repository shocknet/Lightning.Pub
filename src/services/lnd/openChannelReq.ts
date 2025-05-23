import { CommitmentType, OpenChannelRequest } from "../../../proto/lnd/lightning.js";

export const OpenChannelReq = (destination: string, closeAddress: string, fundingAmount: number, pushSats: number, satsPerVByte: number): OpenChannelRequest => ({
    nodePubkey: Buffer.from(destination, 'hex'),
    closeAddress: closeAddress,
    localFundingAmount: BigInt(fundingAmount),
    pushSat: BigInt(pushSats),

    satPerVbyte: BigInt(satsPerVByte), // TBD
    private: false,
    minConfs: 0, // TBD
    baseFee: 1n, // TBD
    feeRate: 1n, // TBD
    targetConf: 0,
    zeroConf: false,
    maxLocalCsv: 0,
    remoteCsvDelay: 0,
    spendUnconfirmed: false,
    minHtlcMsat: 1n,
    remoteChanReserveSat: 10000n,
    remoteMaxHtlcs: 483,
    remoteMaxValueInFlightMsat: 990000000n,
    useBaseFee: true,
    useFeeRate: true,

    // Default stuff
    commitmentType: CommitmentType.ANCHORS,
    scidAlias: false,
    nodePubkeyString: "",
    satPerByte: 0n,
    fundMax: false,
    memo: "",
    outpoints: [],
    fundingShim: undefined
})