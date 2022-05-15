"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTLC = exports.DisconnectPeerResponse = exports.DisconnectPeerRequest = exports.ConnectPeerResponse = exports.ConnectPeerRequest = exports.VerifyMessageResponse = exports.VerifyMessageRequest = exports.SignMessageResponse = exports.SignMessageRequest = exports.NewAddressResponse = exports.NewAddressRequest = exports.ListUnspentResponse = exports.ListUnspentRequest = exports.SendCoinsResponse = exports.SendCoinsRequest = exports.SendManyResponse = exports.SendManyRequest = exports.EstimateFeeResponse = exports.EstimateFeeRequest = exports.LightningAddress = exports.OutPoint = exports.ChannelPoint = exports.ChannelAcceptResponse = exports.ChannelAcceptRequest = exports.SendToRouteRequest = exports.SendResponse = exports.SendRequest = exports.FeeLimit = exports.TransactionDetails = exports.GetTransactionsRequest = exports.Transaction = exports.Utxo = exports.FeatureBit = exports.PaymentFailureReason = exports.InvoiceHTLCState = exports.NodeMetricType = exports.ResolutionOutcome = exports.ResolutionType = exports.Initiator = exports.CommitmentType = exports.AddressType = exports.Failure_FailureCode = exports.HTLCAttempt_HTLCStatus = exports.Payment_PaymentStatus = exports.Invoice_InvoiceState = exports.ChannelEventUpdate_UpdateType = exports.PendingChannelsResponse_ForceClosedChannel_AnchorState = exports.PeerEvent_EventType = exports.Peer_SyncType = exports.ChannelCloseSummary_ClosureType = void 0;
exports.WalletAccountBalance = exports.ChannelEventUpdate = exports.ChannelEventSubscription = exports.PendingChannelsResponse_ForceClosedChannel = exports.PendingChannelsResponse_ClosedChannel = exports.PendingChannelsResponse_Commitments = exports.PendingChannelsResponse_WaitingCloseChannel = exports.PendingChannelsResponse_PendingOpenChannel = exports.PendingChannelsResponse_PendingChannel = exports.PendingChannelsResponse = exports.PendingChannelsRequest = exports.PendingHTLC = exports.FundingStateStepResp = exports.FundingTransitionMsg = exports.FundingPsbtFinalize = exports.FundingPsbtVerify = exports.FundingShimCancel = exports.FundingShim = exports.PsbtShim = exports.ChanPointShim = exports.KeyDescriptor = exports.KeyLocator = exports.OpenStatusUpdate = exports.OpenChannelRequest = exports.ReadyForPsbtFunding = exports.PendingUpdate = exports.CloseStatusUpdate = exports.CloseChannelRequest = exports.ChannelCloseUpdate = exports.ChannelOpenUpdate = exports.ConfirmationUpdate = exports.Chain = exports.GetRecoveryInfoResponse = exports.GetRecoveryInfoRequest = exports.GetInfoResponse = exports.GetInfoRequest = exports.PeerEvent = exports.PeerEventSubscription = exports.ListPeersResponse = exports.ListPeersRequest = exports.TimestampedError = exports.Peer = exports.ClosedChannelsResponse = exports.ClosedChannelsRequest = exports.Resolution = exports.ChannelCloseSummary = exports.ListChannelsResponse = exports.ListChannelsRequest = exports.Channel = exports.ChannelConstraints = void 0;
exports.DeleteAllPaymentsResponse = exports.DeleteAllPaymentsRequest = exports.ListPaymentsResponse = exports.ListPaymentsRequest = exports.HTLCAttempt = exports.Payment = exports.InvoiceSubscription = exports.ListInvoiceResponse = exports.ListInvoiceRequest = exports.PaymentHash = exports.AddInvoiceResponse = exports.AMP = exports.InvoiceHTLC = exports.Invoice = exports.RouteHint = exports.HopHint = exports.ClosedChannelUpdate = exports.ChannelEdgeUpdate = exports.NodeUpdate = exports.GraphTopologyUpdate = exports.GraphTopologySubscription = exports.StopResponse = exports.StopRequest = exports.NetworkInfo = exports.NetworkInfoRequest = exports.ChanInfoRequest = exports.FloatMetric = exports.NodeMetricsResponse = exports.NodeMetricsRequest = exports.ChannelGraph = exports.ChannelGraphRequest = exports.ChannelEdge = exports.RoutingPolicy = exports.NodeAddress = exports.LightningNode = exports.NodeInfo = exports.NodeInfoRequest = exports.Route = exports.AMPRecord = exports.MPPRecord = exports.Hop = exports.QueryRoutesResponse = exports.EdgeLocator = exports.NodePair = exports.QueryRoutesRequest = exports.ChannelBalanceResponse = exports.ChannelBalanceRequest = exports.Amount = exports.WalletBalanceResponse = exports.WalletBalanceRequest = void 0;
exports.Lightning = exports.Op = exports.MacaroonId = exports.ChannelUpdate = exports.Failure = exports.ListPermissionsResponse = exports.ListPermissionsRequest = exports.MacaroonPermissionList = exports.DeleteMacaroonIDResponse = exports.DeleteMacaroonIDRequest = exports.ListMacaroonIDsResponse = exports.ListMacaroonIDsRequest = exports.BakeMacaroonResponse = exports.BakeMacaroonRequest = exports.MacaroonPermission = exports.VerifyChanBackupResponse = exports.ChannelBackupSubscription = exports.RestoreBackupResponse = exports.RestoreChanBackupRequest = exports.ChannelBackups = exports.ChanBackupSnapshot = exports.ChanBackupExportRequest = exports.MultiChanBackup = exports.ChannelBackup = exports.ExportChannelBackupRequest = exports.ForwardingHistoryResponse = exports.ForwardingEvent = exports.ForwardingHistoryRequest = exports.PolicyUpdateResponse = exports.PolicyUpdateRequest = exports.FeeReportResponse = exports.ChannelFeeReport = exports.FeeReportRequest = exports.Feature = exports.PayReq = exports.PayReqString = exports.DebugLevelResponse = exports.DebugLevelRequest = exports.AbandonChannelResponse = exports.AbandonChannelRequest = void 0;
// @generated by protobuf-ts 2.5.0 with parameter long_type_string
// @generated from protobuf file "rpc.proto" (package "lnrpc", syntax proto3)
// tslint:disable
const runtime_rpc_1 = require("@protobuf-ts/runtime-rpc");
const runtime_1 = require("@protobuf-ts/runtime");
const runtime_2 = require("@protobuf-ts/runtime");
const runtime_3 = require("@protobuf-ts/runtime");
const runtime_4 = require("@protobuf-ts/runtime");
const runtime_5 = require("@protobuf-ts/runtime");
/**
 * @generated from protobuf enum lnrpc.ChannelCloseSummary.ClosureType
 */
var ChannelCloseSummary_ClosureType;
(function (ChannelCloseSummary_ClosureType) {
    /**
     * @generated from protobuf enum value: COOPERATIVE_CLOSE = 0;
     */
    ChannelCloseSummary_ClosureType[ChannelCloseSummary_ClosureType["COOPERATIVE_CLOSE"] = 0] = "COOPERATIVE_CLOSE";
    /**
     * @generated from protobuf enum value: LOCAL_FORCE_CLOSE = 1;
     */
    ChannelCloseSummary_ClosureType[ChannelCloseSummary_ClosureType["LOCAL_FORCE_CLOSE"] = 1] = "LOCAL_FORCE_CLOSE";
    /**
     * @generated from protobuf enum value: REMOTE_FORCE_CLOSE = 2;
     */
    ChannelCloseSummary_ClosureType[ChannelCloseSummary_ClosureType["REMOTE_FORCE_CLOSE"] = 2] = "REMOTE_FORCE_CLOSE";
    /**
     * @generated from protobuf enum value: BREACH_CLOSE = 3;
     */
    ChannelCloseSummary_ClosureType[ChannelCloseSummary_ClosureType["BREACH_CLOSE"] = 3] = "BREACH_CLOSE";
    /**
     * @generated from protobuf enum value: FUNDING_CANCELED = 4;
     */
    ChannelCloseSummary_ClosureType[ChannelCloseSummary_ClosureType["FUNDING_CANCELED"] = 4] = "FUNDING_CANCELED";
    /**
     * @generated from protobuf enum value: ABANDONED = 5;
     */
    ChannelCloseSummary_ClosureType[ChannelCloseSummary_ClosureType["ABANDONED"] = 5] = "ABANDONED";
})(ChannelCloseSummary_ClosureType = exports.ChannelCloseSummary_ClosureType || (exports.ChannelCloseSummary_ClosureType = {}));
/**
 * @generated from protobuf enum lnrpc.Peer.SyncType
 */
var Peer_SyncType;
(function (Peer_SyncType) {
    /**
     *
     * Denotes that we cannot determine the peer's current sync type.
     *
     * @generated from protobuf enum value: UNKNOWN_SYNC = 0;
     */
    Peer_SyncType[Peer_SyncType["UNKNOWN_SYNC"] = 0] = "UNKNOWN_SYNC";
    /**
     *
     * Denotes that we are actively receiving new graph updates from the peer.
     *
     * @generated from protobuf enum value: ACTIVE_SYNC = 1;
     */
    Peer_SyncType[Peer_SyncType["ACTIVE_SYNC"] = 1] = "ACTIVE_SYNC";
    /**
     *
     * Denotes that we are not receiving new graph updates from the peer.
     *
     * @generated from protobuf enum value: PASSIVE_SYNC = 2;
     */
    Peer_SyncType[Peer_SyncType["PASSIVE_SYNC"] = 2] = "PASSIVE_SYNC";
    /**
     *
     * Denotes that this peer is pinned into an active sync.
     *
     * @generated from protobuf enum value: PINNED_SYNC = 3;
     */
    Peer_SyncType[Peer_SyncType["PINNED_SYNC"] = 3] = "PINNED_SYNC";
})(Peer_SyncType = exports.Peer_SyncType || (exports.Peer_SyncType = {}));
/**
 * @generated from protobuf enum lnrpc.PeerEvent.EventType
 */
var PeerEvent_EventType;
(function (PeerEvent_EventType) {
    /**
     * @generated from protobuf enum value: PEER_ONLINE = 0;
     */
    PeerEvent_EventType[PeerEvent_EventType["PEER_ONLINE"] = 0] = "PEER_ONLINE";
    /**
     * @generated from protobuf enum value: PEER_OFFLINE = 1;
     */
    PeerEvent_EventType[PeerEvent_EventType["PEER_OFFLINE"] = 1] = "PEER_OFFLINE";
})(PeerEvent_EventType = exports.PeerEvent_EventType || (exports.PeerEvent_EventType = {}));
/**
 * @generated from protobuf enum lnrpc.PendingChannelsResponse.ForceClosedChannel.AnchorState
 */
var PendingChannelsResponse_ForceClosedChannel_AnchorState;
(function (PendingChannelsResponse_ForceClosedChannel_AnchorState) {
    /**
     * @generated from protobuf enum value: LIMBO = 0;
     */
    PendingChannelsResponse_ForceClosedChannel_AnchorState[PendingChannelsResponse_ForceClosedChannel_AnchorState["LIMBO"] = 0] = "LIMBO";
    /**
     * @generated from protobuf enum value: RECOVERED = 1;
     */
    PendingChannelsResponse_ForceClosedChannel_AnchorState[PendingChannelsResponse_ForceClosedChannel_AnchorState["RECOVERED"] = 1] = "RECOVERED";
    /**
     * @generated from protobuf enum value: LOST = 2;
     */
    PendingChannelsResponse_ForceClosedChannel_AnchorState[PendingChannelsResponse_ForceClosedChannel_AnchorState["LOST"] = 2] = "LOST";
})(PendingChannelsResponse_ForceClosedChannel_AnchorState = exports.PendingChannelsResponse_ForceClosedChannel_AnchorState || (exports.PendingChannelsResponse_ForceClosedChannel_AnchorState = {}));
/**
 * @generated from protobuf enum lnrpc.ChannelEventUpdate.UpdateType
 */
var ChannelEventUpdate_UpdateType;
(function (ChannelEventUpdate_UpdateType) {
    /**
     * @generated from protobuf enum value: OPEN_CHANNEL = 0;
     */
    ChannelEventUpdate_UpdateType[ChannelEventUpdate_UpdateType["OPEN_CHANNEL"] = 0] = "OPEN_CHANNEL";
    /**
     * @generated from protobuf enum value: CLOSED_CHANNEL = 1;
     */
    ChannelEventUpdate_UpdateType[ChannelEventUpdate_UpdateType["CLOSED_CHANNEL"] = 1] = "CLOSED_CHANNEL";
    /**
     * @generated from protobuf enum value: ACTIVE_CHANNEL = 2;
     */
    ChannelEventUpdate_UpdateType[ChannelEventUpdate_UpdateType["ACTIVE_CHANNEL"] = 2] = "ACTIVE_CHANNEL";
    /**
     * @generated from protobuf enum value: INACTIVE_CHANNEL = 3;
     */
    ChannelEventUpdate_UpdateType[ChannelEventUpdate_UpdateType["INACTIVE_CHANNEL"] = 3] = "INACTIVE_CHANNEL";
    /**
     * @generated from protobuf enum value: PENDING_OPEN_CHANNEL = 4;
     */
    ChannelEventUpdate_UpdateType[ChannelEventUpdate_UpdateType["PENDING_OPEN_CHANNEL"] = 4] = "PENDING_OPEN_CHANNEL";
})(ChannelEventUpdate_UpdateType = exports.ChannelEventUpdate_UpdateType || (exports.ChannelEventUpdate_UpdateType = {}));
/**
 * @generated from protobuf enum lnrpc.Invoice.InvoiceState
 */
var Invoice_InvoiceState;
(function (Invoice_InvoiceState) {
    /**
     * @generated from protobuf enum value: OPEN = 0;
     */
    Invoice_InvoiceState[Invoice_InvoiceState["OPEN"] = 0] = "OPEN";
    /**
     * @generated from protobuf enum value: SETTLED = 1;
     */
    Invoice_InvoiceState[Invoice_InvoiceState["SETTLED"] = 1] = "SETTLED";
    /**
     * @generated from protobuf enum value: CANCELED = 2;
     */
    Invoice_InvoiceState[Invoice_InvoiceState["CANCELED"] = 2] = "CANCELED";
    /**
     * @generated from protobuf enum value: ACCEPTED = 3;
     */
    Invoice_InvoiceState[Invoice_InvoiceState["ACCEPTED"] = 3] = "ACCEPTED";
})(Invoice_InvoiceState = exports.Invoice_InvoiceState || (exports.Invoice_InvoiceState = {}));
/**
 * @generated from protobuf enum lnrpc.Payment.PaymentStatus
 */
var Payment_PaymentStatus;
(function (Payment_PaymentStatus) {
    /**
     * @generated from protobuf enum value: UNKNOWN = 0;
     */
    Payment_PaymentStatus[Payment_PaymentStatus["UNKNOWN"] = 0] = "UNKNOWN";
    /**
     * @generated from protobuf enum value: IN_FLIGHT = 1;
     */
    Payment_PaymentStatus[Payment_PaymentStatus["IN_FLIGHT"] = 1] = "IN_FLIGHT";
    /**
     * @generated from protobuf enum value: SUCCEEDED = 2;
     */
    Payment_PaymentStatus[Payment_PaymentStatus["SUCCEEDED"] = 2] = "SUCCEEDED";
    /**
     * @generated from protobuf enum value: FAILED = 3;
     */
    Payment_PaymentStatus[Payment_PaymentStatus["FAILED"] = 3] = "FAILED";
})(Payment_PaymentStatus = exports.Payment_PaymentStatus || (exports.Payment_PaymentStatus = {}));
/**
 * @generated from protobuf enum lnrpc.HTLCAttempt.HTLCStatus
 */
var HTLCAttempt_HTLCStatus;
(function (HTLCAttempt_HTLCStatus) {
    /**
     * @generated from protobuf enum value: IN_FLIGHT = 0;
     */
    HTLCAttempt_HTLCStatus[HTLCAttempt_HTLCStatus["IN_FLIGHT"] = 0] = "IN_FLIGHT";
    /**
     * @generated from protobuf enum value: SUCCEEDED = 1;
     */
    HTLCAttempt_HTLCStatus[HTLCAttempt_HTLCStatus["SUCCEEDED"] = 1] = "SUCCEEDED";
    /**
     * @generated from protobuf enum value: FAILED = 2;
     */
    HTLCAttempt_HTLCStatus[HTLCAttempt_HTLCStatus["FAILED"] = 2] = "FAILED";
})(HTLCAttempt_HTLCStatus = exports.HTLCAttempt_HTLCStatus || (exports.HTLCAttempt_HTLCStatus = {}));
/**
 * @generated from protobuf enum lnrpc.Failure.FailureCode
 */
var Failure_FailureCode;
(function (Failure_FailureCode) {
    /**
     *
     * The numbers assigned in this enumeration match the failure codes as
     * defined in BOLT #4. Because protobuf 3 requires enums to start with 0,
     * a RESERVED value is added.
     *
     * @generated from protobuf enum value: RESERVED = 0;
     */
    Failure_FailureCode[Failure_FailureCode["RESERVED"] = 0] = "RESERVED";
    /**
     * @generated from protobuf enum value: INCORRECT_OR_UNKNOWN_PAYMENT_DETAILS = 1;
     */
    Failure_FailureCode[Failure_FailureCode["INCORRECT_OR_UNKNOWN_PAYMENT_DETAILS"] = 1] = "INCORRECT_OR_UNKNOWN_PAYMENT_DETAILS";
    /**
     * @generated from protobuf enum value: INCORRECT_PAYMENT_AMOUNT = 2;
     */
    Failure_FailureCode[Failure_FailureCode["INCORRECT_PAYMENT_AMOUNT"] = 2] = "INCORRECT_PAYMENT_AMOUNT";
    /**
     * @generated from protobuf enum value: FINAL_INCORRECT_CLTV_EXPIRY = 3;
     */
    Failure_FailureCode[Failure_FailureCode["FINAL_INCORRECT_CLTV_EXPIRY"] = 3] = "FINAL_INCORRECT_CLTV_EXPIRY";
    /**
     * @generated from protobuf enum value: FINAL_INCORRECT_HTLC_AMOUNT = 4;
     */
    Failure_FailureCode[Failure_FailureCode["FINAL_INCORRECT_HTLC_AMOUNT"] = 4] = "FINAL_INCORRECT_HTLC_AMOUNT";
    /**
     * @generated from protobuf enum value: FINAL_EXPIRY_TOO_SOON = 5;
     */
    Failure_FailureCode[Failure_FailureCode["FINAL_EXPIRY_TOO_SOON"] = 5] = "FINAL_EXPIRY_TOO_SOON";
    /**
     * @generated from protobuf enum value: INVALID_REALM = 6;
     */
    Failure_FailureCode[Failure_FailureCode["INVALID_REALM"] = 6] = "INVALID_REALM";
    /**
     * @generated from protobuf enum value: EXPIRY_TOO_SOON = 7;
     */
    Failure_FailureCode[Failure_FailureCode["EXPIRY_TOO_SOON"] = 7] = "EXPIRY_TOO_SOON";
    /**
     * @generated from protobuf enum value: INVALID_ONION_VERSION = 8;
     */
    Failure_FailureCode[Failure_FailureCode["INVALID_ONION_VERSION"] = 8] = "INVALID_ONION_VERSION";
    /**
     * @generated from protobuf enum value: INVALID_ONION_HMAC = 9;
     */
    Failure_FailureCode[Failure_FailureCode["INVALID_ONION_HMAC"] = 9] = "INVALID_ONION_HMAC";
    /**
     * @generated from protobuf enum value: INVALID_ONION_KEY = 10;
     */
    Failure_FailureCode[Failure_FailureCode["INVALID_ONION_KEY"] = 10] = "INVALID_ONION_KEY";
    /**
     * @generated from protobuf enum value: AMOUNT_BELOW_MINIMUM = 11;
     */
    Failure_FailureCode[Failure_FailureCode["AMOUNT_BELOW_MINIMUM"] = 11] = "AMOUNT_BELOW_MINIMUM";
    /**
     * @generated from protobuf enum value: FEE_INSUFFICIENT = 12;
     */
    Failure_FailureCode[Failure_FailureCode["FEE_INSUFFICIENT"] = 12] = "FEE_INSUFFICIENT";
    /**
     * @generated from protobuf enum value: INCORRECT_CLTV_EXPIRY = 13;
     */
    Failure_FailureCode[Failure_FailureCode["INCORRECT_CLTV_EXPIRY"] = 13] = "INCORRECT_CLTV_EXPIRY";
    /**
     * @generated from protobuf enum value: CHANNEL_DISABLED = 14;
     */
    Failure_FailureCode[Failure_FailureCode["CHANNEL_DISABLED"] = 14] = "CHANNEL_DISABLED";
    /**
     * @generated from protobuf enum value: TEMPORARY_CHANNEL_FAILURE = 15;
     */
    Failure_FailureCode[Failure_FailureCode["TEMPORARY_CHANNEL_FAILURE"] = 15] = "TEMPORARY_CHANNEL_FAILURE";
    /**
     * @generated from protobuf enum value: REQUIRED_NODE_FEATURE_MISSING = 16;
     */
    Failure_FailureCode[Failure_FailureCode["REQUIRED_NODE_FEATURE_MISSING"] = 16] = "REQUIRED_NODE_FEATURE_MISSING";
    /**
     * @generated from protobuf enum value: REQUIRED_CHANNEL_FEATURE_MISSING = 17;
     */
    Failure_FailureCode[Failure_FailureCode["REQUIRED_CHANNEL_FEATURE_MISSING"] = 17] = "REQUIRED_CHANNEL_FEATURE_MISSING";
    /**
     * @generated from protobuf enum value: UNKNOWN_NEXT_PEER = 18;
     */
    Failure_FailureCode[Failure_FailureCode["UNKNOWN_NEXT_PEER"] = 18] = "UNKNOWN_NEXT_PEER";
    /**
     * @generated from protobuf enum value: TEMPORARY_NODE_FAILURE = 19;
     */
    Failure_FailureCode[Failure_FailureCode["TEMPORARY_NODE_FAILURE"] = 19] = "TEMPORARY_NODE_FAILURE";
    /**
     * @generated from protobuf enum value: PERMANENT_NODE_FAILURE = 20;
     */
    Failure_FailureCode[Failure_FailureCode["PERMANENT_NODE_FAILURE"] = 20] = "PERMANENT_NODE_FAILURE";
    /**
     * @generated from protobuf enum value: PERMANENT_CHANNEL_FAILURE = 21;
     */
    Failure_FailureCode[Failure_FailureCode["PERMANENT_CHANNEL_FAILURE"] = 21] = "PERMANENT_CHANNEL_FAILURE";
    /**
     * @generated from protobuf enum value: EXPIRY_TOO_FAR = 22;
     */
    Failure_FailureCode[Failure_FailureCode["EXPIRY_TOO_FAR"] = 22] = "EXPIRY_TOO_FAR";
    /**
     * @generated from protobuf enum value: MPP_TIMEOUT = 23;
     */
    Failure_FailureCode[Failure_FailureCode["MPP_TIMEOUT"] = 23] = "MPP_TIMEOUT";
    /**
     * @generated from protobuf enum value: INVALID_ONION_PAYLOAD = 24;
     */
    Failure_FailureCode[Failure_FailureCode["INVALID_ONION_PAYLOAD"] = 24] = "INVALID_ONION_PAYLOAD";
    /**
     *
     * An internal error occurred.
     *
     * @generated from protobuf enum value: INTERNAL_FAILURE = 997;
     */
    Failure_FailureCode[Failure_FailureCode["INTERNAL_FAILURE"] = 997] = "INTERNAL_FAILURE";
    /**
     *
     * The error source is known, but the failure itself couldn't be decoded.
     *
     * @generated from protobuf enum value: UNKNOWN_FAILURE = 998;
     */
    Failure_FailureCode[Failure_FailureCode["UNKNOWN_FAILURE"] = 998] = "UNKNOWN_FAILURE";
    /**
     *
     * An unreadable failure result is returned if the received failure message
     * cannot be decrypted. In that case the error source is unknown.
     *
     * @generated from protobuf enum value: UNREADABLE_FAILURE = 999;
     */
    Failure_FailureCode[Failure_FailureCode["UNREADABLE_FAILURE"] = 999] = "UNREADABLE_FAILURE";
})(Failure_FailureCode = exports.Failure_FailureCode || (exports.Failure_FailureCode = {}));
/**
 *
 * `AddressType` has to be one of:
 *
 * - `p2wkh`: Pay to witness key hash (`WITNESS_PUBKEY_HASH` = 0)
 * - `np2wkh`: Pay to nested witness key hash (`NESTED_PUBKEY_HASH` = 1)
 *
 * @generated from protobuf enum lnrpc.AddressType
 */
var AddressType;
(function (AddressType) {
    /**
     * @generated from protobuf enum value: WITNESS_PUBKEY_HASH = 0;
     */
    AddressType[AddressType["WITNESS_PUBKEY_HASH"] = 0] = "WITNESS_PUBKEY_HASH";
    /**
     * @generated from protobuf enum value: NESTED_PUBKEY_HASH = 1;
     */
    AddressType[AddressType["NESTED_PUBKEY_HASH"] = 1] = "NESTED_PUBKEY_HASH";
    /**
     * @generated from protobuf enum value: UNUSED_WITNESS_PUBKEY_HASH = 2;
     */
    AddressType[AddressType["UNUSED_WITNESS_PUBKEY_HASH"] = 2] = "UNUSED_WITNESS_PUBKEY_HASH";
    /**
     * @generated from protobuf enum value: UNUSED_NESTED_PUBKEY_HASH = 3;
     */
    AddressType[AddressType["UNUSED_NESTED_PUBKEY_HASH"] = 3] = "UNUSED_NESTED_PUBKEY_HASH";
})(AddressType = exports.AddressType || (exports.AddressType = {}));
/**
 * @generated from protobuf enum lnrpc.CommitmentType
 */
var CommitmentType;
(function (CommitmentType) {
    /**
     *
     * A channel using the legacy commitment format having tweaked to_remote
     * keys.
     *
     * @generated from protobuf enum value: LEGACY = 0;
     */
    CommitmentType[CommitmentType["LEGACY"] = 0] = "LEGACY";
    /**
     *
     * A channel that uses the modern commitment format where the key in the
     * output of the remote party does not change each state. This makes back
     * up and recovery easier as when the channel is closed, the funds go
     * directly to that key.
     *
     * @generated from protobuf enum value: STATIC_REMOTE_KEY = 1;
     */
    CommitmentType[CommitmentType["STATIC_REMOTE_KEY"] = 1] = "STATIC_REMOTE_KEY";
    /**
     *
     * A channel that uses a commitment format that has anchor outputs on the
     * commitments, allowing fee bumping after a force close transaction has
     * been broadcast.
     *
     * @generated from protobuf enum value: ANCHORS = 2;
     */
    CommitmentType[CommitmentType["ANCHORS"] = 2] = "ANCHORS";
    /**
     *
     * Returned when the commitment type isn't known or unavailable.
     *
     * @generated from protobuf enum value: UNKNOWN_COMMITMENT_TYPE = 999;
     */
    CommitmentType[CommitmentType["UNKNOWN_COMMITMENT_TYPE"] = 999] = "UNKNOWN_COMMITMENT_TYPE";
})(CommitmentType = exports.CommitmentType || (exports.CommitmentType = {}));
/**
 * @generated from protobuf enum lnrpc.Initiator
 */
var Initiator;
(function (Initiator) {
    /**
     * @generated from protobuf enum value: INITIATOR_UNKNOWN = 0;
     */
    Initiator[Initiator["UNKNOWN"] = 0] = "UNKNOWN";
    /**
     * @generated from protobuf enum value: INITIATOR_LOCAL = 1;
     */
    Initiator[Initiator["LOCAL"] = 1] = "LOCAL";
    /**
     * @generated from protobuf enum value: INITIATOR_REMOTE = 2;
     */
    Initiator[Initiator["REMOTE"] = 2] = "REMOTE";
    /**
     * @generated from protobuf enum value: INITIATOR_BOTH = 3;
     */
    Initiator[Initiator["BOTH"] = 3] = "BOTH";
})(Initiator = exports.Initiator || (exports.Initiator = {}));
/**
 * @generated from protobuf enum lnrpc.ResolutionType
 */
var ResolutionType;
(function (ResolutionType) {
    /**
     * @generated from protobuf enum value: TYPE_UNKNOWN = 0;
     */
    ResolutionType[ResolutionType["TYPE_UNKNOWN"] = 0] = "TYPE_UNKNOWN";
    /**
     * We resolved an anchor output.
     *
     * @generated from protobuf enum value: ANCHOR = 1;
     */
    ResolutionType[ResolutionType["ANCHOR"] = 1] = "ANCHOR";
    /**
     *
     * We are resolving an incoming htlc on chain. This if this htlc is
     * claimed, we swept the incoming htlc with the preimage. If it is timed
     * out, our peer swept the timeout path.
     *
     * @generated from protobuf enum value: INCOMING_HTLC = 2;
     */
    ResolutionType[ResolutionType["INCOMING_HTLC"] = 2] = "INCOMING_HTLC";
    /**
     *
     * We are resolving an outgoing htlc on chain. If this htlc is claimed,
     * the remote party swept the htlc with the preimage. If it is timed out,
     * we swept it with the timeout path.
     *
     * @generated from protobuf enum value: OUTGOING_HTLC = 3;
     */
    ResolutionType[ResolutionType["OUTGOING_HTLC"] = 3] = "OUTGOING_HTLC";
    /**
     * We force closed and need to sweep our time locked commitment output.
     *
     * @generated from protobuf enum value: COMMIT = 4;
     */
    ResolutionType[ResolutionType["COMMIT"] = 4] = "COMMIT";
})(ResolutionType = exports.ResolutionType || (exports.ResolutionType = {}));
/**
 * @generated from protobuf enum lnrpc.ResolutionOutcome
 */
var ResolutionOutcome;
(function (ResolutionOutcome) {
    /**
     * Outcome unknown.
     *
     * @generated from protobuf enum value: OUTCOME_UNKNOWN = 0;
     */
    ResolutionOutcome[ResolutionOutcome["OUTCOME_UNKNOWN"] = 0] = "OUTCOME_UNKNOWN";
    /**
     * An output was claimed on chain.
     *
     * @generated from protobuf enum value: CLAIMED = 1;
     */
    ResolutionOutcome[ResolutionOutcome["CLAIMED"] = 1] = "CLAIMED";
    /**
     * An output was left unclaimed on chain.
     *
     * @generated from protobuf enum value: UNCLAIMED = 2;
     */
    ResolutionOutcome[ResolutionOutcome["UNCLAIMED"] = 2] = "UNCLAIMED";
    /**
     *
     * ResolverOutcomeAbandoned indicates that an output that we did not
     * claim on chain, for example an anchor that we did not sweep and a
     * third party claimed on chain, or a htlc that we could not decode
     * so left unclaimed.
     *
     * @generated from protobuf enum value: ABANDONED = 3;
     */
    ResolutionOutcome[ResolutionOutcome["ABANDONED"] = 3] = "ABANDONED";
    /**
     *
     * If we force closed our channel, our htlcs need to be claimed in two
     * stages. This outcome represents the broadcast of a timeout or success
     * transaction for this two stage htlc claim.
     *
     * @generated from protobuf enum value: FIRST_STAGE = 4;
     */
    ResolutionOutcome[ResolutionOutcome["FIRST_STAGE"] = 4] = "FIRST_STAGE";
    /**
     * A htlc was timed out on chain.
     *
     * @generated from protobuf enum value: TIMEOUT = 5;
     */
    ResolutionOutcome[ResolutionOutcome["TIMEOUT"] = 5] = "TIMEOUT";
})(ResolutionOutcome = exports.ResolutionOutcome || (exports.ResolutionOutcome = {}));
/**
 * @generated from protobuf enum lnrpc.NodeMetricType
 */
var NodeMetricType;
(function (NodeMetricType) {
    /**
     * @generated from protobuf enum value: UNKNOWN = 0;
     */
    NodeMetricType[NodeMetricType["UNKNOWN"] = 0] = "UNKNOWN";
    /**
     * @generated from protobuf enum value: BETWEENNESS_CENTRALITY = 1;
     */
    NodeMetricType[NodeMetricType["BETWEENNESS_CENTRALITY"] = 1] = "BETWEENNESS_CENTRALITY";
})(NodeMetricType = exports.NodeMetricType || (exports.NodeMetricType = {}));
/**
 * @generated from protobuf enum lnrpc.InvoiceHTLCState
 */
var InvoiceHTLCState;
(function (InvoiceHTLCState) {
    /**
     * @generated from protobuf enum value: ACCEPTED = 0;
     */
    InvoiceHTLCState[InvoiceHTLCState["ACCEPTED"] = 0] = "ACCEPTED";
    /**
     * @generated from protobuf enum value: SETTLED = 1;
     */
    InvoiceHTLCState[InvoiceHTLCState["SETTLED"] = 1] = "SETTLED";
    /**
     * @generated from protobuf enum value: CANCELED = 2;
     */
    InvoiceHTLCState[InvoiceHTLCState["CANCELED"] = 2] = "CANCELED";
})(InvoiceHTLCState = exports.InvoiceHTLCState || (exports.InvoiceHTLCState = {}));
/**
 * @generated from protobuf enum lnrpc.PaymentFailureReason
 */
var PaymentFailureReason;
(function (PaymentFailureReason) {
    /**
     *
     * Payment isn't failed (yet).
     *
     * @generated from protobuf enum value: FAILURE_REASON_NONE = 0;
     */
    PaymentFailureReason[PaymentFailureReason["FAILURE_REASON_NONE"] = 0] = "FAILURE_REASON_NONE";
    /**
     *
     * There are more routes to try, but the payment timeout was exceeded.
     *
     * @generated from protobuf enum value: FAILURE_REASON_TIMEOUT = 1;
     */
    PaymentFailureReason[PaymentFailureReason["FAILURE_REASON_TIMEOUT"] = 1] = "FAILURE_REASON_TIMEOUT";
    /**
     *
     * All possible routes were tried and failed permanently. Or were no
     * routes to the destination at all.
     *
     * @generated from protobuf enum value: FAILURE_REASON_NO_ROUTE = 2;
     */
    PaymentFailureReason[PaymentFailureReason["FAILURE_REASON_NO_ROUTE"] = 2] = "FAILURE_REASON_NO_ROUTE";
    /**
     *
     * A non-recoverable error has occured.
     *
     * @generated from protobuf enum value: FAILURE_REASON_ERROR = 3;
     */
    PaymentFailureReason[PaymentFailureReason["FAILURE_REASON_ERROR"] = 3] = "FAILURE_REASON_ERROR";
    /**
     *
     * Payment details incorrect (unknown hash, invalid amt or
     * invalid final cltv delta)
     *
     * @generated from protobuf enum value: FAILURE_REASON_INCORRECT_PAYMENT_DETAILS = 4;
     */
    PaymentFailureReason[PaymentFailureReason["FAILURE_REASON_INCORRECT_PAYMENT_DETAILS"] = 4] = "FAILURE_REASON_INCORRECT_PAYMENT_DETAILS";
    /**
     *
     * Insufficient local balance.
     *
     * @generated from protobuf enum value: FAILURE_REASON_INSUFFICIENT_BALANCE = 5;
     */
    PaymentFailureReason[PaymentFailureReason["FAILURE_REASON_INSUFFICIENT_BALANCE"] = 5] = "FAILURE_REASON_INSUFFICIENT_BALANCE";
})(PaymentFailureReason = exports.PaymentFailureReason || (exports.PaymentFailureReason = {}));
/**
 * @generated from protobuf enum lnrpc.FeatureBit
 */
