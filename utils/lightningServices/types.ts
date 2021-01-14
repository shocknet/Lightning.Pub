/**
 * @format
 */
import * as Common from 'shock-common'

export interface PaymentV2 {
  payment_hash: string

  creation_date: string

  payment_preimage: string

  value_sat: string

  value_msat: string

  payment_request: string

  status: 'UNKNOWN' | 'IN_FLIGHT' | 'SUCCEEDED' | 'FAILED'

  fee_sat: number

  fee_msat: number

  creation_time_ns: string

  payment_index: string

  failure_reason:
    | 'FAILURE_REASON_NONE'
    | 'FAILURE_REASON_TIMEOUT'
    | 'FAILURE_REASON_NO_ROUTE'
    | 'FAILURE_REASON_ERROR'
    | 'FAILURE_REASON_INCORRECT_PAYMENT_DETAILS'
    | 'FAILURE_REASON_INSUFFICIENT_BALANCE'
}

enum FeatureBit {
  DATALOSS_PROTECT_REQ = 0,
  DATALOSS_PROTECT_OPT = 1,
  INITIAL_ROUING_SYNC = 3,
  UPFRONT_SHUTDOWN_SCRIPT_REQ = 4,
  UPFRONT_SHUTDOWN_SCRIPT_OPT = 5,
  GOSSIP_QUERIES_REQ = 6,
  GOSSIP_QUERIES_OPT = 7,
  TLV_ONION_REQ = 8,
  TLV_ONION_OPT = 9,
  EXT_GOSSIP_QUERIES_REQ = 10,
  EXT_GOSSIP_QUERIES_OPT = 11,
  STATIC_REMOTE_KEY_REQ = 12,
  STATIC_REMOTE_KEY_OPT = 13,
  PAYMENT_ADDR_REQ = 14,
  PAYMENT_ADDR_OPT = 15,
  MPP_REQ = 16,
  MPP_OPT = 17
}

interface _SendPaymentV2Request {
  dest: Buffer
  /**
   * Number of satoshis to send. The fields amt and amt_msat are mutually
   * exclusive.
   */
  amt: string

  /**
   * The CLTV delta from the current height that should be used to set the
   * timelock for the final hop.
   */
  final_cltv_delta: number

  dest_features: FeatureBit[]

  dest_custom_records: Record<number, Buffer>

  /**
   * The hash to use within the payment's HTLC.
   */
  payment_hash: Buffer

  max_parts: number

  timeout_seconds: number

  no_inflight_updates: boolean

  payment_request: string

  fee_limit_sat: number
}

export type SendPaymentV2Request = Partial<_SendPaymentV2Request>

export interface SendPaymentKeysendParams {
  amt: string
  dest: string
  feeLimit: number
  finalCltvDelta?: number
  maxParts?: number
  timeoutSeconds?: number
}

export interface SendPaymentInvoiceParams {
  amt?: string
  feeLimit: number
  max_parts?: number
  payment_request: string
  timeoutSeconds?: number
}

type StreamListener = (data: any) => void

/**
 * Caution: Not all methods return an stream.
 */
interface LightningStream {
  on(ev: 'data' | 'end' | 'error' | 'status', listener: StreamListener): void
}

type LightningCB = (err: Error, data: Record<string, any>) => void

type LightningMethod = (
  args: Record<string, any>,
  cb?: LightningCB
) => LightningStream

/**
 * Makes it easier for code calling services.
 */
export interface Services {
  lightning: Record<string, LightningMethod>
  walletUnlocker: Record<string, LightningMethod>
  router: Record<string, LightningMethod>
}

export interface ListChannelsReq {
  active_only: boolean
  inactive_only: boolean
  public_only: boolean
  private_only: boolean
  /**
   * Filters the response for channels with a target peer's pubkey. If peer is
   * empty, all channels will be returned.
   */
  peer: Common.Bytes
}

/**
 * https://api.lightning.community/#pendingchannels
 */
export interface PendingChannelsRes {
  /**
   * The balance in satoshis encumbered in pending channels.
   */
  total_limbo_balance: string
  /**
   * Channels pending opening.
   */
  pending_open_channels: Common.PendingOpenChannel[]
  /**
   * Channels pending force closing.
   */
  pending_force_closing_channels: Common.ForceClosedChannel[]
  /**
   * Channels waiting for closing tx to confirm.
   */
  waiting_close_channels: Common.WaitingCloseChannel[]
}

/**
 * https://github.com/lightningnetwork/lnd/blob/daf7c8a85420fc67fffa18fa5f7d08c2040946e4/lnrpc/rpc.proto#L2948
 */
export interface AddInvoiceRes {
  /**
   *
   */
  r_hash: Common.Bytes
  /**
   *  A bare-bones invoice for a payment within the Lightning Network. With the
   *  details of the invoice, the sender has all the data necessary to send a
   *  payment to the recipient.
   */
  payment_request: string
  /**
   *  The "add" index of this invoice. Each newly created invoice will increment
   *  this index making it monotonically increasing. Callers to the
   *  SubscribeInvoices call can use this to instantly get notified of all added
   *  invoices with an add_index greater than this one.
   */
  add_index: string
  /**
   *  The payment address of the generated invoice. This value should be used in
   *  all payments for this invoice as we require it for end to end security.
   */
  payment_addr: Common.Bytes
}
