# NOSTR API DEFINITION


A nostr request will take the same parameter and give the same response as an http request, but it will use nostr as transport, to do that it will send encrypted events to the server public key, in the event 6 thing are required:
- __rpcName__: string containing the name of the method
- __params__: a map with the all the url params for the method
- __query__: a map with the the url query for the method
- __body__: the body of the method request
- __requestId__: id of the request to be able to get a response

The nostr server will send back a message response, and inside the body there will also be a __requestId__ to identify the request this response is answering

## NOSTR Methods
### These are the nostr methods the client implements to communicate with the API via nostr

- LndGetInfo
  - auth type: __Admin__
  - input: [LndGetInfoRequest](#LndGetInfoRequest)
  - output: [LndGetInfoResponse](#LndGetInfoResponse)

- AddApp
  - auth type: __Admin__
  - input: [AddAppRequest](#AddAppRequest)
  - output: [AuthApp](#AuthApp)

- AuthApp
  - auth type: __Admin__
  - input: [AuthAppRequest](#AuthAppRequest)
  - output: [AuthApp](#AuthApp)

- BanUser
  - auth type: __Admin__
  - input: [BanUserRequest](#BanUserRequest)
  - output: [BanUserResponse](#BanUserResponse)

- GetUsageMetrics
  - auth type: __Metrics__
  - This methods has an __empty__ __request__ body
  - output: [UsageMetrics](#UsageMetrics)

- GetAppsMetrics
  - auth type: __Metrics__
  - input: [AppsMetricsRequest](#AppsMetricsRequest)
  - output: [AppsMetrics](#AppsMetrics)

- GetLndMetrics
  - auth type: __Metrics__
  - input: [LndMetricsRequest](#LndMetricsRequest)
  - output: [LndMetrics](#LndMetrics)

- CreateOneTimeInviteLink
  - auth type: __Admin__
  - input: [CreateOneTimeInviteLinkRequest](#CreateOneTimeInviteLinkRequest)
  - output: [CreateOneTimeInviteLinkResponse](#CreateOneTimeInviteLinkResponse)

- GetInviteLinkState
  - auth type: __Admin__
  - input: [GetInviteTokenStateRequest](#GetInviteTokenStateRequest)
  - output: [GetInviteTokenStateResponse](#GetInviteTokenStateResponse)

- EnrollAdminToken
  - auth type: __User__
  - input: [EnrollAdminTokenRequest](#EnrollAdminTokenRequest)
  - This methods has an __empty__ __response__ body

- LinkNPubThroughToken
  - auth type: __GuestWithPub__
  - input: [LinkNPubThroughTokenRequest](#LinkNPubThroughTokenRequest)
  - This methods has an __empty__ __response__ body

- UseInviteLink
  - auth type: __GuestWithPub__
  - input: [UseInviteLinkRequest](#UseInviteLinkRequest)
  - This methods has an __empty__ __response__ body

- UserHealth
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - This methods has an __empty__ __response__ body

- GetUserInfo
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [UserInfo](#UserInfo)

- AddProduct
  - auth type: __User__
  - input: [AddProductRequest](#AddProductRequest)
  - output: [Product](#Product)

- NewProductInvoice
  - auth type: __User__
  - the request url __query__ can take the following string items:
    - id
  - This methods has an __empty__ __request__ body
  - output: [NewInvoiceResponse](#NewInvoiceResponse)

- GetUserOperations
  - auth type: __User__
  - input: [GetUserOperationsRequest](#GetUserOperationsRequest)
  - output: [GetUserOperationsResponse](#GetUserOperationsResponse)

- NewAddress
  - auth type: __User__
  - input: [NewAddressRequest](#NewAddressRequest)
  - output: [NewAddressResponse](#NewAddressResponse)

- PayAddress
  - auth type: __User__
  - input: [PayAddressRequest](#PayAddressRequest)
  - output: [PayAddressResponse](#PayAddressResponse)

- NewInvoice
  - auth type: __User__
  - input: [NewInvoiceRequest](#NewInvoiceRequest)
  - output: [NewInvoiceResponse](#NewInvoiceResponse)

- DecodeInvoice
  - auth type: __User__
  - input: [DecodeInvoiceRequest](#DecodeInvoiceRequest)
  - output: [DecodeInvoiceResponse](#DecodeInvoiceResponse)

- PayInvoice
  - auth type: __User__
  - input: [PayInvoiceRequest](#PayInvoiceRequest)
  - output: [PayInvoiceResponse](#PayInvoiceResponse)

- OpenChannel
  - auth type: __User__
  - input: [OpenChannelRequest](#OpenChannelRequest)
  - output: [OpenChannelResponse](#OpenChannelResponse)

- GetLnurlWithdrawLink
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [LnurlLinkResponse](#LnurlLinkResponse)

- GetLnurlPayLink
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [LnurlLinkResponse](#LnurlLinkResponse)

- GetLNURLChannelLink
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [LnurlLinkResponse](#LnurlLinkResponse)

- GetLiveUserOperations
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [LiveUserOperation](#LiveUserOperation)

- GetMigrationUpdate
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [MigrationUpdate](#MigrationUpdate)

- GetHttpCreds
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [HttpCreds](#HttpCreds)

- BatchUser
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - This methods has an __empty__ __response__ body

# HTTP API DEFINITION

## Supported HTTP Auths
### These are the supported http auth types, to give different type of access to the API users

- __Guest__:
  - expected context content

- __User__:
  - expected context content
    - __app_id__: _string_
    - __app_user_id__: _string_
    - __user_id__: _string_

- __Admin__:
  - expected context content
    - __admin_id__: _string_

- __Metrics__:
  - expected context content
    - __operator_id__: _string_

- __App__:
  - expected context content
    - __app_id__: _string_

- __GuestWithPub__:
  - expected context content
    - __app_id__: _string_
    - __pub__: _string_

## HTTP Methods
### These are the http methods the client implements to communicate with the API

- LndGetInfo
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/lnd/getinfo__
  - input: [LndGetInfoRequest](#LndGetInfoRequest)
  - output: [LndGetInfoResponse](#LndGetInfoResponse)

- AddApp
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/app/add__
  - input: [AddAppRequest](#AddAppRequest)
  - output: [AuthApp](#AuthApp)

- AuthApp
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/app/auth__
  - input: [AuthAppRequest](#AuthAppRequest)
  - output: [AuthApp](#AuthApp)

- BanUser
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/user/ban__
  - input: [BanUserRequest](#BanUserRequest)
  - output: [BanUserResponse](#BanUserResponse)

- GetUsageMetrics
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/reports/usage__
  - This methods has an __empty__ __request__ body
  - output: [UsageMetrics](#UsageMetrics)

- GetAppsMetrics
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/reports/apps__
  - input: [AppsMetricsRequest](#AppsMetricsRequest)
  - output: [AppsMetrics](#AppsMetrics)

- GetLndMetrics
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/reports/lnd__
  - input: [LndMetricsRequest](#LndMetricsRequest)
  - output: [LndMetrics](#LndMetrics)

- CreateOneTimeInviteLink
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/app/invite/create__
  - input: [CreateOneTimeInviteLinkRequest](#CreateOneTimeInviteLinkRequest)
  - output: [CreateOneTimeInviteLinkResponse](#CreateOneTimeInviteLinkResponse)

- GetInviteLinkState
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/app/invite/get__
  - input: [GetInviteTokenStateRequest](#GetInviteTokenStateRequest)
  - output: [GetInviteTokenStateResponse](#GetInviteTokenStateResponse)

- Health
  - auth type: __Guest__
  - http method: __get__
  - http route: __/api/health__
  - This methods has an __empty__ __request__ body
  - This methods has an __empty__ __response__ body

- EncryptionExchange
  - auth type: __Guest__
  - http method: __post__
  - http route: __/api/encryption/exchange__
  - input: [EncryptionExchangeRequest](#EncryptionExchangeRequest)
  - This methods has an __empty__ __response__ body

- SetMockInvoiceAsPaid
  - auth type: __Guest__
  - http method: __post__
  - http route: __/api/lnd/mock/invoice/paid__
  - input: [SetMockInvoiceAsPaidRequest](#SetMockInvoiceAsPaidRequest)
  - This methods has an __empty__ __response__ body

- GetLnurlWithdrawInfo
  - auth type: __Guest__
  - http method: __get__
  - http route: __/api/guest/lnurl_withdraw/info__
  - the request url __query__ can take the following string items:
    - k1
  - This methods has an __empty__ __request__ body
  - output: [LnurlWithdrawInfoResponse](#LnurlWithdrawInfoResponse)

- HandleLnurlWithdraw
  - auth type: __Guest__
  - http method: __get__
  - http route: __/api/guest/lnurl_withdraw/handle__
  - the request url __query__ can take the following string items:
    - k1
    - pr
  - This methods has an __empty__ __request__ body
  - This methods has an __empty__ __response__ body

- GetLnurlPayInfo
  - auth type: __Guest__
  - http method: __get__
  - http route: __/api/guest/lnurl_pay/info__
  - the request url __query__ can take the following string items:
    - k1
  - This methods has an __empty__ __request__ body
  - output: [LnurlPayInfoResponse](#LnurlPayInfoResponse)

- HandleLnurlPay
  - auth type: __Guest__
  - http method: __get__
  - http route: __/api/guest/lnurl_pay/handle__
  - the request url __query__ can take the following string items:
    - k1
    - amount
    - nostr
    - lnurl
  - This methods has an __empty__ __request__ body
  - output: [HandleLnurlPayResponse](#HandleLnurlPayResponse)

- HandleLnurlAddress
  - auth type: __Guest__
  - http method: __get__
  - http route: __/.well-known/lnurlp/:address_name__
  - the request url __params__ are the following string items:
    - address_name
  - This methods has an __empty__ __request__ body
  - output: [LnurlPayInfoResponse](#LnurlPayInfoResponse)

- EnrollAdminToken
  - auth type: __User__
  - http method: __post__
  - http route: __/api/guest/npub/enroll/admin__
  - input: [EnrollAdminTokenRequest](#EnrollAdminTokenRequest)
  - This methods has an __empty__ __response__ body

- LinkNPubThroughToken
  - auth type: __GuestWithPub__
  - http method: __post__
  - http route: __/api/guest/npub/link__
  - input: [LinkNPubThroughTokenRequest](#LinkNPubThroughTokenRequest)
  - This methods has an __empty__ __response__ body

- UseInviteLink
  - auth type: __GuestWithPub__
  - http method: __post__
  - http route: __/api/guest/invite__
  - input: [UseInviteLinkRequest](#UseInviteLinkRequest)
  - This methods has an __empty__ __response__ body

- GetApp
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/get__
  - This methods has an __empty__ __request__ body
  - output: [Application](#Application)

- AddAppUser
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/user/add__
  - input: [AddAppUserRequest](#AddAppUserRequest)
  - output: [AppUser](#AppUser)

- AddAppInvoice
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/add/invoice__
  - input: [AddAppInvoiceRequest](#AddAppInvoiceRequest)
  - output: [NewInvoiceResponse](#NewInvoiceResponse)

- AddAppUserInvoice
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/user/add/invoice__
  - input: [AddAppUserInvoiceRequest](#AddAppUserInvoiceRequest)
  - output: [NewInvoiceResponse](#NewInvoiceResponse)

- GetAppUser
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/user/get__
  - input: [GetAppUserRequest](#GetAppUserRequest)
  - output: [AppUser](#AppUser)

- PayAppUserInvoice
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/invoice/pay__
  - input: [PayAppUserInvoiceRequest](#PayAppUserInvoiceRequest)
  - output: [PayInvoiceResponse](#PayInvoiceResponse)

- SendAppUserToAppUserPayment
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/user/internal/pay__
  - input: [SendAppUserToAppUserPaymentRequest](#SendAppUserToAppUserPaymentRequest)
  - This methods has an __empty__ __response__ body

- SendAppUserToAppPayment
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/internal/pay__
  - input: [SendAppUserToAppPaymentRequest](#SendAppUserToAppPaymentRequest)
  - This methods has an __empty__ __response__ body

- GetAppUserLNURLInfo
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/user/lnurl/pay/info__
  - input: [GetAppUserLNURLInfoRequest](#GetAppUserLNURLInfoRequest)
  - output: [LnurlPayInfoResponse](#LnurlPayInfoResponse)

- SetMockAppUserBalance
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/mock/user/blance/set__
  - input: [SetMockAppUserBalanceRequest](#SetMockAppUserBalanceRequest)
  - This methods has an __empty__ __response__ body

- SetMockAppBalance
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/mock/blance/set__
  - input: [SetMockAppBalanceRequest](#SetMockAppBalanceRequest)
  - This methods has an __empty__ __response__ body

- RequestNPubLinkingToken
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/user/npub/token__
  - input: [RequestNPubLinkingTokenRequest](#RequestNPubLinkingTokenRequest)
  - output: [RequestNPubLinkingTokenResponse](#RequestNPubLinkingTokenResponse)

- ResetNPubLinkingToken
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/user/npub/token/reset__
  - input: [RequestNPubLinkingTokenRequest](#RequestNPubLinkingTokenRequest)
  - output: [RequestNPubLinkingTokenResponse](#RequestNPubLinkingTokenResponse)

- UserHealth
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/health__
  - This methods has an __empty__ __request__ body
  - This methods has an __empty__ __response__ body

- GetUserInfo
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/info__
  - This methods has an __empty__ __request__ body
  - output: [UserInfo](#UserInfo)

- AddProduct
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/product/add__
  - input: [AddProductRequest](#AddProductRequest)
  - output: [Product](#Product)

- NewProductInvoice
  - auth type: __User__
  - http method: __get__
  - http route: __/api/user/product/get/invoice__
  - the request url __query__ can take the following string items:
    - id
  - This methods has an __empty__ __request__ body
  - output: [NewInvoiceResponse](#NewInvoiceResponse)

- GetUserOperations
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/operations__
  - input: [GetUserOperationsRequest](#GetUserOperationsRequest)
  - output: [GetUserOperationsResponse](#GetUserOperationsResponse)

- NewAddress
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/chain/new__
  - input: [NewAddressRequest](#NewAddressRequest)
  - output: [NewAddressResponse](#NewAddressResponse)

- PayAddress
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/chain/pay__
  - input: [PayAddressRequest](#PayAddressRequest)
  - output: [PayAddressResponse](#PayAddressResponse)

- NewInvoice
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/invoice/new__
  - input: [NewInvoiceRequest](#NewInvoiceRequest)
  - output: [NewInvoiceResponse](#NewInvoiceResponse)

- DecodeInvoice
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/invoice/decode__
  - input: [DecodeInvoiceRequest](#DecodeInvoiceRequest)
  - output: [DecodeInvoiceResponse](#DecodeInvoiceResponse)

- PayInvoice
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/invoice/pay__
  - input: [PayInvoiceRequest](#PayInvoiceRequest)
  - output: [PayInvoiceResponse](#PayInvoiceResponse)

- OpenChannel
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/open/channel__
  - input: [OpenChannelRequest](#OpenChannelRequest)
  - output: [OpenChannelResponse](#OpenChannelResponse)

- GetLnurlWithdrawLink
  - auth type: __User__
  - http method: __get__
  - http route: __/api/user/lnurl_withdraw/link__
  - This methods has an __empty__ __request__ body
  - output: [LnurlLinkResponse](#LnurlLinkResponse)

- GetLnurlPayLink
  - auth type: __User__
  - http method: __get__
  - http route: __/api/user/lnurl_pay/link__
  - This methods has an __empty__ __request__ body
  - output: [LnurlLinkResponse](#LnurlLinkResponse)

- GetLNURLChannelLink
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/lnurl_channel/url__
  - This methods has an __empty__ __request__ body
  - output: [LnurlLinkResponse](#LnurlLinkResponse)

- GetLiveUserOperations
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/operations/sub__
  - This methods has an __empty__ __request__ body
  - output: [LiveUserOperation](#LiveUserOperation)

- GetMigrationUpdate
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/migrations/sub__
  - This methods has an __empty__ __request__ body
  - output: [MigrationUpdate](#MigrationUpdate)

- GetHttpCreds
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/http_creds__
  - This methods has an __empty__ __request__ body
  - output: [HttpCreds](#HttpCreds)

- BatchUser
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/batch__
  - This methods has an __empty__ __request__ body
  - This methods has an __empty__ __response__ body

# INPUTS AND OUTPUTS

## Messages
### The content of requests and response from the methods

### AuthApp
  - __auth_token__: _string_
  - __app__: _[Application](#Application)_

### UserInfo
  - __balance__: _number_
  - __max_withdrawable__: _number_
  - __user_identifier__: _string_
  - __service_fee_bps__: _number_
  - __network_max_fee_bps__: _number_
  - __network_max_fee_fixed__: _number_
  - __userId__: _string_

### UserOperations
  - __operations__: ARRAY of: _[UserOperation](#UserOperation)_
  - __fromIndex__: _number_
  - __toIndex__: _number_

### CreateOneTimeInviteLinkResponse
  - __invitation_link__: _string_

### LndGetInfoRequest
  - __nodeId__: _number_

### Application
  - __npub__: _string_
  - __name__: _string_
  - __id__: _string_
  - __balance__: _number_

### LiveUserOperation
  - __operation__: _[UserOperation](#UserOperation)_

### UsageMetric
  - __auth_in_nano__: _number_
  - __validate_in_nano__: _number_
  - __handle_in_nano__: _number_
  - __batch__: _boolean_
  - __nostr__: _boolean_
  - __batch_size__: _number_
  - __processed_at_ms__: _number_
  - __rpc_name__: _string_
  - __parsed_in_nano__: _number_

### Product
  - __id__: _string_
  - __name__: _string_
  - __price_sats__: _number_

### RequestNPubLinkingTokenResponse
  - __token__: _string_

### EnrollAdminTokenRequest
  - __admin_token__: _string_

### UsersInfo
  - __no_balance__: _number_
  - __negative_balance__: _number_
  - __always_been_inactive__: _number_
  - __balance_avg__: _number_
  - __balance_median__: _number_
  - __total__: _number_

### MigrationUpdate
  - __relays__: _[RelaysMigration](#RelaysMigration)_ *this field is optional
  - __closure__: _[ClosureMigration](#ClosureMigration)_ *this field is optional

### SetMockInvoiceAsPaidRequest
  - __invoice__: _string_
  - __amount__: _number_

### BannedAppUser
  - __app_name__: _string_
  - __app_id__: _string_
  - __user_identifier__: _string_
  - __nostr_pub__: _string_

### AppUser
  - __identifier__: _string_
  - __info__: _[UserInfo](#UserInfo)_
  - __max_withdrawable__: _number_

### PayAddressResponse
  - __service_fee__: _number_
  - __network_fee__: _number_
  - __txId__: _string_
  - __operation_id__: _string_

### UserOperation
  - __inbound__: _boolean_
  - __confirmed__: _boolean_
  - __tx_hash__: _string_
  - __paidAtUnix__: _number_
  - __type__: _[UserOperationType](#UserOperationType)_
  - __operationId__: _string_
  - __service_fee__: _number_
  - __network_fee__: _number_
  - __internal__: _boolean_
  - __amount__: _number_
  - __identifier__: _string_

### AddProductRequest
  - __name__: _string_
  - __price_sats__: _number_

### AppMetrics
  - __users__: _[UsersInfo](#UsersInfo)_
  - __spent__: _number_
  - __fees__: _number_
  - __invoices__: _number_
  - __operations__: ARRAY of: _[UserOperation](#UserOperation)_
  - __app__: _[Application](#Application)_
  - __received__: _number_
  - __available__: _number_
  - __total_fees__: _number_

### LndMetricsRequest
  - __from_unix__: _number_ *this field is optional
  - __to_unix__: _number_ *this field is optional

### PayAppUserInvoiceRequest
  - __user_identifier__: _string_
  - __invoice__: _string_
  - __amount__: _number_

### SendAppUserToAppUserPaymentRequest
  - __from_user_identifier__: _string_
  - __to_user_identifier__: _string_
  - __amount__: _number_

### GetAppUserLNURLInfoRequest
  - __user_identifier__: _string_
  - __base_url_override__: _string_

### SetMockAppBalanceRequest
  - __amount__: _number_

### NewInvoiceResponse
  - __invoice__: _string_

### BanUserResponse
  - __balance_sats__: _number_
  - __banned_app_users__: ARRAY of: _[BannedAppUser](#BannedAppUser)_

### AddAppUserInvoiceRequest
  - __receiver_identifier__: _string_
  - __payer_identifier__: _string_
  - __http_callback_url__: _string_
  - __invoice_req__: _[NewInvoiceRequest](#NewInvoiceRequest)_

### UseInviteLinkRequest
  - __invite_token__: _string_

### LndMetrics
  - __nodes__: ARRAY of: _[LndNodeMetrics](#LndNodeMetrics)_

### AddAppUserRequest
  - __identifier__: _string_
  - __fail_if_exists__: _boolean_
  - __balance__: _number_

### ChainBalanceEvent
  - __total_balance__: _number_
  - __block_height__: _number_
  - __confirmed_balance__: _number_
  - __unconfirmed_balance__: _number_

### GetInviteTokenStateResponse
  - __used__: _boolean_

### NewAddressRequest
  - __addressType__: _[AddressType](#AddressType)_

### HandleLnurlPayResponse
  - __pr__: _string_
  - __routes__: ARRAY of: _[Empty](#Empty)_

### AppsMetricsRequest
  - __from_unix__: _number_ *this field is optional
  - __to_unix__: _number_ *this field is optional
  - __include_operations__: _boolean_ *this field is optional

### ChannelBalanceEvent
  - __block_height__: _number_
  - __channel_id__: _string_
  - __local_balance_sats__: _number_
  - __remote_balance_sats__: _number_

### GetAppUserRequest
  - __user_identifier__: _string_

### PayInvoiceRequest
  - __invoice__: _string_
  - __amount__: _number_

### OpenChannelResponse
  - __channelId__: _string_

### GetUserOperationsResponse
  - __latestOutgoingInvoiceOperations__: _[UserOperations](#UserOperations)_
  - __latestIncomingInvoiceOperations__: _[UserOperations](#UserOperations)_
  - __latestOutgoingTxOperations__: _[UserOperations](#UserOperations)_
  - __latestIncomingTxOperations__: _[UserOperations](#UserOperations)_
  - __latestOutgoingUserToUserPayemnts__: _[UserOperations](#UserOperations)_
  - __latestIncomingUserToUserPayemnts__: _[UserOperations](#UserOperations)_

### Empty

### UsageMetrics
  - __metrics__: ARRAY of: _[UsageMetric](#UsageMetric)_

### RequestNPubLinkingTokenRequest
  - __user_identifier__: _string_

### GetInviteTokenStateRequest
  - __invite_token__: _string_

### HttpCreds
  - __url__: _string_
  - __token__: _string_

### EncryptionExchangeRequest
  - __publicKey__: _string_
  - __deviceId__: _string_

### LnurlPayInfoResponse
  - __tag__: _string_
  - __callback__: _string_
  - __maxSendable__: _number_
  - __minSendable__: _number_
  - __metadata__: _string_
  - __allowsNostr__: _boolean_
  - __nostrPubkey__: _string_

### AuthAppRequest
  - __name__: _string_
  - __allow_user_creation__: _boolean_ *this field is optional

### SetMockAppUserBalanceRequest
  - __user_identifier__: _string_
  - __amount__: _number_

### DecodeInvoiceRequest
  - __invoice__: _string_

### DecodeInvoiceResponse
  - __amount__: _number_

### LnurlWithdrawInfoResponse
  - __callback__: _string_
  - __k1__: _string_
  - __defaultDescription__: _string_
  - __minWithdrawable__: _number_
  - __maxWithdrawable__: _number_
  - __balanceCheck__: _string_
  - __payLink__: _string_
  - __tag__: _string_

### ChannelRouting
  - __receive_errors__: _number_
  - __forward_errors_as_input__: _number_
  - __forward_fee_as_output__: _number_
  - __channel_id__: _string_
  - __send_errors__: _number_
  - __missed_forward_fee_as_output__: _number_
  - __forward_fee_as_input__: _number_
  - __events_number__: _number_
  - __forward_errors_as_output__: _number_
  - __missed_forward_fee_as_input__: _number_

### LndNodeMetrics
  - __chain_balance_events__: ARRAY of: _[ChainBalanceEvent](#ChainBalanceEvent)_
  - __closing_channels__: _number_
  - __channel_routing__: ARRAY of: _[ChannelRouting](#ChannelRouting)_
  - __channels_balance_events__: ARRAY of: _[ChannelBalanceEvent](#ChannelBalanceEvent)_
  - __offline_channels__: _number_
  - __online_channels__: _number_
  - __pending_channels__: _number_
  - __open_channels__: ARRAY of: _[OpenChannel](#OpenChannel)_
  - __closed_channels__: ARRAY of: _[ClosedChannel](#ClosedChannel)_

### GetProductBuyLinkResponse
  - __link__: _string_

### CreateOneTimeInviteLinkRequest
  - __sats__: _number_ *this field is optional

### SendAppUserToAppPaymentRequest
  - __from_user_identifier__: _string_
  - __amount__: _number_

### OpenChannelRequest
  - __pushAmount__: _number_
  - __closeAddress__: _string_
  - __destination__: _string_
  - __fundingAmount__: _number_

### LndGetInfoResponse
  - __alias__: _string_

### AddAppInvoiceRequest
  - __payer_identifier__: _string_
  - __http_callback_url__: _string_
  - __invoice_req__: _[NewInvoiceRequest](#NewInvoiceRequest)_

### NewAddressResponse
  - __address__: _string_

### OpenChannel
  - __channel_id__: _string_
  - __capacity__: _number_
  - __active__: _boolean_
  - __lifetime__: _number_
  - __local_balance__: _number_
  - __remote_balance__: _number_

### ClosedChannel
  - __channel_id__: _string_
  - __capacity__: _number_
  - __closed_height__: _number_

### RelaysMigration
  - __relays__: ARRAY of: _string_

### AppsMetrics
  - __apps__: ARRAY of: _[AppMetrics](#AppMetrics)_

### LnurlLinkResponse
  - __k1__: _string_
  - __lnurl__: _string_

### AddAppRequest
  - __name__: _string_
  - __allow_user_creation__: _boolean_

### PayAddressRequest
  - __address__: _string_
  - __amoutSats__: _number_
  - __satsPerVByte__: _number_

### NewInvoiceRequest
  - __amountSats__: _number_
  - __memo__: _string_

### PayInvoiceResponse
  - __amount_paid__: _number_
  - __operation_id__: _string_
  - __service_fee__: _number_
  - __network_fee__: _number_
  - __preimage__: _string_

### LinkNPubThroughTokenRequest
  - __token__: _string_

### RoutingEvent
  - __incoming_amt_msat__: _number_
  - __offchain__: _boolean_
  - __forward_fail_event__: _boolean_
  - __outgoing_channel_id__: _number_
  - __outgoing_htlc_id__: _number_
  - __timestamp_ns__: _number_
  - __outgoing_amt_msat__: _number_
  - __failure_string__: _string_
  - __settled__: _boolean_
  - __incoming_channel_id__: _number_
  - __incoming_htlc_id__: _number_
  - __event_type__: _string_

### BanUserRequest
  - __user_id__: _string_

### GetUserOperationsRequest
  - __latestIncomingUserToUserPayment__: _number_
  - __latestOutgoingUserToUserPayment__: _number_
  - __max_size__: _number_
  - __latestIncomingInvoice__: _number_
  - __latestOutgoingInvoice__: _number_
  - __latestIncomingTx__: _number_
  - __latestOutgoingTx__: _number_

### ClosureMigration
  - __closes_at_unix__: _number_
## Enums
### The enumerators used in the messages

### AddressType
  - __WITNESS_PUBKEY_HASH__
  - __NESTED_PUBKEY_HASH__
  - __TAPROOT_PUBKEY__

### UserOperationType
  - __INCOMING_TX__
  - __OUTGOING_TX__
  - __INCOMING_INVOICE__
  - __OUTGOING_INVOICE__
  - __OUTGOING_USER_TO_USER__
  - __INCOMING_USER_TO_USER__