var FeatureBit;
(function (FeatureBit) {
    /**
     * @generated from protobuf enum value: DATALOSS_PROTECT_REQ = 0;
     */
    FeatureBit[FeatureBit["DATALOSS_PROTECT_REQ"] = 0] = "DATALOSS_PROTECT_REQ";
    /**
     * @generated from protobuf enum value: DATALOSS_PROTECT_OPT = 1;
     */
    FeatureBit[FeatureBit["DATALOSS_PROTECT_OPT"] = 1] = "DATALOSS_PROTECT_OPT";
    /**
     * @generated from protobuf enum value: INITIAL_ROUING_SYNC = 3;
     */
    FeatureBit[FeatureBit["INITIAL_ROUING_SYNC"] = 3] = "INITIAL_ROUING_SYNC";
    /**
     * @generated from protobuf enum value: UPFRONT_SHUTDOWN_SCRIPT_REQ = 4;
     */
    FeatureBit[FeatureBit["UPFRONT_SHUTDOWN_SCRIPT_REQ"] = 4] = "UPFRONT_SHUTDOWN_SCRIPT_REQ";
    /**
     * @generated from protobuf enum value: UPFRONT_SHUTDOWN_SCRIPT_OPT = 5;
     */
    FeatureBit[FeatureBit["UPFRONT_SHUTDOWN_SCRIPT_OPT"] = 5] = "UPFRONT_SHUTDOWN_SCRIPT_OPT";
    /**
     * @generated from protobuf enum value: GOSSIP_QUERIES_REQ = 6;
     */
    FeatureBit[FeatureBit["GOSSIP_QUERIES_REQ"] = 6] = "GOSSIP_QUERIES_REQ";
    /**
     * @generated from protobuf enum value: GOSSIP_QUERIES_OPT = 7;
     */
    FeatureBit[FeatureBit["GOSSIP_QUERIES_OPT"] = 7] = "GOSSIP_QUERIES_OPT";
    /**
     * @generated from protobuf enum value: TLV_ONION_REQ = 8;
     */
    FeatureBit[FeatureBit["TLV_ONION_REQ"] = 8] = "TLV_ONION_REQ";
    /**
     * @generated from protobuf enum value: TLV_ONION_OPT = 9;
     */
    FeatureBit[FeatureBit["TLV_ONION_OPT"] = 9] = "TLV_ONION_OPT";
    /**
     * @generated from protobuf enum value: EXT_GOSSIP_QUERIES_REQ = 10;
     */
    FeatureBit[FeatureBit["EXT_GOSSIP_QUERIES_REQ"] = 10] = "EXT_GOSSIP_QUERIES_REQ";
    /**
     * @generated from protobuf enum value: EXT_GOSSIP_QUERIES_OPT = 11;
     */
    FeatureBit[FeatureBit["EXT_GOSSIP_QUERIES_OPT"] = 11] = "EXT_GOSSIP_QUERIES_OPT";
    /**
     * @generated from protobuf enum value: STATIC_REMOTE_KEY_REQ = 12;
     */
    FeatureBit[FeatureBit["STATIC_REMOTE_KEY_REQ"] = 12] = "STATIC_REMOTE_KEY_REQ";
    /**
     * @generated from protobuf enum value: STATIC_REMOTE_KEY_OPT = 13;
     */
    FeatureBit[FeatureBit["STATIC_REMOTE_KEY_OPT"] = 13] = "STATIC_REMOTE_KEY_OPT";
    /**
     * @generated from protobuf enum value: PAYMENT_ADDR_REQ = 14;
     */
    FeatureBit[FeatureBit["PAYMENT_ADDR_REQ"] = 14] = "PAYMENT_ADDR_REQ";
    /**
     * @generated from protobuf enum value: PAYMENT_ADDR_OPT = 15;
     */
    FeatureBit[FeatureBit["PAYMENT_ADDR_OPT"] = 15] = "PAYMENT_ADDR_OPT";
    /**
     * @generated from protobuf enum value: MPP_REQ = 16;
     */
    FeatureBit[FeatureBit["MPP_REQ"] = 16] = "MPP_REQ";
    /**
     * @generated from protobuf enum value: MPP_OPT = 17;
     */
    FeatureBit[FeatureBit["MPP_OPT"] = 17] = "MPP_OPT";
    /**
     * @generated from protobuf enum value: WUMBO_CHANNELS_REQ = 18;
     */
    FeatureBit[FeatureBit["WUMBO_CHANNELS_REQ"] = 18] = "WUMBO_CHANNELS_REQ";
    /**
     * @generated from protobuf enum value: WUMBO_CHANNELS_OPT = 19;
     */
    FeatureBit[FeatureBit["WUMBO_CHANNELS_OPT"] = 19] = "WUMBO_CHANNELS_OPT";
    /**
     * @generated from protobuf enum value: ANCHORS_REQ = 20;
     */
    FeatureBit[FeatureBit["ANCHORS_REQ"] = 20] = "ANCHORS_REQ";
    /**
     * @generated from protobuf enum value: ANCHORS_OPT = 21;
     */
    FeatureBit[FeatureBit["ANCHORS_OPT"] = 21] = "ANCHORS_OPT";
    /**
     * @generated from protobuf enum value: ANCHORS_ZERO_FEE_HTLC_REQ = 22;
     */
    FeatureBit[FeatureBit["ANCHORS_ZERO_FEE_HTLC_REQ"] = 22] = "ANCHORS_ZERO_FEE_HTLC_REQ";
    /**
     * @generated from protobuf enum value: ANCHORS_ZERO_FEE_HTLC_OPT = 23;
     */
    FeatureBit[FeatureBit["ANCHORS_ZERO_FEE_HTLC_OPT"] = 23] = "ANCHORS_ZERO_FEE_HTLC_OPT";
    /**
     * @generated from protobuf enum value: AMP_REQ = 30;
     */
    FeatureBit[FeatureBit["AMP_REQ"] = 30] = "AMP_REQ";
    /**
     * @generated from protobuf enum value: AMP_OPT = 31;
     */
    FeatureBit[FeatureBit["AMP_OPT"] = 31] = "AMP_OPT";
})(FeatureBit = exports.FeatureBit || (exports.FeatureBit = {}));
// @generated message type with reflection information, may provide speed optimized methods
class Utxo$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.Utxo", [
            { no: 1, name: "address_type", kind: "enum", T: () => ["lnrpc.AddressType", AddressType] },
            { no: 2, name: "address", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "amount_sat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "pk_script", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 5, name: "outpoint", kind: "message", T: () => exports.OutPoint },
            { no: 6, name: "confirmations", kind: "scalar", T: 3 /*ScalarType.INT64*/ }
        ]);
    }
    create(value) {
        const message = { addressType: 0, address: "", amountSat: "0", pkScript: "", confirmations: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.AddressType address_type */ 1:
                    message.addressType = reader.int32();
                    break;
                case /* string address */ 2:
                    message.address = reader.string();
                    break;
                case /* int64 amount_sat */ 3:
                    message.amountSat = reader.int64().toString();
                    break;
                case /* string pk_script */ 4:
                    message.pkScript = reader.string();
                    break;
                case /* lnrpc.OutPoint outpoint */ 5:
                    message.outpoint = exports.OutPoint.internalBinaryRead(reader, reader.uint32(), options, message.outpoint);
                    break;
                case /* int64 confirmations */ 6:
                    message.confirmations = reader.int64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.AddressType address_type = 1; */
        if (message.addressType !== 0)
            writer.tag(1, runtime_1.WireType.Varint).int32(message.addressType);
        /* string address = 2; */
        if (message.address !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.address);
        /* int64 amount_sat = 3; */
        if (message.amountSat !== "0")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.amountSat);
        /* string pk_script = 4; */
        if (message.pkScript !== "")
            writer.tag(4, runtime_1.WireType.LengthDelimited).string(message.pkScript);
        /* lnrpc.OutPoint outpoint = 5; */
        if (message.outpoint)
            exports.OutPoint.internalBinaryWrite(message.outpoint, writer.tag(5, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* int64 confirmations = 6; */
        if (message.confirmations !== "0")
            writer.tag(6, runtime_1.WireType.Varint).int64(message.confirmations);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.Utxo
 */
exports.Utxo = new Utxo$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Transaction$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.Transaction", [
            { no: 1, name: "tx_hash", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "amount", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "num_confirmations", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 4, name: "block_hash", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 5, name: "block_height", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 6, name: "time_stamp", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 7, name: "total_fees", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 8, name: "dest_addresses", kind: "scalar", repeat: 2 /*RepeatType.UNPACKED*/, T: 9 /*ScalarType.STRING*/ },
            { no: 9, name: "raw_tx_hex", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 10, name: "label", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { txHash: "", amount: "0", numConfirmations: 0, blockHash: "", blockHeight: 0, timeStamp: "0", totalFees: "0", destAddresses: [], rawTxHex: "", label: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string tx_hash */ 1:
                    message.txHash = reader.string();
                    break;
                case /* int64 amount */ 2:
                    message.amount = reader.int64().toString();
                    break;
                case /* int32 num_confirmations */ 3:
                    message.numConfirmations = reader.int32();
                    break;
                case /* string block_hash */ 4:
                    message.blockHash = reader.string();
                    break;
                case /* int32 block_height */ 5:
                    message.blockHeight = reader.int32();
                    break;
                case /* int64 time_stamp */ 6:
                    message.timeStamp = reader.int64().toString();
                    break;
                case /* int64 total_fees */ 7:
                    message.totalFees = reader.int64().toString();
                    break;
                case /* repeated string dest_addresses */ 8:
                    message.destAddresses.push(reader.string());
                    break;
                case /* string raw_tx_hex */ 9:
                    message.rawTxHex = reader.string();
                    break;
                case /* string label */ 10:
                    message.label = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string tx_hash = 1; */
        if (message.txHash !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.txHash);
        /* int64 amount = 2; */
        if (message.amount !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.amount);
        /* int32 num_confirmations = 3; */
        if (message.numConfirmations !== 0)
            writer.tag(3, runtime_1.WireType.Varint).int32(message.numConfirmations);
        /* string block_hash = 4; */
        if (message.blockHash !== "")
            writer.tag(4, runtime_1.WireType.LengthDelimited).string(message.blockHash);
        /* int32 block_height = 5; */
        if (message.blockHeight !== 0)
            writer.tag(5, runtime_1.WireType.Varint).int32(message.blockHeight);
        /* int64 time_stamp = 6; */
        if (message.timeStamp !== "0")
            writer.tag(6, runtime_1.WireType.Varint).int64(message.timeStamp);
        /* int64 total_fees = 7; */
        if (message.totalFees !== "0")
            writer.tag(7, runtime_1.WireType.Varint).int64(message.totalFees);
        /* repeated string dest_addresses = 8; */
        for (let i = 0; i < message.destAddresses.length; i++)
            writer.tag(8, runtime_1.WireType.LengthDelimited).string(message.destAddresses[i]);
        /* string raw_tx_hex = 9; */
        if (message.rawTxHex !== "")
            writer.tag(9, runtime_1.WireType.LengthDelimited).string(message.rawTxHex);
        /* string label = 10; */
        if (message.label !== "")
            writer.tag(10, runtime_1.WireType.LengthDelimited).string(message.label);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.Transaction
 */
exports.Transaction = new Transaction$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetTransactionsRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.GetTransactionsRequest", [
            { no: 1, name: "start_height", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 2, name: "end_height", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 3, name: "account", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { startHeight: 0, endHeight: 0, account: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* int32 start_height */ 1:
                    message.startHeight = reader.int32();
                    break;
                case /* int32 end_height */ 2:
                    message.endHeight = reader.int32();
                    break;
                case /* string account */ 3:
                    message.account = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* int32 start_height = 1; */
        if (message.startHeight !== 0)
            writer.tag(1, runtime_1.WireType.Varint).int32(message.startHeight);
        /* int32 end_height = 2; */
        if (message.endHeight !== 0)
            writer.tag(2, runtime_1.WireType.Varint).int32(message.endHeight);
        /* string account = 3; */
        if (message.account !== "")
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.account);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.GetTransactionsRequest
 */
exports.GetTransactionsRequest = new GetTransactionsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class TransactionDetails$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.TransactionDetails", [
            { no: 1, name: "transactions", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.Transaction }
        ]);
    }
    create(value) {
        const message = { transactions: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.Transaction transactions */ 1:
                    message.transactions.push(exports.Transaction.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.Transaction transactions = 1; */
        for (let i = 0; i < message.transactions.length; i++)
            exports.Transaction.internalBinaryWrite(message.transactions[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.TransactionDetails
 */
exports.TransactionDetails = new TransactionDetails$Type();
// @generated message type with reflection information, may provide speed optimized methods
class FeeLimit$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.FeeLimit", [
            { no: 1, name: "fixed", kind: "scalar", oneof: "limit", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "fixed_msat", kind: "scalar", oneof: "limit", T: 3 /*ScalarType.INT64*/ },
            { no: 2, name: "percent", kind: "scalar", oneof: "limit", T: 3 /*ScalarType.INT64*/ }
        ]);
    }
    create(value) {
        const message = { limit: { oneofKind: undefined } };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* int64 fixed */ 1:
                    message.limit = {
                        oneofKind: "fixed",
                        fixed: reader.int64().toString()
                    };
                    break;
                case /* int64 fixed_msat */ 3:
                    message.limit = {
                        oneofKind: "fixedMsat",
                        fixedMsat: reader.int64().toString()
                    };
                    break;
                case /* int64 percent */ 2:
                    message.limit = {
                        oneofKind: "percent",
                        percent: reader.int64().toString()
                    };
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* int64 fixed = 1; */
        if (message.limit.oneofKind === "fixed")
            writer.tag(1, runtime_1.WireType.Varint).int64(message.limit.fixed);
        /* int64 fixed_msat = 3; */
        if (message.limit.oneofKind === "fixedMsat")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.limit.fixedMsat);
        /* int64 percent = 2; */
        if (message.limit.oneofKind === "percent")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.limit.percent);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.FeeLimit
 */
exports.FeeLimit = new FeeLimit$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SendRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.SendRequest", [
            { no: 1, name: "dest", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "dest_string", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "amt", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 12, name: "amt_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "payment_hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 5, name: "payment_hash_string", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 6, name: "payment_request", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 7, name: "final_cltv_delta", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 8, name: "fee_limit", kind: "message", T: () => exports.FeeLimit },
            { no: 9, name: "outgoing_chan_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 13, name: "last_hop_pubkey", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 10, name: "cltv_limit", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 11, name: "dest_custom_records", kind: "map", K: 4 /*ScalarType.UINT64*/, V: { kind: "scalar", T: 12 /*ScalarType.BYTES*/ } },
            { no: 14, name: "allow_self_payment", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 15, name: "dest_features", kind: "enum", repeat: 1 /*RepeatType.PACKED*/, T: () => ["lnrpc.FeatureBit", FeatureBit] },
            { no: 16, name: "payment_addr", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { dest: new Uint8Array(0), destString: "", amt: "0", amtMsat: "0", paymentHash: new Uint8Array(0), paymentHashString: "", paymentRequest: "", finalCltvDelta: 0, outgoingChanId: "0", lastHopPubkey: new Uint8Array(0), cltvLimit: 0, destCustomRecords: {}, allowSelfPayment: false, destFeatures: [], paymentAddr: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes dest */ 1:
                    message.dest = reader.bytes();
                    break;
                case /* string dest_string = 2 [deprecated = true];*/ 2:
                    message.destString = reader.string();
                    break;
                case /* int64 amt */ 3:
                    message.amt = reader.int64().toString();
                    break;
                case /* int64 amt_msat */ 12:
                    message.amtMsat = reader.int64().toString();
                    break;
                case /* bytes payment_hash */ 4:
                    message.paymentHash = reader.bytes();
                    break;
                case /* string payment_hash_string = 5 [deprecated = true];*/ 5:
                    message.paymentHashString = reader.string();
                    break;
                case /* string payment_request */ 6:
                    message.paymentRequest = reader.string();
                    break;
                case /* int32 final_cltv_delta */ 7:
                    message.finalCltvDelta = reader.int32();
                    break;
                case /* lnrpc.FeeLimit fee_limit */ 8:
                    message.feeLimit = exports.FeeLimit.internalBinaryRead(reader, reader.uint32(), options, message.feeLimit);
                    break;
                case /* uint64 outgoing_chan_id = 9 [jstype = JS_STRING];*/ 9:
                    message.outgoingChanId = reader.uint64().toString();
                    break;
                case /* bytes last_hop_pubkey */ 13:
                    message.lastHopPubkey = reader.bytes();
                    break;
                case /* uint32 cltv_limit */ 10:
                    message.cltvLimit = reader.uint32();
                    break;
                case /* map<uint64, bytes> dest_custom_records */ 11:
                    this.binaryReadMap11(message.destCustomRecords, reader, options);
                    break;
                case /* bool allow_self_payment */ 14:
                    message.allowSelfPayment = reader.bool();
                    break;
                case /* repeated lnrpc.FeatureBit dest_features */ 15:
                    if (wireType === runtime_1.WireType.LengthDelimited)
                        for (let e = reader.int32() + reader.pos; reader.pos < e;)
                            message.destFeatures.push(reader.int32());
                    else
                        message.destFeatures.push(reader.int32());
                    break;
                case /* bytes payment_addr */ 16:
                    message.paymentAddr = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    binaryReadMap11(map, reader, options) {
        let len = reader.uint32(), end = reader.pos + len, key, val;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case 1:
                    key = reader.uint64().toString();
                    break;
                case 2:
                    val = reader.bytes();
                    break;
                default: throw new globalThis.Error("unknown map entry field for field lnrpc.SendRequest.dest_custom_records");
            }
        }
        map[key !== null && key !== void 0 ? key : "0"] = val !== null && val !== void 0 ? val : new Uint8Array(0);
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes dest = 1; */
        if (message.dest.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.dest);
        /* string dest_string = 2 [deprecated = true]; */
        if (message.destString !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.destString);
        /* int64 amt = 3; */
        if (message.amt !== "0")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.amt);
        /* int64 amt_msat = 12; */
        if (message.amtMsat !== "0")
            writer.tag(12, runtime_1.WireType.Varint).int64(message.amtMsat);
        /* bytes payment_hash = 4; */
        if (message.paymentHash.length)
            writer.tag(4, runtime_1.WireType.LengthDelimited).bytes(message.paymentHash);
        /* string payment_hash_string = 5 [deprecated = true]; */
        if (message.paymentHashString !== "")
            writer.tag(5, runtime_1.WireType.LengthDelimited).string(message.paymentHashString);
        /* string payment_request = 6; */
        if (message.paymentRequest !== "")
            writer.tag(6, runtime_1.WireType.LengthDelimited).string(message.paymentRequest);
        /* int32 final_cltv_delta = 7; */
        if (message.finalCltvDelta !== 0)
            writer.tag(7, runtime_1.WireType.Varint).int32(message.finalCltvDelta);
        /* lnrpc.FeeLimit fee_limit = 8; */
        if (message.feeLimit)
            exports.FeeLimit.internalBinaryWrite(message.feeLimit, writer.tag(8, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* uint64 outgoing_chan_id = 9 [jstype = JS_STRING]; */
        if (message.outgoingChanId !== "0")
            writer.tag(9, runtime_1.WireType.Varint).uint64(message.outgoingChanId);
        /* bytes last_hop_pubkey = 13; */
        if (message.lastHopPubkey.length)
            writer.tag(13, runtime_1.WireType.LengthDelimited).bytes(message.lastHopPubkey);
        /* uint32 cltv_limit = 10; */
        if (message.cltvLimit !== 0)
            writer.tag(10, runtime_1.WireType.Varint).uint32(message.cltvLimit);
        /* map<uint64, bytes> dest_custom_records = 11; */
        for (let k of Object.keys(message.destCustomRecords))
            writer.tag(11, runtime_1.WireType.LengthDelimited).fork().tag(1, runtime_1.WireType.Varint).uint64(k).tag(2, runtime_1.WireType.LengthDelimited).bytes(message.destCustomRecords[k]).join();
        /* bool allow_self_payment = 14; */
        if (message.allowSelfPayment !== false)
            writer.tag(14, runtime_1.WireType.Varint).bool(message.allowSelfPayment);
        /* repeated lnrpc.FeatureBit dest_features = 15; */
        if (message.destFeatures.length) {
            writer.tag(15, runtime_1.WireType.LengthDelimited).fork();
            for (let i = 0; i < message.destFeatures.length; i++)
                writer.int32(message.destFeatures[i]);
            writer.join();
        }
        /* bytes payment_addr = 16; */
        if (message.paymentAddr.length)
            writer.tag(16, runtime_1.WireType.LengthDelimited).bytes(message.paymentAddr);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.SendRequest
 */
exports.SendRequest = new SendRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SendResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.SendResponse", [
            { no: 1, name: "payment_error", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "payment_preimage", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 3, name: "payment_route", kind: "message", T: () => exports.Route },
            { no: 4, name: "payment_hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { paymentError: "", paymentPreimage: new Uint8Array(0), paymentHash: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string payment_error */ 1:
                    message.paymentError = reader.string();
                    break;
                case /* bytes payment_preimage */ 2:
                    message.paymentPreimage = reader.bytes();
                    break;
                case /* lnrpc.Route payment_route */ 3:
                    message.paymentRoute = exports.Route.internalBinaryRead(reader, reader.uint32(), options, message.paymentRoute);
                    break;
                case /* bytes payment_hash */ 4:
                    message.paymentHash = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string payment_error = 1; */
        if (message.paymentError !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.paymentError);
        /* bytes payment_preimage = 2; */
        if (message.paymentPreimage.length)
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.paymentPreimage);
        /* lnrpc.Route payment_route = 3; */
        if (message.paymentRoute)
            exports.Route.internalBinaryWrite(message.paymentRoute, writer.tag(3, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* bytes payment_hash = 4; */
        if (message.paymentHash.length)
            writer.tag(4, runtime_1.WireType.LengthDelimited).bytes(message.paymentHash);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.SendResponse
 */
exports.SendResponse = new SendResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SendToRouteRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.SendToRouteRequest", [
            { no: 1, name: "payment_hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "payment_hash_string", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 4, name: "route", kind: "message", T: () => exports.Route }
        ]);
    }
    create(value) {
        const message = { paymentHash: new Uint8Array(0), paymentHashString: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes payment_hash */ 1:
                    message.paymentHash = reader.bytes();
                    break;
                case /* string payment_hash_string = 2 [deprecated = true];*/ 2:
                    message.paymentHashString = reader.string();
                    break;
                case /* lnrpc.Route route */ 4:
                    message.route = exports.Route.internalBinaryRead(reader, reader.uint32(), options, message.route);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes payment_hash = 1; */
        if (message.paymentHash.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.paymentHash);
        /* string payment_hash_string = 2 [deprecated = true]; */
        if (message.paymentHashString !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.paymentHashString);
        /* lnrpc.Route route = 4; */
        if (message.route)
            exports.Route.internalBinaryWrite(message.route, writer.tag(4, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.SendToRouteRequest
 */
exports.SendToRouteRequest = new SendToRouteRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelAcceptRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelAcceptRequest", [
            { no: 1, name: "node_pubkey", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "chain_hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 3, name: "pending_chan_id", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 4, name: "funding_amt", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 5, name: "push_amt", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 6, name: "dust_limit", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 7, name: "max_value_in_flight", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 8, name: "channel_reserve", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 9, name: "min_htlc", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 10, name: "fee_per_kw", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 11, name: "csv_delay", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 12, name: "max_accepted_htlcs", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 13, name: "channel_flags", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { nodePubkey: new Uint8Array(0), chainHash: new Uint8Array(0), pendingChanId: new Uint8Array(0), fundingAmt: "0", pushAmt: "0", dustLimit: "0", maxValueInFlight: "0", channelReserve: "0", minHtlc: "0", feePerKw: "0", csvDelay: 0, maxAcceptedHtlcs: 0, channelFlags: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes node_pubkey */ 1:
                    message.nodePubkey = reader.bytes();
                    break;
                case /* bytes chain_hash */ 2:
                    message.chainHash = reader.bytes();
                    break;
                case /* bytes pending_chan_id */ 3:
                    message.pendingChanId = reader.bytes();
                    break;
                case /* uint64 funding_amt */ 4:
                    message.fundingAmt = reader.uint64().toString();
                    break;
                case /* uint64 push_amt */ 5:
                    message.pushAmt = reader.uint64().toString();
                    break;
                case /* uint64 dust_limit */ 6:
                    message.dustLimit = reader.uint64().toString();
                    break;
                case /* uint64 max_value_in_flight */ 7:
                    message.maxValueInFlight = reader.uint64().toString();
                    break;
                case /* uint64 channel_reserve */ 8:
                    message.channelReserve = reader.uint64().toString();
                    break;
                case /* uint64 min_htlc */ 9:
                    message.minHtlc = reader.uint64().toString();
                    break;
                case /* uint64 fee_per_kw */ 10:
                    message.feePerKw = reader.uint64().toString();
                    break;
                case /* uint32 csv_delay */ 11:
                    message.csvDelay = reader.uint32();
                    break;
                case /* uint32 max_accepted_htlcs */ 12:
                    message.maxAcceptedHtlcs = reader.uint32();
                    break;
                case /* uint32 channel_flags */ 13:
                    message.channelFlags = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes node_pubkey = 1; */
        if (message.nodePubkey.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.nodePubkey);
        /* bytes chain_hash = 2; */
        if (message.chainHash.length)
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.chainHash);
        /* bytes pending_chan_id = 3; */
        if (message.pendingChanId.length)
            writer.tag(3, runtime_1.WireType.LengthDelimited).bytes(message.pendingChanId);
        /* uint64 funding_amt = 4; */
        if (message.fundingAmt !== "0")
            writer.tag(4, runtime_1.WireType.Varint).uint64(message.fundingAmt);
        /* uint64 push_amt = 5; */
        if (message.pushAmt !== "0")
            writer.tag(5, runtime_1.WireType.Varint).uint64(message.pushAmt);
        /* uint64 dust_limit = 6; */
        if (message.dustLimit !== "0")
            writer.tag(6, runtime_1.WireType.Varint).uint64(message.dustLimit);
        /* uint64 max_value_in_flight = 7; */
        if (message.maxValueInFlight !== "0")
            writer.tag(7, runtime_1.WireType.Varint).uint64(message.maxValueInFlight);
        /* uint64 channel_reserve = 8; */
        if (message.channelReserve !== "0")
            writer.tag(8, runtime_1.WireType.Varint).uint64(message.channelReserve);
        /* uint64 min_htlc = 9; */
        if (message.minHtlc !== "0")
            writer.tag(9, runtime_1.WireType.Varint).uint64(message.minHtlc);
        /* uint64 fee_per_kw = 10; */
        if (message.feePerKw !== "0")
            writer.tag(10, runtime_1.WireType.Varint).uint64(message.feePerKw);
        /* uint32 csv_delay = 11; */
        if (message.csvDelay !== 0)
            writer.tag(11, runtime_1.WireType.Varint).uint32(message.csvDelay);
        /* uint32 max_accepted_htlcs = 12; */
        if (message.maxAcceptedHtlcs !== 0)
            writer.tag(12, runtime_1.WireType.Varint).uint32(message.maxAcceptedHtlcs);
        /* uint32 channel_flags = 13; */
        if (message.channelFlags !== 0)
            writer.tag(13, runtime_1.WireType.Varint).uint32(message.channelFlags);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelAcceptRequest
 */
exports.ChannelAcceptRequest = new ChannelAcceptRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelAcceptResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelAcceptResponse", [
            { no: 1, name: "accept", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 2, name: "pending_chan_id", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 3, name: "error", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 4, name: "upfront_shutdown", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 5, name: "csv_delay", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 6, name: "reserve_sat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 7, name: "in_flight_max_msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 8, name: "max_htlc_count", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 9, name: "min_htlc_in", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 10, name: "min_accept_depth", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { accept: false, pendingChanId: new Uint8Array(0), error: "", upfrontShutdown: "", csvDelay: 0, reserveSat: "0", inFlightMaxMsat: "0", maxHtlcCount: 0, minHtlcIn: "0", minAcceptDepth: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool accept */ 1:
                    message.accept = reader.bool();
                    break;
                case /* bytes pending_chan_id */ 2:
                    message.pendingChanId = reader.bytes();
                    break;
                case /* string error */ 3:
                    message.error = reader.string();
                    break;
                case /* string upfront_shutdown */ 4:
                    message.upfrontShutdown = reader.string();
                    break;
                case /* uint32 csv_delay */ 5:
                    message.csvDelay = reader.uint32();
                    break;
                case /* uint64 reserve_sat */ 6:
                    message.reserveSat = reader.uint64().toString();
                    break;
                case /* uint64 in_flight_max_msat */ 7:
                    message.inFlightMaxMsat = reader.uint64().toString();
                    break;
                case /* uint32 max_htlc_count */ 8:
                    message.maxHtlcCount = reader.uint32();
                    break;
                case /* uint64 min_htlc_in */ 9:
                    message.minHtlcIn = reader.uint64().toString();
                    break;
                case /* uint32 min_accept_depth */ 10:
                    message.minAcceptDepth = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool accept = 1; */
        if (message.accept !== false)
            writer.tag(1, runtime_1.WireType.Varint).bool(message.accept);
        /* bytes pending_chan_id = 2; */
        if (message.pendingChanId.length)
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.pendingChanId);
        /* string error = 3; */
        if (message.error !== "")
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.error);
        /* string upfront_shutdown = 4; */
        if (message.upfrontShutdown !== "")
            writer.tag(4, runtime_1.WireType.LengthDelimited).string(message.upfrontShutdown);
        /* uint32 csv_delay = 5; */
        if (message.csvDelay !== 0)
            writer.tag(5, runtime_1.WireType.Varint).uint32(message.csvDelay);
        /* uint64 reserve_sat = 6; */
        if (message.reserveSat !== "0")
            writer.tag(6, runtime_1.WireType.Varint).uint64(message.reserveSat);
        /* uint64 in_flight_max_msat = 7; */
        if (message.inFlightMaxMsat !== "0")
            writer.tag(7, runtime_1.WireType.Varint).uint64(message.inFlightMaxMsat);
        /* uint32 max_htlc_count = 8; */
        if (message.maxHtlcCount !== 0)
            writer.tag(8, runtime_1.WireType.Varint).uint32(message.maxHtlcCount);
        /* uint64 min_htlc_in = 9; */
        if (message.minHtlcIn !== "0")
            writer.tag(9, runtime_1.WireType.Varint).uint64(message.minHtlcIn);
        /* uint32 min_accept_depth = 10; */
        if (message.minAcceptDepth !== 0)
            writer.tag(10, runtime_1.WireType.Varint).uint32(message.minAcceptDepth);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelAcceptResponse
 */
exports.ChannelAcceptResponse = new ChannelAcceptResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelPoint$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelPoint", [
            { no: 1, name: "funding_txid_bytes", kind: "scalar", oneof: "fundingTxid", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "funding_txid_str", kind: "scalar", oneof: "fundingTxid", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "output_index", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { fundingTxid: { oneofKind: undefined }, outputIndex: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes funding_txid_bytes */ 1:
                    message.fundingTxid = {
                        oneofKind: "fundingTxidBytes",
                        fundingTxidBytes: reader.bytes()
                    };
                    break;
                case /* string funding_txid_str */ 2:
                    message.fundingTxid = {
                        oneofKind: "fundingTxidStr",
                        fundingTxidStr: reader.string()
                    };
                    break;
                case /* uint32 output_index */ 3:
                    message.outputIndex = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes funding_txid_bytes = 1; */
        if (message.fundingTxid.oneofKind === "fundingTxidBytes")
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.fundingTxid.fundingTxidBytes);
        /* string funding_txid_str = 2; */
        if (message.fundingTxid.oneofKind === "fundingTxidStr")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.fundingTxid.fundingTxidStr);
        /* uint32 output_index = 3; */
        if (message.outputIndex !== 0)
            writer.tag(3, runtime_1.WireType.Varint).uint32(message.outputIndex);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelPoint
 */
exports.ChannelPoint = new ChannelPoint$Type();
// @generated message type with reflection information, may provide speed optimized methods
class OutPoint$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.OutPoint", [
            { no: 1, name: "txid_bytes", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "txid_str", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "output_index", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { txidBytes: new Uint8Array(0), txidStr: "", outputIndex: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes txid_bytes */ 1:
                    message.txidBytes = reader.bytes();
                    break;
                case /* string txid_str */ 2:
                    message.txidStr = reader.string();
                    break;
                case /* uint32 output_index */ 3:
                    message.outputIndex = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes txid_bytes = 1; */
        if (message.txidBytes.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.txidBytes);
        /* string txid_str = 2; */
        if (message.txidStr !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.txidStr);
        /* uint32 output_index = 3; */
        if (message.outputIndex !== 0)
            writer.tag(3, runtime_1.WireType.Varint).uint32(message.outputIndex);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.OutPoint
 */
exports.OutPoint = new OutPoint$Type();
// @generated message type with reflection information, may provide speed optimized methods
class LightningAddress$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.LightningAddress", [
            { no: 1, name: "pubkey", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "host", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { pubkey: "", host: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string pubkey */ 1:
                    message.pubkey = reader.string();
                    break;
                case /* string host */ 2:
                    message.host = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string pubkey = 1; */
        if (message.pubkey !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.pubkey);
        /* string host = 2; */
        if (message.host !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.host);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.LightningAddress
 */
exports.LightningAddress = new LightningAddress$Type();
// @generated message type with reflection information, may provide speed optimized methods
class EstimateFeeRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.EstimateFeeRequest", [
            { no: 1, name: "AddrToAmount", kind: "map", jsonName: "AddrToAmount", K: 9 /*ScalarType.STRING*/, V: { kind: "scalar", T: 3 /*ScalarType.INT64*/ } },
            { no: 2, name: "target_conf", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 3, name: "min_confs", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 4, name: "spend_unconfirmed", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { addrToAmount: {}, targetConf: 0, minConfs: 0, spendUnconfirmed: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* map<string, int64> AddrToAmount = 1 [json_name = "AddrToAmount"];*/ 1:
                    this.binaryReadMap1(message.addrToAmount, reader, options);
                    break;
                case /* int32 target_conf */ 2:
                    message.targetConf = reader.int32();
                    break;
                case /* int32 min_confs */ 3:
                    message.minConfs = reader.int32();
                    break;
                case /* bool spend_unconfirmed */ 4:
                    message.spendUnconfirmed = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    binaryReadMap1(map, reader, options) {
        let len = reader.uint32(), end = reader.pos + len, key, val;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case 1:
                    key = reader.string();
                    break;
                case 2:
                    val = reader.int64().toString();
                    break;
                default: throw new globalThis.Error("unknown map entry field for field lnrpc.EstimateFeeRequest.AddrToAmount");
            }
        }
        map[key !== null && key !== void 0 ? key : ""] = val !== null && val !== void 0 ? val : "0";
    }
    internalBinaryWrite(message, writer, options) {
        /* map<string, int64> AddrToAmount = 1 [json_name = "AddrToAmount"]; */
        for (let k of Object.keys(message.addrToAmount))
            writer.tag(1, runtime_1.WireType.LengthDelimited).fork().tag(1, runtime_1.WireType.LengthDelimited).string(k).tag(2, runtime_1.WireType.Varint).int64(message.addrToAmount[k]).join();
        /* int32 target_conf = 2; */
        if (message.targetConf !== 0)
            writer.tag(2, runtime_1.WireType.Varint).int32(message.targetConf);
        /* int32 min_confs = 3; */
        if (message.minConfs !== 0)
            writer.tag(3, runtime_1.WireType.Varint).int32(message.minConfs);
        /* bool spend_unconfirmed = 4; */
        if (message.spendUnconfirmed !== false)
            writer.tag(4, runtime_1.WireType.Varint).bool(message.spendUnconfirmed);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.EstimateFeeRequest
 */
exports.EstimateFeeRequest = new EstimateFeeRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class EstimateFeeResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.EstimateFeeResponse", [
            { no: 1, name: "fee_sat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 2, name: "feerate_sat_per_byte", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "sat_per_vbyte", kind: "scalar", T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { feeSat: "0", feerateSatPerByte: "0", satPerVbyte: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* int64 fee_sat */ 1:
                    message.feeSat = reader.int64().toString();
                    break;
                case /* int64 feerate_sat_per_byte = 2 [deprecated = true];*/ 2:
                    message.feerateSatPerByte = reader.int64().toString();
                    break;
                case /* uint64 sat_per_vbyte */ 3:
                    message.satPerVbyte = reader.uint64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* int64 fee_sat = 1; */
        if (message.feeSat !== "0")
            writer.tag(1, runtime_1.WireType.Varint).int64(message.feeSat);
        /* int64 feerate_sat_per_byte = 2 [deprecated = true]; */
        if (message.feerateSatPerByte !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.feerateSatPerByte);
        /* uint64 sat_per_vbyte = 3; */
        if (message.satPerVbyte !== "0")
            writer.tag(3, runtime_1.WireType.Varint).uint64(message.satPerVbyte);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.EstimateFeeResponse
 */
exports.EstimateFeeResponse = new EstimateFeeResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SendManyRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.SendManyRequest", [
            { no: 1, name: "AddrToAmount", kind: "map", jsonName: "AddrToAmount", K: 9 /*ScalarType.STRING*/, V: { kind: "scalar", T: 3 /*ScalarType.INT64*/ } },
            { no: 3, name: "target_conf", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 4, name: "sat_per_vbyte", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 5, name: "sat_per_byte", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 6, name: "label", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 7, name: "min_confs", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 8, name: "spend_unconfirmed", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { addrToAmount: {}, targetConf: 0, satPerVbyte: "0", satPerByte: "0", label: "", minConfs: 0, spendUnconfirmed: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* map<string, int64> AddrToAmount = 1 [json_name = "AddrToAmount"];*/ 1:
                    this.binaryReadMap1(message.addrToAmount, reader, options);
                    break;
                case /* int32 target_conf */ 3:
                    message.targetConf = reader.int32();
                    break;
                case /* uint64 sat_per_vbyte */ 4:
                    message.satPerVbyte = reader.uint64().toString();
                    break;
                case /* int64 sat_per_byte = 5 [deprecated = true];*/ 5:
                    message.satPerByte = reader.int64().toString();
                    break;
                case /* string label */ 6:
                    message.label = reader.string();
                    break;
                case /* int32 min_confs */ 7:
                    message.minConfs = reader.int32();
                    break;
                case /* bool spend_unconfirmed */ 8:
                    message.spendUnconfirmed = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    binaryReadMap1(map, reader, options) {
        let len = reader.uint32(), end = reader.pos + len, key, val;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case 1:
                    key = reader.string();
                    break;
                case 2:
                    val = reader.int64().toString();
                    break;
                default: throw new globalThis.Error("unknown map entry field for field lnrpc.SendManyRequest.AddrToAmount");
            }
        }
        map[key !== null && key !== void 0 ? key : ""] = val !== null && val !== void 0 ? val : "0";
    }
    internalBinaryWrite(message, writer, options) {
        /* map<string, int64> AddrToAmount = 1 [json_name = "AddrToAmount"]; */
        for (let k of Object.keys(message.addrToAmount))
            writer.tag(1, runtime_1.WireType.LengthDelimited).fork().tag(1, runtime_1.WireType.LengthDelimited).string(k).tag(2, runtime_1.WireType.Varint).int64(message.addrToAmount[k]).join();
        /* int32 target_conf = 3; */
        if (message.targetConf !== 0)
            writer.tag(3, runtime_1.WireType.Varint).int32(message.targetConf);
        /* uint64 sat_per_vbyte = 4; */
        if (message.satPerVbyte !== "0")
            writer.tag(4, runtime_1.WireType.Varint).uint64(message.satPerVbyte);
        /* int64 sat_per_byte = 5 [deprecated = true]; */
        if (message.satPerByte !== "0")
            writer.tag(5, runtime_1.WireType.Varint).int64(message.satPerByte);
        /* string label = 6; */
        if (message.label !== "")
            writer.tag(6, runtime_1.WireType.LengthDelimited).string(message.label);
        /* int32 min_confs = 7; */
        if (message.minConfs !== 0)
            writer.tag(7, runtime_1.WireType.Varint).int32(message.minConfs);
        /* bool spend_unconfirmed = 8; */
        if (message.spendUnconfirmed !== false)
            writer.tag(8, runtime_1.WireType.Varint).bool(message.spendUnconfirmed);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.SendManyRequest
 */
exports.SendManyRequest = new SendManyRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SendManyResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.SendManyResponse", [
            { no: 1, name: "txid", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { txid: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string txid */ 1:
                    message.txid = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string txid = 1; */
        if (message.txid !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.txid);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.SendManyResponse
 */
exports.SendManyResponse = new SendManyResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SendCoinsRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.SendCoinsRequest", [
            { no: 1, name: "addr", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "amount", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "target_conf", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 4, name: "sat_per_vbyte", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 5, name: "sat_per_byte", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 6, name: "send_all", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 7, name: "label", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 8, name: "min_confs", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 9, name: "spend_unconfirmed", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { addr: "", amount: "0", targetConf: 0, satPerVbyte: "0", satPerByte: "0", sendAll: false, label: "", minConfs: 0, spendUnconfirmed: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string addr */ 1:
                    message.addr = reader.string();
                    break;
                case /* int64 amount */ 2:
                    message.amount = reader.int64().toString();
                    break;
                case /* int32 target_conf */ 3:
                    message.targetConf = reader.int32();
                    break;
                case /* uint64 sat_per_vbyte */ 4:
                    message.satPerVbyte = reader.uint64().toString();
                    break;
                case /* int64 sat_per_byte = 5 [deprecated = true];*/ 5:
                    message.satPerByte = reader.int64().toString();
                    break;
                case /* bool send_all */ 6:
                    message.sendAll = reader.bool();
                    break;
                case /* string label */ 7:
                    message.label = reader.string();
                    break;
                case /* int32 min_confs */ 8:
                    message.minConfs = reader.int32();
                    break;
                case /* bool spend_unconfirmed */ 9:
                    message.spendUnconfirmed = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string addr = 1; */
        if (message.addr !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.addr);
        /* int64 amount = 2; */
        if (message.amount !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.amount);
        /* int32 target_conf = 3; */
        if (message.targetConf !== 0)
            writer.tag(3, runtime_1.WireType.Varint).int32(message.targetConf);
        /* uint64 sat_per_vbyte = 4; */
        if (message.satPerVbyte !== "0")
            writer.tag(4, runtime_1.WireType.Varint).uint64(message.satPerVbyte);
        /* int64 sat_per_byte = 5 [deprecated = true]; */
        if (message.satPerByte !== "0")
            writer.tag(5, runtime_1.WireType.Varint).int64(message.satPerByte);
        /* bool send_all = 6; */
        if (message.sendAll !== false)
            writer.tag(6, runtime_1.WireType.Varint).bool(message.sendAll);
        /* string label = 7; */
        if (message.label !== "")
            writer.tag(7, runtime_1.WireType.LengthDelimited).string(message.label);
        /* int32 min_confs = 8; */
        if (message.minConfs !== 0)
            writer.tag(8, runtime_1.WireType.Varint).int32(message.minConfs);
        /* bool spend_unconfirmed = 9; */
        if (message.spendUnconfirmed !== false)
            writer.tag(9, runtime_1.WireType.Varint).bool(message.spendUnconfirmed);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.SendCoinsRequest
 */
exports.SendCoinsRequest = new SendCoinsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SendCoinsResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.SendCoinsResponse", [
            { no: 1, name: "txid", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { txid: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string txid */ 1:
                    message.txid = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string txid = 1; */
        if (message.txid !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.txid);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.SendCoinsResponse
 */
exports.SendCoinsResponse = new SendCoinsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListUnspentRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ListUnspentRequest", [
            { no: 1, name: "min_confs", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 2, name: "max_confs", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 3, name: "account", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { minConfs: 0, maxConfs: 0, account: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* int32 min_confs */ 1:
                    message.minConfs = reader.int32();
                    break;
                case /* int32 max_confs */ 2:
                    message.maxConfs = reader.int32();
                    break;
                case /* string account */ 3:
                    message.account = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* int32 min_confs = 1; */
        if (message.minConfs !== 0)
            writer.tag(1, runtime_1.WireType.Varint).int32(message.minConfs);
        /* int32 max_confs = 2; */
        if (message.maxConfs !== 0)
            writer.tag(2, runtime_1.WireType.Varint).int32(message.maxConfs);
        /* string account = 3; */
        if (message.account !== "")
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.account);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ListUnspentRequest
 */
exports.ListUnspentRequest = new ListUnspentRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListUnspentResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ListUnspentResponse", [
            { no: 1, name: "utxos", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.Utxo }
        ]);
    }
    create(value) {
        const message = { utxos: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.Utxo utxos */ 1:
                    message.utxos.push(exports.Utxo.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.Utxo utxos = 1; */
        for (let i = 0; i < message.utxos.length; i++)
            exports.Utxo.internalBinaryWrite(message.utxos[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ListUnspentResponse
 */
exports.ListUnspentResponse = new ListUnspentResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class NewAddressRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.NewAddressRequest", [
            { no: 1, name: "type", kind: "enum", T: () => ["lnrpc.AddressType", AddressType] },
            { no: 2, name: "account", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { type: 0, account: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.AddressType type */ 1:
                    message.type = reader.int32();
                    break;
                case /* string account */ 2:
                    message.account = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.AddressType type = 1; */
        if (message.type !== 0)
            writer.tag(1, runtime_1.WireType.Varint).int32(message.type);
        /* string account = 2; */
        if (message.account !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.account);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.NewAddressRequest
 */
exports.NewAddressRequest = new NewAddressRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class NewAddressResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.NewAddressResponse", [
            { no: 1, name: "address", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { address: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string address */ 1:
                    message.address = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string address = 1; */
        if (message.address !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.address);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.NewAddressResponse
 */
exports.NewAddressResponse = new NewAddressResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SignMessageRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.SignMessageRequest", [
            { no: 1, name: "msg", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { msg: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes msg */ 1:
                    message.msg = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes msg = 1; */
        if (message.msg.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.msg);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.SignMessageRequest
 */
exports.SignMessageRequest = new SignMessageRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SignMessageResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.SignMessageResponse", [
            { no: 1, name: "signature", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { signature: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string signature */ 1:
                    message.signature = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string signature = 1; */
        if (message.signature !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.signature);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.SignMessageResponse
 */
exports.SignMessageResponse = new SignMessageResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class VerifyMessageRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.VerifyMessageRequest", [
            { no: 1, name: "msg", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "signature", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { msg: new Uint8Array(0), signature: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes msg */ 1:
                    message.msg = reader.bytes();
                    break;
                case /* string signature */ 2:
                    message.signature = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes msg = 1; */
        if (message.msg.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.msg);
        /* string signature = 2; */
        if (message.signature !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.signature);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.VerifyMessageRequest
 */
exports.VerifyMessageRequest = new VerifyMessageRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class VerifyMessageResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.VerifyMessageResponse", [
            { no: 1, name: "valid", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 2, name: "pubkey", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { valid: false, pubkey: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool valid */ 1:
                    message.valid = reader.bool();
                    break;
                case /* string pubkey */ 2:
                    message.pubkey = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool valid = 1; */
        if (message.valid !== false)
            writer.tag(1, runtime_1.WireType.Varint).bool(message.valid);
        /* string pubkey = 2; */
        if (message.pubkey !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.pubkey);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.VerifyMessageResponse
 */
exports.VerifyMessageResponse = new VerifyMessageResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ConnectPeerRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ConnectPeerRequest", [
            { no: 1, name: "addr", kind: "message", T: () => exports.LightningAddress },
            { no: 2, name: "perm", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 3, name: "timeout", kind: "scalar", T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { perm: false, timeout: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.LightningAddress addr */ 1:
                    message.addr = exports.LightningAddress.internalBinaryRead(reader, reader.uint32(), options, message.addr);
                    break;
                case /* bool perm */ 2:
                    message.perm = reader.bool();
                    break;
                case /* uint64 timeout */ 3:
                    message.timeout = reader.uint64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.LightningAddress addr = 1; */
        if (message.addr)
            exports.LightningAddress.internalBinaryWrite(message.addr, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* bool perm = 2; */
        if (message.perm !== false)
            writer.tag(2, runtime_1.WireType.Varint).bool(message.perm);
        /* uint64 timeout = 3; */
        if (message.timeout !== "0")
            writer.tag(3, runtime_1.WireType.Varint).uint64(message.timeout);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ConnectPeerRequest
 */
exports.ConnectPeerRequest = new ConnectPeerRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ConnectPeerResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ConnectPeerResponse", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ConnectPeerResponse
 */
exports.ConnectPeerResponse = new ConnectPeerResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class DisconnectPeerRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.DisconnectPeerRequest", [
            { no: 1, name: "pub_key", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { pubKey: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string pub_key */ 1:
                    message.pubKey = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string pub_key = 1; */
        if (message.pubKey !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.pubKey);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.DisconnectPeerRequest
 */
exports.DisconnectPeerRequest = new DisconnectPeerRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class DisconnectPeerResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.DisconnectPeerResponse", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.DisconnectPeerResponse
 */
exports.DisconnectPeerResponse = new DisconnectPeerResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class HTLC$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.HTLC", [
            { no: 1, name: "incoming", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 2, name: "amount", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "hash_lock", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 4, name: "expiration_height", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 5, name: "htlc_index", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 6, name: "forwarding_channel", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 7, name: "forwarding_htlc_index", kind: "scalar", T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { incoming: false, amount: "0", hashLock: new Uint8Array(0), expirationHeight: 0, htlcIndex: "0", forwardingChannel: "0", forwardingHtlcIndex: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool incoming */ 1:
                    message.incoming = reader.bool();
                    break;
                case /* int64 amount */ 2:
                    message.amount = reader.int64().toString();
                    break;
                case /* bytes hash_lock */ 3:
                    message.hashLock = reader.bytes();
                    break;
                case /* uint32 expiration_height */ 4:
                    message.expirationHeight = reader.uint32();
                    break;
                case /* uint64 htlc_index */ 5:
                    message.htlcIndex = reader.uint64().toString();
                    break;
                case /* uint64 forwarding_channel */ 6:
                    message.forwardingChannel = reader.uint64().toString();
                    break;
                case /* uint64 forwarding_htlc_index */ 7:
                    message.forwardingHtlcIndex = reader.uint64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool incoming = 1; */
        if (message.incoming !== false)
            writer.tag(1, runtime_1.WireType.Varint).bool(message.incoming);
        /* int64 amount = 2; */
        if (message.amount !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.amount);
        /* bytes hash_lock = 3; */
        if (message.hashLock.length)
            writer.tag(3, runtime_1.WireType.LengthDelimited).bytes(message.hashLock);
        /* uint32 expiration_height = 4; */
        if (message.expirationHeight !== 0)
            writer.tag(4, runtime_1.WireType.Varint).uint32(message.expirationHeight);
        /* uint64 htlc_index = 5; */
        if (message.htlcIndex !== "0")
            writer.tag(5, runtime_1.WireType.Varint).uint64(message.htlcIndex);
        /* uint64 forwarding_channel = 6; */
        if (message.forwardingChannel !== "0")
            writer.tag(6, runtime_1.WireType.Varint).uint64(message.forwardingChannel);
        /* uint64 forwarding_htlc_index = 7; */
        if (message.forwardingHtlcIndex !== "0")
            writer.tag(7, runtime_1.WireType.Varint).uint64(message.forwardingHtlcIndex);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.HTLC
 */
exports.HTLC = new HTLC$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelConstraints$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelConstraints", [
            { no: 1, name: "csv_delay", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 2, name: "chan_reserve_sat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 3, name: "dust_limit_sat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 4, name: "max_pending_amt_msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 5, name: "min_htlc_msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 6, name: "max_accepted_htlcs", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { csvDelay: 0, chanReserveSat: "0", dustLimitSat: "0", maxPendingAmtMsat: "0", minHtlcMsat: "0", maxAcceptedHtlcs: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint32 csv_delay */ 1:
                    message.csvDelay = reader.uint32();
                    break;
                case /* uint64 chan_reserve_sat */ 2:
                    message.chanReserveSat = reader.uint64().toString();
                    break;
                case /* uint64 dust_limit_sat */ 3:
                    message.dustLimitSat = reader.uint64().toString();
                    break;
                case /* uint64 max_pending_amt_msat */ 4:
                    message.maxPendingAmtMsat = reader.uint64().toString();
                    break;
                case /* uint64 min_htlc_msat */ 5:
                    message.minHtlcMsat = reader.uint64().toString();
                    break;
                case /* uint32 max_accepted_htlcs */ 6:
                    message.maxAcceptedHtlcs = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint32 csv_delay = 1; */
        if (message.csvDelay !== 0)
            writer.tag(1, runtime_1.WireType.Varint).uint32(message.csvDelay);
        /* uint64 chan_reserve_sat = 2; */
        if (message.chanReserveSat !== "0")
            writer.tag(2, runtime_1.WireType.Varint).uint64(message.chanReserveSat);
        /* uint64 dust_limit_sat = 3; */
        if (message.dustLimitSat !== "0")
            writer.tag(3, runtime_1.WireType.Varint).uint64(message.dustLimitSat);
        /* uint64 max_pending_amt_msat = 4; */
        if (message.maxPendingAmtMsat !== "0")
            writer.tag(4, runtime_1.WireType.Varint).uint64(message.maxPendingAmtMsat);
        /* uint64 min_htlc_msat = 5; */
        if (message.minHtlcMsat !== "0")
            writer.tag(5, runtime_1.WireType.Varint).uint64(message.minHtlcMsat);
        /* uint32 max_accepted_htlcs = 6; */
        if (message.maxAcceptedHtlcs !== 0)
            writer.tag(6, runtime_1.WireType.Varint).uint32(message.maxAcceptedHtlcs);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelConstraints
 */
exports.ChannelConstraints = new ChannelConstraints$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Channel$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.Channel", [
            { no: 1, name: "active", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 2, name: "remote_pubkey", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "channel_point", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 4, name: "chan_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 5, name: "capacity", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 6, name: "local_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 7, name: "remote_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 8, name: "commit_fee", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 9, name: "commit_weight", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 10, name: "fee_per_kw", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 11, name: "unsettled_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 12, name: "total_satoshis_sent", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 13, name: "total_satoshis_received", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 14, name: "num_updates", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 15, name: "pending_htlcs", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.HTLC },
            { no: 16, name: "csv_delay", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 17, name: "private", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 18, name: "initiator", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 19, name: "chan_status_flags", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 20, name: "local_chan_reserve_sat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 21, name: "remote_chan_reserve_sat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 22, name: "static_remote_key", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 26, name: "commitment_type", kind: "enum", T: () => ["lnrpc.CommitmentType", CommitmentType] },
            { no: 23, name: "lifetime", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 24, name: "uptime", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 25, name: "close_address", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 27, name: "push_amount_sat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 28, name: "thaw_height", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 29, name: "local_constraints", kind: "message", T: () => exports.ChannelConstraints },
            { no: 30, name: "remote_constraints", kind: "message", T: () => exports.ChannelConstraints }
        ]);
    }
    create(value) {
        const message = { active: false, remotePubkey: "", channelPoint: "", chanId: "0", capacity: "0", localBalance: "0", remoteBalance: "0", commitFee: "0", commitWeight: "0", feePerKw: "0", unsettledBalance: "0", totalSatoshisSent: "0", totalSatoshisReceived: "0", numUpdates: "0", pendingHtlcs: [], csvDelay: 0, private: false, initiator: false, chanStatusFlags: "", localChanReserveSat: "0", remoteChanReserveSat: "0", staticRemoteKey: false, commitmentType: 0, lifetime: "0", uptime: "0", closeAddress: "", pushAmountSat: "0", thawHeight: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool active */ 1:
                    message.active = reader.bool();
                    break;
                case /* string remote_pubkey */ 2:
                    message.remotePubkey = reader.string();
                    break;
                case /* string channel_point */ 3:
                    message.channelPoint = reader.string();
                    break;
                case /* uint64 chan_id = 4 [jstype = JS_STRING];*/ 4:
                    message.chanId = reader.uint64().toString();
                    break;
                case /* int64 capacity */ 5:
                    message.capacity = reader.int64().toString();
                    break;
                case /* int64 local_balance */ 6:
                    message.localBalance = reader.int64().toString();
                    break;
                case /* int64 remote_balance */ 7:
                    message.remoteBalance = reader.int64().toString();
                    break;
                case /* int64 commit_fee */ 8:
                    message.commitFee = reader.int64().toString();
                    break;
                case /* int64 commit_weight */ 9:
                    message.commitWeight = reader.int64().toString();
                    break;
                case /* int64 fee_per_kw */ 10:
                    message.feePerKw = reader.int64().toString();
                    break;
                case /* int64 unsettled_balance */ 11:
                    message.unsettledBalance = reader.int64().toString();
                    break;
                case /* int64 total_satoshis_sent */ 12:
                    message.totalSatoshisSent = reader.int64().toString();
                    break;
                case /* int64 total_satoshis_received */ 13:
                    message.totalSatoshisReceived = reader.int64().toString();
                    break;
                case /* uint64 num_updates */ 14:
                    message.numUpdates = reader.uint64().toString();
                    break;
                case /* repeated lnrpc.HTLC pending_htlcs */ 15:
                    message.pendingHtlcs.push(exports.HTLC.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* uint32 csv_delay = 16 [deprecated = true];*/ 16:
                    message.csvDelay = reader.uint32();
                    break;
                case /* bool private */ 17:
                    message.private = reader.bool();
                    break;
                case /* bool initiator */ 18:
                    message.initiator = reader.bool();
                    break;
                case /* string chan_status_flags */ 19:
                    message.chanStatusFlags = reader.string();
                    break;
                case /* int64 local_chan_reserve_sat = 20 [deprecated = true];*/ 20:
                    message.localChanReserveSat = reader.int64().toString();
                    break;
                case /* int64 remote_chan_reserve_sat = 21 [deprecated = true];*/ 21:
                    message.remoteChanReserveSat = reader.int64().toString();
                    break;
                case /* bool static_remote_key = 22 [deprecated = true];*/ 22:
                    message.staticRemoteKey = reader.bool();
                    break;
                case /* lnrpc.CommitmentType commitment_type */ 26:
                    message.commitmentType = reader.int32();
                    break;
                case /* int64 lifetime */ 23:
                    message.lifetime = reader.int64().toString();
                    break;
                case /* int64 uptime */ 24:
                    message.uptime = reader.int64().toString();
                    break;
                case /* string close_address */ 25:
                    message.closeAddress = reader.string();
                    break;
                case /* uint64 push_amount_sat */ 27:
                    message.pushAmountSat = reader.uint64().toString();
                    break;
                case /* uint32 thaw_height */ 28:
                    message.thawHeight = reader.uint32();
                    break;
                case /* lnrpc.ChannelConstraints local_constraints */ 29:
                    message.localConstraints = exports.ChannelConstraints.internalBinaryRead(reader, reader.uint32(), options, message.localConstraints);
                    break;
                case /* lnrpc.ChannelConstraints remote_constraints */ 30:
                    message.remoteConstraints = exports.ChannelConstraints.internalBinaryRead(reader, reader.uint32(), options, message.remoteConstraints);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool active = 1; */
        if (message.active !== false)
            writer.tag(1, runtime_1.WireType.Varint).bool(message.active);
        /* string remote_pubkey = 2; */
        if (message.remotePubkey !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.remotePubkey);
        /* string channel_point = 3; */
        if (message.channelPoint !== "")
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.channelPoint);
        /* uint64 chan_id = 4 [jstype = JS_STRING]; */
        if (message.chanId !== "0")
            writer.tag(4, runtime_1.WireType.Varint).uint64(message.chanId);
        /* int64 capacity = 5; */
        if (message.capacity !== "0")
            writer.tag(5, runtime_1.WireType.Varint).int64(message.capacity);
        /* int64 local_balance = 6; */
        if (message.localBalance !== "0")
            writer.tag(6, runtime_1.WireType.Varint).int64(message.localBalance);
        /* int64 remote_balance = 7; */
        if (message.remoteBalance !== "0")
            writer.tag(7, runtime_1.WireType.Varint).int64(message.remoteBalance);
        /* int64 commit_fee = 8; */
        if (message.commitFee !== "0")
            writer.tag(8, runtime_1.WireType.Varint).int64(message.commitFee);
        /* int64 commit_weight = 9; */
        if (message.commitWeight !== "0")
            writer.tag(9, runtime_1.WireType.Varint).int64(message.commitWeight);
        /* int64 fee_per_kw = 10; */
        if (message.feePerKw !== "0")
            writer.tag(10, runtime_1.WireType.Varint).int64(message.feePerKw);
        /* int64 unsettled_balance = 11; */
        if (message.unsettledBalance !== "0")
            writer.tag(11, runtime_1.WireType.Varint).int64(message.unsettledBalance);
        /* int64 total_satoshis_sent = 12; */
        if (message.totalSatoshisSent !== "0")
            writer.tag(12, runtime_1.WireType.Varint).int64(message.totalSatoshisSent);
        /* int64 total_satoshis_received = 13; */
        if (message.totalSatoshisReceived !== "0")
            writer.tag(13, runtime_1.WireType.Varint).int64(message.totalSatoshisReceived);
        /* uint64 num_updates = 14; */
        if (message.numUpdates !== "0")
            writer.tag(14, runtime_1.WireType.Varint).uint64(message.numUpdates);
        /* repeated lnrpc.HTLC pending_htlcs = 15; */
        for (let i = 0; i < message.pendingHtlcs.length; i++)
            exports.HTLC.internalBinaryWrite(message.pendingHtlcs[i], writer.tag(15, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* uint32 csv_delay = 16 [deprecated = true]; */
        if (message.csvDelay !== 0)
            writer.tag(16, runtime_1.WireType.Varint).uint32(message.csvDelay);
        /* bool private = 17; */
        if (message.private !== false)
            writer.tag(17, runtime_1.WireType.Varint).bool(message.private);
        /* bool initiator = 18; */
        if (message.initiator !== false)
            writer.tag(18, runtime_1.WireType.Varint).bool(message.initiator);
        /* string chan_status_flags = 19; */
        if (message.chanStatusFlags !== "")
            writer.tag(19, runtime_1.WireType.LengthDelimited).string(message.chanStatusFlags);
        /* int64 local_chan_reserve_sat = 20 [deprecated = true]; */
        if (message.localChanReserveSat !== "0")
            writer.tag(20, runtime_1.WireType.Varint).int64(message.localChanReserveSat);
        /* int64 remote_chan_reserve_sat = 21 [deprecated = true]; */
        if (message.remoteChanReserveSat !== "0")
            writer.tag(21, runtime_1.WireType.Varint).int64(message.remoteChanReserveSat);
        /* bool static_remote_key = 22 [deprecated = true]; */
        if (message.staticRemoteKey !== false)
            writer.tag(22, runtime_1.WireType.Varint).bool(message.staticRemoteKey);
        /* lnrpc.CommitmentType commitment_type = 26; */
        if (message.commitmentType !== 0)
            writer.tag(26, runtime_1.WireType.Varint).int32(message.commitmentType);
        /* int64 lifetime = 23; */
        if (message.lifetime !== "0")
            writer.tag(23, runtime_1.WireType.Varint).int64(message.lifetime);
        /* int64 uptime = 24; */
        if (message.uptime !== "0")
            writer.tag(24, runtime_1.WireType.Varint).int64(message.uptime);
        /* string close_address = 25; */
        if (message.closeAddress !== "")
            writer.tag(25, runtime_1.WireType.LengthDelimited).string(message.closeAddress);
        /* uint64 push_amount_sat = 27; */
        if (message.pushAmountSat !== "0")
            writer.tag(27, runtime_1.WireType.Varint).uint64(message.pushAmountSat);
        /* uint32 thaw_height = 28; */
        if (message.thawHeight !== 0)
            writer.tag(28, runtime_1.WireType.Varint).uint32(message.thawHeight);
        /* lnrpc.ChannelConstraints local_constraints = 29; */
        if (message.localConstraints)
            exports.ChannelConstraints.internalBinaryWrite(message.localConstraints, writer.tag(29, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.ChannelConstraints remote_constraints = 30; */
        if (message.remoteConstraints)
            exports.ChannelConstraints.internalBinaryWrite(message.remoteConstraints, writer.tag(30, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.Channel
 */
exports.Channel = new Channel$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListChannelsRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ListChannelsRequest", [
            { no: 1, name: "active_only", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 2, name: "inactive_only", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 3, name: "public_only", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 4, name: "private_only", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 5, name: "peer", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { activeOnly: false, inactiveOnly: false, publicOnly: false, privateOnly: false, peer: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool active_only */ 1:
                    message.activeOnly = reader.bool();
                    break;
                case /* bool inactive_only */ 2:
                    message.inactiveOnly = reader.bool();
                    break;
                case /* bool public_only */ 3:
                    message.publicOnly = reader.bool();
                    break;
                case /* bool private_only */ 4:
                    message.privateOnly = reader.bool();
                    break;
                case /* bytes peer */ 5:
                    message.peer = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool active_only = 1; */
        if (message.activeOnly !== false)
            writer.tag(1, runtime_1.WireType.Varint).bool(message.activeOnly);
        /* bool inactive_only = 2; */
        if (message.inactiveOnly !== false)
            writer.tag(2, runtime_1.WireType.Varint).bool(message.inactiveOnly);
        /* bool public_only = 3; */
        if (message.publicOnly !== false)
            writer.tag(3, runtime_1.WireType.Varint).bool(message.publicOnly);
        /* bool private_only = 4; */
        if (message.privateOnly !== false)
            writer.tag(4, runtime_1.WireType.Varint).bool(message.privateOnly);
        /* bytes peer = 5; */
        if (message.peer.length)
            writer.tag(5, runtime_1.WireType.LengthDelimited).bytes(message.peer);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ListChannelsRequest
 */
exports.ListChannelsRequest = new ListChannelsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListChannelsResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ListChannelsResponse", [
            { no: 11, name: "channels", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.Channel }
        ]);
    }
    create(value) {
        const message = { channels: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.Channel channels */ 11:
                    message.channels.push(exports.Channel.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.Channel channels = 11; */
        for (let i = 0; i < message.channels.length; i++)
            exports.Channel.internalBinaryWrite(message.channels[i], writer.tag(11, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ListChannelsResponse
 */
exports.ListChannelsResponse = new ListChannelsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelCloseSummary$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelCloseSummary", [
            { no: 1, name: "channel_point", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "chan_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 3, name: "chain_hash", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 4, name: "closing_tx_hash", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 5, name: "remote_pubkey", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 6, name: "capacity", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 7, name: "close_height", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 8, name: "settled_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 9, name: "time_locked_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 10, name: "close_type", kind: "enum", T: () => ["lnrpc.ChannelCloseSummary.ClosureType", ChannelCloseSummary_ClosureType] },
            { no: 11, name: "open_initiator", kind: "enum", T: () => ["lnrpc.Initiator", Initiator, "INITIATOR_"] },
            { no: 12, name: "close_initiator", kind: "enum", T: () => ["lnrpc.Initiator", Initiator, "INITIATOR_"] },
            { no: 13, name: "resolutions", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.Resolution }
        ]);
    }
    create(value) {
        const message = { channelPoint: "", chanId: "0", chainHash: "", closingTxHash: "", remotePubkey: "", capacity: "0", closeHeight: 0, settledBalance: "0", timeLockedBalance: "0", closeType: 0, openInitiator: 0, closeInitiator: 0, resolutions: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string channel_point */ 1:
                    message.channelPoint = reader.string();
                    break;
                case /* uint64 chan_id = 2 [jstype = JS_STRING];*/ 2:
                    message.chanId = reader.uint64().toString();
                    break;
                case /* string chain_hash */ 3:
                    message.chainHash = reader.string();
                    break;
                case /* string closing_tx_hash */ 4:
                    message.closingTxHash = reader.string();
                    break;
                case /* string remote_pubkey */ 5:
                    message.remotePubkey = reader.string();
                    break;
                case /* int64 capacity */ 6:
                    message.capacity = reader.int64().toString();
                    break;
                case /* uint32 close_height */ 7:
                    message.closeHeight = reader.uint32();
                    break;
                case /* int64 settled_balance */ 8:
                    message.settledBalance = reader.int64().toString();
                    break;
                case /* int64 time_locked_balance */ 9:
                    message.timeLockedBalance = reader.int64().toString();
                    break;
                case /* lnrpc.ChannelCloseSummary.ClosureType close_type */ 10:
                    message.closeType = reader.int32();
                    break;
                case /* lnrpc.Initiator open_initiator */ 11:
                    message.openInitiator = reader.int32();
                    break;
                case /* lnrpc.Initiator close_initiator */ 12:
                    message.closeInitiator = reader.int32();
                    break;
                case /* repeated lnrpc.Resolution resolutions */ 13:
                    message.resolutions.push(exports.Resolution.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string channel_point = 1; */
        if (message.channelPoint !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.channelPoint);
        /* uint64 chan_id = 2 [jstype = JS_STRING]; */
        if (message.chanId !== "0")
            writer.tag(2, runtime_1.WireType.Varint).uint64(message.chanId);
        /* string chain_hash = 3; */
        if (message.chainHash !== "")
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.chainHash);
        /* string closing_tx_hash = 4; */
        if (message.closingTxHash !== "")
            writer.tag(4, runtime_1.WireType.LengthDelimited).string(message.closingTxHash);
        /* string remote_pubkey = 5; */
        if (message.remotePubkey !== "")
            writer.tag(5, runtime_1.WireType.LengthDelimited).string(message.remotePubkey);
        /* int64 capacity = 6; */
        if (message.capacity !== "0")
            writer.tag(6, runtime_1.WireType.Varint).int64(message.capacity);
        /* uint32 close_height = 7; */
        if (message.closeHeight !== 0)
            writer.tag(7, runtime_1.WireType.Varint).uint32(message.closeHeight);
        /* int64 settled_balance = 8; */
        if (message.settledBalance !== "0")
            writer.tag(8, runtime_1.WireType.Varint).int64(message.settledBalance);
        /* int64 time_locked_balance = 9; */
        if (message.timeLockedBalance !== "0")
            writer.tag(9, runtime_1.WireType.Varint).int64(message.timeLockedBalance);
        /* lnrpc.ChannelCloseSummary.ClosureType close_type = 10; */
        if (message.closeType !== 0)
            writer.tag(10, runtime_1.WireType.Varint).int32(message.closeType);
        /* lnrpc.Initiator open_initiator = 11; */
        if (message.openInitiator !== 0)
            writer.tag(11, runtime_1.WireType.Varint).int32(message.openInitiator);
        /* lnrpc.Initiator close_initiator = 12; */
        if (message.closeInitiator !== 0)
            writer.tag(12, runtime_1.WireType.Varint).int32(message.closeInitiator);
        /* repeated lnrpc.Resolution resolutions = 13; */
        for (let i = 0; i < message.resolutions.length; i++)
            exports.Resolution.internalBinaryWrite(message.resolutions[i], writer.tag(13, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelCloseSummary
 */
exports.ChannelCloseSummary = new ChannelCloseSummary$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Resolution$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.Resolution", [
            { no: 1, name: "resolution_type", kind: "enum", T: () => ["lnrpc.ResolutionType", ResolutionType] },
            { no: 2, name: "outcome", kind: "enum", T: () => ["lnrpc.ResolutionOutcome", ResolutionOutcome] },
            { no: 3, name: "outpoint", kind: "message", T: () => exports.OutPoint },
            { no: 4, name: "amount_sat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 5, name: "sweep_txid", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { resolutionType: 0, outcome: 0, amountSat: "0", sweepTxid: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.ResolutionType resolution_type */ 1:
                    message.resolutionType = reader.int32();
                    break;
                case /* lnrpc.ResolutionOutcome outcome */ 2:
                    message.outcome = reader.int32();
                    break;
                case /* lnrpc.OutPoint outpoint */ 3:
                    message.outpoint = exports.OutPoint.internalBinaryRead(reader, reader.uint32(), options, message.outpoint);
                    break;
                case /* uint64 amount_sat */ 4:
                    message.amountSat = reader.uint64().toString();
                    break;
                case /* string sweep_txid */ 5:
                    message.sweepTxid = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.ResolutionType resolution_type = 1; */
        if (message.resolutionType !== 0)
            writer.tag(1, runtime_1.WireType.Varint).int32(message.resolutionType);
        /* lnrpc.ResolutionOutcome outcome = 2; */
        if (message.outcome !== 0)
            writer.tag(2, runtime_1.WireType.Varint).int32(message.outcome);
        /* lnrpc.OutPoint outpoint = 3; */
        if (message.outpoint)
            exports.OutPoint.internalBinaryWrite(message.outpoint, writer.tag(3, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* uint64 amount_sat = 4; */
        if (message.amountSat !== "0")
            writer.tag(4, runtime_1.WireType.Varint).uint64(message.amountSat);
        /* string sweep_txid = 5; */
        if (message.sweepTxid !== "")
            writer.tag(5, runtime_1.WireType.LengthDelimited).string(message.sweepTxid);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.Resolution
 */
exports.Resolution = new Resolution$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ClosedChannelsRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ClosedChannelsRequest", [
            { no: 1, name: "cooperative", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 2, name: "local_force", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 3, name: "remote_force", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 4, name: "breach", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 5, name: "funding_canceled", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 6, name: "abandoned", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { cooperative: false, localForce: false, remoteForce: false, breach: false, fundingCanceled: false, abandoned: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool cooperative */ 1:
                    message.cooperative = reader.bool();
                    break;
                case /* bool local_force */ 2:
                    message.localForce = reader.bool();
                    break;
                case /* bool remote_force */ 3:
                    message.remoteForce = reader.bool();
                    break;
                case /* bool breach */ 4:
                    message.breach = reader.bool();
                    break;
                case /* bool funding_canceled */ 5:
                    message.fundingCanceled = reader.bool();
                    break;
                case /* bool abandoned */ 6:
                    message.abandoned = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool cooperative = 1; */
        if (message.cooperative !== false)
            writer.tag(1, runtime_1.WireType.Varint).bool(message.cooperative);
        /* bool local_force = 2; */
        if (message.localForce !== false)
            writer.tag(2, runtime_1.WireType.Varint).bool(message.localForce);
        /* bool remote_force = 3; */
        if (message.remoteForce !== false)
            writer.tag(3, runtime_1.WireType.Varint).bool(message.remoteForce);
        /* bool breach = 4; */
        if (message.breach !== false)
            writer.tag(4, runtime_1.WireType.Varint).bool(message.breach);
        /* bool funding_canceled = 5; */
        if (message.fundingCanceled !== false)
            writer.tag(5, runtime_1.WireType.Varint).bool(message.fundingCanceled);
        /* bool abandoned = 6; */
        if (message.abandoned !== false)
            writer.tag(6, runtime_1.WireType.Varint).bool(message.abandoned);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ClosedChannelsRequest
 */
exports.ClosedChannelsRequest = new ClosedChannelsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ClosedChannelsResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ClosedChannelsResponse", [
            { no: 1, name: "channels", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.ChannelCloseSummary }
        ]);
    }
    create(value) {
        const message = { channels: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.ChannelCloseSummary channels */ 1:
                    message.channels.push(exports.ChannelCloseSummary.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.ChannelCloseSummary channels = 1; */
        for (let i = 0; i < message.channels.length; i++)
            exports.ChannelCloseSummary.internalBinaryWrite(message.channels[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ClosedChannelsResponse
 */
exports.ClosedChannelsResponse = new ClosedChannelsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Peer$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.Peer", [
            { no: 1, name: "pub_key", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "address", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 4, name: "bytes_sent", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 5, name: "bytes_recv", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 6, name: "sat_sent", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 7, name: "sat_recv", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 8, name: "inbound", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 9, name: "ping_time", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 10, name: "sync_type", kind: "enum", T: () => ["lnrpc.Peer.SyncType", Peer_SyncType] },
            { no: 11, name: "features", kind: "map", K: 13 /*ScalarType.UINT32*/, V: { kind: "message", T: () => exports.Feature } },
            { no: 12, name: "errors", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.TimestampedError },
            { no: 13, name: "flap_count", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 14, name: "last_flap_ns", kind: "scalar", T: 3 /*ScalarType.INT64*/ }
        ]);
    }
    create(value) {
        const message = { pubKey: "", address: "", bytesSent: "0", bytesRecv: "0", satSent: "0", satRecv: "0", inbound: false, pingTime: "0", syncType: 0, features: {}, errors: [], flapCount: 0, lastFlapNs: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string pub_key */ 1:
                    message.pubKey = reader.string();
                    break;
                case /* string address */ 3:
                    message.address = reader.string();
                    break;
                case /* uint64 bytes_sent */ 4:
                    message.bytesSent = reader.uint64().toString();
                    break;
                case /* uint64 bytes_recv */ 5:
                    message.bytesRecv = reader.uint64().toString();
                    break;
                case /* int64 sat_sent */ 6:
                    message.satSent = reader.int64().toString();
                    break;
                case /* int64 sat_recv */ 7:
                    message.satRecv = reader.int64().toString();
                    break;
                case /* bool inbound */ 8:
                    message.inbound = reader.bool();
                    break;
                case /* int64 ping_time */ 9:
                    message.pingTime = reader.int64().toString();
                    break;
                case /* lnrpc.Peer.SyncType sync_type */ 10:
                    message.syncType = reader.int32();
                    break;
                case /* map<uint32, lnrpc.Feature> features */ 11:
                    this.binaryReadMap11(message.features, reader, options);
                    break;
                case /* repeated lnrpc.TimestampedError errors */ 12:
                    message.errors.push(exports.TimestampedError.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* int32 flap_count */ 13:
                    message.flapCount = reader.int32();
                    break;
                case /* int64 last_flap_ns */ 14:
                    message.lastFlapNs = reader.int64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    binaryReadMap11(map, reader, options) {
        let len = reader.uint32(), end = reader.pos + len, key, val;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case 1:
                    key = reader.uint32();
                    break;
                case 2:
                    val = exports.Feature.internalBinaryRead(reader, reader.uint32(), options);
                    break;
                default: throw new globalThis.Error("unknown map entry field for field lnrpc.Peer.features");
            }
        }
        map[key !== null && key !== void 0 ? key : 0] = val !== null && val !== void 0 ? val : exports.Feature.create();
    }
    internalBinaryWrite(message, writer, options) {
        /* string pub_key = 1; */
        if (message.pubKey !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.pubKey);
        /* string address = 3; */
        if (message.address !== "")
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.address);
        /* uint64 bytes_sent = 4; */
        if (message.bytesSent !== "0")
            writer.tag(4, runtime_1.WireType.Varint).uint64(message.bytesSent);
        /* uint64 bytes_recv = 5; */
        if (message.bytesRecv !== "0")
            writer.tag(5, runtime_1.WireType.Varint).uint64(message.bytesRecv);
        /* int64 sat_sent = 6; */
        if (message.satSent !== "0")
            writer.tag(6, runtime_1.WireType.Varint).int64(message.satSent);
        /* int64 sat_recv = 7; */
        if (message.satRecv !== "0")
            writer.tag(7, runtime_1.WireType.Varint).int64(message.satRecv);
        /* bool inbound = 8; */
        if (message.inbound !== false)
            writer.tag(8, runtime_1.WireType.Varint).bool(message.inbound);
        /* int64 ping_time = 9; */
        if (message.pingTime !== "0")
            writer.tag(9, runtime_1.WireType.Varint).int64(message.pingTime);
        /* lnrpc.Peer.SyncType sync_type = 10; */
        if (message.syncType !== 0)
            writer.tag(10, runtime_1.WireType.Varint).int32(message.syncType);
        /* map<uint32, lnrpc.Feature> features = 11; */
        for (let k of Object.keys(message.features)) {
            writer.tag(11, runtime_1.WireType.LengthDelimited).fork().tag(1, runtime_1.WireType.Varint).uint32(parseInt(k));
            writer.tag(2, runtime_1.WireType.LengthDelimited).fork();
            exports.Feature.internalBinaryWrite(message.features[k], writer, options);
            writer.join().join();
        }
        /* repeated lnrpc.TimestampedError errors = 12; */
        for (let i = 0; i < message.errors.length; i++)
            exports.TimestampedError.internalBinaryWrite(message.errors[i], writer.tag(12, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* int32 flap_count = 13; */
        if (message.flapCount !== 0)
            writer.tag(13, runtime_1.WireType.Varint).int32(message.flapCount);
        /* int64 last_flap_ns = 14; */
        if (message.lastFlapNs !== "0")
            writer.tag(14, runtime_1.WireType.Varint).int64(message.lastFlapNs);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.Peer
 */
exports.Peer = new Peer$Type();
// @generated message type with reflection information, may provide speed optimized methods
class TimestampedError$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.TimestampedError", [
            { no: 1, name: "timestamp", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 2, name: "error", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { timestamp: "0", error: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 timestamp */ 1:
                    message.timestamp = reader.uint64().toString();
                    break;
                case /* string error */ 2:
                    message.error = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 timestamp = 1; */
        if (message.timestamp !== "0")
            writer.tag(1, runtime_1.WireType.Varint).uint64(message.timestamp);
        /* string error = 2; */
        if (message.error !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.error);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.TimestampedError
 */
exports.TimestampedError = new TimestampedError$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListPeersRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ListPeersRequest", [
            { no: 1, name: "latest_error", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { latestError: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool latest_error */ 1:
                    message.latestError = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool latest_error = 1; */
        if (message.latestError !== false)
            writer.tag(1, runtime_1.WireType.Varint).bool(message.latestError);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ListPeersRequest
 */
exports.ListPeersRequest = new ListPeersRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListPeersResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ListPeersResponse", [
            { no: 1, name: "peers", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.Peer }
        ]);
    }
    create(value) {
        const message = { peers: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.Peer peers */ 1:
                    message.peers.push(exports.Peer.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.Peer peers = 1; */
        for (let i = 0; i < message.peers.length; i++)
            exports.Peer.internalBinaryWrite(message.peers[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ListPeersResponse
 */
exports.ListPeersResponse = new ListPeersResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PeerEventSubscription$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PeerEventSubscription", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PeerEventSubscription
 */
exports.PeerEventSubscription = new PeerEventSubscription$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PeerEvent$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PeerEvent", [
            { no: 1, name: "pub_key", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "type", kind: "enum", T: () => ["lnrpc.PeerEvent.EventType", PeerEvent_EventType] }
        ]);
    }
    create(value) {
        const message = { pubKey: "", type: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string pub_key */ 1:
                    message.pubKey = reader.string();
                    break;
                case /* lnrpc.PeerEvent.EventType type */ 2:
                    message.type = reader.int32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string pub_key = 1; */
        if (message.pubKey !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.pubKey);
        /* lnrpc.PeerEvent.EventType type = 2; */
        if (message.type !== 0)
            writer.tag(2, runtime_1.WireType.Varint).int32(message.type);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PeerEvent
 */
exports.PeerEvent = new PeerEvent$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetInfoRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.GetInfoRequest", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.GetInfoRequest
 */
exports.GetInfoRequest = new GetInfoRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetInfoResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.GetInfoResponse", [
            { no: 14, name: "version", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 20, name: "commit_hash", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 1, name: "identity_pubkey", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "alias", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 17, name: "color", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "num_pending_channels", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 4, name: "num_active_channels", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 15, name: "num_inactive_channels", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 5, name: "num_peers", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 6, name: "block_height", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 8, name: "block_hash", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 13, name: "best_header_timestamp", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 9, name: "synced_to_chain", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 18, name: "synced_to_graph", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 10, name: "testnet", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 16, name: "chains", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.Chain },
            { no: 12, name: "uris", kind: "scalar", repeat: 2 /*RepeatType.UNPACKED*/, T: 9 /*ScalarType.STRING*/ },
            { no: 19, name: "features", kind: "map", K: 13 /*ScalarType.UINT32*/, V: { kind: "message", T: () => exports.Feature } }
        ]);
    }
    create(value) {
        const message = { version: "", commitHash: "", identityPubkey: "", alias: "", color: "", numPendingChannels: 0, numActiveChannels: 0, numInactiveChannels: 0, numPeers: 0, blockHeight: 0, blockHash: "", bestHeaderTimestamp: "0", syncedToChain: false, syncedToGraph: false, testnet: false, chains: [], uris: [], features: {} };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string version */ 14:
                    message.version = reader.string();
                    break;
                case /* string commit_hash */ 20:
                    message.commitHash = reader.string();
                    break;
                case /* string identity_pubkey */ 1:
                    message.identityPubkey = reader.string();
                    break;
                case /* string alias */ 2:
                    message.alias = reader.string();
                    break;
                case /* string color */ 17:
                    message.color = reader.string();
                    break;
                case /* uint32 num_pending_channels */ 3:
                    message.numPendingChannels = reader.uint32();
                    break;
                case /* uint32 num_active_channels */ 4:
                    message.numActiveChannels = reader.uint32();
                    break;
                case /* uint32 num_inactive_channels */ 15:
                    message.numInactiveChannels = reader.uint32();
                    break;
                case /* uint32 num_peers */ 5:
                    message.numPeers = reader.uint32();
                    break;
                case /* uint32 block_height */ 6:
                    message.blockHeight = reader.uint32();
                    break;
                case /* string block_hash */ 8:
                    message.blockHash = reader.string();
                    break;
                case /* int64 best_header_timestamp */ 13:
                    message.bestHeaderTimestamp = reader.int64().toString();
                    break;
                case /* bool synced_to_chain */ 9:
                    message.syncedToChain = reader.bool();
                    break;
                case /* bool synced_to_graph */ 18:
                    message.syncedToGraph = reader.bool();
                    break;
                case /* bool testnet = 10 [deprecated = true];*/ 10:
                    message.testnet = reader.bool();
                    break;
                case /* repeated lnrpc.Chain chains */ 16:
                    message.chains.push(exports.Chain.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* repeated string uris */ 12:
                    message.uris.push(reader.string());
                    break;
                case /* map<uint32, lnrpc.Feature> features */ 19:
                    this.binaryReadMap19(message.features, reader, options);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    binaryReadMap19(map, reader, options) {
        let len = reader.uint32(), end = reader.pos + len, key, val;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case 1:
                    key = reader.uint32();
                    break;
                case 2:
                    val = exports.Feature.internalBinaryRead(reader, reader.uint32(), options);
                    break;
                default: throw new globalThis.Error("unknown map entry field for field lnrpc.GetInfoResponse.features");
            }
        }
        map[key !== null && key !== void 0 ? key : 0] = val !== null && val !== void 0 ? val : exports.Feature.create();
    }
    internalBinaryWrite(message, writer, options) {
        /* string version = 14; */
        if (message.version !== "")
            writer.tag(14, runtime_1.WireType.LengthDelimited).string(message.version);
        /* string commit_hash = 20; */
        if (message.commitHash !== "")
            writer.tag(20, runtime_1.WireType.LengthDelimited).string(message.commitHash);
        /* string identity_pubkey = 1; */
        if (message.identityPubkey !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.identityPubkey);
        /* string alias = 2; */
        if (message.alias !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.alias);
        /* string color = 17; */
        if (message.color !== "")
            writer.tag(17, runtime_1.WireType.LengthDelimited).string(message.color);
        /* uint32 num_pending_channels = 3; */
        if (message.numPendingChannels !== 0)
            writer.tag(3, runtime_1.WireType.Varint).uint32(message.numPendingChannels);
        /* uint32 num_active_channels = 4; */
        if (message.numActiveChannels !== 0)
            writer.tag(4, runtime_1.WireType.Varint).uint32(message.numActiveChannels);
        /* uint32 num_inactive_channels = 15; */
        if (message.numInactiveChannels !== 0)
            writer.tag(15, runtime_1.WireType.Varint).uint32(message.numInactiveChannels);
        /* uint32 num_peers = 5; */
        if (message.numPeers !== 0)
            writer.tag(5, runtime_1.WireType.Varint).uint32(message.numPeers);
        /* uint32 block_height = 6; */
        if (message.blockHeight !== 0)
            writer.tag(6, runtime_1.WireType.Varint).uint32(message.blockHeight);
        /* string block_hash = 8; */
        if (message.blockHash !== "")
            writer.tag(8, runtime_1.WireType.LengthDelimited).string(message.blockHash);
        /* int64 best_header_timestamp = 13; */
        if (message.bestHeaderTimestamp !== "0")
            writer.tag(13, runtime_1.WireType.Varint).int64(message.bestHeaderTimestamp);
        /* bool synced_to_chain = 9; */
        if (message.syncedToChain !== false)
            writer.tag(9, runtime_1.WireType.Varint).bool(message.syncedToChain);
        /* bool synced_to_graph = 18; */
        if (message.syncedToGraph !== false)
            writer.tag(18, runtime_1.WireType.Varint).bool(message.syncedToGraph);
        /* bool testnet = 10 [deprecated = true]; */
        if (message.testnet !== false)
            writer.tag(10, runtime_1.WireType.Varint).bool(message.testnet);
        /* repeated lnrpc.Chain chains = 16; */
        for (let i = 0; i < message.chains.length; i++)
            exports.Chain.internalBinaryWrite(message.chains[i], writer.tag(16, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* repeated string uris = 12; */
        for (let i = 0; i < message.uris.length; i++)
            writer.tag(12, runtime_1.WireType.LengthDelimited).string(message.uris[i]);
        /* map<uint32, lnrpc.Feature> features = 19; */
        for (let k of Object.keys(message.features)) {
            writer.tag(19, runtime_1.WireType.LengthDelimited).fork().tag(1, runtime_1.WireType.Varint).uint32(parseInt(k));
            writer.tag(2, runtime_1.WireType.LengthDelimited).fork();
            exports.Feature.internalBinaryWrite(message.features[k], writer, options);
            writer.join().join();
        }
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.GetInfoResponse
 */
exports.GetInfoResponse = new GetInfoResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetRecoveryInfoRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.GetRecoveryInfoRequest", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.GetRecoveryInfoRequest
 */
exports.GetRecoveryInfoRequest = new GetRecoveryInfoRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetRecoveryInfoResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.GetRecoveryInfoResponse", [
            { no: 1, name: "recovery_mode", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 2, name: "recovery_finished", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 3, name: "progress", kind: "scalar", T: 1 /*ScalarType.DOUBLE*/ }
        ]);
    }
    create(value) {
        const message = { recoveryMode: false, recoveryFinished: false, progress: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool recovery_mode */ 1:
                    message.recoveryMode = reader.bool();
                    break;
                case /* bool recovery_finished */ 2:
                    message.recoveryFinished = reader.bool();
                    break;
                case /* double progress */ 3:
                    message.progress = reader.double();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool recovery_mode = 1; */
        if (message.recoveryMode !== false)
            writer.tag(1, runtime_1.WireType.Varint).bool(message.recoveryMode);
        /* bool recovery_finished = 2; */
        if (message.recoveryFinished !== false)
            writer.tag(2, runtime_1.WireType.Varint).bool(message.recoveryFinished);
        /* double progress = 3; */
        if (message.progress !== 0)
            writer.tag(3, runtime_1.WireType.Bit64).double(message.progress);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.GetRecoveryInfoResponse
 */
exports.GetRecoveryInfoResponse = new GetRecoveryInfoResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Chain$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.Chain", [
            { no: 1, name: "chain", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "network", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { chain: "", network: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string chain */ 1:
                    message.chain = reader.string();
                    break;
                case /* string network */ 2:
                    message.network = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string chain = 1; */
        if (message.chain !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.chain);
        /* string network = 2; */
        if (message.network !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.network);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.Chain
 */
exports.Chain = new Chain$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ConfirmationUpdate$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ConfirmationUpdate", [
            { no: 1, name: "block_sha", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "block_height", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 3, name: "num_confs_left", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { blockSha: new Uint8Array(0), blockHeight: 0, numConfsLeft: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes block_sha */ 1:
                    message.blockSha = reader.bytes();
                    break;
                case /* int32 block_height */ 2:
                    message.blockHeight = reader.int32();
                    break;
                case /* uint32 num_confs_left */ 3:
                    message.numConfsLeft = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes block_sha = 1; */
        if (message.blockSha.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.blockSha);
        /* int32 block_height = 2; */
        if (message.blockHeight !== 0)
            writer.tag(2, runtime_1.WireType.Varint).int32(message.blockHeight);
        /* uint32 num_confs_left = 3; */
        if (message.numConfsLeft !== 0)
            writer.tag(3, runtime_1.WireType.Varint).uint32(message.numConfsLeft);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ConfirmationUpdate
 */
exports.ConfirmationUpdate = new ConfirmationUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelOpenUpdate$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelOpenUpdate", [
            { no: 1, name: "channel_point", kind: "message", T: () => exports.ChannelPoint }
        ]);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.ChannelPoint channel_point */ 1:
                    message.channelPoint = exports.ChannelPoint.internalBinaryRead(reader, reader.uint32(), options, message.channelPoint);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.ChannelPoint channel_point = 1; */
        if (message.channelPoint)
            exports.ChannelPoint.internalBinaryWrite(message.channelPoint, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelOpenUpdate
 */
exports.ChannelOpenUpdate = new ChannelOpenUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelCloseUpdate$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelCloseUpdate", [
            { no: 1, name: "closing_txid", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "success", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { closingTxid: new Uint8Array(0), success: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes closing_txid */ 1:
                    message.closingTxid = reader.bytes();
                    break;
                case /* bool success */ 2:
                    message.success = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes closing_txid = 1; */
        if (message.closingTxid.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.closingTxid);
        /* bool success = 2; */
        if (message.success !== false)
            writer.tag(2, runtime_1.WireType.Varint).bool(message.success);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelCloseUpdate
 */
exports.ChannelCloseUpdate = new ChannelCloseUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CloseChannelRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.CloseChannelRequest", [
            { no: 1, name: "channel_point", kind: "message", T: () => exports.ChannelPoint },
            { no: 2, name: "force", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 3, name: "target_conf", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 4, name: "sat_per_byte", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 5, name: "delivery_address", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 6, name: "sat_per_vbyte", kind: "scalar", T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { force: false, targetConf: 0, satPerByte: "0", deliveryAddress: "", satPerVbyte: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.ChannelPoint channel_point */ 1:
                    message.channelPoint = exports.ChannelPoint.internalBinaryRead(reader, reader.uint32(), options, message.channelPoint);
                    break;
                case /* bool force */ 2:
                    message.force = reader.bool();
                    break;
                case /* int32 target_conf */ 3:
                    message.targetConf = reader.int32();
                    break;
                case /* int64 sat_per_byte = 4 [deprecated = true];*/ 4:
                    message.satPerByte = reader.int64().toString();
                    break;
                case /* string delivery_address */ 5:
                    message.deliveryAddress = reader.string();
                    break;
                case /* uint64 sat_per_vbyte */ 6:
                    message.satPerVbyte = reader.uint64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.ChannelPoint channel_point = 1; */
        if (message.channelPoint)
            exports.ChannelPoint.internalBinaryWrite(message.channelPoint, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* bool force = 2; */
        if (message.force !== false)
            writer.tag(2, runtime_1.WireType.Varint).bool(message.force);
        /* int32 target_conf = 3; */
        if (message.targetConf !== 0)
            writer.tag(3, runtime_1.WireType.Varint).int32(message.targetConf);
        /* int64 sat_per_byte = 4 [deprecated = true]; */
        if (message.satPerByte !== "0")
            writer.tag(4, runtime_1.WireType.Varint).int64(message.satPerByte);
        /* string delivery_address = 5; */
        if (message.deliveryAddress !== "")
            writer.tag(5, runtime_1.WireType.LengthDelimited).string(message.deliveryAddress);
        /* uint64 sat_per_vbyte = 6; */
        if (message.satPerVbyte !== "0")
            writer.tag(6, runtime_1.WireType.Varint).uint64(message.satPerVbyte);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.CloseChannelRequest
 */
exports.CloseChannelRequest = new CloseChannelRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CloseStatusUpdate$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.CloseStatusUpdate", [
            { no: 1, name: "close_pending", kind: "message", oneof: "update", T: () => exports.PendingUpdate },
            { no: 3, name: "chan_close", kind: "message", oneof: "update", T: () => exports.ChannelCloseUpdate }
        ]);
    }
    create(value) {
        const message = { update: { oneofKind: undefined } };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.PendingUpdate close_pending */ 1:
                    message.update = {
                        oneofKind: "closePending",
                        closePending: exports.PendingUpdate.internalBinaryRead(reader, reader.uint32(), options, message.update.closePending)
                    };
                    break;
                case /* lnrpc.ChannelCloseUpdate chan_close */ 3:
                    message.update = {
                        oneofKind: "chanClose",
                        chanClose: exports.ChannelCloseUpdate.internalBinaryRead(reader, reader.uint32(), options, message.update.chanClose)
                    };
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.PendingUpdate close_pending = 1; */
        if (message.update.oneofKind === "closePending")
            exports.PendingUpdate.internalBinaryWrite(message.update.closePending, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.ChannelCloseUpdate chan_close = 3; */
        if (message.update.oneofKind === "chanClose")
            exports.ChannelCloseUpdate.internalBinaryWrite(message.update.chanClose, writer.tag(3, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.CloseStatusUpdate
 */
exports.CloseStatusUpdate = new CloseStatusUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PendingUpdate$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PendingUpdate", [
            { no: 1, name: "txid", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "output_index", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { txid: new Uint8Array(0), outputIndex: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes txid */ 1:
                    message.txid = reader.bytes();
                    break;
                case /* uint32 output_index */ 2:
                    message.outputIndex = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes txid = 1; */
        if (message.txid.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.txid);
        /* uint32 output_index = 2; */
        if (message.outputIndex !== 0)
            writer.tag(2, runtime_1.WireType.Varint).uint32(message.outputIndex);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PendingUpdate
 */
exports.PendingUpdate = new PendingUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ReadyForPsbtFunding$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ReadyForPsbtFunding", [
            { no: 1, name: "funding_address", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "funding_amount", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "psbt", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { fundingAddress: "", fundingAmount: "0", psbt: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string funding_address */ 1:
                    message.fundingAddress = reader.string();
                    break;
                case /* int64 funding_amount */ 2:
                    message.fundingAmount = reader.int64().toString();
                    break;
                case /* bytes psbt */ 3:
                    message.psbt = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string funding_address = 1; */
        if (message.fundingAddress !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.fundingAddress);
        /* int64 funding_amount = 2; */
        if (message.fundingAmount !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.fundingAmount);
        /* bytes psbt = 3; */
        if (message.psbt.length)
            writer.tag(3, runtime_1.WireType.LengthDelimited).bytes(message.psbt);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ReadyForPsbtFunding
 */
exports.ReadyForPsbtFunding = new ReadyForPsbtFunding$Type();
// @generated message type with reflection information, may provide speed optimized methods
class OpenChannelRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.OpenChannelRequest", [
            { no: 1, name: "sat_per_vbyte", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 2, name: "node_pubkey", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 3, name: "node_pubkey_string", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 4, name: "local_funding_amount", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 5, name: "push_sat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 6, name: "target_conf", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 7, name: "sat_per_byte", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 8, name: "private", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 9, name: "min_htlc_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 10, name: "remote_csv_delay", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 11, name: "min_confs", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 12, name: "spend_unconfirmed", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 13, name: "close_address", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 14, name: "funding_shim", kind: "message", T: () => exports.FundingShim },
            { no: 15, name: "remote_max_value_in_flight_msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 16, name: "remote_max_htlcs", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 17, name: "max_local_csv", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { satPerVbyte: "0", nodePubkey: new Uint8Array(0), nodePubkeyString: "", localFundingAmount: "0", pushSat: "0", targetConf: 0, satPerByte: "0", private: false, minHtlcMsat: "0", remoteCsvDelay: 0, minConfs: 0, spendUnconfirmed: false, closeAddress: "", remoteMaxValueInFlightMsat: "0", remoteMaxHtlcs: 0, maxLocalCsv: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 sat_per_vbyte */ 1:
                    message.satPerVbyte = reader.uint64().toString();
                    break;
                case /* bytes node_pubkey */ 2:
                    message.nodePubkey = reader.bytes();
                    break;
                case /* string node_pubkey_string = 3 [deprecated = true];*/ 3:
                    message.nodePubkeyString = reader.string();
                    break;
                case /* int64 local_funding_amount */ 4:
                    message.localFundingAmount = reader.int64().toString();
                    break;
                case /* int64 push_sat */ 5:
                    message.pushSat = reader.int64().toString();
                    break;
                case /* int32 target_conf */ 6:
                    message.targetConf = reader.int32();
                    break;
                case /* int64 sat_per_byte = 7 [deprecated = true];*/ 7:
                    message.satPerByte = reader.int64().toString();
                    break;
                case /* bool private */ 8:
                    message.private = reader.bool();
                    break;
                case /* int64 min_htlc_msat */ 9:
                    message.minHtlcMsat = reader.int64().toString();
                    break;
                case /* uint32 remote_csv_delay */ 10:
                    message.remoteCsvDelay = reader.uint32();
                    break;
                case /* int32 min_confs */ 11:
                    message.minConfs = reader.int32();
                    break;
                case /* bool spend_unconfirmed */ 12:
                    message.spendUnconfirmed = reader.bool();
                    break;
                case /* string close_address */ 13:
                    message.closeAddress = reader.string();
                    break;
                case /* lnrpc.FundingShim funding_shim */ 14:
                    message.fundingShim = exports.FundingShim.internalBinaryRead(reader, reader.uint32(), options, message.fundingShim);
                    break;
                case /* uint64 remote_max_value_in_flight_msat */ 15:
                    message.remoteMaxValueInFlightMsat = reader.uint64().toString();
                    break;
                case /* uint32 remote_max_htlcs */ 16:
                    message.remoteMaxHtlcs = reader.uint32();
                    break;
                case /* uint32 max_local_csv */ 17:
                    message.maxLocalCsv = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 sat_per_vbyte = 1; */
        if (message.satPerVbyte !== "0")
            writer.tag(1, runtime_1.WireType.Varint).uint64(message.satPerVbyte);
        /* bytes node_pubkey = 2; */
        if (message.nodePubkey.length)
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.nodePubkey);
        /* string node_pubkey_string = 3 [deprecated = true]; */
        if (message.nodePubkeyString !== "")
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.nodePubkeyString);
        /* int64 local_funding_amount = 4; */
        if (message.localFundingAmount !== "0")
            writer.tag(4, runtime_1.WireType.Varint).int64(message.localFundingAmount);
        /* int64 push_sat = 5; */
        if (message.pushSat !== "0")
            writer.tag(5, runtime_1.WireType.Varint).int64(message.pushSat);
        /* int32 target_conf = 6; */
        if (message.targetConf !== 0)
            writer.tag(6, runtime_1.WireType.Varint).int32(message.targetConf);
        /* int64 sat_per_byte = 7 [deprecated = true]; */
        if (message.satPerByte !== "0")
            writer.tag(7, runtime_1.WireType.Varint).int64(message.satPerByte);
        /* bool private = 8; */
        if (message.private !== false)
            writer.tag(8, runtime_1.WireType.Varint).bool(message.private);
        /* int64 min_htlc_msat = 9; */
        if (message.minHtlcMsat !== "0")
            writer.tag(9, runtime_1.WireType.Varint).int64(message.minHtlcMsat);
        /* uint32 remote_csv_delay = 10; */
        if (message.remoteCsvDelay !== 0)
            writer.tag(10, runtime_1.WireType.Varint).uint32(message.remoteCsvDelay);
        /* int32 min_confs = 11; */
        if (message.minConfs !== 0)
            writer.tag(11, runtime_1.WireType.Varint).int32(message.minConfs);
        /* bool spend_unconfirmed = 12; */
        if (message.spendUnconfirmed !== false)
            writer.tag(12, runtime_1.WireType.Varint).bool(message.spendUnconfirmed);
        /* string close_address = 13; */
        if (message.closeAddress !== "")
            writer.tag(13, runtime_1.WireType.LengthDelimited).string(message.closeAddress);
        /* lnrpc.FundingShim funding_shim = 14; */
        if (message.fundingShim)
            exports.FundingShim.internalBinaryWrite(message.fundingShim, writer.tag(14, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* uint64 remote_max_value_in_flight_msat = 15; */
        if (message.remoteMaxValueInFlightMsat !== "0")
            writer.tag(15, runtime_1.WireType.Varint).uint64(message.remoteMaxValueInFlightMsat);
        /* uint32 remote_max_htlcs = 16; */
        if (message.remoteMaxHtlcs !== 0)
            writer.tag(16, runtime_1.WireType.Varint).uint32(message.remoteMaxHtlcs);
        /* uint32 max_local_csv = 17; */
        if (message.maxLocalCsv !== 0)
            writer.tag(17, runtime_1.WireType.Varint).uint32(message.maxLocalCsv);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.OpenChannelRequest
 */
exports.OpenChannelRequest = new OpenChannelRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class OpenStatusUpdate$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.OpenStatusUpdate", [
            { no: 1, name: "chan_pending", kind: "message", oneof: "update", T: () => exports.PendingUpdate },
            { no: 3, name: "chan_open", kind: "message", oneof: "update", T: () => exports.ChannelOpenUpdate },
            { no: 5, name: "psbt_fund", kind: "message", oneof: "update", T: () => exports.ReadyForPsbtFunding },
            { no: 4, name: "pending_chan_id", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { update: { oneofKind: undefined }, pendingChanId: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.PendingUpdate chan_pending */ 1:
                    message.update = {
                        oneofKind: "chanPending",
                        chanPending: exports.PendingUpdate.internalBinaryRead(reader, reader.uint32(), options, message.update.chanPending)
                    };
                    break;
                case /* lnrpc.ChannelOpenUpdate chan_open */ 3:
                    message.update = {
                        oneofKind: "chanOpen",
                        chanOpen: exports.ChannelOpenUpdate.internalBinaryRead(reader, reader.uint32(), options, message.update.chanOpen)
                    };
                    break;
                case /* lnrpc.ReadyForPsbtFunding psbt_fund */ 5:
                    message.update = {
                        oneofKind: "psbtFund",
                        psbtFund: exports.ReadyForPsbtFunding.internalBinaryRead(reader, reader.uint32(), options, message.update.psbtFund)
                    };
                    break;
                case /* bytes pending_chan_id */ 4:
                    message.pendingChanId = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.PendingUpdate chan_pending = 1; */
        if (message.update.oneofKind === "chanPending")
            exports.PendingUpdate.internalBinaryWrite(message.update.chanPending, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.ChannelOpenUpdate chan_open = 3; */
        if (message.update.oneofKind === "chanOpen")
            exports.ChannelOpenUpdate.internalBinaryWrite(message.update.chanOpen, writer.tag(3, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.ReadyForPsbtFunding psbt_fund = 5; */
        if (message.update.oneofKind === "psbtFund")
            exports.ReadyForPsbtFunding.internalBinaryWrite(message.update.psbtFund, writer.tag(5, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* bytes pending_chan_id = 4; */
        if (message.pendingChanId.length)
            writer.tag(4, runtime_1.WireType.LengthDelimited).bytes(message.pendingChanId);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.OpenStatusUpdate
 */
exports.OpenStatusUpdate = new OpenStatusUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class KeyLocator$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.KeyLocator", [
            { no: 1, name: "key_family", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 2, name: "key_index", kind: "scalar", T: 5 /*ScalarType.INT32*/ }
        ]);
    }
    create(value) {
        const message = { keyFamily: 0, keyIndex: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* int32 key_family */ 1:
                    message.keyFamily = reader.int32();
                    break;
                case /* int32 key_index */ 2:
                    message.keyIndex = reader.int32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* int32 key_family = 1; */
        if (message.keyFamily !== 0)
            writer.tag(1, runtime_1.WireType.Varint).int32(message.keyFamily);
        /* int32 key_index = 2; */
        if (message.keyIndex !== 0)
            writer.tag(2, runtime_1.WireType.Varint).int32(message.keyIndex);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.KeyLocator
 */
exports.KeyLocator = new KeyLocator$Type();
// @generated message type with reflection information, may provide speed optimized methods
class KeyDescriptor$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.KeyDescriptor", [
            { no: 1, name: "raw_key_bytes", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "key_loc", kind: "message", T: () => exports.KeyLocator }
        ]);
    }
    create(value) {
        const message = { rawKeyBytes: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes raw_key_bytes */ 1:
                    message.rawKeyBytes = reader.bytes();
                    break;
                case /* lnrpc.KeyLocator key_loc */ 2:
                    message.keyLoc = exports.KeyLocator.internalBinaryRead(reader, reader.uint32(), options, message.keyLoc);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes raw_key_bytes = 1; */
        if (message.rawKeyBytes.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.rawKeyBytes);
        /* lnrpc.KeyLocator key_loc = 2; */
        if (message.keyLoc)
            exports.KeyLocator.internalBinaryWrite(message.keyLoc, writer.tag(2, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.KeyDescriptor
 */
exports.KeyDescriptor = new KeyDescriptor$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChanPointShim$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChanPointShim", [
            { no: 1, name: "amt", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 2, name: "chan_point", kind: "message", T: () => exports.ChannelPoint },
            { no: 3, name: "local_key", kind: "message", T: () => exports.KeyDescriptor },
            { no: 4, name: "remote_key", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 5, name: "pending_chan_id", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 6, name: "thaw_height", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { amt: "0", remoteKey: new Uint8Array(0), pendingChanId: new Uint8Array(0), thawHeight: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* int64 amt */ 1:
                    message.amt = reader.int64().toString();
                    break;
                case /* lnrpc.ChannelPoint chan_point */ 2:
                    message.chanPoint = exports.ChannelPoint.internalBinaryRead(reader, reader.uint32(), options, message.chanPoint);
                    break;
                case /* lnrpc.KeyDescriptor local_key */ 3:
                    message.localKey = exports.KeyDescriptor.internalBinaryRead(reader, reader.uint32(), options, message.localKey);
                    break;
                case /* bytes remote_key */ 4:
                    message.remoteKey = reader.bytes();
                    break;
                case /* bytes pending_chan_id */ 5:
                    message.pendingChanId = reader.bytes();
                    break;
                case /* uint32 thaw_height */ 6:
                    message.thawHeight = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* int64 amt = 1; */
        if (message.amt !== "0")
            writer.tag(1, runtime_1.WireType.Varint).int64(message.amt);
        /* lnrpc.ChannelPoint chan_point = 2; */
        if (message.chanPoint)
            exports.ChannelPoint.internalBinaryWrite(message.chanPoint, writer.tag(2, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.KeyDescriptor local_key = 3; */
        if (message.localKey)
            exports.KeyDescriptor.internalBinaryWrite(message.localKey, writer.tag(3, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* bytes remote_key = 4; */
        if (message.remoteKey.length)
            writer.tag(4, runtime_1.WireType.LengthDelimited).bytes(message.remoteKey);
        /* bytes pending_chan_id = 5; */
        if (message.pendingChanId.length)
            writer.tag(5, runtime_1.WireType.LengthDelimited).bytes(message.pendingChanId);
        /* uint32 thaw_height = 6; */
        if (message.thawHeight !== 0)
            writer.tag(6, runtime_1.WireType.Varint).uint32(message.thawHeight);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChanPointShim
 */
exports.ChanPointShim = new ChanPointShim$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PsbtShim$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PsbtShim", [
            { no: 1, name: "pending_chan_id", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "base_psbt", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 3, name: "no_publish", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { pendingChanId: new Uint8Array(0), basePsbt: new Uint8Array(0), noPublish: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes pending_chan_id */ 1:
                    message.pendingChanId = reader.bytes();
                    break;
                case /* bytes base_psbt */ 2:
                    message.basePsbt = reader.bytes();
                    break;
                case /* bool no_publish */ 3:
                    message.noPublish = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes pending_chan_id = 1; */
        if (message.pendingChanId.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.pendingChanId);
        /* bytes base_psbt = 2; */
        if (message.basePsbt.length)
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.basePsbt);
        /* bool no_publish = 3; */
        if (message.noPublish !== false)
            writer.tag(3, runtime_1.WireType.Varint).bool(message.noPublish);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PsbtShim
 */
exports.PsbtShim = new PsbtShim$Type();
// @generated message type with reflection information, may provide speed optimized methods
class FundingShim$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.FundingShim", [
            { no: 1, name: "chan_point_shim", kind: "message", oneof: "shim", T: () => exports.ChanPointShim },
            { no: 2, name: "psbt_shim", kind: "message", oneof: "shim", T: () => exports.PsbtShim }
        ]);
    }
    create(value) {
        const message = { shim: { oneofKind: undefined } };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.ChanPointShim chan_point_shim */ 1:
                    message.shim = {
                        oneofKind: "chanPointShim",
                        chanPointShim: exports.ChanPointShim.internalBinaryRead(reader, reader.uint32(), options, message.shim.chanPointShim)
                    };
                    break;
                case /* lnrpc.PsbtShim psbt_shim */ 2:
                    message.shim = {
                        oneofKind: "psbtShim",
                        psbtShim: exports.PsbtShim.internalBinaryRead(reader, reader.uint32(), options, message.shim.psbtShim)
                    };
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.ChanPointShim chan_point_shim = 1; */
        if (message.shim.oneofKind === "chanPointShim")
            exports.ChanPointShim.internalBinaryWrite(message.shim.chanPointShim, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.PsbtShim psbt_shim = 2; */
        if (message.shim.oneofKind === "psbtShim")
            exports.PsbtShim.internalBinaryWrite(message.shim.psbtShim, writer.tag(2, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.FundingShim
 */
exports.FundingShim = new FundingShim$Type();
// @generated message type with reflection information, may provide speed optimized methods
class FundingShimCancel$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.FundingShimCancel", [
            { no: 1, name: "pending_chan_id", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { pendingChanId: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes pending_chan_id */ 1:
                    message.pendingChanId = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes pending_chan_id = 1; */
        if (message.pendingChanId.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.pendingChanId);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.FundingShimCancel
 */
exports.FundingShimCancel = new FundingShimCancel$Type();
// @generated message type with reflection information, may provide speed optimized methods
class FundingPsbtVerify$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.FundingPsbtVerify", [
            { no: 1, name: "funded_psbt", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "pending_chan_id", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { fundedPsbt: new Uint8Array(0), pendingChanId: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes funded_psbt */ 1:
                    message.fundedPsbt = reader.bytes();
                    break;
                case /* bytes pending_chan_id */ 2:
                    message.pendingChanId = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes funded_psbt = 1; */
        if (message.fundedPsbt.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.fundedPsbt);
        /* bytes pending_chan_id = 2; */
        if (message.pendingChanId.length)
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.pendingChanId);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.FundingPsbtVerify
 */
exports.FundingPsbtVerify = new FundingPsbtVerify$Type();
// @generated message type with reflection information, may provide speed optimized methods
class FundingPsbtFinalize$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.FundingPsbtFinalize", [
            { no: 1, name: "signed_psbt", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "pending_chan_id", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 3, name: "final_raw_tx", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { signedPsbt: new Uint8Array(0), pendingChanId: new Uint8Array(0), finalRawTx: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes signed_psbt */ 1:
                    message.signedPsbt = reader.bytes();
                    break;
                case /* bytes pending_chan_id */ 2:
                    message.pendingChanId = reader.bytes();
                    break;
                case /* bytes final_raw_tx */ 3:
                    message.finalRawTx = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes signed_psbt = 1; */
        if (message.signedPsbt.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.signedPsbt);
        /* bytes pending_chan_id = 2; */
        if (message.pendingChanId.length)
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.pendingChanId);
        /* bytes final_raw_tx = 3; */
        if (message.finalRawTx.length)
            writer.tag(3, runtime_1.WireType.LengthDelimited).bytes(message.finalRawTx);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.FundingPsbtFinalize
 */
exports.FundingPsbtFinalize = new FundingPsbtFinalize$Type();
// @generated message type with reflection information, may provide speed optimized methods
class FundingTransitionMsg$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.FundingTransitionMsg", [
            { no: 1, name: "shim_register", kind: "message", oneof: "trigger", T: () => exports.FundingShim },
            { no: 2, name: "shim_cancel", kind: "message", oneof: "trigger", T: () => exports.FundingShimCancel },
            { no: 3, name: "psbt_verify", kind: "message", oneof: "trigger", T: () => exports.FundingPsbtVerify },
            { no: 4, name: "psbt_finalize", kind: "message", oneof: "trigger", T: () => exports.FundingPsbtFinalize }
        ]);
    }
    create(value) {
        const message = { trigger: { oneofKind: undefined } };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.FundingShim shim_register */ 1:
                    message.trigger = {
                        oneofKind: "shimRegister",
                        shimRegister: exports.FundingShim.internalBinaryRead(reader, reader.uint32(), options, message.trigger.shimRegister)
                    };
                    break;
                case /* lnrpc.FundingShimCancel shim_cancel */ 2:
                    message.trigger = {
                        oneofKind: "shimCancel",
                        shimCancel: exports.FundingShimCancel.internalBinaryRead(reader, reader.uint32(), options, message.trigger.shimCancel)
                    };
                    break;
                case /* lnrpc.FundingPsbtVerify psbt_verify */ 3:
                    message.trigger = {
                        oneofKind: "psbtVerify",
                        psbtVerify: exports.FundingPsbtVerify.internalBinaryRead(reader, reader.uint32(), options, message.trigger.psbtVerify)
                    };
                    break;
                case /* lnrpc.FundingPsbtFinalize psbt_finalize */ 4:
                    message.trigger = {
                        oneofKind: "psbtFinalize",
                        psbtFinalize: exports.FundingPsbtFinalize.internalBinaryRead(reader, reader.uint32(), options, message.trigger.psbtFinalize)
                    };
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.FundingShim shim_register = 1; */
        if (message.trigger.oneofKind === "shimRegister")
            exports.FundingShim.internalBinaryWrite(message.trigger.shimRegister, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.FundingShimCancel shim_cancel = 2; */
        if (message.trigger.oneofKind === "shimCancel")
            exports.FundingShimCancel.internalBinaryWrite(message.trigger.shimCancel, writer.tag(2, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.FundingPsbtVerify psbt_verify = 3; */
        if (message.trigger.oneofKind === "psbtVerify")
            exports.FundingPsbtVerify.internalBinaryWrite(message.trigger.psbtVerify, writer.tag(3, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.FundingPsbtFinalize psbt_finalize = 4; */
        if (message.trigger.oneofKind === "psbtFinalize")
            exports.FundingPsbtFinalize.internalBinaryWrite(message.trigger.psbtFinalize, writer.tag(4, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.FundingTransitionMsg
 */
exports.FundingTransitionMsg = new FundingTransitionMsg$Type();
// @generated message type with reflection information, may provide speed optimized methods
class FundingStateStepResp$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.FundingStateStepResp", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.FundingStateStepResp
 */
exports.FundingStateStepResp = new FundingStateStepResp$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PendingHTLC$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PendingHTLC", [
            { no: 1, name: "incoming", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 2, name: "amount", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "outpoint", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 4, name: "maturity_height", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 5, name: "blocks_til_maturity", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 6, name: "stage", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { incoming: false, amount: "0", outpoint: "", maturityHeight: 0, blocksTilMaturity: 0, stage: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool incoming */ 1:
                    message.incoming = reader.bool();
                    break;
                case /* int64 amount */ 2:
                    message.amount = reader.int64().toString();
                    break;
                case /* string outpoint */ 3:
                    message.outpoint = reader.string();
                    break;
                case /* uint32 maturity_height */ 4:
                    message.maturityHeight = reader.uint32();
                    break;
                case /* int32 blocks_til_maturity */ 5:
                    message.blocksTilMaturity = reader.int32();
                    break;
                case /* uint32 stage */ 6:
                    message.stage = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool incoming = 1; */
        if (message.incoming !== false)
            writer.tag(1, runtime_1.WireType.Varint).bool(message.incoming);
        /* int64 amount = 2; */
        if (message.amount !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.amount);
        /* string outpoint = 3; */
        if (message.outpoint !== "")
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.outpoint);
        /* uint32 maturity_height = 4; */
        if (message.maturityHeight !== 0)
            writer.tag(4, runtime_1.WireType.Varint).uint32(message.maturityHeight);
        /* int32 blocks_til_maturity = 5; */
        if (message.blocksTilMaturity !== 0)
            writer.tag(5, runtime_1.WireType.Varint).int32(message.blocksTilMaturity);
        /* uint32 stage = 6; */
        if (message.stage !== 0)
            writer.tag(6, runtime_1.WireType.Varint).uint32(message.stage);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PendingHTLC
 */
exports.PendingHTLC = new PendingHTLC$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PendingChannelsRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PendingChannelsRequest", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PendingChannelsRequest
 */
exports.PendingChannelsRequest = new PendingChannelsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PendingChannelsResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PendingChannelsResponse", [
            { no: 1, name: "total_limbo_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 2, name: "pending_open_channels", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.PendingChannelsResponse_PendingOpenChannel },
            { no: 3, name: "pending_closing_channels", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.PendingChannelsResponse_ClosedChannel },
            { no: 4, name: "pending_force_closing_channels", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.PendingChannelsResponse_ForceClosedChannel },
            { no: 5, name: "waiting_close_channels", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.PendingChannelsResponse_WaitingCloseChannel }
        ]);
    }
    create(value) {
        const message = { totalLimboBalance: "0", pendingOpenChannels: [], pendingClosingChannels: [], pendingForceClosingChannels: [], waitingCloseChannels: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* int64 total_limbo_balance */ 1:
                    message.totalLimboBalance = reader.int64().toString();
                    break;
                case /* repeated lnrpc.PendingChannelsResponse.PendingOpenChannel pending_open_channels */ 2:
                    message.pendingOpenChannels.push(exports.PendingChannelsResponse_PendingOpenChannel.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* repeated lnrpc.PendingChannelsResponse.ClosedChannel pending_closing_channels = 3 [deprecated = true];*/ 3:
                    message.pendingClosingChannels.push(exports.PendingChannelsResponse_ClosedChannel.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* repeated lnrpc.PendingChannelsResponse.ForceClosedChannel pending_force_closing_channels */ 4:
                    message.pendingForceClosingChannels.push(exports.PendingChannelsResponse_ForceClosedChannel.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* repeated lnrpc.PendingChannelsResponse.WaitingCloseChannel waiting_close_channels */ 5:
                    message.waitingCloseChannels.push(exports.PendingChannelsResponse_WaitingCloseChannel.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* int64 total_limbo_balance = 1; */
        if (message.totalLimboBalance !== "0")
            writer.tag(1, runtime_1.WireType.Varint).int64(message.totalLimboBalance);
        /* repeated lnrpc.PendingChannelsResponse.PendingOpenChannel pending_open_channels = 2; */
        for (let i = 0; i < message.pendingOpenChannels.length; i++)
            exports.PendingChannelsResponse_PendingOpenChannel.internalBinaryWrite(message.pendingOpenChannels[i], writer.tag(2, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* repeated lnrpc.PendingChannelsResponse.ClosedChannel pending_closing_channels = 3 [deprecated = true]; */
        for (let i = 0; i < message.pendingClosingChannels.length; i++)
            exports.PendingChannelsResponse_ClosedChannel.internalBinaryWrite(message.pendingClosingChannels[i], writer.tag(3, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* repeated lnrpc.PendingChannelsResponse.ForceClosedChannel pending_force_closing_channels = 4; */
        for (let i = 0; i < message.pendingForceClosingChannels.length; i++)
            exports.PendingChannelsResponse_ForceClosedChannel.internalBinaryWrite(message.pendingForceClosingChannels[i], writer.tag(4, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* repeated lnrpc.PendingChannelsResponse.WaitingCloseChannel waiting_close_channels = 5; */
        for (let i = 0; i < message.waitingCloseChannels.length; i++)
            exports.PendingChannelsResponse_WaitingCloseChannel.internalBinaryWrite(message.waitingCloseChannels[i], writer.tag(5, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PendingChannelsResponse
 */
exports.PendingChannelsResponse = new PendingChannelsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PendingChannelsResponse_PendingChannel$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PendingChannelsResponse.PendingChannel", [
            { no: 1, name: "remote_node_pub", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "channel_point", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "capacity", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "local_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 5, name: "remote_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 6, name: "local_chan_reserve_sat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 7, name: "remote_chan_reserve_sat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 8, name: "initiator", kind: "enum", T: () => ["lnrpc.Initiator", Initiator, "INITIATOR_"] },
            { no: 9, name: "commitment_type", kind: "enum", T: () => ["lnrpc.CommitmentType", CommitmentType] }
        ]);
    }
    create(value) {
        const message = { remoteNodePub: "", channelPoint: "", capacity: "0", localBalance: "0", remoteBalance: "0", localChanReserveSat: "0", remoteChanReserveSat: "0", initiator: 0, commitmentType: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string remote_node_pub */ 1:
                    message.remoteNodePub = reader.string();
                    break;
                case /* string channel_point */ 2:
                    message.channelPoint = reader.string();
                    break;
                case /* int64 capacity */ 3:
                    message.capacity = reader.int64().toString();
                    break;
                case /* int64 local_balance */ 4:
                    message.localBalance = reader.int64().toString();
                    break;
                case /* int64 remote_balance */ 5:
                    message.remoteBalance = reader.int64().toString();
                    break;
                case /* int64 local_chan_reserve_sat */ 6:
                    message.localChanReserveSat = reader.int64().toString();
                    break;
                case /* int64 remote_chan_reserve_sat */ 7:
                    message.remoteChanReserveSat = reader.int64().toString();
                    break;
                case /* lnrpc.Initiator initiator */ 8:
                    message.initiator = reader.int32();
                    break;
                case /* lnrpc.CommitmentType commitment_type */ 9:
                    message.commitmentType = reader.int32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string remote_node_pub = 1; */
        if (message.remoteNodePub !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.remoteNodePub);
        /* string channel_point = 2; */
        if (message.channelPoint !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.channelPoint);
        /* int64 capacity = 3; */
        if (message.capacity !== "0")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.capacity);
        /* int64 local_balance = 4; */
        if (message.localBalance !== "0")
            writer.tag(4, runtime_1.WireType.Varint).int64(message.localBalance);
        /* int64 remote_balance = 5; */
        if (message.remoteBalance !== "0")
            writer.tag(5, runtime_1.WireType.Varint).int64(message.remoteBalance);
        /* int64 local_chan_reserve_sat = 6; */
        if (message.localChanReserveSat !== "0")
            writer.tag(6, runtime_1.WireType.Varint).int64(message.localChanReserveSat);
        /* int64 remote_chan_reserve_sat = 7; */
        if (message.remoteChanReserveSat !== "0")
            writer.tag(7, runtime_1.WireType.Varint).int64(message.remoteChanReserveSat);
        /* lnrpc.Initiator initiator = 8; */
        if (message.initiator !== 0)
            writer.tag(8, runtime_1.WireType.Varint).int32(message.initiator);
        /* lnrpc.CommitmentType commitment_type = 9; */
        if (message.commitmentType !== 0)
            writer.tag(9, runtime_1.WireType.Varint).int32(message.commitmentType);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PendingChannelsResponse.PendingChannel
 */
exports.PendingChannelsResponse_PendingChannel = new PendingChannelsResponse_PendingChannel$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PendingChannelsResponse_PendingOpenChannel$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PendingChannelsResponse.PendingOpenChannel", [
            { no: 1, name: "channel", kind: "message", T: () => exports.PendingChannelsResponse_PendingChannel },
            { no: 2, name: "confirmation_height", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 4, name: "commit_fee", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 5, name: "commit_weight", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 6, name: "fee_per_kw", kind: "scalar", T: 3 /*ScalarType.INT64*/ }
        ]);
    }
    create(value) {
        const message = { confirmationHeight: 0, commitFee: "0", commitWeight: "0", feePerKw: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.PendingChannelsResponse.PendingChannel channel */ 1:
                    message.channel = exports.PendingChannelsResponse_PendingChannel.internalBinaryRead(reader, reader.uint32(), options, message.channel);
                    break;
                case /* uint32 confirmation_height */ 2:
                    message.confirmationHeight = reader.uint32();
                    break;
                case /* int64 commit_fee */ 4:
                    message.commitFee = reader.int64().toString();
                    break;
                case /* int64 commit_weight */ 5:
                    message.commitWeight = reader.int64().toString();
                    break;
                case /* int64 fee_per_kw */ 6:
                    message.feePerKw = reader.int64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.PendingChannelsResponse.PendingChannel channel = 1; */
        if (message.channel)
            exports.PendingChannelsResponse_PendingChannel.internalBinaryWrite(message.channel, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* uint32 confirmation_height = 2; */
        if (message.confirmationHeight !== 0)
            writer.tag(2, runtime_1.WireType.Varint).uint32(message.confirmationHeight);
        /* int64 commit_fee = 4; */
        if (message.commitFee !== "0")
            writer.tag(4, runtime_1.WireType.Varint).int64(message.commitFee);
        /* int64 commit_weight = 5; */
        if (message.commitWeight !== "0")
            writer.tag(5, runtime_1.WireType.Varint).int64(message.commitWeight);
        /* int64 fee_per_kw = 6; */
        if (message.feePerKw !== "0")
            writer.tag(6, runtime_1.WireType.Varint).int64(message.feePerKw);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PendingChannelsResponse.PendingOpenChannel
 */
exports.PendingChannelsResponse_PendingOpenChannel = new PendingChannelsResponse_PendingOpenChannel$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PendingChannelsResponse_WaitingCloseChannel$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PendingChannelsResponse.WaitingCloseChannel", [
            { no: 1, name: "channel", kind: "message", T: () => exports.PendingChannelsResponse_PendingChannel },
            { no: 2, name: "limbo_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "commitments", kind: "message", T: () => exports.PendingChannelsResponse_Commitments }
        ]);
    }
    create(value) {
        const message = { limboBalance: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.PendingChannelsResponse.PendingChannel channel */ 1:
                    message.channel = exports.PendingChannelsResponse_PendingChannel.internalBinaryRead(reader, reader.uint32(), options, message.channel);
                    break;
                case /* int64 limbo_balance */ 2:
                    message.limboBalance = reader.int64().toString();
                    break;
                case /* lnrpc.PendingChannelsResponse.Commitments commitments */ 3:
                    message.commitments = exports.PendingChannelsResponse_Commitments.internalBinaryRead(reader, reader.uint32(), options, message.commitments);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.PendingChannelsResponse.PendingChannel channel = 1; */
        if (message.channel)
            exports.PendingChannelsResponse_PendingChannel.internalBinaryWrite(message.channel, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* int64 limbo_balance = 2; */
        if (message.limboBalance !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.limboBalance);
        /* lnrpc.PendingChannelsResponse.Commitments commitments = 3; */
        if (message.commitments)
            exports.PendingChannelsResponse_Commitments.internalBinaryWrite(message.commitments, writer.tag(3, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PendingChannelsResponse.WaitingCloseChannel
 */
exports.PendingChannelsResponse_WaitingCloseChannel = new PendingChannelsResponse_WaitingCloseChannel$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PendingChannelsResponse_Commitments$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PendingChannelsResponse.Commitments", [
            { no: 1, name: "local_txid", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "remote_txid", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "remote_pending_txid", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 4, name: "local_commit_fee_sat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 5, name: "remote_commit_fee_sat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 6, name: "remote_pending_commit_fee_sat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { localTxid: "", remoteTxid: "", remotePendingTxid: "", localCommitFeeSat: "0", remoteCommitFeeSat: "0", remotePendingCommitFeeSat: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string local_txid */ 1:
                    message.localTxid = reader.string();
                    break;
                case /* string remote_txid */ 2:
                    message.remoteTxid = reader.string();
                    break;
                case /* string remote_pending_txid */ 3:
                    message.remotePendingTxid = reader.string();
                    break;
                case /* uint64 local_commit_fee_sat */ 4:
                    message.localCommitFeeSat = reader.uint64().toString();
                    break;
                case /* uint64 remote_commit_fee_sat */ 5:
                    message.remoteCommitFeeSat = reader.uint64().toString();
                    break;
                case /* uint64 remote_pending_commit_fee_sat */ 6:
                    message.remotePendingCommitFeeSat = reader.uint64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string local_txid = 1; */
        if (message.localTxid !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.localTxid);
        /* string remote_txid = 2; */
        if (message.remoteTxid !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.remoteTxid);
        /* string remote_pending_txid = 3; */
        if (message.remotePendingTxid !== "")
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.remotePendingTxid);
        /* uint64 local_commit_fee_sat = 4; */
        if (message.localCommitFeeSat !== "0")
            writer.tag(4, runtime_1.WireType.Varint).uint64(message.localCommitFeeSat);
        /* uint64 remote_commit_fee_sat = 5; */
        if (message.remoteCommitFeeSat !== "0")
            writer.tag(5, runtime_1.WireType.Varint).uint64(message.remoteCommitFeeSat);
        /* uint64 remote_pending_commit_fee_sat = 6; */
        if (message.remotePendingCommitFeeSat !== "0")
            writer.tag(6, runtime_1.WireType.Varint).uint64(message.remotePendingCommitFeeSat);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PendingChannelsResponse.Commitments
 */
exports.PendingChannelsResponse_Commitments = new PendingChannelsResponse_Commitments$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PendingChannelsResponse_ClosedChannel$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PendingChannelsResponse.ClosedChannel", [
            { no: 1, name: "channel", kind: "message", T: () => exports.PendingChannelsResponse_PendingChannel },
            { no: 2, name: "closing_txid", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { closingTxid: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.PendingChannelsResponse.PendingChannel channel */ 1:
                    message.channel = exports.PendingChannelsResponse_PendingChannel.internalBinaryRead(reader, reader.uint32(), options, message.channel);
                    break;
                case /* string closing_txid */ 2:
                    message.closingTxid = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.PendingChannelsResponse.PendingChannel channel = 1; */
        if (message.channel)
            exports.PendingChannelsResponse_PendingChannel.internalBinaryWrite(message.channel, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* string closing_txid = 2; */
        if (message.closingTxid !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.closingTxid);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PendingChannelsResponse.ClosedChannel
 */
exports.PendingChannelsResponse_ClosedChannel = new PendingChannelsResponse_ClosedChannel$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PendingChannelsResponse_ForceClosedChannel$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PendingChannelsResponse.ForceClosedChannel", [
            { no: 1, name: "channel", kind: "message", T: () => exports.PendingChannelsResponse_PendingChannel },
            { no: 2, name: "closing_txid", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "limbo_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "maturity_height", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 5, name: "blocks_til_maturity", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 6, name: "recovered_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 8, name: "pending_htlcs", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.PendingHTLC },
            { no: 9, name: "anchor", kind: "enum", T: () => ["lnrpc.PendingChannelsResponse.ForceClosedChannel.AnchorState", PendingChannelsResponse_ForceClosedChannel_AnchorState] }
        ]);
    }
    create(value) {
        const message = { closingTxid: "", limboBalance: "0", maturityHeight: 0, blocksTilMaturity: 0, recoveredBalance: "0", pendingHtlcs: [], anchor: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.PendingChannelsResponse.PendingChannel channel */ 1:
                    message.channel = exports.PendingChannelsResponse_PendingChannel.internalBinaryRead(reader, reader.uint32(), options, message.channel);
                    break;
                case /* string closing_txid */ 2:
                    message.closingTxid = reader.string();
                    break;
                case /* int64 limbo_balance */ 3:
                    message.limboBalance = reader.int64().toString();
                    break;
                case /* uint32 maturity_height */ 4:
                    message.maturityHeight = reader.uint32();
                    break;
                case /* int32 blocks_til_maturity */ 5:
                    message.blocksTilMaturity = reader.int32();
                    break;
                case /* int64 recovered_balance */ 6:
                    message.recoveredBalance = reader.int64().toString();
                    break;
                case /* repeated lnrpc.PendingHTLC pending_htlcs */ 8:
                    message.pendingHtlcs.push(exports.PendingHTLC.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* lnrpc.PendingChannelsResponse.ForceClosedChannel.AnchorState anchor */ 9:
                    message.anchor = reader.int32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.PendingChannelsResponse.PendingChannel channel = 1; */
        if (message.channel)
            exports.PendingChannelsResponse_PendingChannel.internalBinaryWrite(message.channel, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* string closing_txid = 2; */
        if (message.closingTxid !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.closingTxid);
        /* int64 limbo_balance = 3; */
        if (message.limboBalance !== "0")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.limboBalance);
        /* uint32 maturity_height = 4; */
        if (message.maturityHeight !== 0)
            writer.tag(4, runtime_1.WireType.Varint).uint32(message.maturityHeight);
        /* int32 blocks_til_maturity = 5; */
        if (message.blocksTilMaturity !== 0)
            writer.tag(5, runtime_1.WireType.Varint).int32(message.blocksTilMaturity);
        /* int64 recovered_balance = 6; */
        if (message.recoveredBalance !== "0")
            writer.tag(6, runtime_1.WireType.Varint).int64(message.recoveredBalance);
        /* repeated lnrpc.PendingHTLC pending_htlcs = 8; */
        for (let i = 0; i < message.pendingHtlcs.length; i++)
            exports.PendingHTLC.internalBinaryWrite(message.pendingHtlcs[i], writer.tag(8, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.PendingChannelsResponse.ForceClosedChannel.AnchorState anchor = 9; */
        if (message.anchor !== 0)
            writer.tag(9, runtime_1.WireType.Varint).int32(message.anchor);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PendingChannelsResponse.ForceClosedChannel
 */
exports.PendingChannelsResponse_ForceClosedChannel = new PendingChannelsResponse_ForceClosedChannel$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelEventSubscription$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelEventSubscription", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelEventSubscription
 */
exports.ChannelEventSubscription = new ChannelEventSubscription$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelEventUpdate$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelEventUpdate", [
            { no: 1, name: "open_channel", kind: "message", oneof: "channel", T: () => exports.Channel },
            { no: 2, name: "closed_channel", kind: "message", oneof: "channel", T: () => exports.ChannelCloseSummary },
            { no: 3, name: "active_channel", kind: "message", oneof: "channel", T: () => exports.ChannelPoint },
            { no: 4, name: "inactive_channel", kind: "message", oneof: "channel", T: () => exports.ChannelPoint },
            { no: 6, name: "pending_open_channel", kind: "message", oneof: "channel", T: () => exports.PendingUpdate },
            { no: 5, name: "type", kind: "enum", T: () => ["lnrpc.ChannelEventUpdate.UpdateType", ChannelEventUpdate_UpdateType] }
        ]);
    }
    create(value) {
        const message = { channel: { oneofKind: undefined }, type: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.Channel open_channel */ 1:
                    message.channel = {
                        oneofKind: "openChannel",
                        openChannel: exports.Channel.internalBinaryRead(reader, reader.uint32(), options, message.channel.openChannel)
                    };
                    break;
                case /* lnrpc.ChannelCloseSummary closed_channel */ 2:
                    message.channel = {
                        oneofKind: "closedChannel",
                        closedChannel: exports.ChannelCloseSummary.internalBinaryRead(reader, reader.uint32(), options, message.channel.closedChannel)
                    };
                    break;
                case /* lnrpc.ChannelPoint active_channel */ 3:
                    message.channel = {
                        oneofKind: "activeChannel",
                        activeChannel: exports.ChannelPoint.internalBinaryRead(reader, reader.uint32(), options, message.channel.activeChannel)
                    };
                    break;
                case /* lnrpc.ChannelPoint inactive_channel */ 4:
                    message.channel = {
                        oneofKind: "inactiveChannel",
                        inactiveChannel: exports.ChannelPoint.internalBinaryRead(reader, reader.uint32(), options, message.channel.inactiveChannel)
                    };
                    break;
                case /* lnrpc.PendingUpdate pending_open_channel */ 6:
                    message.channel = {
                        oneofKind: "pendingOpenChannel",
                        pendingOpenChannel: exports.PendingUpdate.internalBinaryRead(reader, reader.uint32(), options, message.channel.pendingOpenChannel)
                    };
                    break;
                case /* lnrpc.ChannelEventUpdate.UpdateType type */ 5:
                    message.type = reader.int32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.Channel open_channel = 1; */
        if (message.channel.oneofKind === "openChannel")
            exports.Channel.internalBinaryWrite(message.channel.openChannel, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.ChannelCloseSummary closed_channel = 2; */
        if (message.channel.oneofKind === "closedChannel")
            exports.ChannelCloseSummary.internalBinaryWrite(message.channel.closedChannel, writer.tag(2, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.ChannelPoint active_channel = 3; */
        if (message.channel.oneofKind === "activeChannel")
            exports.ChannelPoint.internalBinaryWrite(message.channel.activeChannel, writer.tag(3, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.ChannelPoint inactive_channel = 4; */
        if (message.channel.oneofKind === "inactiveChannel")
            exports.ChannelPoint.internalBinaryWrite(message.channel.inactiveChannel, writer.tag(4, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.PendingUpdate pending_open_channel = 6; */
        if (message.channel.oneofKind === "pendingOpenChannel")
            exports.PendingUpdate.internalBinaryWrite(message.channel.pendingOpenChannel, writer.tag(6, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.ChannelEventUpdate.UpdateType type = 5; */
        if (message.type !== 0)
            writer.tag(5, runtime_1.WireType.Varint).int32(message.type);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelEventUpdate
 */
exports.ChannelEventUpdate = new ChannelEventUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class WalletAccountBalance$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.WalletAccountBalance", [
            { no: 1, name: "confirmed_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 2, name: "unconfirmed_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ }
        ]);
    }
    create(value) {
        const message = { confirmedBalance: "0", unconfirmedBalance: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* int64 confirmed_balance */ 1:
                    message.confirmedBalance = reader.int64().toString();
                    break;
                case /* int64 unconfirmed_balance */ 2:
                    message.unconfirmedBalance = reader.int64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* int64 confirmed_balance = 1; */
        if (message.confirmedBalance !== "0")
            writer.tag(1, runtime_1.WireType.Varint).int64(message.confirmedBalance);
        /* int64 unconfirmed_balance = 2; */
        if (message.unconfirmedBalance !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.unconfirmedBalance);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.WalletAccountBalance
 */
exports.WalletAccountBalance = new WalletAccountBalance$Type();
// @generated message type with reflection information, may provide speed optimized methods
class WalletBalanceRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.WalletBalanceRequest", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.WalletBalanceRequest
 */
exports.WalletBalanceRequest = new WalletBalanceRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class WalletBalanceResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.WalletBalanceResponse", [
            { no: 1, name: "total_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 2, name: "confirmed_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "unconfirmed_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "account_balance", kind: "map", K: 9 /*ScalarType.STRING*/, V: { kind: "message", T: () => exports.WalletAccountBalance } }
        ]);
    }
    create(value) {
        const message = { totalBalance: "0", confirmedBalance: "0", unconfirmedBalance: "0", accountBalance: {} };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* int64 total_balance */ 1:
                    message.totalBalance = reader.int64().toString();
                    break;
                case /* int64 confirmed_balance */ 2:
                    message.confirmedBalance = reader.int64().toString();
                    break;
                case /* int64 unconfirmed_balance */ 3:
                    message.unconfirmedBalance = reader.int64().toString();
                    break;
                case /* map<string, lnrpc.WalletAccountBalance> account_balance */ 4:
                    this.binaryReadMap4(message.accountBalance, reader, options);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    binaryReadMap4(map, reader, options) {
        let len = reader.uint32(), end = reader.pos + len, key, val;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case 1:
                    key = reader.string();
                    break;
                case 2:
                    val = exports.WalletAccountBalance.internalBinaryRead(reader, reader.uint32(), options);
                    break;
                default: throw new globalThis.Error("unknown map entry field for field lnrpc.WalletBalanceResponse.account_balance");
            }
        }
        map[key !== null && key !== void 0 ? key : ""] = val !== null && val !== void 0 ? val : exports.WalletAccountBalance.create();
    }
    internalBinaryWrite(message, writer, options) {
        /* int64 total_balance = 1; */
        if (message.totalBalance !== "0")
            writer.tag(1, runtime_1.WireType.Varint).int64(message.totalBalance);
        /* int64 confirmed_balance = 2; */
        if (message.confirmedBalance !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.confirmedBalance);
        /* int64 unconfirmed_balance = 3; */
        if (message.unconfirmedBalance !== "0")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.unconfirmedBalance);
        /* map<string, lnrpc.WalletAccountBalance> account_balance = 4; */
        for (let k of Object.keys(message.accountBalance)) {
            writer.tag(4, runtime_1.WireType.LengthDelimited).fork().tag(1, runtime_1.WireType.LengthDelimited).string(k);
            writer.tag(2, runtime_1.WireType.LengthDelimited).fork();
            exports.WalletAccountBalance.internalBinaryWrite(message.accountBalance[k], writer, options);
            writer.join().join();
        }
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.WalletBalanceResponse
 */
exports.WalletBalanceResponse = new WalletBalanceResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Amount$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.Amount", [
            { no: 1, name: "sat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 2, name: "msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { sat: "0", msat: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 sat */ 1:
                    message.sat = reader.uint64().toString();
                    break;
                case /* uint64 msat */ 2:
                    message.msat = reader.uint64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 sat = 1; */
        if (message.sat !== "0")
            writer.tag(1, runtime_1.WireType.Varint).uint64(message.sat);
        /* uint64 msat = 2; */
        if (message.msat !== "0")
            writer.tag(2, runtime_1.WireType.Varint).uint64(message.msat);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.Amount
 */
exports.Amount = new Amount$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelBalanceRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelBalanceRequest", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelBalanceRequest
 */
exports.ChannelBalanceRequest = new ChannelBalanceRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelBalanceResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelBalanceResponse", [
            { no: 1, name: "balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 2, name: "pending_open_balance", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "local_balance", kind: "message", T: () => exports.Amount },
            { no: 4, name: "remote_balance", kind: "message", T: () => exports.Amount },
            { no: 5, name: "unsettled_local_balance", kind: "message", T: () => exports.Amount },
            { no: 6, name: "unsettled_remote_balance", kind: "message", T: () => exports.Amount },
            { no: 7, name: "pending_open_local_balance", kind: "message", T: () => exports.Amount },
            { no: 8, name: "pending_open_remote_balance", kind: "message", T: () => exports.Amount }
        ]);
    }
    create(value) {
        const message = { balance: "0", pendingOpenBalance: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* int64 balance = 1 [deprecated = true];*/ 1:
                    message.balance = reader.int64().toString();
                    break;
                case /* int64 pending_open_balance = 2 [deprecated = true];*/ 2:
                    message.pendingOpenBalance = reader.int64().toString();
                    break;
                case /* lnrpc.Amount local_balance */ 3:
                    message.localBalance = exports.Amount.internalBinaryRead(reader, reader.uint32(), options, message.localBalance);
                    break;
                case /* lnrpc.Amount remote_balance */ 4:
                    message.remoteBalance = exports.Amount.internalBinaryRead(reader, reader.uint32(), options, message.remoteBalance);
                    break;
                case /* lnrpc.Amount unsettled_local_balance */ 5:
                    message.unsettledLocalBalance = exports.Amount.internalBinaryRead(reader, reader.uint32(), options, message.unsettledLocalBalance);
                    break;
                case /* lnrpc.Amount unsettled_remote_balance */ 6:
                    message.unsettledRemoteBalance = exports.Amount.internalBinaryRead(reader, reader.uint32(), options, message.unsettledRemoteBalance);
                    break;
                case /* lnrpc.Amount pending_open_local_balance */ 7:
                    message.pendingOpenLocalBalance = exports.Amount.internalBinaryRead(reader, reader.uint32(), options, message.pendingOpenLocalBalance);
                    break;
                case /* lnrpc.Amount pending_open_remote_balance */ 8:
                    message.pendingOpenRemoteBalance = exports.Amount.internalBinaryRead(reader, reader.uint32(), options, message.pendingOpenRemoteBalance);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* int64 balance = 1 [deprecated = true]; */
        if (message.balance !== "0")
            writer.tag(1, runtime_1.WireType.Varint).int64(message.balance);
        /* int64 pending_open_balance = 2 [deprecated = true]; */
        if (message.pendingOpenBalance !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.pendingOpenBalance);
        /* lnrpc.Amount local_balance = 3; */
        if (message.localBalance)
            exports.Amount.internalBinaryWrite(message.localBalance, writer.tag(3, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.Amount remote_balance = 4; */
        if (message.remoteBalance)
            exports.Amount.internalBinaryWrite(message.remoteBalance, writer.tag(4, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.Amount unsettled_local_balance = 5; */
        if (message.unsettledLocalBalance)
            exports.Amount.internalBinaryWrite(message.unsettledLocalBalance, writer.tag(5, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.Amount unsettled_remote_balance = 6; */
        if (message.unsettledRemoteBalance)
            exports.Amount.internalBinaryWrite(message.unsettledRemoteBalance, writer.tag(6, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.Amount pending_open_local_balance = 7; */
        if (message.pendingOpenLocalBalance)
            exports.Amount.internalBinaryWrite(message.pendingOpenLocalBalance, writer.tag(7, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.Amount pending_open_remote_balance = 8; */
        if (message.pendingOpenRemoteBalance)
            exports.Amount.internalBinaryWrite(message.pendingOpenRemoteBalance, writer.tag(8, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelBalanceResponse
 */
exports.ChannelBalanceResponse = new ChannelBalanceResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class QueryRoutesRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.QueryRoutesRequest", [
            { no: 1, name: "pub_key", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "amt", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 12, name: "amt_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "final_cltv_delta", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 5, name: "fee_limit", kind: "message", T: () => exports.FeeLimit },
            { no: 6, name: "ignored_nodes", kind: "scalar", repeat: 2 /*RepeatType.UNPACKED*/, T: 12 /*ScalarType.BYTES*/ },
            { no: 7, name: "ignored_edges", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.EdgeLocator },
            { no: 8, name: "source_pub_key", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 9, name: "use_mission_control", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 10, name: "ignored_pairs", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.NodePair },
            { no: 11, name: "cltv_limit", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 13, name: "dest_custom_records", kind: "map", K: 4 /*ScalarType.UINT64*/, V: { kind: "scalar", T: 12 /*ScalarType.BYTES*/ } },
            { no: 14, name: "outgoing_chan_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 15, name: "last_hop_pubkey", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 16, name: "route_hints", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.RouteHint },
            { no: 17, name: "dest_features", kind: "enum", repeat: 1 /*RepeatType.PACKED*/, T: () => ["lnrpc.FeatureBit", FeatureBit] }
        ]);
    }
    create(value) {
        const message = { pubKey: "", amt: "0", amtMsat: "0", finalCltvDelta: 0, ignoredNodes: [], ignoredEdges: [], sourcePubKey: "", useMissionControl: false, ignoredPairs: [], cltvLimit: 0, destCustomRecords: {}, outgoingChanId: "0", lastHopPubkey: new Uint8Array(0), routeHints: [], destFeatures: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string pub_key */ 1:
                    message.pubKey = reader.string();
                    break;
                case /* int64 amt */ 2:
                    message.amt = reader.int64().toString();
                    break;
                case /* int64 amt_msat */ 12:
                    message.amtMsat = reader.int64().toString();
                    break;
                case /* int32 final_cltv_delta */ 4:
                    message.finalCltvDelta = reader.int32();
                    break;
                case /* lnrpc.FeeLimit fee_limit */ 5:
                    message.feeLimit = exports.FeeLimit.internalBinaryRead(reader, reader.uint32(), options, message.feeLimit);
                    break;
                case /* repeated bytes ignored_nodes */ 6:
                    message.ignoredNodes.push(reader.bytes());
                    break;
                case /* repeated lnrpc.EdgeLocator ignored_edges = 7 [deprecated = true];*/ 7:
                    message.ignoredEdges.push(exports.EdgeLocator.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* string source_pub_key */ 8:
                    message.sourcePubKey = reader.string();
                    break;
                case /* bool use_mission_control */ 9:
                    message.useMissionControl = reader.bool();
                    break;
                case /* repeated lnrpc.NodePair ignored_pairs */ 10:
                    message.ignoredPairs.push(exports.NodePair.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* uint32 cltv_limit */ 11:
                    message.cltvLimit = reader.uint32();
                    break;
                case /* map<uint64, bytes> dest_custom_records */ 13:
                    this.binaryReadMap13(message.destCustomRecords, reader, options);
                    break;
                case /* uint64 outgoing_chan_id = 14 [jstype = JS_STRING];*/ 14:
                    message.outgoingChanId = reader.uint64().toString();
                    break;
                case /* bytes last_hop_pubkey */ 15:
                    message.lastHopPubkey = reader.bytes();
                    break;
                case /* repeated lnrpc.RouteHint route_hints */ 16:
                    message.routeHints.push(exports.RouteHint.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* repeated lnrpc.FeatureBit dest_features */ 17:
                    if (wireType === runtime_1.WireType.LengthDelimited)
                        for (let e = reader.int32() + reader.pos; reader.pos < e;)
                            message.destFeatures.push(reader.int32());
                    else
                        message.destFeatures.push(reader.int32());
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    binaryReadMap13(map, reader, options) {
        let len = reader.uint32(), end = reader.pos + len, key, val;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case 1:
                    key = reader.uint64().toString();
                    break;
                case 2:
                    val = reader.bytes();
                    break;
                default: throw new globalThis.Error("unknown map entry field for field lnrpc.QueryRoutesRequest.dest_custom_records");
            }
        }
        map[key !== null && key !== void 0 ? key : "0"] = val !== null && val !== void 0 ? val : new Uint8Array(0);
    }
    internalBinaryWrite(message, writer, options) {
        /* string pub_key = 1; */
        if (message.pubKey !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.pubKey);
        /* int64 amt = 2; */
        if (message.amt !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.amt);
        /* int64 amt_msat = 12; */
        if (message.amtMsat !== "0")
            writer.tag(12, runtime_1.WireType.Varint).int64(message.amtMsat);
        /* int32 final_cltv_delta = 4; */
        if (message.finalCltvDelta !== 0)
            writer.tag(4, runtime_1.WireType.Varint).int32(message.finalCltvDelta);
        /* lnrpc.FeeLimit fee_limit = 5; */
        if (message.feeLimit)
            exports.FeeLimit.internalBinaryWrite(message.feeLimit, writer.tag(5, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* repeated bytes ignored_nodes = 6; */
        for (let i = 0; i < message.ignoredNodes.length; i++)
            writer.tag(6, runtime_1.WireType.LengthDelimited).bytes(message.ignoredNodes[i]);
        /* repeated lnrpc.EdgeLocator ignored_edges = 7 [deprecated = true]; */
        for (let i = 0; i < message.ignoredEdges.length; i++)
            exports.EdgeLocator.internalBinaryWrite(message.ignoredEdges[i], writer.tag(7, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* string source_pub_key = 8; */
        if (message.sourcePubKey !== "")
            writer.tag(8, runtime_1.WireType.LengthDelimited).string(message.sourcePubKey);
        /* bool use_mission_control = 9; */
        if (message.useMissionControl !== false)
            writer.tag(9, runtime_1.WireType.Varint).bool(message.useMissionControl);
        /* repeated lnrpc.NodePair ignored_pairs = 10; */
        for (let i = 0; i < message.ignoredPairs.length; i++)
            exports.NodePair.internalBinaryWrite(message.ignoredPairs[i], writer.tag(10, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* uint32 cltv_limit = 11; */
        if (message.cltvLimit !== 0)
            writer.tag(11, runtime_1.WireType.Varint).uint32(message.cltvLimit);
        /* map<uint64, bytes> dest_custom_records = 13; */
        for (let k of Object.keys(message.destCustomRecords))
            writer.tag(13, runtime_1.WireType.LengthDelimited).fork().tag(1, runtime_1.WireType.Varint).uint64(k).tag(2, runtime_1.WireType.LengthDelimited).bytes(message.destCustomRecords[k]).join();
        /* uint64 outgoing_chan_id = 14 [jstype = JS_STRING]; */
        if (message.outgoingChanId !== "0")
            writer.tag(14, runtime_1.WireType.Varint).uint64(message.outgoingChanId);
        /* bytes last_hop_pubkey = 15; */
        if (message.lastHopPubkey.length)
            writer.tag(15, runtime_1.WireType.LengthDelimited).bytes(message.lastHopPubkey);
        /* repeated lnrpc.RouteHint route_hints = 16; */
        for (let i = 0; i < message.routeHints.length; i++)
            exports.RouteHint.internalBinaryWrite(message.routeHints[i], writer.tag(16, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* repeated lnrpc.FeatureBit dest_features = 17; */
        if (message.destFeatures.length) {
            writer.tag(17, runtime_1.WireType.LengthDelimited).fork();
            for (let i = 0; i < message.destFeatures.length; i++)
                writer.int32(message.destFeatures[i]);
            writer.join();
        }
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.QueryRoutesRequest
 */
exports.QueryRoutesRequest = new QueryRoutesRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class NodePair$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.NodePair", [
            { no: 1, name: "from", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "to", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { from: new Uint8Array(0), to: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes from */ 1:
                    message.from = reader.bytes();
                    break;
                case /* bytes to */ 2:
                    message.to = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes from = 1; */
        if (message.from.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.from);
        /* bytes to = 2; */
        if (message.to.length)
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.to);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.NodePair
 */
exports.NodePair = new NodePair$Type();
// @generated message type with reflection information, may provide speed optimized methods
class EdgeLocator$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.EdgeLocator", [
            { no: 1, name: "channel_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 2, name: "direction_reverse", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { channelId: "0", directionReverse: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 channel_id = 1 [jstype = JS_STRING];*/ 1:
                    message.channelId = reader.uint64().toString();
                    break;
                case /* bool direction_reverse */ 2:
                    message.directionReverse = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 channel_id = 1 [jstype = JS_STRING]; */
        if (message.channelId !== "0")
            writer.tag(1, runtime_1.WireType.Varint).uint64(message.channelId);
        /* bool direction_reverse = 2; */
        if (message.directionReverse !== false)
            writer.tag(2, runtime_1.WireType.Varint).bool(message.directionReverse);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.EdgeLocator
 */
exports.EdgeLocator = new EdgeLocator$Type();
// @generated message type with reflection information, may provide speed optimized methods
class QueryRoutesResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.QueryRoutesResponse", [
            { no: 1, name: "routes", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.Route },
            { no: 2, name: "success_prob", kind: "scalar", T: 1 /*ScalarType.DOUBLE*/ }
        ]);
    }
    create(value) {
        const message = { routes: [], successProb: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.Route routes */ 1:
                    message.routes.push(exports.Route.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* double success_prob */ 2:
                    message.successProb = reader.double();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.Route routes = 1; */
        for (let i = 0; i < message.routes.length; i++)
            exports.Route.internalBinaryWrite(message.routes[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* double success_prob = 2; */
        if (message.successProb !== 0)
            writer.tag(2, runtime_1.WireType.Bit64).double(message.successProb);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.QueryRoutesResponse
 */
exports.QueryRoutesResponse = new QueryRoutesResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Hop$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.Hop", [
            { no: 1, name: "chan_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 2, name: "chan_capacity", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "amt_to_forward", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "fee", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 5, name: "expiry", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 6, name: "amt_to_forward_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 7, name: "fee_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 8, name: "pub_key", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 9, name: "tlv_payload", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 10, name: "mpp_record", kind: "message", T: () => exports.MPPRecord },
            { no: 12, name: "amp_record", kind: "message", T: () => exports.AMPRecord },
            { no: 11, name: "custom_records", kind: "map", K: 4 /*ScalarType.UINT64*/, V: { kind: "scalar", T: 12 /*ScalarType.BYTES*/ } }
        ]);
    }
    create(value) {
        const message = { chanId: "0", chanCapacity: "0", amtToForward: "0", fee: "0", expiry: 0, amtToForwardMsat: "0", feeMsat: "0", pubKey: "", tlvPayload: false, customRecords: {} };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 chan_id = 1 [jstype = JS_STRING];*/ 1:
                    message.chanId = reader.uint64().toString();
                    break;
                case /* int64 chan_capacity = 2 [deprecated = true];*/ 2:
                    message.chanCapacity = reader.int64().toString();
                    break;
                case /* int64 amt_to_forward = 3 [deprecated = true];*/ 3:
                    message.amtToForward = reader.int64().toString();
                    break;
                case /* int64 fee = 4 [deprecated = true];*/ 4:
                    message.fee = reader.int64().toString();
                    break;
                case /* uint32 expiry */ 5:
                    message.expiry = reader.uint32();
                    break;
                case /* int64 amt_to_forward_msat */ 6:
                    message.amtToForwardMsat = reader.int64().toString();
                    break;
                case /* int64 fee_msat */ 7:
                    message.feeMsat = reader.int64().toString();
                    break;
                case /* string pub_key */ 8:
                    message.pubKey = reader.string();
                    break;
                case /* bool tlv_payload */ 9:
                    message.tlvPayload = reader.bool();
                    break;
                case /* lnrpc.MPPRecord mpp_record */ 10:
                    message.mppRecord = exports.MPPRecord.internalBinaryRead(reader, reader.uint32(), options, message.mppRecord);
                    break;
                case /* lnrpc.AMPRecord amp_record */ 12:
                    message.ampRecord = exports.AMPRecord.internalBinaryRead(reader, reader.uint32(), options, message.ampRecord);
                    break;
                case /* map<uint64, bytes> custom_records */ 11:
                    this.binaryReadMap11(message.customRecords, reader, options);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    binaryReadMap11(map, reader, options) {
        let len = reader.uint32(), end = reader.pos + len, key, val;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case 1:
                    key = reader.uint64().toString();
                    break;
                case 2:
                    val = reader.bytes();
                    break;
                default: throw new globalThis.Error("unknown map entry field for field lnrpc.Hop.custom_records");
            }
        }
        map[key !== null && key !== void 0 ? key : "0"] = val !== null && val !== void 0 ? val : new Uint8Array(0);
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 chan_id = 1 [jstype = JS_STRING]; */
        if (message.chanId !== "0")
            writer.tag(1, runtime_1.WireType.Varint).uint64(message.chanId);
        /* int64 chan_capacity = 2 [deprecated = true]; */
        if (message.chanCapacity !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.chanCapacity);
        /* int64 amt_to_forward = 3 [deprecated = true]; */
        if (message.amtToForward !== "0")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.amtToForward);
        /* int64 fee = 4 [deprecated = true]; */
        if (message.fee !== "0")
            writer.tag(4, runtime_1.WireType.Varint).int64(message.fee);
        /* uint32 expiry = 5; */
        if (message.expiry !== 0)
            writer.tag(5, runtime_1.WireType.Varint).uint32(message.expiry);
        /* int64 amt_to_forward_msat = 6; */
        if (message.amtToForwardMsat !== "0")
            writer.tag(6, runtime_1.WireType.Varint).int64(message.amtToForwardMsat);
        /* int64 fee_msat = 7; */
        if (message.feeMsat !== "0")
            writer.tag(7, runtime_1.WireType.Varint).int64(message.feeMsat);
        /* string pub_key = 8; */
        if (message.pubKey !== "")
            writer.tag(8, runtime_1.WireType.LengthDelimited).string(message.pubKey);
        /* bool tlv_payload = 9; */
        if (message.tlvPayload !== false)
            writer.tag(9, runtime_1.WireType.Varint).bool(message.tlvPayload);
        /* lnrpc.MPPRecord mpp_record = 10; */
        if (message.mppRecord)
            exports.MPPRecord.internalBinaryWrite(message.mppRecord, writer.tag(10, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.AMPRecord amp_record = 12; */
        if (message.ampRecord)
            exports.AMPRecord.internalBinaryWrite(message.ampRecord, writer.tag(12, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* map<uint64, bytes> custom_records = 11; */
        for (let k of Object.keys(message.customRecords))
            writer.tag(11, runtime_1.WireType.LengthDelimited).fork().tag(1, runtime_1.WireType.Varint).uint64(k).tag(2, runtime_1.WireType.LengthDelimited).bytes(message.customRecords[k]).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.Hop
 */
exports.Hop = new Hop$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MPPRecord$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.MPPRecord", [
            { no: 11, name: "payment_addr", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 10, name: "total_amt_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ }
        ]);
    }
    create(value) {
        const message = { paymentAddr: new Uint8Array(0), totalAmtMsat: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes payment_addr */ 11:
                    message.paymentAddr = reader.bytes();
                    break;
                case /* int64 total_amt_msat */ 10:
                    message.totalAmtMsat = reader.int64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes payment_addr = 11; */
        if (message.paymentAddr.length)
            writer.tag(11, runtime_1.WireType.LengthDelimited).bytes(message.paymentAddr);
        /* int64 total_amt_msat = 10; */
        if (message.totalAmtMsat !== "0")
            writer.tag(10, runtime_1.WireType.Varint).int64(message.totalAmtMsat);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.MPPRecord
 */
exports.MPPRecord = new MPPRecord$Type();
// @generated message type with reflection information, may provide speed optimized methods
class AMPRecord$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.AMPRecord", [
            { no: 1, name: "root_share", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "set_id", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 3, name: "child_index", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { rootShare: new Uint8Array(0), setId: new Uint8Array(0), childIndex: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes root_share */ 1:
                    message.rootShare = reader.bytes();
                    break;
                case /* bytes set_id */ 2:
                    message.setId = reader.bytes();
                    break;
                case /* uint32 child_index */ 3:
                    message.childIndex = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes root_share = 1; */
        if (message.rootShare.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.rootShare);
        /* bytes set_id = 2; */
        if (message.setId.length)
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.setId);
        /* uint32 child_index = 3; */
        if (message.childIndex !== 0)
            writer.tag(3, runtime_1.WireType.Varint).uint32(message.childIndex);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.AMPRecord
 */
exports.AMPRecord = new AMPRecord$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Route$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.Route", [
            { no: 1, name: "total_time_lock", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 2, name: "total_fees", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "total_amt", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "hops", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.Hop },
            { no: 5, name: "total_fees_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 6, name: "total_amt_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ }
        ]);
    }
    create(value) {
        const message = { totalTimeLock: 0, totalFees: "0", totalAmt: "0", hops: [], totalFeesMsat: "0", totalAmtMsat: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint32 total_time_lock */ 1:
                    message.totalTimeLock = reader.uint32();
                    break;
                case /* int64 total_fees = 2 [deprecated = true];*/ 2:
                    message.totalFees = reader.int64().toString();
                    break;
                case /* int64 total_amt = 3 [deprecated = true];*/ 3:
                    message.totalAmt = reader.int64().toString();
                    break;
                case /* repeated lnrpc.Hop hops */ 4:
                    message.hops.push(exports.Hop.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* int64 total_fees_msat */ 5:
                    message.totalFeesMsat = reader.int64().toString();
                    break;
                case /* int64 total_amt_msat */ 6:
                    message.totalAmtMsat = reader.int64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint32 total_time_lock = 1; */
        if (message.totalTimeLock !== 0)
            writer.tag(1, runtime_1.WireType.Varint).uint32(message.totalTimeLock);
        /* int64 total_fees = 2 [deprecated = true]; */
        if (message.totalFees !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.totalFees);
        /* int64 total_amt = 3 [deprecated = true]; */
        if (message.totalAmt !== "0")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.totalAmt);
        /* repeated lnrpc.Hop hops = 4; */
        for (let i = 0; i < message.hops.length; i++)
            exports.Hop.internalBinaryWrite(message.hops[i], writer.tag(4, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* int64 total_fees_msat = 5; */
        if (message.totalFeesMsat !== "0")
            writer.tag(5, runtime_1.WireType.Varint).int64(message.totalFeesMsat);
        /* int64 total_amt_msat = 6; */
        if (message.totalAmtMsat !== "0")
            writer.tag(6, runtime_1.WireType.Varint).int64(message.totalAmtMsat);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.Route
 */
exports.Route = new Route$Type();
// @generated message type with reflection information, may provide speed optimized methods
class NodeInfoRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.NodeInfoRequest", [
            { no: 1, name: "pub_key", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "include_channels", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { pubKey: "", includeChannels: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string pub_key */ 1:
                    message.pubKey = reader.string();
                    break;
                case /* bool include_channels */ 2:
                    message.includeChannels = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string pub_key = 1; */
        if (message.pubKey !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.pubKey);
        /* bool include_channels = 2; */
        if (message.includeChannels !== false)
            writer.tag(2, runtime_1.WireType.Varint).bool(message.includeChannels);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.NodeInfoRequest
 */
exports.NodeInfoRequest = new NodeInfoRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class NodeInfo$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.NodeInfo", [
            { no: 1, name: "node", kind: "message", T: () => exports.LightningNode },
            { no: 2, name: "num_channels", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 3, name: "total_capacity", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "channels", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.ChannelEdge }
        ]);
    }
    create(value) {
        const message = { numChannels: 0, totalCapacity: "0", channels: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.LightningNode node */ 1:
                    message.node = exports.LightningNode.internalBinaryRead(reader, reader.uint32(), options, message.node);
                    break;
                case /* uint32 num_channels */ 2:
                    message.numChannels = reader.uint32();
                    break;
                case /* int64 total_capacity */ 3:
                    message.totalCapacity = reader.int64().toString();
                    break;
                case /* repeated lnrpc.ChannelEdge channels */ 4:
                    message.channels.push(exports.ChannelEdge.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.LightningNode node = 1; */
        if (message.node)
            exports.LightningNode.internalBinaryWrite(message.node, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* uint32 num_channels = 2; */
        if (message.numChannels !== 0)
            writer.tag(2, runtime_1.WireType.Varint).uint32(message.numChannels);
        /* int64 total_capacity = 3; */
        if (message.totalCapacity !== "0")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.totalCapacity);
        /* repeated lnrpc.ChannelEdge channels = 4; */
        for (let i = 0; i < message.channels.length; i++)
            exports.ChannelEdge.internalBinaryWrite(message.channels[i], writer.tag(4, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.NodeInfo
 */
exports.NodeInfo = new NodeInfo$Type();
// @generated message type with reflection information, may provide speed optimized methods
class LightningNode$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.LightningNode", [
            { no: 1, name: "last_update", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 2, name: "pub_key", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "alias", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 4, name: "addresses", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.NodeAddress },
            { no: 5, name: "color", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 6, name: "features", kind: "map", K: 13 /*ScalarType.UINT32*/, V: { kind: "message", T: () => exports.Feature } }
        ]);
    }
    create(value) {
        const message = { lastUpdate: 0, pubKey: "", alias: "", addresses: [], color: "", features: {} };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint32 last_update */ 1:
                    message.lastUpdate = reader.uint32();
                    break;
                case /* string pub_key */ 2:
                    message.pubKey = reader.string();
                    break;
                case /* string alias */ 3:
                    message.alias = reader.string();
                    break;
                case /* repeated lnrpc.NodeAddress addresses */ 4:
                    message.addresses.push(exports.NodeAddress.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* string color */ 5:
                    message.color = reader.string();
                    break;
                case /* map<uint32, lnrpc.Feature> features */ 6:
                    this.binaryReadMap6(message.features, reader, options);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    binaryReadMap6(map, reader, options) {
        let len = reader.uint32(), end = reader.pos + len, key, val;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case 1:
                    key = reader.uint32();
                    break;
                case 2:
                    val = exports.Feature.internalBinaryRead(reader, reader.uint32(), options);
                    break;
                default: throw new globalThis.Error("unknown map entry field for field lnrpc.LightningNode.features");
            }
        }
        map[key !== null && key !== void 0 ? key : 0] = val !== null && val !== void 0 ? val : exports.Feature.create();
    }
    internalBinaryWrite(message, writer, options) {
        /* uint32 last_update = 1; */
        if (message.lastUpdate !== 0)
            writer.tag(1, runtime_1.WireType.Varint).uint32(message.lastUpdate);
        /* string pub_key = 2; */
        if (message.pubKey !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.pubKey);
        /* string alias = 3; */
        if (message.alias !== "")
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.alias);
        /* repeated lnrpc.NodeAddress addresses = 4; */
        for (let i = 0; i < message.addresses.length; i++)
            exports.NodeAddress.internalBinaryWrite(message.addresses[i], writer.tag(4, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* string color = 5; */
        if (message.color !== "")
            writer.tag(5, runtime_1.WireType.LengthDelimited).string(message.color);
        /* map<uint32, lnrpc.Feature> features = 6; */
        for (let k of Object.keys(message.features)) {
            writer.tag(6, runtime_1.WireType.LengthDelimited).fork().tag(1, runtime_1.WireType.Varint).uint32(parseInt(k));
            writer.tag(2, runtime_1.WireType.LengthDelimited).fork();
            exports.Feature.internalBinaryWrite(message.features[k], writer, options);
            writer.join().join();
        }
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.LightningNode
 */
exports.LightningNode = new LightningNode$Type();
// @generated message type with reflection information, may provide speed optimized methods
class NodeAddress$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.NodeAddress", [
            { no: 1, name: "network", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "addr", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { network: "", addr: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string network */ 1:
                    message.network = reader.string();
                    break;
                case /* string addr */ 2:
                    message.addr = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string network = 1; */
        if (message.network !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.network);
        /* string addr = 2; */
        if (message.addr !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.addr);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.NodeAddress
 */
exports.NodeAddress = new NodeAddress$Type();
// @generated message type with reflection information, may provide speed optimized methods
class RoutingPolicy$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.RoutingPolicy", [
            { no: 1, name: "time_lock_delta", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 2, name: "min_htlc", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "fee_base_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "fee_rate_milli_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 5, name: "disabled", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 6, name: "max_htlc_msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 7, name: "last_update", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { timeLockDelta: 0, minHtlc: "0", feeBaseMsat: "0", feeRateMilliMsat: "0", disabled: false, maxHtlcMsat: "0", lastUpdate: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint32 time_lock_delta */ 1:
                    message.timeLockDelta = reader.uint32();
                    break;
                case /* int64 min_htlc */ 2:
                    message.minHtlc = reader.int64().toString();
                    break;
                case /* int64 fee_base_msat */ 3:
                    message.feeBaseMsat = reader.int64().toString();
                    break;
                case /* int64 fee_rate_milli_msat */ 4:
                    message.feeRateMilliMsat = reader.int64().toString();
                    break;
                case /* bool disabled */ 5:
                    message.disabled = reader.bool();
                    break;
                case /* uint64 max_htlc_msat */ 6:
                    message.maxHtlcMsat = reader.uint64().toString();
                    break;
                case /* uint32 last_update */ 7:
                    message.lastUpdate = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint32 time_lock_delta = 1; */
        if (message.timeLockDelta !== 0)
            writer.tag(1, runtime_1.WireType.Varint).uint32(message.timeLockDelta);
        /* int64 min_htlc = 2; */
        if (message.minHtlc !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.minHtlc);
        /* int64 fee_base_msat = 3; */
        if (message.feeBaseMsat !== "0")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.feeBaseMsat);
        /* int64 fee_rate_milli_msat = 4; */
        if (message.feeRateMilliMsat !== "0")
            writer.tag(4, runtime_1.WireType.Varint).int64(message.feeRateMilliMsat);
        /* bool disabled = 5; */
        if (message.disabled !== false)
            writer.tag(5, runtime_1.WireType.Varint).bool(message.disabled);
        /* uint64 max_htlc_msat = 6; */
        if (message.maxHtlcMsat !== "0")
            writer.tag(6, runtime_1.WireType.Varint).uint64(message.maxHtlcMsat);
        /* uint32 last_update = 7; */
        if (message.lastUpdate !== 0)
            writer.tag(7, runtime_1.WireType.Varint).uint32(message.lastUpdate);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.RoutingPolicy
 */
exports.RoutingPolicy = new RoutingPolicy$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelEdge$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelEdge", [
            { no: 1, name: "channel_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 2, name: "chan_point", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "last_update", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 4, name: "node1_pub", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 5, name: "node2_pub", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 6, name: "capacity", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 7, name: "node1_policy", kind: "message", T: () => exports.RoutingPolicy },
            { no: 8, name: "node2_policy", kind: "message", T: () => exports.RoutingPolicy }
        ]);
    }
    create(value) {
        const message = { channelId: "0", chanPoint: "", lastUpdate: 0, node1Pub: "", node2Pub: "", capacity: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 channel_id = 1 [jstype = JS_STRING];*/ 1:
                    message.channelId = reader.uint64().toString();
                    break;
                case /* string chan_point */ 2:
                    message.chanPoint = reader.string();
                    break;
                case /* uint32 last_update = 3 [deprecated = true];*/ 3:
                    message.lastUpdate = reader.uint32();
                    break;
                case /* string node1_pub */ 4:
                    message.node1Pub = reader.string();
                    break;
                case /* string node2_pub */ 5:
                    message.node2Pub = reader.string();
                    break;
                case /* int64 capacity */ 6:
                    message.capacity = reader.int64().toString();
                    break;
                case /* lnrpc.RoutingPolicy node1_policy */ 7:
                    message.node1Policy = exports.RoutingPolicy.internalBinaryRead(reader, reader.uint32(), options, message.node1Policy);
                    break;
                case /* lnrpc.RoutingPolicy node2_policy */ 8:
                    message.node2Policy = exports.RoutingPolicy.internalBinaryRead(reader, reader.uint32(), options, message.node2Policy);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 channel_id = 1 [jstype = JS_STRING]; */
        if (message.channelId !== "0")
            writer.tag(1, runtime_1.WireType.Varint).uint64(message.channelId);
        /* string chan_point = 2; */
        if (message.chanPoint !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.chanPoint);
        /* uint32 last_update = 3 [deprecated = true]; */
        if (message.lastUpdate !== 0)
            writer.tag(3, runtime_1.WireType.Varint).uint32(message.lastUpdate);
        /* string node1_pub = 4; */
        if (message.node1Pub !== "")
            writer.tag(4, runtime_1.WireType.LengthDelimited).string(message.node1Pub);
        /* string node2_pub = 5; */
        if (message.node2Pub !== "")
            writer.tag(5, runtime_1.WireType.LengthDelimited).string(message.node2Pub);
        /* int64 capacity = 6; */
        if (message.capacity !== "0")
            writer.tag(6, runtime_1.WireType.Varint).int64(message.capacity);
        /* lnrpc.RoutingPolicy node1_policy = 7; */
        if (message.node1Policy)
            exports.RoutingPolicy.internalBinaryWrite(message.node1Policy, writer.tag(7, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.RoutingPolicy node2_policy = 8; */
        if (message.node2Policy)
            exports.RoutingPolicy.internalBinaryWrite(message.node2Policy, writer.tag(8, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelEdge
 */
exports.ChannelEdge = new ChannelEdge$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelGraphRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelGraphRequest", [
            { no: 1, name: "include_unannounced", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { includeUnannounced: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool include_unannounced */ 1:
                    message.includeUnannounced = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool include_unannounced = 1; */
        if (message.includeUnannounced !== false)
            writer.tag(1, runtime_1.WireType.Varint).bool(message.includeUnannounced);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelGraphRequest
 */
exports.ChannelGraphRequest = new ChannelGraphRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelGraph$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelGraph", [
            { no: 1, name: "nodes", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.LightningNode },
            { no: 2, name: "edges", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.ChannelEdge }
        ]);
    }
    create(value) {
        const message = { nodes: [], edges: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.LightningNode nodes */ 1:
                    message.nodes.push(exports.LightningNode.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* repeated lnrpc.ChannelEdge edges */ 2:
                    message.edges.push(exports.ChannelEdge.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.LightningNode nodes = 1; */
        for (let i = 0; i < message.nodes.length; i++)
            exports.LightningNode.internalBinaryWrite(message.nodes[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* repeated lnrpc.ChannelEdge edges = 2; */
        for (let i = 0; i < message.edges.length; i++)
            exports.ChannelEdge.internalBinaryWrite(message.edges[i], writer.tag(2, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelGraph
 */
exports.ChannelGraph = new ChannelGraph$Type();
// @generated message type with reflection information, may provide speed optimized methods
class NodeMetricsRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.NodeMetricsRequest", [
            { no: 1, name: "types", kind: "enum", repeat: 1 /*RepeatType.PACKED*/, T: () => ["lnrpc.NodeMetricType", NodeMetricType] }
        ]);
    }
    create(value) {
        const message = { types: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.NodeMetricType types */ 1:
                    if (wireType === runtime_1.WireType.LengthDelimited)
                        for (let e = reader.int32() + reader.pos; reader.pos < e;)
                            message.types.push(reader.int32());
                    else
                        message.types.push(reader.int32());
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.NodeMetricType types = 1; */
        if (message.types.length) {
            writer.tag(1, runtime_1.WireType.LengthDelimited).fork();
            for (let i = 0; i < message.types.length; i++)
                writer.int32(message.types[i]);
            writer.join();
        }
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.NodeMetricsRequest
 */
exports.NodeMetricsRequest = new NodeMetricsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class NodeMetricsResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.NodeMetricsResponse", [
            { no: 1, name: "betweenness_centrality", kind: "map", K: 9 /*ScalarType.STRING*/, V: { kind: "message", T: () => exports.FloatMetric } }
        ]);
    }
    create(value) {
        const message = { betweennessCentrality: {} };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* map<string, lnrpc.FloatMetric> betweenness_centrality */ 1:
                    this.binaryReadMap1(message.betweennessCentrality, reader, options);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    binaryReadMap1(map, reader, options) {
        let len = reader.uint32(), end = reader.pos + len, key, val;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case 1:
                    key = reader.string();
                    break;
                case 2:
                    val = exports.FloatMetric.internalBinaryRead(reader, reader.uint32(), options);
                    break;
                default: throw new globalThis.Error("unknown map entry field for field lnrpc.NodeMetricsResponse.betweenness_centrality");
            }
        }
        map[key !== null && key !== void 0 ? key : ""] = val !== null && val !== void 0 ? val : exports.FloatMetric.create();
    }
    internalBinaryWrite(message, writer, options) {
        /* map<string, lnrpc.FloatMetric> betweenness_centrality = 1; */
        for (let k of Object.keys(message.betweennessCentrality)) {
            writer.tag(1, runtime_1.WireType.LengthDelimited).fork().tag(1, runtime_1.WireType.LengthDelimited).string(k);
            writer.tag(2, runtime_1.WireType.LengthDelimited).fork();
            exports.FloatMetric.internalBinaryWrite(message.betweennessCentrality[k], writer, options);
            writer.join().join();
        }
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.NodeMetricsResponse
 */
exports.NodeMetricsResponse = new NodeMetricsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class FloatMetric$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.FloatMetric", [
            { no: 1, name: "value", kind: "scalar", T: 1 /*ScalarType.DOUBLE*/ },
            { no: 2, name: "normalized_value", kind: "scalar", T: 1 /*ScalarType.DOUBLE*/ }
        ]);
    }
    create(value) {
        const message = { value: 0, normalizedValue: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* double value */ 1:
                    message.value = reader.double();
                    break;
                case /* double normalized_value */ 2:
                    message.normalizedValue = reader.double();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* double value = 1; */
        if (message.value !== 0)
            writer.tag(1, runtime_1.WireType.Bit64).double(message.value);
        /* double normalized_value = 2; */
        if (message.normalizedValue !== 0)
            writer.tag(2, runtime_1.WireType.Bit64).double(message.normalizedValue);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.FloatMetric
 */
exports.FloatMetric = new FloatMetric$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChanInfoRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChanInfoRequest", [
            { no: 1, name: "chan_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { chanId: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 chan_id = 1 [jstype = JS_STRING];*/ 1:
                    message.chanId = reader.uint64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 chan_id = 1 [jstype = JS_STRING]; */
        if (message.chanId !== "0")
            writer.tag(1, runtime_1.WireType.Varint).uint64(message.chanId);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChanInfoRequest
 */
exports.ChanInfoRequest = new ChanInfoRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class NetworkInfoRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.NetworkInfoRequest", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.NetworkInfoRequest
 */
exports.NetworkInfoRequest = new NetworkInfoRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class NetworkInfo$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.NetworkInfo", [
            { no: 1, name: "graph_diameter", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 2, name: "avg_out_degree", kind: "scalar", T: 1 /*ScalarType.DOUBLE*/ },
            { no: 3, name: "max_out_degree", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 4, name: "num_nodes", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 5, name: "num_channels", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 6, name: "total_network_capacity", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 7, name: "avg_channel_size", kind: "scalar", T: 1 /*ScalarType.DOUBLE*/ },
            { no: 8, name: "min_channel_size", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 9, name: "max_channel_size", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 10, name: "median_channel_size_sat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 11, name: "num_zombie_chans", kind: "scalar", T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { graphDiameter: 0, avgOutDegree: 0, maxOutDegree: 0, numNodes: 0, numChannels: 0, totalNetworkCapacity: "0", avgChannelSize: 0, minChannelSize: "0", maxChannelSize: "0", medianChannelSizeSat: "0", numZombieChans: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint32 graph_diameter */ 1:
                    message.graphDiameter = reader.uint32();
                    break;
                case /* double avg_out_degree */ 2:
                    message.avgOutDegree = reader.double();
                    break;
                case /* uint32 max_out_degree */ 3:
                    message.maxOutDegree = reader.uint32();
                    break;
                case /* uint32 num_nodes */ 4:
                    message.numNodes = reader.uint32();
                    break;
                case /* uint32 num_channels */ 5:
                    message.numChannels = reader.uint32();
                    break;
                case /* int64 total_network_capacity */ 6:
                    message.totalNetworkCapacity = reader.int64().toString();
                    break;
                case /* double avg_channel_size */ 7:
                    message.avgChannelSize = reader.double();
                    break;
                case /* int64 min_channel_size */ 8:
                    message.minChannelSize = reader.int64().toString();
                    break;
                case /* int64 max_channel_size */ 9:
                    message.maxChannelSize = reader.int64().toString();
                    break;
                case /* int64 median_channel_size_sat */ 10:
                    message.medianChannelSizeSat = reader.int64().toString();
                    break;
                case /* uint64 num_zombie_chans */ 11:
                    message.numZombieChans = reader.uint64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint32 graph_diameter = 1; */
        if (message.graphDiameter !== 0)
            writer.tag(1, runtime_1.WireType.Varint).uint32(message.graphDiameter);
        /* double avg_out_degree = 2; */
        if (message.avgOutDegree !== 0)
            writer.tag(2, runtime_1.WireType.Bit64).double(message.avgOutDegree);
        /* uint32 max_out_degree = 3; */
        if (message.maxOutDegree !== 0)
            writer.tag(3, runtime_1.WireType.Varint).uint32(message.maxOutDegree);
        /* uint32 num_nodes = 4; */
        if (message.numNodes !== 0)
            writer.tag(4, runtime_1.WireType.Varint).uint32(message.numNodes);
        /* uint32 num_channels = 5; */
        if (message.numChannels !== 0)
            writer.tag(5, runtime_1.WireType.Varint).uint32(message.numChannels);
        /* int64 total_network_capacity = 6; */
        if (message.totalNetworkCapacity !== "0")
            writer.tag(6, runtime_1.WireType.Varint).int64(message.totalNetworkCapacity);
        /* double avg_channel_size = 7; */
        if (message.avgChannelSize !== 0)
            writer.tag(7, runtime_1.WireType.Bit64).double(message.avgChannelSize);
        /* int64 min_channel_size = 8; */
        if (message.minChannelSize !== "0")
            writer.tag(8, runtime_1.WireType.Varint).int64(message.minChannelSize);
        /* int64 max_channel_size = 9; */
        if (message.maxChannelSize !== "0")
            writer.tag(9, runtime_1.WireType.Varint).int64(message.maxChannelSize);
        /* int64 median_channel_size_sat = 10; */
        if (message.medianChannelSizeSat !== "0")
            writer.tag(10, runtime_1.WireType.Varint).int64(message.medianChannelSizeSat);
        /* uint64 num_zombie_chans = 11; */
        if (message.numZombieChans !== "0")
            writer.tag(11, runtime_1.WireType.Varint).uint64(message.numZombieChans);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.NetworkInfo
 */
exports.NetworkInfo = new NetworkInfo$Type();
// @generated message type with reflection information, may provide speed optimized methods
class StopRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.StopRequest", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.StopRequest
 */
exports.StopRequest = new StopRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class StopResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.StopResponse", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.StopResponse
 */
exports.StopResponse = new StopResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GraphTopologySubscription$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.GraphTopologySubscription", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.GraphTopologySubscription
 */
exports.GraphTopologySubscription = new GraphTopologySubscription$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GraphTopologyUpdate$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.GraphTopologyUpdate", [
            { no: 1, name: "node_updates", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.NodeUpdate },
            { no: 2, name: "channel_updates", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.ChannelEdgeUpdate },
            { no: 3, name: "closed_chans", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.ClosedChannelUpdate }
        ]);
    }
    create(value) {
        const message = { nodeUpdates: [], channelUpdates: [], closedChans: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.NodeUpdate node_updates */ 1:
                    message.nodeUpdates.push(exports.NodeUpdate.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* repeated lnrpc.ChannelEdgeUpdate channel_updates */ 2:
                    message.channelUpdates.push(exports.ChannelEdgeUpdate.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* repeated lnrpc.ClosedChannelUpdate closed_chans */ 3:
                    message.closedChans.push(exports.ClosedChannelUpdate.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.NodeUpdate node_updates = 1; */
        for (let i = 0; i < message.nodeUpdates.length; i++)
            exports.NodeUpdate.internalBinaryWrite(message.nodeUpdates[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* repeated lnrpc.ChannelEdgeUpdate channel_updates = 2; */
        for (let i = 0; i < message.channelUpdates.length; i++)
            exports.ChannelEdgeUpdate.internalBinaryWrite(message.channelUpdates[i], writer.tag(2, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* repeated lnrpc.ClosedChannelUpdate closed_chans = 3; */
        for (let i = 0; i < message.closedChans.length; i++)
            exports.ClosedChannelUpdate.internalBinaryWrite(message.closedChans[i], writer.tag(3, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.GraphTopologyUpdate
 */
exports.GraphTopologyUpdate = new GraphTopologyUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class NodeUpdate$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.NodeUpdate", [
            { no: 1, name: "addresses", kind: "scalar", repeat: 2 /*RepeatType.UNPACKED*/, T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "identity_key", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "global_features", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 4, name: "alias", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 5, name: "color", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 7, name: "node_addresses", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.NodeAddress },
            { no: 6, name: "features", kind: "map", K: 13 /*ScalarType.UINT32*/, V: { kind: "message", T: () => exports.Feature } }
        ]);
    }
    create(value) {
        const message = { addresses: [], identityKey: "", globalFeatures: new Uint8Array(0), alias: "", color: "", nodeAddresses: [], features: {} };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated string addresses = 1 [deprecated = true];*/ 1:
                    message.addresses.push(reader.string());
                    break;
                case /* string identity_key */ 2:
                    message.identityKey = reader.string();
                    break;
                case /* bytes global_features = 3 [deprecated = true];*/ 3:
                    message.globalFeatures = reader.bytes();
                    break;
                case /* string alias */ 4:
                    message.alias = reader.string();
                    break;
                case /* string color */ 5:
                    message.color = reader.string();
                    break;
                case /* repeated lnrpc.NodeAddress node_addresses */ 7:
                    message.nodeAddresses.push(exports.NodeAddress.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* map<uint32, lnrpc.Feature> features */ 6:
                    this.binaryReadMap6(message.features, reader, options);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    binaryReadMap6(map, reader, options) {
        let len = reader.uint32(), end = reader.pos + len, key, val;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case 1:
                    key = reader.uint32();
                    break;
                case 2:
                    val = exports.Feature.internalBinaryRead(reader, reader.uint32(), options);
                    break;
                default: throw new globalThis.Error("unknown map entry field for field lnrpc.NodeUpdate.features");
            }
        }
        map[key !== null && key !== void 0 ? key : 0] = val !== null && val !== void 0 ? val : exports.Feature.create();
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated string addresses = 1 [deprecated = true]; */
        for (let i = 0; i < message.addresses.length; i++)
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.addresses[i]);
        /* string identity_key = 2; */
        if (message.identityKey !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.identityKey);
        /* bytes global_features = 3 [deprecated = true]; */
        if (message.globalFeatures.length)
            writer.tag(3, runtime_1.WireType.LengthDelimited).bytes(message.globalFeatures);
        /* string alias = 4; */
        if (message.alias !== "")
            writer.tag(4, runtime_1.WireType.LengthDelimited).string(message.alias);
        /* string color = 5; */
        if (message.color !== "")
            writer.tag(5, runtime_1.WireType.LengthDelimited).string(message.color);
        /* repeated lnrpc.NodeAddress node_addresses = 7; */
        for (let i = 0; i < message.nodeAddresses.length; i++)
            exports.NodeAddress.internalBinaryWrite(message.nodeAddresses[i], writer.tag(7, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* map<uint32, lnrpc.Feature> features = 6; */
        for (let k of Object.keys(message.features)) {
            writer.tag(6, runtime_1.WireType.LengthDelimited).fork().tag(1, runtime_1.WireType.Varint).uint32(parseInt(k));
            writer.tag(2, runtime_1.WireType.LengthDelimited).fork();
            exports.Feature.internalBinaryWrite(message.features[k], writer, options);
            writer.join().join();
        }
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.NodeUpdate
 */
exports.NodeUpdate = new NodeUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelEdgeUpdate$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelEdgeUpdate", [
            { no: 1, name: "chan_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 2, name: "chan_point", kind: "message", T: () => exports.ChannelPoint },
            { no: 3, name: "capacity", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "routing_policy", kind: "message", T: () => exports.RoutingPolicy },
            { no: 5, name: "advertising_node", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 6, name: "connecting_node", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { chanId: "0", capacity: "0", advertisingNode: "", connectingNode: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 chan_id = 1 [jstype = JS_STRING];*/ 1:
                    message.chanId = reader.uint64().toString();
                    break;
                case /* lnrpc.ChannelPoint chan_point */ 2:
                    message.chanPoint = exports.ChannelPoint.internalBinaryRead(reader, reader.uint32(), options, message.chanPoint);
                    break;
                case /* int64 capacity */ 3:
                    message.capacity = reader.int64().toString();
                    break;
                case /* lnrpc.RoutingPolicy routing_policy */ 4:
                    message.routingPolicy = exports.RoutingPolicy.internalBinaryRead(reader, reader.uint32(), options, message.routingPolicy);
                    break;
                case /* string advertising_node */ 5:
                    message.advertisingNode = reader.string();
                    break;
                case /* string connecting_node */ 6:
                    message.connectingNode = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 chan_id = 1 [jstype = JS_STRING]; */
        if (message.chanId !== "0")
            writer.tag(1, runtime_1.WireType.Varint).uint64(message.chanId);
        /* lnrpc.ChannelPoint chan_point = 2; */
        if (message.chanPoint)
            exports.ChannelPoint.internalBinaryWrite(message.chanPoint, writer.tag(2, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* int64 capacity = 3; */
        if (message.capacity !== "0")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.capacity);
        /* lnrpc.RoutingPolicy routing_policy = 4; */
        if (message.routingPolicy)
            exports.RoutingPolicy.internalBinaryWrite(message.routingPolicy, writer.tag(4, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* string advertising_node = 5; */
        if (message.advertisingNode !== "")
            writer.tag(5, runtime_1.WireType.LengthDelimited).string(message.advertisingNode);
        /* string connecting_node = 6; */
        if (message.connectingNode !== "")
            writer.tag(6, runtime_1.WireType.LengthDelimited).string(message.connectingNode);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelEdgeUpdate
 */
exports.ChannelEdgeUpdate = new ChannelEdgeUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ClosedChannelUpdate$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ClosedChannelUpdate", [
            { no: 1, name: "chan_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 2, name: "capacity", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "closed_height", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 4, name: "chan_point", kind: "message", T: () => exports.ChannelPoint }
        ]);
    }
    create(value) {
        const message = { chanId: "0", capacity: "0", closedHeight: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 chan_id = 1 [jstype = JS_STRING];*/ 1:
                    message.chanId = reader.uint64().toString();
                    break;
                case /* int64 capacity */ 2:
                    message.capacity = reader.int64().toString();
                    break;
                case /* uint32 closed_height */ 3:
                    message.closedHeight = reader.uint32();
                    break;
                case /* lnrpc.ChannelPoint chan_point */ 4:
                    message.chanPoint = exports.ChannelPoint.internalBinaryRead(reader, reader.uint32(), options, message.chanPoint);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 chan_id = 1 [jstype = JS_STRING]; */
        if (message.chanId !== "0")
            writer.tag(1, runtime_1.WireType.Varint).uint64(message.chanId);
        /* int64 capacity = 2; */
        if (message.capacity !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.capacity);
        /* uint32 closed_height = 3; */
        if (message.closedHeight !== 0)
            writer.tag(3, runtime_1.WireType.Varint).uint32(message.closedHeight);
        /* lnrpc.ChannelPoint chan_point = 4; */
        if (message.chanPoint)
            exports.ChannelPoint.internalBinaryWrite(message.chanPoint, writer.tag(4, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ClosedChannelUpdate
 */
exports.ClosedChannelUpdate = new ClosedChannelUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class HopHint$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.HopHint", [
            { no: 1, name: "node_id", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "chan_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 3, name: "fee_base_msat", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 4, name: "fee_proportional_millionths", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 5, name: "cltv_expiry_delta", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { nodeId: "", chanId: "0", feeBaseMsat: 0, feeProportionalMillionths: 0, cltvExpiryDelta: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string node_id */ 1:
                    message.nodeId = reader.string();
                    break;
                case /* uint64 chan_id = 2 [jstype = JS_STRING];*/ 2:
                    message.chanId = reader.uint64().toString();
                    break;
                case /* uint32 fee_base_msat */ 3:
                    message.feeBaseMsat = reader.uint32();
                    break;
                case /* uint32 fee_proportional_millionths */ 4:
                    message.feeProportionalMillionths = reader.uint32();
                    break;
                case /* uint32 cltv_expiry_delta */ 5:
                    message.cltvExpiryDelta = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string node_id = 1; */
        if (message.nodeId !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.nodeId);
        /* uint64 chan_id = 2 [jstype = JS_STRING]; */
        if (message.chanId !== "0")
            writer.tag(2, runtime_1.WireType.Varint).uint64(message.chanId);
        /* uint32 fee_base_msat = 3; */
        if (message.feeBaseMsat !== 0)
            writer.tag(3, runtime_1.WireType.Varint).uint32(message.feeBaseMsat);
        /* uint32 fee_proportional_millionths = 4; */
        if (message.feeProportionalMillionths !== 0)
            writer.tag(4, runtime_1.WireType.Varint).uint32(message.feeProportionalMillionths);
        /* uint32 cltv_expiry_delta = 5; */
        if (message.cltvExpiryDelta !== 0)
            writer.tag(5, runtime_1.WireType.Varint).uint32(message.cltvExpiryDelta);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.HopHint
 */
exports.HopHint = new HopHint$Type();
// @generated message type with reflection information, may provide speed optimized methods
class RouteHint$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.RouteHint", [
            { no: 1, name: "hop_hints", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.HopHint }
        ]);
    }
    create(value) {
        const message = { hopHints: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.HopHint hop_hints */ 1:
                    message.hopHints.push(exports.HopHint.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.HopHint hop_hints = 1; */
        for (let i = 0; i < message.hopHints.length; i++)
            exports.HopHint.internalBinaryWrite(message.hopHints[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.RouteHint
 */
exports.RouteHint = new RouteHint$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Invoice$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.Invoice", [
            { no: 1, name: "memo", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "r_preimage", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 4, name: "r_hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 5, name: "value", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 23, name: "value_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 6, name: "settled", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 7, name: "creation_date", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 8, name: "settle_date", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 9, name: "payment_request", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 10, name: "description_hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 11, name: "expiry", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 12, name: "fallback_addr", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 13, name: "cltv_expiry", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 14, name: "route_hints", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.RouteHint },
            { no: 15, name: "private", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 16, name: "add_index", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 17, name: "settle_index", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 18, name: "amt_paid", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 19, name: "amt_paid_sat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 20, name: "amt_paid_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 21, name: "state", kind: "enum", T: () => ["lnrpc.Invoice.InvoiceState", Invoice_InvoiceState] },
            { no: 22, name: "htlcs", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.InvoiceHTLC },
            { no: 24, name: "features", kind: "map", K: 13 /*ScalarType.UINT32*/, V: { kind: "message", T: () => exports.Feature } },
            { no: 25, name: "is_keysend", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 26, name: "payment_addr", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 27, name: "is_amp", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { memo: "", rPreimage: new Uint8Array(0), rHash: new Uint8Array(0), value: "0", valueMsat: "0", settled: false, creationDate: "0", settleDate: "0", paymentRequest: "", descriptionHash: new Uint8Array(0), expiry: "0", fallbackAddr: "", cltvExpiry: "0", routeHints: [], private: false, addIndex: "0", settleIndex: "0", amtPaid: "0", amtPaidSat: "0", amtPaidMsat: "0", state: 0, htlcs: [], features: {}, isKeysend: false, paymentAddr: new Uint8Array(0), isAmp: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string memo */ 1:
                    message.memo = reader.string();
                    break;
                case /* bytes r_preimage */ 3:
                    message.rPreimage = reader.bytes();
                    break;
                case /* bytes r_hash */ 4:
                    message.rHash = reader.bytes();
                    break;
                case /* int64 value */ 5:
                    message.value = reader.int64().toString();
                    break;
                case /* int64 value_msat */ 23:
                    message.valueMsat = reader.int64().toString();
                    break;
                case /* bool settled = 6 [deprecated = true];*/ 6:
                    message.settled = reader.bool();
                    break;
                case /* int64 creation_date */ 7:
                    message.creationDate = reader.int64().toString();
                    break;
                case /* int64 settle_date */ 8:
                    message.settleDate = reader.int64().toString();
                    break;
                case /* string payment_request */ 9:
                    message.paymentRequest = reader.string();
                    break;
                case /* bytes description_hash */ 10:
                    message.descriptionHash = reader.bytes();
                    break;
                case /* int64 expiry */ 11:
                    message.expiry = reader.int64().toString();
                    break;
                case /* string fallback_addr */ 12:
                    message.fallbackAddr = reader.string();
                    break;
                case /* uint64 cltv_expiry */ 13:
                    message.cltvExpiry = reader.uint64().toString();
                    break;
                case /* repeated lnrpc.RouteHint route_hints */ 14:
                    message.routeHints.push(exports.RouteHint.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* bool private */ 15:
                    message.private = reader.bool();
                    break;
                case /* uint64 add_index */ 16:
                    message.addIndex = reader.uint64().toString();
                    break;
                case /* uint64 settle_index */ 17:
                    message.settleIndex = reader.uint64().toString();
                    break;
                case /* int64 amt_paid = 18 [deprecated = true];*/ 18:
                    message.amtPaid = reader.int64().toString();
                    break;
                case /* int64 amt_paid_sat */ 19:
                    message.amtPaidSat = reader.int64().toString();
                    break;
                case /* int64 amt_paid_msat */ 20:
                    message.amtPaidMsat = reader.int64().toString();
                    break;
                case /* lnrpc.Invoice.InvoiceState state */ 21:
                    message.state = reader.int32();
                    break;
                case /* repeated lnrpc.InvoiceHTLC htlcs */ 22:
                    message.htlcs.push(exports.InvoiceHTLC.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* map<uint32, lnrpc.Feature> features */ 24:
                    this.binaryReadMap24(message.features, reader, options);
                    break;
                case /* bool is_keysend */ 25:
                    message.isKeysend = reader.bool();
                    break;
                case /* bytes payment_addr */ 26:
                    message.paymentAddr = reader.bytes();
                    break;
                case /* bool is_amp */ 27:
                    message.isAmp = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    binaryReadMap24(map, reader, options) {
        let len = reader.uint32(), end = reader.pos + len, key, val;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case 1:
                    key = reader.uint32();
                    break;
                case 2:
                    val = exports.Feature.internalBinaryRead(reader, reader.uint32(), options);
                    break;
                default: throw new globalThis.Error("unknown map entry field for field lnrpc.Invoice.features");
            }
        }
        map[key !== null && key !== void 0 ? key : 0] = val !== null && val !== void 0 ? val : exports.Feature.create();
    }
    internalBinaryWrite(message, writer, options) {
        /* string memo = 1; */
        if (message.memo !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.memo);
        /* bytes r_preimage = 3; */
        if (message.rPreimage.length)
            writer.tag(3, runtime_1.WireType.LengthDelimited).bytes(message.rPreimage);
        /* bytes r_hash = 4; */
        if (message.rHash.length)
            writer.tag(4, runtime_1.WireType.LengthDelimited).bytes(message.rHash);
        /* int64 value = 5; */
        if (message.value !== "0")
            writer.tag(5, runtime_1.WireType.Varint).int64(message.value);
        /* int64 value_msat = 23; */
        if (message.valueMsat !== "0")
            writer.tag(23, runtime_1.WireType.Varint).int64(message.valueMsat);
        /* bool settled = 6 [deprecated = true]; */
        if (message.settled !== false)
            writer.tag(6, runtime_1.WireType.Varint).bool(message.settled);
        /* int64 creation_date = 7; */
        if (message.creationDate !== "0")
            writer.tag(7, runtime_1.WireType.Varint).int64(message.creationDate);
        /* int64 settle_date = 8; */
        if (message.settleDate !== "0")
            writer.tag(8, runtime_1.WireType.Varint).int64(message.settleDate);
        /* string payment_request = 9; */
        if (message.paymentRequest !== "")
            writer.tag(9, runtime_1.WireType.LengthDelimited).string(message.paymentRequest);
        /* bytes description_hash = 10; */
        if (message.descriptionHash.length)
            writer.tag(10, runtime_1.WireType.LengthDelimited).bytes(message.descriptionHash);
        /* int64 expiry = 11; */
        if (message.expiry !== "0")
            writer.tag(11, runtime_1.WireType.Varint).int64(message.expiry);
        /* string fallback_addr = 12; */
        if (message.fallbackAddr !== "")
            writer.tag(12, runtime_1.WireType.LengthDelimited).string(message.fallbackAddr);
        /* uint64 cltv_expiry = 13; */
        if (message.cltvExpiry !== "0")
            writer.tag(13, runtime_1.WireType.Varint).uint64(message.cltvExpiry);
        /* repeated lnrpc.RouteHint route_hints = 14; */
        for (let i = 0; i < message.routeHints.length; i++)
            exports.RouteHint.internalBinaryWrite(message.routeHints[i], writer.tag(14, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* bool private = 15; */
        if (message.private !== false)
            writer.tag(15, runtime_1.WireType.Varint).bool(message.private);
        /* uint64 add_index = 16; */
        if (message.addIndex !== "0")
            writer.tag(16, runtime_1.WireType.Varint).uint64(message.addIndex);
        /* uint64 settle_index = 17; */
        if (message.settleIndex !== "0")
            writer.tag(17, runtime_1.WireType.Varint).uint64(message.settleIndex);
        /* int64 amt_paid = 18 [deprecated = true]; */
        if (message.amtPaid !== "0")
            writer.tag(18, runtime_1.WireType.Varint).int64(message.amtPaid);
        /* int64 amt_paid_sat = 19; */
        if (message.amtPaidSat !== "0")
            writer.tag(19, runtime_1.WireType.Varint).int64(message.amtPaidSat);
        /* int64 amt_paid_msat = 20; */
        if (message.amtPaidMsat !== "0")
            writer.tag(20, runtime_1.WireType.Varint).int64(message.amtPaidMsat);
        /* lnrpc.Invoice.InvoiceState state = 21; */
        if (message.state !== 0)
            writer.tag(21, runtime_1.WireType.Varint).int32(message.state);
        /* repeated lnrpc.InvoiceHTLC htlcs = 22; */
        for (let i = 0; i < message.htlcs.length; i++)
            exports.InvoiceHTLC.internalBinaryWrite(message.htlcs[i], writer.tag(22, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* map<uint32, lnrpc.Feature> features = 24; */
        for (let k of Object.keys(message.features)) {
            writer.tag(24, runtime_1.WireType.LengthDelimited).fork().tag(1, runtime_1.WireType.Varint).uint32(parseInt(k));
            writer.tag(2, runtime_1.WireType.LengthDelimited).fork();
            exports.Feature.internalBinaryWrite(message.features[k], writer, options);
            writer.join().join();
        }
        /* bool is_keysend = 25; */
        if (message.isKeysend !== false)
            writer.tag(25, runtime_1.WireType.Varint).bool(message.isKeysend);
        /* bytes payment_addr = 26; */
        if (message.paymentAddr.length)
            writer.tag(26, runtime_1.WireType.LengthDelimited).bytes(message.paymentAddr);
        /* bool is_amp = 27; */
        if (message.isAmp !== false)
            writer.tag(27, runtime_1.WireType.Varint).bool(message.isAmp);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.Invoice
 */
exports.Invoice = new Invoice$Type();
// @generated message type with reflection information, may provide speed optimized methods
class InvoiceHTLC$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.InvoiceHTLC", [
            { no: 1, name: "chan_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 2, name: "htlc_index", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 3, name: "amt_msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 4, name: "accept_height", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 5, name: "accept_time", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 6, name: "resolve_time", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 7, name: "expiry_height", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 8, name: "state", kind: "enum", T: () => ["lnrpc.InvoiceHTLCState", InvoiceHTLCState] },
            { no: 9, name: "custom_records", kind: "map", K: 4 /*ScalarType.UINT64*/, V: { kind: "scalar", T: 12 /*ScalarType.BYTES*/ } },
            { no: 10, name: "mpp_total_amt_msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 11, name: "amp", kind: "message", T: () => exports.AMP }
        ]);
    }
    create(value) {
        const message = { chanId: "0", htlcIndex: "0", amtMsat: "0", acceptHeight: 0, acceptTime: "0", resolveTime: "0", expiryHeight: 0, state: 0, customRecords: {}, mppTotalAmtMsat: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 chan_id = 1 [jstype = JS_STRING];*/ 1:
                    message.chanId = reader.uint64().toString();
                    break;
                case /* uint64 htlc_index */ 2:
                    message.htlcIndex = reader.uint64().toString();
                    break;
                case /* uint64 amt_msat */ 3:
                    message.amtMsat = reader.uint64().toString();
                    break;
                case /* int32 accept_height */ 4:
                    message.acceptHeight = reader.int32();
                    break;
                case /* int64 accept_time */ 5:
                    message.acceptTime = reader.int64().toString();
                    break;
                case /* int64 resolve_time */ 6:
                    message.resolveTime = reader.int64().toString();
                    break;
                case /* int32 expiry_height */ 7:
                    message.expiryHeight = reader.int32();
                    break;
                case /* lnrpc.InvoiceHTLCState state */ 8:
                    message.state = reader.int32();
                    break;
                case /* map<uint64, bytes> custom_records */ 9:
                    this.binaryReadMap9(message.customRecords, reader, options);
                    break;
                case /* uint64 mpp_total_amt_msat */ 10:
                    message.mppTotalAmtMsat = reader.uint64().toString();
                    break;
                case /* lnrpc.AMP amp */ 11:
                    message.amp = exports.AMP.internalBinaryRead(reader, reader.uint32(), options, message.amp);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    binaryReadMap9(map, reader, options) {
        let len = reader.uint32(), end = reader.pos + len, key, val;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case 1:
                    key = reader.uint64().toString();
                    break;
                case 2:
                    val = reader.bytes();
                    break;
                default: throw new globalThis.Error("unknown map entry field for field lnrpc.InvoiceHTLC.custom_records");
            }
        }
        map[key !== null && key !== void 0 ? key : "0"] = val !== null && val !== void 0 ? val : new Uint8Array(0);
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 chan_id = 1 [jstype = JS_STRING]; */
        if (message.chanId !== "0")
            writer.tag(1, runtime_1.WireType.Varint).uint64(message.chanId);
        /* uint64 htlc_index = 2; */
        if (message.htlcIndex !== "0")
            writer.tag(2, runtime_1.WireType.Varint).uint64(message.htlcIndex);
        /* uint64 amt_msat = 3; */
        if (message.amtMsat !== "0")
            writer.tag(3, runtime_1.WireType.Varint).uint64(message.amtMsat);
        /* int32 accept_height = 4; */
        if (message.acceptHeight !== 0)
            writer.tag(4, runtime_1.WireType.Varint).int32(message.acceptHeight);
        /* int64 accept_time = 5; */
        if (message.acceptTime !== "0")
            writer.tag(5, runtime_1.WireType.Varint).int64(message.acceptTime);
        /* int64 resolve_time = 6; */
        if (message.resolveTime !== "0")
            writer.tag(6, runtime_1.WireType.Varint).int64(message.resolveTime);
        /* int32 expiry_height = 7; */
        if (message.expiryHeight !== 0)
            writer.tag(7, runtime_1.WireType.Varint).int32(message.expiryHeight);
        /* lnrpc.InvoiceHTLCState state = 8; */
        if (message.state !== 0)
            writer.tag(8, runtime_1.WireType.Varint).int32(message.state);
        /* map<uint64, bytes> custom_records = 9; */
        for (let k of Object.keys(message.customRecords))
            writer.tag(9, runtime_1.WireType.LengthDelimited).fork().tag(1, runtime_1.WireType.Varint).uint64(k).tag(2, runtime_1.WireType.LengthDelimited).bytes(message.customRecords[k]).join();
        /* uint64 mpp_total_amt_msat = 10; */
        if (message.mppTotalAmtMsat !== "0")
            writer.tag(10, runtime_1.WireType.Varint).uint64(message.mppTotalAmtMsat);
        /* lnrpc.AMP amp = 11; */
        if (message.amp)
            exports.AMP.internalBinaryWrite(message.amp, writer.tag(11, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.InvoiceHTLC
 */
exports.InvoiceHTLC = new InvoiceHTLC$Type();
// @generated message type with reflection information, may provide speed optimized methods
class AMP$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.AMP", [
            { no: 1, name: "root_share", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "set_id", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 3, name: "child_index", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 4, name: "hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 5, name: "preimage", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { rootShare: new Uint8Array(0), setId: new Uint8Array(0), childIndex: 0, hash: new Uint8Array(0), preimage: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes root_share */ 1:
                    message.rootShare = reader.bytes();
                    break;
                case /* bytes set_id */ 2:
                    message.setId = reader.bytes();
                    break;
                case /* uint32 child_index */ 3:
                    message.childIndex = reader.uint32();
                    break;
                case /* bytes hash */ 4:
                    message.hash = reader.bytes();
                    break;
                case /* bytes preimage */ 5:
                    message.preimage = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes root_share = 1; */
        if (message.rootShare.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.rootShare);
        /* bytes set_id = 2; */
        if (message.setId.length)
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.setId);
        /* uint32 child_index = 3; */
        if (message.childIndex !== 0)
            writer.tag(3, runtime_1.WireType.Varint).uint32(message.childIndex);
        /* bytes hash = 4; */
        if (message.hash.length)
            writer.tag(4, runtime_1.WireType.LengthDelimited).bytes(message.hash);
        /* bytes preimage = 5; */
        if (message.preimage.length)
            writer.tag(5, runtime_1.WireType.LengthDelimited).bytes(message.preimage);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.AMP
 */
exports.AMP = new AMP$Type();
// @generated message type with reflection information, may provide speed optimized methods
class AddInvoiceResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.AddInvoiceResponse", [
            { no: 1, name: "r_hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "payment_request", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 16, name: "add_index", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 17, name: "payment_addr", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { rHash: new Uint8Array(0), paymentRequest: "", addIndex: "0", paymentAddr: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes r_hash */ 1:
                    message.rHash = reader.bytes();
                    break;
                case /* string payment_request */ 2:
                    message.paymentRequest = reader.string();
                    break;
                case /* uint64 add_index */ 16:
                    message.addIndex = reader.uint64().toString();
                    break;
                case /* bytes payment_addr */ 17:
                    message.paymentAddr = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes r_hash = 1; */
        if (message.rHash.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.rHash);
        /* string payment_request = 2; */
        if (message.paymentRequest !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.paymentRequest);
        /* uint64 add_index = 16; */
        if (message.addIndex !== "0")
            writer.tag(16, runtime_1.WireType.Varint).uint64(message.addIndex);
        /* bytes payment_addr = 17; */
        if (message.paymentAddr.length)
            writer.tag(17, runtime_1.WireType.LengthDelimited).bytes(message.paymentAddr);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.AddInvoiceResponse
 */
exports.AddInvoiceResponse = new AddInvoiceResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PaymentHash$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PaymentHash", [
            { no: 1, name: "r_hash_str", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "r_hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { rHashStr: "", rHash: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string r_hash_str = 1 [deprecated = true];*/ 1:
                    message.rHashStr = reader.string();
                    break;
                case /* bytes r_hash */ 2:
                    message.rHash = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string r_hash_str = 1 [deprecated = true]; */
        if (message.rHashStr !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.rHashStr);
        /* bytes r_hash = 2; */
        if (message.rHash.length)
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.rHash);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PaymentHash
 */
exports.PaymentHash = new PaymentHash$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListInvoiceRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ListInvoiceRequest", [
            { no: 1, name: "pending_only", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 4, name: "index_offset", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 5, name: "num_max_invoices", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 6, name: "reversed", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { pendingOnly: false, indexOffset: "0", numMaxInvoices: "0", reversed: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool pending_only */ 1:
                    message.pendingOnly = reader.bool();
                    break;
                case /* uint64 index_offset */ 4:
                    message.indexOffset = reader.uint64().toString();
                    break;
                case /* uint64 num_max_invoices */ 5:
                    message.numMaxInvoices = reader.uint64().toString();
                    break;
                case /* bool reversed */ 6:
                    message.reversed = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool pending_only = 1; */
        if (message.pendingOnly !== false)
            writer.tag(1, runtime_1.WireType.Varint).bool(message.pendingOnly);
        /* uint64 index_offset = 4; */
        if (message.indexOffset !== "0")
            writer.tag(4, runtime_1.WireType.Varint).uint64(message.indexOffset);
        /* uint64 num_max_invoices = 5; */
        if (message.numMaxInvoices !== "0")
            writer.tag(5, runtime_1.WireType.Varint).uint64(message.numMaxInvoices);
        /* bool reversed = 6; */
        if (message.reversed !== false)
            writer.tag(6, runtime_1.WireType.Varint).bool(message.reversed);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ListInvoiceRequest
 */
exports.ListInvoiceRequest = new ListInvoiceRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListInvoiceResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ListInvoiceResponse", [
            { no: 1, name: "invoices", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.Invoice },
            { no: 2, name: "last_index_offset", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 3, name: "first_index_offset", kind: "scalar", T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { invoices: [], lastIndexOffset: "0", firstIndexOffset: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.Invoice invoices */ 1:
                    message.invoices.push(exports.Invoice.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* uint64 last_index_offset */ 2:
                    message.lastIndexOffset = reader.uint64().toString();
                    break;
                case /* uint64 first_index_offset */ 3:
                    message.firstIndexOffset = reader.uint64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.Invoice invoices = 1; */
        for (let i = 0; i < message.invoices.length; i++)
            exports.Invoice.internalBinaryWrite(message.invoices[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* uint64 last_index_offset = 2; */
        if (message.lastIndexOffset !== "0")
            writer.tag(2, runtime_1.WireType.Varint).uint64(message.lastIndexOffset);
        /* uint64 first_index_offset = 3; */
        if (message.firstIndexOffset !== "0")
            writer.tag(3, runtime_1.WireType.Varint).uint64(message.firstIndexOffset);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ListInvoiceResponse
 */
exports.ListInvoiceResponse = new ListInvoiceResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class InvoiceSubscription$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.InvoiceSubscription", [
            { no: 1, name: "add_index", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 2, name: "settle_index", kind: "scalar", T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { addIndex: "0", settleIndex: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 add_index */ 1:
                    message.addIndex = reader.uint64().toString();
                    break;
                case /* uint64 settle_index */ 2:
                    message.settleIndex = reader.uint64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 add_index = 1; */
        if (message.addIndex !== "0")
            writer.tag(1, runtime_1.WireType.Varint).uint64(message.addIndex);
        /* uint64 settle_index = 2; */
        if (message.settleIndex !== "0")
            writer.tag(2, runtime_1.WireType.Varint).uint64(message.settleIndex);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.InvoiceSubscription
 */
exports.InvoiceSubscription = new InvoiceSubscription$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Payment$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.Payment", [
            { no: 1, name: "payment_hash", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "value", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "creation_date", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 5, name: "fee", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 6, name: "payment_preimage", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 7, name: "value_sat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 8, name: "value_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 9, name: "payment_request", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 10, name: "status", kind: "enum", T: () => ["lnrpc.Payment.PaymentStatus", Payment_PaymentStatus] },
            { no: 11, name: "fee_sat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 12, name: "fee_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 13, name: "creation_time_ns", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 14, name: "htlcs", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.HTLCAttempt },
            { no: 15, name: "payment_index", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 16, name: "failure_reason", kind: "enum", T: () => ["lnrpc.PaymentFailureReason", PaymentFailureReason] }
        ]);
    }
    create(value) {
        const message = { paymentHash: "", value: "0", creationDate: "0", fee: "0", paymentPreimage: "", valueSat: "0", valueMsat: "0", paymentRequest: "", status: 0, feeSat: "0", feeMsat: "0", creationTimeNs: "0", htlcs: [], paymentIndex: "0", failureReason: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string payment_hash */ 1:
                    message.paymentHash = reader.string();
                    break;
                case /* int64 value = 2 [deprecated = true];*/ 2:
                    message.value = reader.int64().toString();
                    break;
                case /* int64 creation_date = 3 [deprecated = true];*/ 3:
                    message.creationDate = reader.int64().toString();
                    break;
                case /* int64 fee = 5 [deprecated = true];*/ 5:
                    message.fee = reader.int64().toString();
                    break;
                case /* string payment_preimage */ 6:
                    message.paymentPreimage = reader.string();
                    break;
                case /* int64 value_sat */ 7:
                    message.valueSat = reader.int64().toString();
                    break;
                case /* int64 value_msat */ 8:
                    message.valueMsat = reader.int64().toString();
                    break;
                case /* string payment_request */ 9:
                    message.paymentRequest = reader.string();
                    break;
                case /* lnrpc.Payment.PaymentStatus status */ 10:
                    message.status = reader.int32();
                    break;
                case /* int64 fee_sat */ 11:
                    message.feeSat = reader.int64().toString();
                    break;
                case /* int64 fee_msat */ 12:
                    message.feeMsat = reader.int64().toString();
                    break;
                case /* int64 creation_time_ns */ 13:
                    message.creationTimeNs = reader.int64().toString();
                    break;
                case /* repeated lnrpc.HTLCAttempt htlcs */ 14:
                    message.htlcs.push(exports.HTLCAttempt.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* uint64 payment_index */ 15:
                    message.paymentIndex = reader.uint64().toString();
                    break;
                case /* lnrpc.PaymentFailureReason failure_reason */ 16:
                    message.failureReason = reader.int32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string payment_hash = 1; */
        if (message.paymentHash !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.paymentHash);
        /* int64 value = 2 [deprecated = true]; */
        if (message.value !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.value);
        /* int64 creation_date = 3 [deprecated = true]; */
        if (message.creationDate !== "0")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.creationDate);
        /* int64 fee = 5 [deprecated = true]; */
        if (message.fee !== "0")
            writer.tag(5, runtime_1.WireType.Varint).int64(message.fee);
        /* string payment_preimage = 6; */
        if (message.paymentPreimage !== "")
            writer.tag(6, runtime_1.WireType.LengthDelimited).string(message.paymentPreimage);
        /* int64 value_sat = 7; */
        if (message.valueSat !== "0")
            writer.tag(7, runtime_1.WireType.Varint).int64(message.valueSat);
        /* int64 value_msat = 8; */
        if (message.valueMsat !== "0")
            writer.tag(8, runtime_1.WireType.Varint).int64(message.valueMsat);
        /* string payment_request = 9; */
        if (message.paymentRequest !== "")
            writer.tag(9, runtime_1.WireType.LengthDelimited).string(message.paymentRequest);
        /* lnrpc.Payment.PaymentStatus status = 10; */
        if (message.status !== 0)
            writer.tag(10, runtime_1.WireType.Varint).int32(message.status);
        /* int64 fee_sat = 11; */
        if (message.feeSat !== "0")
            writer.tag(11, runtime_1.WireType.Varint).int64(message.feeSat);
        /* int64 fee_msat = 12; */
        if (message.feeMsat !== "0")
            writer.tag(12, runtime_1.WireType.Varint).int64(message.feeMsat);
        /* int64 creation_time_ns = 13; */
        if (message.creationTimeNs !== "0")
            writer.tag(13, runtime_1.WireType.Varint).int64(message.creationTimeNs);
        /* repeated lnrpc.HTLCAttempt htlcs = 14; */
        for (let i = 0; i < message.htlcs.length; i++)
            exports.HTLCAttempt.internalBinaryWrite(message.htlcs[i], writer.tag(14, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* uint64 payment_index = 15; */
        if (message.paymentIndex !== "0")
            writer.tag(15, runtime_1.WireType.Varint).uint64(message.paymentIndex);
        /* lnrpc.PaymentFailureReason failure_reason = 16; */
        if (message.failureReason !== 0)
            writer.tag(16, runtime_1.WireType.Varint).int32(message.failureReason);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.Payment
 */
exports.Payment = new Payment$Type();
// @generated message type with reflection information, may provide speed optimized methods
class HTLCAttempt$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.HTLCAttempt", [
            { no: 7, name: "attempt_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 1, name: "status", kind: "enum", T: () => ["lnrpc.HTLCAttempt.HTLCStatus", HTLCAttempt_HTLCStatus] },
            { no: 2, name: "route", kind: "message", T: () => exports.Route },
            { no: 3, name: "attempt_time_ns", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "resolve_time_ns", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 5, name: "failure", kind: "message", T: () => exports.Failure },
            { no: 6, name: "preimage", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { attemptId: "0", status: 0, attemptTimeNs: "0", resolveTimeNs: "0", preimage: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 attempt_id */ 7:
                    message.attemptId = reader.uint64().toString();
                    break;
                case /* lnrpc.HTLCAttempt.HTLCStatus status */ 1:
                    message.status = reader.int32();
                    break;
                case /* lnrpc.Route route */ 2:
                    message.route = exports.Route.internalBinaryRead(reader, reader.uint32(), options, message.route);
                    break;
                case /* int64 attempt_time_ns */ 3:
                    message.attemptTimeNs = reader.int64().toString();
                    break;
                case /* int64 resolve_time_ns */ 4:
                    message.resolveTimeNs = reader.int64().toString();
                    break;
                case /* lnrpc.Failure failure */ 5:
                    message.failure = exports.Failure.internalBinaryRead(reader, reader.uint32(), options, message.failure);
                    break;
                case /* bytes preimage */ 6:
                    message.preimage = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 attempt_id = 7; */
        if (message.attemptId !== "0")
            writer.tag(7, runtime_1.WireType.Varint).uint64(message.attemptId);
        /* lnrpc.HTLCAttempt.HTLCStatus status = 1; */
        if (message.status !== 0)
            writer.tag(1, runtime_1.WireType.Varint).int32(message.status);
        /* lnrpc.Route route = 2; */
        if (message.route)
            exports.Route.internalBinaryWrite(message.route, writer.tag(2, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* int64 attempt_time_ns = 3; */
        if (message.attemptTimeNs !== "0")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.attemptTimeNs);
        /* int64 resolve_time_ns = 4; */
        if (message.resolveTimeNs !== "0")
            writer.tag(4, runtime_1.WireType.Varint).int64(message.resolveTimeNs);
        /* lnrpc.Failure failure = 5; */
        if (message.failure)
            exports.Failure.internalBinaryWrite(message.failure, writer.tag(5, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* bytes preimage = 6; */
        if (message.preimage.length)
            writer.tag(6, runtime_1.WireType.LengthDelimited).bytes(message.preimage);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.HTLCAttempt
 */
exports.HTLCAttempt = new HTLCAttempt$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListPaymentsRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ListPaymentsRequest", [
            { no: 1, name: "include_incomplete", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 2, name: "index_offset", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 3, name: "max_payments", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 4, name: "reversed", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { includeIncomplete: false, indexOffset: "0", maxPayments: "0", reversed: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool include_incomplete */ 1:
                    message.includeIncomplete = reader.bool();
                    break;
                case /* uint64 index_offset */ 2:
                    message.indexOffset = reader.uint64().toString();
                    break;
                case /* uint64 max_payments */ 3:
                    message.maxPayments = reader.uint64().toString();
                    break;
                case /* bool reversed */ 4:
                    message.reversed = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool include_incomplete = 1; */
        if (message.includeIncomplete !== false)
            writer.tag(1, runtime_1.WireType.Varint).bool(message.includeIncomplete);
        /* uint64 index_offset = 2; */
        if (message.indexOffset !== "0")
            writer.tag(2, runtime_1.WireType.Varint).uint64(message.indexOffset);
        /* uint64 max_payments = 3; */
        if (message.maxPayments !== "0")
            writer.tag(3, runtime_1.WireType.Varint).uint64(message.maxPayments);
        /* bool reversed = 4; */
        if (message.reversed !== false)
            writer.tag(4, runtime_1.WireType.Varint).bool(message.reversed);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ListPaymentsRequest
 */
exports.ListPaymentsRequest = new ListPaymentsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListPaymentsResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ListPaymentsResponse", [
            { no: 1, name: "payments", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.Payment },
            { no: 2, name: "first_index_offset", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 3, name: "last_index_offset", kind: "scalar", T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { payments: [], firstIndexOffset: "0", lastIndexOffset: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.Payment payments */ 1:
                    message.payments.push(exports.Payment.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* uint64 first_index_offset */ 2:
                    message.firstIndexOffset = reader.uint64().toString();
                    break;
                case /* uint64 last_index_offset */ 3:
                    message.lastIndexOffset = reader.uint64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.Payment payments = 1; */
        for (let i = 0; i < message.payments.length; i++)
            exports.Payment.internalBinaryWrite(message.payments[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* uint64 first_index_offset = 2; */
        if (message.firstIndexOffset !== "0")
            writer.tag(2, runtime_1.WireType.Varint).uint64(message.firstIndexOffset);
        /* uint64 last_index_offset = 3; */
        if (message.lastIndexOffset !== "0")
            writer.tag(3, runtime_1.WireType.Varint).uint64(message.lastIndexOffset);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ListPaymentsResponse
 */
exports.ListPaymentsResponse = new ListPaymentsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class DeleteAllPaymentsRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.DeleteAllPaymentsRequest", [
            { no: 1, name: "failed_payments_only", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 2, name: "failed_htlcs_only", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { failedPaymentsOnly: false, failedHtlcsOnly: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool failed_payments_only */ 1:
                    message.failedPaymentsOnly = reader.bool();
                    break;
                case /* bool failed_htlcs_only */ 2:
                    message.failedHtlcsOnly = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool failed_payments_only = 1; */
        if (message.failedPaymentsOnly !== false)
            writer.tag(1, runtime_1.WireType.Varint).bool(message.failedPaymentsOnly);
        /* bool failed_htlcs_only = 2; */
        if (message.failedHtlcsOnly !== false)
            writer.tag(2, runtime_1.WireType.Varint).bool(message.failedHtlcsOnly);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.DeleteAllPaymentsRequest
 */
exports.DeleteAllPaymentsRequest = new DeleteAllPaymentsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class DeleteAllPaymentsResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.DeleteAllPaymentsResponse", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.DeleteAllPaymentsResponse
 */
exports.DeleteAllPaymentsResponse = new DeleteAllPaymentsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class AbandonChannelRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.AbandonChannelRequest", [
            { no: 1, name: "channel_point", kind: "message", T: () => exports.ChannelPoint },
            { no: 2, name: "pending_funding_shim_only", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { pendingFundingShimOnly: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.ChannelPoint channel_point */ 1:
                    message.channelPoint = exports.ChannelPoint.internalBinaryRead(reader, reader.uint32(), options, message.channelPoint);
                    break;
                case /* bool pending_funding_shim_only */ 2:
                    message.pendingFundingShimOnly = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.ChannelPoint channel_point = 1; */
        if (message.channelPoint)
            exports.ChannelPoint.internalBinaryWrite(message.channelPoint, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* bool pending_funding_shim_only = 2; */
        if (message.pendingFundingShimOnly !== false)
            writer.tag(2, runtime_1.WireType.Varint).bool(message.pendingFundingShimOnly);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.AbandonChannelRequest
 */
exports.AbandonChannelRequest = new AbandonChannelRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class AbandonChannelResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.AbandonChannelResponse", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.AbandonChannelResponse
 */
exports.AbandonChannelResponse = new AbandonChannelResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class DebugLevelRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.DebugLevelRequest", [
            { no: 1, name: "show", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 2, name: "level_spec", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { show: false, levelSpec: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool show */ 1:
                    message.show = reader.bool();
                    break;
                case /* string level_spec */ 2:
                    message.levelSpec = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool show = 1; */
        if (message.show !== false)
            writer.tag(1, runtime_1.WireType.Varint).bool(message.show);
        /* string level_spec = 2; */
        if (message.levelSpec !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.levelSpec);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.DebugLevelRequest
 */
exports.DebugLevelRequest = new DebugLevelRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class DebugLevelResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.DebugLevelResponse", [
            { no: 1, name: "sub_systems", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { subSystems: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string sub_systems */ 1:
                    message.subSystems = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string sub_systems = 1; */
        if (message.subSystems !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.subSystems);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.DebugLevelResponse
 */
exports.DebugLevelResponse = new DebugLevelResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PayReqString$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PayReqString", [
            { no: 1, name: "pay_req", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { payReq: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string pay_req */ 1:
                    message.payReq = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string pay_req = 1; */
        if (message.payReq !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.payReq);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PayReqString
 */
exports.PayReqString = new PayReqString$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PayReq$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PayReq", [
            { no: 1, name: "destination", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "payment_hash", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "num_satoshis", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "timestamp", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 5, name: "expiry", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 6, name: "description", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 7, name: "description_hash", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 8, name: "fallback_addr", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 9, name: "cltv_expiry", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 10, name: "route_hints", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.RouteHint },
            { no: 11, name: "payment_addr", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 12, name: "num_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 13, name: "features", kind: "map", K: 13 /*ScalarType.UINT32*/, V: { kind: "message", T: () => exports.Feature } }
        ]);
    }
    create(value) {
        const message = { destination: "", paymentHash: "", numSatoshis: "0", timestamp: "0", expiry: "0", description: "", descriptionHash: "", fallbackAddr: "", cltvExpiry: "0", routeHints: [], paymentAddr: new Uint8Array(0), numMsat: "0", features: {} };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string destination */ 1:
                    message.destination = reader.string();
                    break;
                case /* string payment_hash */ 2:
                    message.paymentHash = reader.string();
                    break;
                case /* int64 num_satoshis */ 3:
                    message.numSatoshis = reader.int64().toString();
                    break;
                case /* int64 timestamp */ 4:
                    message.timestamp = reader.int64().toString();
                    break;
                case /* int64 expiry */ 5:
                    message.expiry = reader.int64().toString();
                    break;
                case /* string description */ 6:
                    message.description = reader.string();
                    break;
                case /* string description_hash */ 7:
                    message.descriptionHash = reader.string();
                    break;
                case /* string fallback_addr */ 8:
                    message.fallbackAddr = reader.string();
                    break;
                case /* int64 cltv_expiry */ 9:
                    message.cltvExpiry = reader.int64().toString();
                    break;
                case /* repeated lnrpc.RouteHint route_hints */ 10:
                    message.routeHints.push(exports.RouteHint.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* bytes payment_addr */ 11:
                    message.paymentAddr = reader.bytes();
                    break;
                case /* int64 num_msat */ 12:
                    message.numMsat = reader.int64().toString();
                    break;
                case /* map<uint32, lnrpc.Feature> features */ 13:
                    this.binaryReadMap13(message.features, reader, options);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    binaryReadMap13(map, reader, options) {
        let len = reader.uint32(), end = reader.pos + len, key, val;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case 1:
                    key = reader.uint32();
                    break;
                case 2:
                    val = exports.Feature.internalBinaryRead(reader, reader.uint32(), options);
                    break;
                default: throw new globalThis.Error("unknown map entry field for field lnrpc.PayReq.features");
            }
        }
        map[key !== null && key !== void 0 ? key : 0] = val !== null && val !== void 0 ? val : exports.Feature.create();
    }
    internalBinaryWrite(message, writer, options) {
        /* string destination = 1; */
        if (message.destination !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.destination);
        /* string payment_hash = 2; */
        if (message.paymentHash !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.paymentHash);
        /* int64 num_satoshis = 3; */
        if (message.numSatoshis !== "0")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.numSatoshis);
        /* int64 timestamp = 4; */
        if (message.timestamp !== "0")
            writer.tag(4, runtime_1.WireType.Varint).int64(message.timestamp);
        /* int64 expiry = 5; */
        if (message.expiry !== "0")
            writer.tag(5, runtime_1.WireType.Varint).int64(message.expiry);
        /* string description = 6; */
        if (message.description !== "")
            writer.tag(6, runtime_1.WireType.LengthDelimited).string(message.description);
        /* string description_hash = 7; */
        if (message.descriptionHash !== "")
            writer.tag(7, runtime_1.WireType.LengthDelimited).string(message.descriptionHash);
        /* string fallback_addr = 8; */
        if (message.fallbackAddr !== "")
            writer.tag(8, runtime_1.WireType.LengthDelimited).string(message.fallbackAddr);
        /* int64 cltv_expiry = 9; */
        if (message.cltvExpiry !== "0")
            writer.tag(9, runtime_1.WireType.Varint).int64(message.cltvExpiry);
        /* repeated lnrpc.RouteHint route_hints = 10; */
        for (let i = 0; i < message.routeHints.length; i++)
            exports.RouteHint.internalBinaryWrite(message.routeHints[i], writer.tag(10, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* bytes payment_addr = 11; */
        if (message.paymentAddr.length)
            writer.tag(11, runtime_1.WireType.LengthDelimited).bytes(message.paymentAddr);
        /* int64 num_msat = 12; */
        if (message.numMsat !== "0")
            writer.tag(12, runtime_1.WireType.Varint).int64(message.numMsat);
        /* map<uint32, lnrpc.Feature> features = 13; */
        for (let k of Object.keys(message.features)) {
            writer.tag(13, runtime_1.WireType.LengthDelimited).fork().tag(1, runtime_1.WireType.Varint).uint32(parseInt(k));
            writer.tag(2, runtime_1.WireType.LengthDelimited).fork();
            exports.Feature.internalBinaryWrite(message.features[k], writer, options);
            writer.join().join();
        }
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PayReq
 */
exports.PayReq = new PayReq$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Feature$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.Feature", [
            { no: 2, name: "name", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "is_required", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 4, name: "is_known", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { name: "", isRequired: false, isKnown: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string name */ 2:
                    message.name = reader.string();
                    break;
                case /* bool is_required */ 3:
                    message.isRequired = reader.bool();
                    break;
                case /* bool is_known */ 4:
                    message.isKnown = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string name = 2; */
        if (message.name !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.name);
        /* bool is_required = 3; */
        if (message.isRequired !== false)
            writer.tag(3, runtime_1.WireType.Varint).bool(message.isRequired);
        /* bool is_known = 4; */
        if (message.isKnown !== false)
            writer.tag(4, runtime_1.WireType.Varint).bool(message.isKnown);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.Feature
 */
exports.Feature = new Feature$Type();
// @generated message type with reflection information, may provide speed optimized methods
class FeeReportRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.FeeReportRequest", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.FeeReportRequest
 */
exports.FeeReportRequest = new FeeReportRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelFeeReport$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelFeeReport", [
            { no: 5, name: "chan_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 1, name: "channel_point", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "base_fee_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 3, name: "fee_per_mil", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "fee_rate", kind: "scalar", T: 1 /*ScalarType.DOUBLE*/ }
        ]);
    }
    create(value) {
        const message = { chanId: "0", channelPoint: "", baseFeeMsat: "0", feePerMil: "0", feeRate: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 chan_id = 5 [jstype = JS_STRING];*/ 5:
                    message.chanId = reader.uint64().toString();
                    break;
                case /* string channel_point */ 1:
                    message.channelPoint = reader.string();
                    break;
                case /* int64 base_fee_msat */ 2:
                    message.baseFeeMsat = reader.int64().toString();
                    break;
                case /* int64 fee_per_mil */ 3:
                    message.feePerMil = reader.int64().toString();
                    break;
                case /* double fee_rate */ 4:
                    message.feeRate = reader.double();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 chan_id = 5 [jstype = JS_STRING]; */
        if (message.chanId !== "0")
            writer.tag(5, runtime_1.WireType.Varint).uint64(message.chanId);
        /* string channel_point = 1; */
        if (message.channelPoint !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.channelPoint);
        /* int64 base_fee_msat = 2; */
        if (message.baseFeeMsat !== "0")
            writer.tag(2, runtime_1.WireType.Varint).int64(message.baseFeeMsat);
        /* int64 fee_per_mil = 3; */
        if (message.feePerMil !== "0")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.feePerMil);
        /* double fee_rate = 4; */
        if (message.feeRate !== 0)
            writer.tag(4, runtime_1.WireType.Bit64).double(message.feeRate);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelFeeReport
 */
exports.ChannelFeeReport = new ChannelFeeReport$Type();
// @generated message type with reflection information, may provide speed optimized methods
class FeeReportResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.FeeReportResponse", [
            { no: 1, name: "channel_fees", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.ChannelFeeReport },
            { no: 2, name: "day_fee_sum", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 3, name: "week_fee_sum", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 4, name: "month_fee_sum", kind: "scalar", T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { channelFees: [], dayFeeSum: "0", weekFeeSum: "0", monthFeeSum: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.ChannelFeeReport channel_fees */ 1:
                    message.channelFees.push(exports.ChannelFeeReport.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* uint64 day_fee_sum */ 2:
                    message.dayFeeSum = reader.uint64().toString();
                    break;
                case /* uint64 week_fee_sum */ 3:
                    message.weekFeeSum = reader.uint64().toString();
                    break;
                case /* uint64 month_fee_sum */ 4:
                    message.monthFeeSum = reader.uint64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.ChannelFeeReport channel_fees = 1; */
        for (let i = 0; i < message.channelFees.length; i++)
            exports.ChannelFeeReport.internalBinaryWrite(message.channelFees[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* uint64 day_fee_sum = 2; */
        if (message.dayFeeSum !== "0")
            writer.tag(2, runtime_1.WireType.Varint).uint64(message.dayFeeSum);
        /* uint64 week_fee_sum = 3; */
        if (message.weekFeeSum !== "0")
            writer.tag(3, runtime_1.WireType.Varint).uint64(message.weekFeeSum);
        /* uint64 month_fee_sum = 4; */
        if (message.monthFeeSum !== "0")
            writer.tag(4, runtime_1.WireType.Varint).uint64(message.monthFeeSum);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.FeeReportResponse
 */
exports.FeeReportResponse = new FeeReportResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PolicyUpdateRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PolicyUpdateRequest", [
            { no: 1, name: "global", kind: "scalar", oneof: "scope", T: 8 /*ScalarType.BOOL*/ },
            { no: 2, name: "chan_point", kind: "message", oneof: "scope", T: () => exports.ChannelPoint },
            { no: 3, name: "base_fee_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "fee_rate", kind: "scalar", T: 1 /*ScalarType.DOUBLE*/ },
            { no: 5, name: "time_lock_delta", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 6, name: "max_htlc_msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 7, name: "min_htlc_msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 8, name: "min_htlc_msat_specified", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { scope: { oneofKind: undefined }, baseFeeMsat: "0", feeRate: 0, timeLockDelta: 0, maxHtlcMsat: "0", minHtlcMsat: "0", minHtlcMsatSpecified: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool global */ 1:
                    message.scope = {
                        oneofKind: "global",
                        global: reader.bool()
                    };
                    break;
                case /* lnrpc.ChannelPoint chan_point */ 2:
                    message.scope = {
                        oneofKind: "chanPoint",
                        chanPoint: exports.ChannelPoint.internalBinaryRead(reader, reader.uint32(), options, message.scope.chanPoint)
                    };
                    break;
                case /* int64 base_fee_msat */ 3:
                    message.baseFeeMsat = reader.int64().toString();
                    break;
                case /* double fee_rate */ 4:
                    message.feeRate = reader.double();
                    break;
                case /* uint32 time_lock_delta */ 5:
                    message.timeLockDelta = reader.uint32();
                    break;
                case /* uint64 max_htlc_msat */ 6:
                    message.maxHtlcMsat = reader.uint64().toString();
                    break;
                case /* uint64 min_htlc_msat */ 7:
                    message.minHtlcMsat = reader.uint64().toString();
                    break;
                case /* bool min_htlc_msat_specified */ 8:
                    message.minHtlcMsatSpecified = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool global = 1; */
        if (message.scope.oneofKind === "global")
            writer.tag(1, runtime_1.WireType.Varint).bool(message.scope.global);
        /* lnrpc.ChannelPoint chan_point = 2; */
        if (message.scope.oneofKind === "chanPoint")
            exports.ChannelPoint.internalBinaryWrite(message.scope.chanPoint, writer.tag(2, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* int64 base_fee_msat = 3; */
        if (message.baseFeeMsat !== "0")
            writer.tag(3, runtime_1.WireType.Varint).int64(message.baseFeeMsat);
        /* double fee_rate = 4; */
        if (message.feeRate !== 0)
            writer.tag(4, runtime_1.WireType.Bit64).double(message.feeRate);
        /* uint32 time_lock_delta = 5; */
        if (message.timeLockDelta !== 0)
            writer.tag(5, runtime_1.WireType.Varint).uint32(message.timeLockDelta);
        /* uint64 max_htlc_msat = 6; */
        if (message.maxHtlcMsat !== "0")
            writer.tag(6, runtime_1.WireType.Varint).uint64(message.maxHtlcMsat);
        /* uint64 min_htlc_msat = 7; */
        if (message.minHtlcMsat !== "0")
            writer.tag(7, runtime_1.WireType.Varint).uint64(message.minHtlcMsat);
        /* bool min_htlc_msat_specified = 8; */
        if (message.minHtlcMsatSpecified !== false)
            writer.tag(8, runtime_1.WireType.Varint).bool(message.minHtlcMsatSpecified);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PolicyUpdateRequest
 */
exports.PolicyUpdateRequest = new PolicyUpdateRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PolicyUpdateResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.PolicyUpdateResponse", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.PolicyUpdateResponse
 */
exports.PolicyUpdateResponse = new PolicyUpdateResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ForwardingHistoryRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ForwardingHistoryRequest", [
            { no: 1, name: "start_time", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 2, name: "end_time", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 3, name: "index_offset", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 4, name: "num_max_events", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { startTime: "0", endTime: "0", indexOffset: 0, numMaxEvents: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 start_time */ 1:
                    message.startTime = reader.uint64().toString();
                    break;
                case /* uint64 end_time */ 2:
                    message.endTime = reader.uint64().toString();
                    break;
                case /* uint32 index_offset */ 3:
                    message.indexOffset = reader.uint32();
                    break;
                case /* uint32 num_max_events */ 4:
                    message.numMaxEvents = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 start_time = 1; */
        if (message.startTime !== "0")
            writer.tag(1, runtime_1.WireType.Varint).uint64(message.startTime);
        /* uint64 end_time = 2; */
        if (message.endTime !== "0")
            writer.tag(2, runtime_1.WireType.Varint).uint64(message.endTime);
        /* uint32 index_offset = 3; */
        if (message.indexOffset !== 0)
            writer.tag(3, runtime_1.WireType.Varint).uint32(message.indexOffset);
        /* uint32 num_max_events = 4; */
        if (message.numMaxEvents !== 0)
            writer.tag(4, runtime_1.WireType.Varint).uint32(message.numMaxEvents);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ForwardingHistoryRequest
 */
exports.ForwardingHistoryRequest = new ForwardingHistoryRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ForwardingEvent$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ForwardingEvent", [
            { no: 1, name: "timestamp", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 2, name: "chan_id_in", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 4, name: "chan_id_out", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 5, name: "amt_in", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 6, name: "amt_out", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 7, name: "fee", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 8, name: "fee_msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 9, name: "amt_in_msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 10, name: "amt_out_msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 11, name: "timestamp_ns", kind: "scalar", T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { timestamp: "0", chanIdIn: "0", chanIdOut: "0", amtIn: "0", amtOut: "0", fee: "0", feeMsat: "0", amtInMsat: "0", amtOutMsat: "0", timestampNs: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 timestamp = 1 [deprecated = true];*/ 1:
                    message.timestamp = reader.uint64().toString();
                    break;
                case /* uint64 chan_id_in = 2 [jstype = JS_STRING];*/ 2:
                    message.chanIdIn = reader.uint64().toString();
                    break;
                case /* uint64 chan_id_out = 4 [jstype = JS_STRING];*/ 4:
                    message.chanIdOut = reader.uint64().toString();
                    break;
                case /* uint64 amt_in */ 5:
                    message.amtIn = reader.uint64().toString();
                    break;
                case /* uint64 amt_out */ 6:
                    message.amtOut = reader.uint64().toString();
                    break;
                case /* uint64 fee */ 7:
                    message.fee = reader.uint64().toString();
                    break;
                case /* uint64 fee_msat */ 8:
                    message.feeMsat = reader.uint64().toString();
                    break;
                case /* uint64 amt_in_msat */ 9:
                    message.amtInMsat = reader.uint64().toString();
                    break;
                case /* uint64 amt_out_msat */ 10:
                    message.amtOutMsat = reader.uint64().toString();
                    break;
                case /* uint64 timestamp_ns */ 11:
                    message.timestampNs = reader.uint64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 timestamp = 1 [deprecated = true]; */
        if (message.timestamp !== "0")
            writer.tag(1, runtime_1.WireType.Varint).uint64(message.timestamp);
        /* uint64 chan_id_in = 2 [jstype = JS_STRING]; */
        if (message.chanIdIn !== "0")
            writer.tag(2, runtime_1.WireType.Varint).uint64(message.chanIdIn);
        /* uint64 chan_id_out = 4 [jstype = JS_STRING]; */
        if (message.chanIdOut !== "0")
            writer.tag(4, runtime_1.WireType.Varint).uint64(message.chanIdOut);
        /* uint64 amt_in = 5; */
        if (message.amtIn !== "0")
            writer.tag(5, runtime_1.WireType.Varint).uint64(message.amtIn);
        /* uint64 amt_out = 6; */
        if (message.amtOut !== "0")
            writer.tag(6, runtime_1.WireType.Varint).uint64(message.amtOut);
        /* uint64 fee = 7; */
        if (message.fee !== "0")
            writer.tag(7, runtime_1.WireType.Varint).uint64(message.fee);
        /* uint64 fee_msat = 8; */
        if (message.feeMsat !== "0")
            writer.tag(8, runtime_1.WireType.Varint).uint64(message.feeMsat);
        /* uint64 amt_in_msat = 9; */
        if (message.amtInMsat !== "0")
            writer.tag(9, runtime_1.WireType.Varint).uint64(message.amtInMsat);
        /* uint64 amt_out_msat = 10; */
        if (message.amtOutMsat !== "0")
            writer.tag(10, runtime_1.WireType.Varint).uint64(message.amtOutMsat);
        /* uint64 timestamp_ns = 11; */
        if (message.timestampNs !== "0")
            writer.tag(11, runtime_1.WireType.Varint).uint64(message.timestampNs);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ForwardingEvent
 */
exports.ForwardingEvent = new ForwardingEvent$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ForwardingHistoryResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ForwardingHistoryResponse", [
            { no: 1, name: "forwarding_events", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.ForwardingEvent },
            { no: 2, name: "last_offset_index", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { forwardingEvents: [], lastOffsetIndex: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.ForwardingEvent forwarding_events */ 1:
                    message.forwardingEvents.push(exports.ForwardingEvent.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* uint32 last_offset_index */ 2:
                    message.lastOffsetIndex = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.ForwardingEvent forwarding_events = 1; */
        for (let i = 0; i < message.forwardingEvents.length; i++)
            exports.ForwardingEvent.internalBinaryWrite(message.forwardingEvents[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* uint32 last_offset_index = 2; */
        if (message.lastOffsetIndex !== 0)
            writer.tag(2, runtime_1.WireType.Varint).uint32(message.lastOffsetIndex);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ForwardingHistoryResponse
 */
exports.ForwardingHistoryResponse = new ForwardingHistoryResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ExportChannelBackupRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ExportChannelBackupRequest", [
            { no: 1, name: "chan_point", kind: "message", T: () => exports.ChannelPoint }
        ]);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.ChannelPoint chan_point */ 1:
                    message.chanPoint = exports.ChannelPoint.internalBinaryRead(reader, reader.uint32(), options, message.chanPoint);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.ChannelPoint chan_point = 1; */
        if (message.chanPoint)
            exports.ChannelPoint.internalBinaryWrite(message.chanPoint, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ExportChannelBackupRequest
 */
exports.ExportChannelBackupRequest = new ExportChannelBackupRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelBackup$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelBackup", [
            { no: 1, name: "chan_point", kind: "message", T: () => exports.ChannelPoint },
            { no: 2, name: "chan_backup", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { chanBackup: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.ChannelPoint chan_point */ 1:
                    message.chanPoint = exports.ChannelPoint.internalBinaryRead(reader, reader.uint32(), options, message.chanPoint);
                    break;
                case /* bytes chan_backup */ 2:
                    message.chanBackup = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.ChannelPoint chan_point = 1; */
        if (message.chanPoint)
            exports.ChannelPoint.internalBinaryWrite(message.chanPoint, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* bytes chan_backup = 2; */
        if (message.chanBackup.length)
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.chanBackup);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelBackup
 */
exports.ChannelBackup = new ChannelBackup$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MultiChanBackup$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.MultiChanBackup", [
            { no: 1, name: "chan_points", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.ChannelPoint },
            { no: 2, name: "multi_chan_backup", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { chanPoints: [], multiChanBackup: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.ChannelPoint chan_points */ 1:
                    message.chanPoints.push(exports.ChannelPoint.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* bytes multi_chan_backup */ 2:
                    message.multiChanBackup = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.ChannelPoint chan_points = 1; */
        for (let i = 0; i < message.chanPoints.length; i++)
            exports.ChannelPoint.internalBinaryWrite(message.chanPoints[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* bytes multi_chan_backup = 2; */
        if (message.multiChanBackup.length)
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.multiChanBackup);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.MultiChanBackup
 */
exports.MultiChanBackup = new MultiChanBackup$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChanBackupExportRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChanBackupExportRequest", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChanBackupExportRequest
 */
exports.ChanBackupExportRequest = new ChanBackupExportRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChanBackupSnapshot$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChanBackupSnapshot", [
            { no: 1, name: "single_chan_backups", kind: "message", T: () => exports.ChannelBackups },
            { no: 2, name: "multi_chan_backup", kind: "message", T: () => exports.MultiChanBackup }
        ]);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.ChannelBackups single_chan_backups */ 1:
                    message.singleChanBackups = exports.ChannelBackups.internalBinaryRead(reader, reader.uint32(), options, message.singleChanBackups);
                    break;
                case /* lnrpc.MultiChanBackup multi_chan_backup */ 2:
                    message.multiChanBackup = exports.MultiChanBackup.internalBinaryRead(reader, reader.uint32(), options, message.multiChanBackup);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.ChannelBackups single_chan_backups = 1; */
        if (message.singleChanBackups)
            exports.ChannelBackups.internalBinaryWrite(message.singleChanBackups, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* lnrpc.MultiChanBackup multi_chan_backup = 2; */
        if (message.multiChanBackup)
            exports.MultiChanBackup.internalBinaryWrite(message.multiChanBackup, writer.tag(2, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChanBackupSnapshot
 */
exports.ChanBackupSnapshot = new ChanBackupSnapshot$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelBackups$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelBackups", [
            { no: 1, name: "chan_backups", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.ChannelBackup }
        ]);
    }
    create(value) {
        const message = { chanBackups: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.ChannelBackup chan_backups */ 1:
                    message.chanBackups.push(exports.ChannelBackup.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.ChannelBackup chan_backups = 1; */
        for (let i = 0; i < message.chanBackups.length; i++)
            exports.ChannelBackup.internalBinaryWrite(message.chanBackups[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelBackups
 */
exports.ChannelBackups = new ChannelBackups$Type();
// @generated message type with reflection information, may provide speed optimized methods
class RestoreChanBackupRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.RestoreChanBackupRequest", [
            { no: 1, name: "chan_backups", kind: "message", oneof: "backup", T: () => exports.ChannelBackups },
            { no: 2, name: "multi_chan_backup", kind: "scalar", oneof: "backup", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { backup: { oneofKind: undefined } };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.ChannelBackups chan_backups */ 1:
                    message.backup = {
                        oneofKind: "chanBackups",
                        chanBackups: exports.ChannelBackups.internalBinaryRead(reader, reader.uint32(), options, message.backup.chanBackups)
                    };
                    break;
                case /* bytes multi_chan_backup */ 2:
                    message.backup = {
                        oneofKind: "multiChanBackup",
                        multiChanBackup: reader.bytes()
                    };
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.ChannelBackups chan_backups = 1; */
        if (message.backup.oneofKind === "chanBackups")
            exports.ChannelBackups.internalBinaryWrite(message.backup.chanBackups, writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* bytes multi_chan_backup = 2; */
        if (message.backup.oneofKind === "multiChanBackup")
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.backup.multiChanBackup);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.RestoreChanBackupRequest
 */
exports.RestoreChanBackupRequest = new RestoreChanBackupRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class RestoreBackupResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.RestoreBackupResponse", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.RestoreBackupResponse
 */
exports.RestoreBackupResponse = new RestoreBackupResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelBackupSubscription$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelBackupSubscription", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelBackupSubscription
 */
exports.ChannelBackupSubscription = new ChannelBackupSubscription$Type();
// @generated message type with reflection information, may provide speed optimized methods
class VerifyChanBackupResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.VerifyChanBackupResponse", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.VerifyChanBackupResponse
 */
exports.VerifyChanBackupResponse = new VerifyChanBackupResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MacaroonPermission$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.MacaroonPermission", [
            { no: 1, name: "entity", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "action", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { entity: "", action: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string entity */ 1:
                    message.entity = reader.string();
                    break;
                case /* string action */ 2:
                    message.action = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string entity = 1; */
        if (message.entity !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.entity);
        /* string action = 2; */
        if (message.action !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.action);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.MacaroonPermission
 */
exports.MacaroonPermission = new MacaroonPermission$Type();
// @generated message type with reflection information, may provide speed optimized methods
class BakeMacaroonRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.BakeMacaroonRequest", [
            { no: 1, name: "permissions", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.MacaroonPermission },
            { no: 2, name: "root_key_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { permissions: [], rootKeyId: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.MacaroonPermission permissions */ 1:
                    message.permissions.push(exports.MacaroonPermission.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* uint64 root_key_id */ 2:
                    message.rootKeyId = reader.uint64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.MacaroonPermission permissions = 1; */
        for (let i = 0; i < message.permissions.length; i++)
            exports.MacaroonPermission.internalBinaryWrite(message.permissions[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* uint64 root_key_id = 2; */
        if (message.rootKeyId !== "0")
            writer.tag(2, runtime_1.WireType.Varint).uint64(message.rootKeyId);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.BakeMacaroonRequest
 */
exports.BakeMacaroonRequest = new BakeMacaroonRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class BakeMacaroonResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.BakeMacaroonResponse", [
            { no: 1, name: "macaroon", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { macaroon: "" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string macaroon */ 1:
                    message.macaroon = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string macaroon = 1; */
        if (message.macaroon !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.macaroon);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.BakeMacaroonResponse
 */
exports.BakeMacaroonResponse = new BakeMacaroonResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListMacaroonIDsRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ListMacaroonIDsRequest", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ListMacaroonIDsRequest
 */
exports.ListMacaroonIDsRequest = new ListMacaroonIDsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListMacaroonIDsResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ListMacaroonIDsResponse", [
            { no: 1, name: "root_key_ids", kind: "scalar", repeat: 1 /*RepeatType.PACKED*/, T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { rootKeyIds: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated uint64 root_key_ids */ 1:
                    if (wireType === runtime_1.WireType.LengthDelimited)
                        for (let e = reader.int32() + reader.pos; reader.pos < e;)
                            message.rootKeyIds.push(reader.uint64().toString());
                    else
                        message.rootKeyIds.push(reader.uint64().toString());
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated uint64 root_key_ids = 1; */
        if (message.rootKeyIds.length) {
            writer.tag(1, runtime_1.WireType.LengthDelimited).fork();
            for (let i = 0; i < message.rootKeyIds.length; i++)
                writer.uint64(message.rootKeyIds[i]);
            writer.join();
        }
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ListMacaroonIDsResponse
 */
exports.ListMacaroonIDsResponse = new ListMacaroonIDsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class DeleteMacaroonIDRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.DeleteMacaroonIDRequest", [
            { no: 1, name: "root_key_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ }
        ]);
    }
    create(value) {
        const message = { rootKeyId: "0" };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* uint64 root_key_id */ 1:
                    message.rootKeyId = reader.uint64().toString();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* uint64 root_key_id = 1; */
        if (message.rootKeyId !== "0")
            writer.tag(1, runtime_1.WireType.Varint).uint64(message.rootKeyId);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.DeleteMacaroonIDRequest
 */
exports.DeleteMacaroonIDRequest = new DeleteMacaroonIDRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class DeleteMacaroonIDResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.DeleteMacaroonIDResponse", [
            { no: 1, name: "deleted", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value) {
        const message = { deleted: false };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bool deleted */ 1:
                    message.deleted = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bool deleted = 1; */
        if (message.deleted !== false)
            writer.tag(1, runtime_1.WireType.Varint).bool(message.deleted);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.DeleteMacaroonIDResponse
 */
exports.DeleteMacaroonIDResponse = new DeleteMacaroonIDResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MacaroonPermissionList$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.MacaroonPermissionList", [
            { no: 1, name: "permissions", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.MacaroonPermission }
        ]);
    }
    create(value) {
        const message = { permissions: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated lnrpc.MacaroonPermission permissions */ 1:
                    message.permissions.push(exports.MacaroonPermission.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated lnrpc.MacaroonPermission permissions = 1; */
        for (let i = 0; i < message.permissions.length; i++)
            exports.MacaroonPermission.internalBinaryWrite(message.permissions[i], writer.tag(1, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.MacaroonPermissionList
 */
exports.MacaroonPermissionList = new MacaroonPermissionList$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListPermissionsRequest$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ListPermissionsRequest", []);
    }
    create(value) {
        const message = {};
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        return target !== null && target !== void 0 ? target : this.create();
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ListPermissionsRequest
 */
exports.ListPermissionsRequest = new ListPermissionsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListPermissionsResponse$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ListPermissionsResponse", [
            { no: 1, name: "method_permissions", kind: "map", K: 9 /*ScalarType.STRING*/, V: { kind: "message", T: () => exports.MacaroonPermissionList } }
        ]);
    }
    create(value) {
        const message = { methodPermissions: {} };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* map<string, lnrpc.MacaroonPermissionList> method_permissions */ 1:
                    this.binaryReadMap1(message.methodPermissions, reader, options);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    binaryReadMap1(map, reader, options) {
        let len = reader.uint32(), end = reader.pos + len, key, val;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case 1:
                    key = reader.string();
                    break;
                case 2:
                    val = exports.MacaroonPermissionList.internalBinaryRead(reader, reader.uint32(), options);
                    break;
                default: throw new globalThis.Error("unknown map entry field for field lnrpc.ListPermissionsResponse.method_permissions");
            }
        }
        map[key !== null && key !== void 0 ? key : ""] = val !== null && val !== void 0 ? val : exports.MacaroonPermissionList.create();
    }
    internalBinaryWrite(message, writer, options) {
        /* map<string, lnrpc.MacaroonPermissionList> method_permissions = 1; */
        for (let k of Object.keys(message.methodPermissions)) {
            writer.tag(1, runtime_1.WireType.LengthDelimited).fork().tag(1, runtime_1.WireType.LengthDelimited).string(k);
            writer.tag(2, runtime_1.WireType.LengthDelimited).fork();
            exports.MacaroonPermissionList.internalBinaryWrite(message.methodPermissions[k], writer, options);
            writer.join().join();
        }
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ListPermissionsResponse
 */
exports.ListPermissionsResponse = new ListPermissionsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Failure$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.Failure", [
            { no: 1, name: "code", kind: "enum", T: () => ["lnrpc.Failure.FailureCode", Failure_FailureCode] },
            { no: 3, name: "channel_update", kind: "message", T: () => exports.ChannelUpdate },
            { no: 4, name: "htlc_msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 5, name: "onion_sha_256", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 6, name: "cltv_expiry", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 7, name: "flags", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 8, name: "failure_source_index", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 9, name: "height", kind: "scalar", T: 13 /*ScalarType.UINT32*/ }
        ]);
    }
    create(value) {
        const message = { code: 0, htlcMsat: "0", onionSha256: new Uint8Array(0), cltvExpiry: 0, flags: 0, failureSourceIndex: 0, height: 0 };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* lnrpc.Failure.FailureCode code */ 1:
                    message.code = reader.int32();
                    break;
                case /* lnrpc.ChannelUpdate channel_update */ 3:
                    message.channelUpdate = exports.ChannelUpdate.internalBinaryRead(reader, reader.uint32(), options, message.channelUpdate);
                    break;
                case /* uint64 htlc_msat */ 4:
                    message.htlcMsat = reader.uint64().toString();
                    break;
                case /* bytes onion_sha_256 */ 5:
                    message.onionSha256 = reader.bytes();
                    break;
                case /* uint32 cltv_expiry */ 6:
                    message.cltvExpiry = reader.uint32();
                    break;
                case /* uint32 flags */ 7:
                    message.flags = reader.uint32();
                    break;
                case /* uint32 failure_source_index */ 8:
                    message.failureSourceIndex = reader.uint32();
                    break;
                case /* uint32 height */ 9:
                    message.height = reader.uint32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* lnrpc.Failure.FailureCode code = 1; */
        if (message.code !== 0)
            writer.tag(1, runtime_1.WireType.Varint).int32(message.code);
        /* lnrpc.ChannelUpdate channel_update = 3; */
        if (message.channelUpdate)
            exports.ChannelUpdate.internalBinaryWrite(message.channelUpdate, writer.tag(3, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* uint64 htlc_msat = 4; */
        if (message.htlcMsat !== "0")
            writer.tag(4, runtime_1.WireType.Varint).uint64(message.htlcMsat);
        /* bytes onion_sha_256 = 5; */
        if (message.onionSha256.length)
            writer.tag(5, runtime_1.WireType.LengthDelimited).bytes(message.onionSha256);
        /* uint32 cltv_expiry = 6; */
        if (message.cltvExpiry !== 0)
            writer.tag(6, runtime_1.WireType.Varint).uint32(message.cltvExpiry);
        /* uint32 flags = 7; */
        if (message.flags !== 0)
            writer.tag(7, runtime_1.WireType.Varint).uint32(message.flags);
        /* uint32 failure_source_index = 8; */
        if (message.failureSourceIndex !== 0)
            writer.tag(8, runtime_1.WireType.Varint).uint32(message.failureSourceIndex);
        /* uint32 height = 9; */
        if (message.height !== 0)
            writer.tag(9, runtime_1.WireType.Varint).uint32(message.height);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.Failure
 */
exports.Failure = new Failure$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChannelUpdate$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.ChannelUpdate", [
            { no: 1, name: "signature", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "chain_hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 3, name: "chan_id", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 4, name: "timestamp", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 10, name: "message_flags", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 5, name: "channel_flags", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 6, name: "time_lock_delta", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 7, name: "htlc_minimum_msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 8, name: "base_fee", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 9, name: "fee_rate", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 11, name: "htlc_maximum_msat", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 12, name: "extra_opaque_data", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value) {
        const message = { signature: new Uint8Array(0), chainHash: new Uint8Array(0), chanId: "0", timestamp: 0, messageFlags: 0, channelFlags: 0, timeLockDelta: 0, htlcMinimumMsat: "0", baseFee: 0, feeRate: 0, htlcMaximumMsat: "0", extraOpaqueData: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes signature */ 1:
                    message.signature = reader.bytes();
                    break;
                case /* bytes chain_hash */ 2:
                    message.chainHash = reader.bytes();
                    break;
                case /* uint64 chan_id = 3 [jstype = JS_STRING];*/ 3:
                    message.chanId = reader.uint64().toString();
                    break;
                case /* uint32 timestamp */ 4:
                    message.timestamp = reader.uint32();
                    break;
                case /* uint32 message_flags */ 10:
                    message.messageFlags = reader.uint32();
                    break;
                case /* uint32 channel_flags */ 5:
                    message.channelFlags = reader.uint32();
                    break;
                case /* uint32 time_lock_delta */ 6:
                    message.timeLockDelta = reader.uint32();
                    break;
                case /* uint64 htlc_minimum_msat */ 7:
                    message.htlcMinimumMsat = reader.uint64().toString();
                    break;
                case /* uint32 base_fee */ 8:
                    message.baseFee = reader.uint32();
                    break;
                case /* uint32 fee_rate */ 9:
                    message.feeRate = reader.uint32();
                    break;
                case /* uint64 htlc_maximum_msat */ 11:
                    message.htlcMaximumMsat = reader.uint64().toString();
                    break;
                case /* bytes extra_opaque_data */ 12:
                    message.extraOpaqueData = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes signature = 1; */
        if (message.signature.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.signature);
        /* bytes chain_hash = 2; */
        if (message.chainHash.length)
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.chainHash);
        /* uint64 chan_id = 3 [jstype = JS_STRING]; */
        if (message.chanId !== "0")
            writer.tag(3, runtime_1.WireType.Varint).uint64(message.chanId);
        /* uint32 timestamp = 4; */
        if (message.timestamp !== 0)
            writer.tag(4, runtime_1.WireType.Varint).uint32(message.timestamp);
        /* uint32 message_flags = 10; */
        if (message.messageFlags !== 0)
            writer.tag(10, runtime_1.WireType.Varint).uint32(message.messageFlags);
        /* uint32 channel_flags = 5; */
        if (message.channelFlags !== 0)
            writer.tag(5, runtime_1.WireType.Varint).uint32(message.channelFlags);
        /* uint32 time_lock_delta = 6; */
        if (message.timeLockDelta !== 0)
            writer.tag(6, runtime_1.WireType.Varint).uint32(message.timeLockDelta);
        /* uint64 htlc_minimum_msat = 7; */
        if (message.htlcMinimumMsat !== "0")
            writer.tag(7, runtime_1.WireType.Varint).uint64(message.htlcMinimumMsat);
        /* uint32 base_fee = 8; */
        if (message.baseFee !== 0)
            writer.tag(8, runtime_1.WireType.Varint).uint32(message.baseFee);
        /* uint32 fee_rate = 9; */
        if (message.feeRate !== 0)
            writer.tag(9, runtime_1.WireType.Varint).uint32(message.feeRate);
        /* uint64 htlc_maximum_msat = 11; */
        if (message.htlcMaximumMsat !== "0")
            writer.tag(11, runtime_1.WireType.Varint).uint64(message.htlcMaximumMsat);
        /* bytes extra_opaque_data = 12; */
        if (message.extraOpaqueData.length)
            writer.tag(12, runtime_1.WireType.LengthDelimited).bytes(message.extraOpaqueData);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.ChannelUpdate
 */
exports.ChannelUpdate = new ChannelUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MacaroonId$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.MacaroonId", [
            { no: 1, name: "nonce", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "storageId", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 3, name: "ops", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => exports.Op }
        ]);
    }
    create(value) {
        const message = { nonce: new Uint8Array(0), storageId: new Uint8Array(0), ops: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes nonce */ 1:
                    message.nonce = reader.bytes();
                    break;
                case /* bytes storageId */ 2:
                    message.storageId = reader.bytes();
                    break;
                case /* repeated lnrpc.Op ops */ 3:
                    message.ops.push(exports.Op.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* bytes nonce = 1; */
        if (message.nonce.length)
            writer.tag(1, runtime_1.WireType.LengthDelimited).bytes(message.nonce);
        /* bytes storageId = 2; */
        if (message.storageId.length)
            writer.tag(2, runtime_1.WireType.LengthDelimited).bytes(message.storageId);
        /* repeated lnrpc.Op ops = 3; */
        for (let i = 0; i < message.ops.length; i++)
            exports.Op.internalBinaryWrite(message.ops[i], writer.tag(3, runtime_1.WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.MacaroonId
 */
exports.MacaroonId = new MacaroonId$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Op$Type extends runtime_5.MessageType {
    constructor() {
        super("lnrpc.Op", [
            { no: 1, name: "entity", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "actions", kind: "scalar", repeat: 2 /*RepeatType.UNPACKED*/, T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = { entity: "", actions: [] };
        globalThis.Object.defineProperty(message, runtime_4.MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string entity */ 1:
                    message.entity = reader.string();
                    break;
                case /* repeated string actions */ 2:
                    message.actions.push(reader.string());
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string entity = 1; */
        if (message.entity !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.entity);
        /* repeated string actions = 2; */
        for (let i = 0; i < message.actions.length; i++)
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.actions[i]);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message lnrpc.Op
 */
exports.Op = new Op$Type();
/**
 * @generated ServiceType for protobuf service lnrpc.Lightning
 */
exports.Lightning = new runtime_rpc_1.ServiceType("lnrpc.Lightning", [
    { name: "WalletBalance", options: {}, I: exports.WalletBalanceRequest, O: exports.WalletBalanceResponse },
    { name: "ChannelBalance", options: {}, I: exports.ChannelBalanceRequest, O: exports.ChannelBalanceResponse },
    { name: "GetTransactions", options: {}, I: exports.GetTransactionsRequest, O: exports.TransactionDetails },
    { name: "EstimateFee", options: {}, I: exports.EstimateFeeRequest, O: exports.EstimateFeeResponse },
    { name: "SendCoins", options: {}, I: exports.SendCoinsRequest, O: exports.SendCoinsResponse },
    { name: "ListUnspent", options: {}, I: exports.ListUnspentRequest, O: exports.ListUnspentResponse },
    { name: "SubscribeTransactions", serverStreaming: true, options: {}, I: exports.GetTransactionsRequest, O: exports.Transaction },
    { name: "SendMany", options: {}, I: exports.SendManyRequest, O: exports.SendManyResponse },
    { name: "NewAddress", options: {}, I: exports.NewAddressRequest, O: exports.NewAddressResponse },
    { name: "SignMessage", options: {}, I: exports.SignMessageRequest, O: exports.SignMessageResponse },
    { name: "VerifyMessage", options: {}, I: exports.VerifyMessageRequest, O: exports.VerifyMessageResponse },
    { name: "ConnectPeer", options: {}, I: exports.ConnectPeerRequest, O: exports.ConnectPeerResponse },
    { name: "DisconnectPeer", options: {}, I: exports.DisconnectPeerRequest, O: exports.DisconnectPeerResponse },
    { name: "ListPeers", options: {}, I: exports.ListPeersRequest, O: exports.ListPeersResponse },
    { name: "SubscribePeerEvents", serverStreaming: true, options: {}, I: exports.PeerEventSubscription, O: exports.PeerEvent },
    { name: "GetInfo", options: {}, I: exports.GetInfoRequest, O: exports.GetInfoResponse },
    { name: "GetRecoveryInfo", options: {}, I: exports.GetRecoveryInfoRequest, O: exports.GetRecoveryInfoResponse },
    { name: "PendingChannels", options: {}, I: exports.PendingChannelsRequest, O: exports.PendingChannelsResponse },
    { name: "ListChannels", options: {}, I: exports.ListChannelsRequest, O: exports.ListChannelsResponse },
    { name: "SubscribeChannelEvents", serverStreaming: true, options: {}, I: exports.ChannelEventSubscription, O: exports.ChannelEventUpdate },
    { name: "ClosedChannels", options: {}, I: exports.ClosedChannelsRequest, O: exports.ClosedChannelsResponse },
    { name: "OpenChannelSync", options: {}, I: exports.OpenChannelRequest, O: exports.ChannelPoint },
    { name: "OpenChannel", serverStreaming: true, options: {}, I: exports.OpenChannelRequest, O: exports.OpenStatusUpdate },
    { name: "FundingStateStep", options: {}, I: exports.FundingTransitionMsg, O: exports.FundingStateStepResp },
    { name: "ChannelAcceptor", serverStreaming: true, clientStreaming: true, options: {}, I: exports.ChannelAcceptResponse, O: exports.ChannelAcceptRequest },
    { name: "CloseChannel", serverStreaming: true, options: {}, I: exports.CloseChannelRequest, O: exports.CloseStatusUpdate },
    { name: "AbandonChannel", options: {}, I: exports.AbandonChannelRequest, O: exports.AbandonChannelResponse },
    { name: "SendPayment", serverStreaming: true, clientStreaming: true, options: {}, I: exports.SendRequest, O: exports.SendResponse },
    { name: "SendPaymentSync", options: {}, I: exports.SendRequest, O: exports.SendResponse },
    { name: "SendToRoute", serverStreaming: true, clientStreaming: true, options: {}, I: exports.SendToRouteRequest, O: exports.SendResponse },
    { name: "SendToRouteSync", options: {}, I: exports.SendToRouteRequest, O: exports.SendResponse },
    { name: "AddInvoice", options: {}, I: exports.Invoice, O: exports.AddInvoiceResponse },
    { name: "ListInvoices", options: {}, I: exports.ListInvoiceRequest, O: exports.ListInvoiceResponse },
    { name: "LookupInvoice", options: {}, I: exports.PaymentHash, O: exports.Invoice },
    { name: "SubscribeInvoices", serverStreaming: true, options: {}, I: exports.InvoiceSubscription, O: exports.Invoice },
    { name: "DecodePayReq", options: {}, I: exports.PayReqString, O: exports.PayReq },
    { name: "ListPayments", options: {}, I: exports.ListPaymentsRequest, O: exports.ListPaymentsResponse },
    { name: "DeleteAllPayments", options: {}, I: exports.DeleteAllPaymentsRequest, O: exports.DeleteAllPaymentsResponse },
    { name: "DescribeGraph", options: {}, I: exports.ChannelGraphRequest, O: exports.ChannelGraph },
    { name: "GetNodeMetrics", options: {}, I: exports.NodeMetricsRequest, O: exports.NodeMetricsResponse },
    { name: "GetChanInfo", options: {}, I: exports.ChanInfoRequest, O: exports.ChannelEdge },
    { name: "GetNodeInfo", options: {}, I: exports.NodeInfoRequest, O: exports.NodeInfo },
    { name: "QueryRoutes", options: {}, I: exports.QueryRoutesRequest, O: exports.QueryRoutesResponse },
    { name: "GetNetworkInfo", options: {}, I: exports.NetworkInfoRequest, O: exports.NetworkInfo },
    { name: "StopDaemon", options: {}, I: exports.StopRequest, O: exports.StopResponse },
    { name: "SubscribeChannelGraph", serverStreaming: true, options: {}, I: exports.GraphTopologySubscription, O: exports.GraphTopologyUpdate },
    { name: "DebugLevel", options: {}, I: exports.DebugLevelRequest, O: exports.DebugLevelResponse },
    { name: "FeeReport", options: {}, I: exports.FeeReportRequest, O: exports.FeeReportResponse },
    { name: "UpdateChannelPolicy", options: {}, I: exports.PolicyUpdateRequest, O: exports.PolicyUpdateResponse },
    { name: "ForwardingHistory", options: {}, I: exports.ForwardingHistoryRequest, O: exports.ForwardingHistoryResponse },
    { name: "ExportChannelBackup", options: {}, I: exports.ExportChannelBackupRequest, O: exports.ChannelBackup },
    { name: "ExportAllChannelBackups", options: {}, I: exports.ChanBackupExportRequest, O: exports.ChanBackupSnapshot },
    { name: "VerifyChanBackup", options: {}, I: exports.ChanBackupSnapshot, O: exports.VerifyChanBackupResponse },
    { name: "RestoreChannelBackups", options: {}, I: exports.RestoreChanBackupRequest, O: exports.RestoreBackupResponse },
    { name: "SubscribeChannelBackups", serverStreaming: true, options: {}, I: exports.ChannelBackupSubscription, O: exports.ChanBackupSnapshot },
    { name: "BakeMacaroon", options: {}, I: exports.BakeMacaroonRequest, O: exports.BakeMacaroonResponse },
    { name: "ListMacaroonIDs", options: {}, I: exports.ListMacaroonIDsRequest, O: exports.ListMacaroonIDsResponse },
    { name: "DeleteMacaroonID", options: {}, I: exports.DeleteMacaroonIDRequest, O: exports.DeleteMacaroonIDResponse },
    { name: "ListPermissions", options: {}, I: exports.ListPermissionsRequest, O: exports.ListPermissionsResponse }
]);
//# sourceMappingURL=rpc.js.map