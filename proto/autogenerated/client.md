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

- AddApp
  - auth type: __Admin__
  - input: [AddAppRequest](#AddAppRequest)
  - output: [AuthApp](#AuthApp)

- AddPeer
  - auth type: __Admin__
  - input: [AddPeerRequest](#AddPeerRequest)
  - This methods has an __empty__ __response__ body

- AddProduct
  - auth type: __User__
  - input: [AddProductRequest](#AddProductRequest)
  - output: [Product](#Product)

- AddUserOffer
  - auth type: __User__
  - input: [OfferConfig](#OfferConfig)
  - output: [OfferId](#OfferId)

- AuthApp
  - auth type: __Admin__
  - input: [AuthAppRequest](#AuthAppRequest)
  - output: [AuthApp](#AuthApp)

- AuthorizeDebit
  - auth type: __User__
  - input: [DebitAuthorizationRequest](#DebitAuthorizationRequest)
  - output: [DebitAuthorization](#DebitAuthorization)

- AuthorizeManage
  - auth type: __User__
  - input: [ManageAuthorizationRequest](#ManageAuthorizationRequest)
  - output: [ManageAuthorization](#ManageAuthorization)

- BanDebit
  - auth type: __User__
  - input: [DebitOperation](#DebitOperation)
  - This methods has an __empty__ __response__ body

- BanUser
  - auth type: __Admin__
  - input: [BanUserRequest](#BanUserRequest)
  - output: [BanUserResponse](#BanUserResponse)

- BatchUser
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - This methods has an __empty__ __response__ body

- CloseChannel
  - auth type: __Admin__
  - input: [CloseChannelRequest](#CloseChannelRequest)
  - output: [CloseChannelResponse](#CloseChannelResponse)

- CreateOneTimeInviteLink
  - auth type: __Admin__
  - input: [CreateOneTimeInviteLinkRequest](#CreateOneTimeInviteLinkRequest)
  - output: [CreateOneTimeInviteLinkResponse](#CreateOneTimeInviteLinkResponse)

- DecodeInvoice
  - auth type: __User__
  - input: [DecodeInvoiceRequest](#DecodeInvoiceRequest)
  - output: [DecodeInvoiceResponse](#DecodeInvoiceResponse)

- DeleteUserOffer
  - auth type: __User__
  - input: [OfferId](#OfferId)
  - This methods has an __empty__ __response__ body

- EditDebit
  - auth type: __User__
  - input: [DebitAuthorizationRequest](#DebitAuthorizationRequest)
  - This methods has an __empty__ __response__ body

- EnrollAdminToken
  - auth type: __User__
  - input: [EnrollAdminTokenRequest](#EnrollAdminTokenRequest)
  - This methods has an __empty__ __response__ body

- GetAppsMetrics
  - auth type: __Metrics__
  - input: [AppsMetricsRequest](#AppsMetricsRequest)
  - output: [AppsMetrics](#AppsMetrics)

- GetBundleMetrics
  - auth type: __Metrics__
  - input: [LatestBundleMetricReq](#LatestBundleMetricReq)
  - output: [BundleMetrics](#BundleMetrics)

- GetDebitAuthorizations
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [DebitAuthorizations](#DebitAuthorizations)

- GetErrorStats
  - auth type: __Metrics__
  - This methods has an __empty__ __request__ body
  - output: [ErrorStats](#ErrorStats)

- GetHttpCreds
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [HttpCreds](#HttpCreds)

- GetInviteLinkState
  - auth type: __Admin__
  - input: [GetInviteTokenStateRequest](#GetInviteTokenStateRequest)
  - output: [GetInviteTokenStateResponse](#GetInviteTokenStateResponse)

- GetLNURLChannelLink
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [LnurlLinkResponse](#LnurlLinkResponse)

- GetLiveDebitRequests
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [LiveDebitRequest](#LiveDebitRequest)

- GetLiveManageRequests
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [LiveManageRequest](#LiveManageRequest)

- GetLiveUserOperations
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [LiveUserOperation](#LiveUserOperation)

- GetLndForwardingMetrics
  - auth type: __Metrics__
  - input: [LndMetricsRequest](#LndMetricsRequest)
  - output: [LndForwardingMetrics](#LndForwardingMetrics)

- GetLndMetrics
  - auth type: __Metrics__
  - input: [LndMetricsRequest](#LndMetricsRequest)
  - output: [LndMetrics](#LndMetrics)

- GetLnurlPayLink
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [LnurlLinkResponse](#LnurlLinkResponse)

- GetLnurlWithdrawLink
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [LnurlLinkResponse](#LnurlLinkResponse)

- GetManageAuthorizations
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [ManageAuthorizations](#ManageAuthorizations)

- GetMigrationUpdate
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [MigrationUpdate](#MigrationUpdate)

- GetPaymentState
  - auth type: __User__
  - input: [GetPaymentStateRequest](#GetPaymentStateRequest)
  - output: [PaymentState](#PaymentState)

- GetProvidersDisruption
  - auth type: __Metrics__
  - This methods has an __empty__ __request__ body
  - output: [ProvidersDisruption](#ProvidersDisruption)

- GetSeed
  - auth type: __Admin__
  - This methods has an __empty__ __request__ body
  - output: [LndSeed](#LndSeed)

- GetSingleBundleMetrics
  - auth type: __Metrics__
  - input: [SingleMetricReq](#SingleMetricReq)
  - output: [BundleData](#BundleData)

- GetSingleUsageMetrics
  - auth type: __Metrics__
  - input: [SingleMetricReq](#SingleMetricReq)
  - output: [UsageMetricTlv](#UsageMetricTlv)

- GetUsageMetrics
  - auth type: __Metrics__
  - input: [LatestUsageMetricReq](#LatestUsageMetricReq)
  - output: [UsageMetrics](#UsageMetrics)

- GetUserInfo
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [UserInfo](#UserInfo)

- GetUserOffer
  - auth type: __User__
  - input: [OfferId](#OfferId)
  - output: [OfferConfig](#OfferConfig)

- GetUserOfferInvoices
  - auth type: __User__
  - input: [GetUserOfferInvoicesReq](#GetUserOfferInvoicesReq)
  - output: [OfferInvoices](#OfferInvoices)

- GetUserOffers
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [UserOffers](#UserOffers)

- GetUserOperations
  - auth type: __User__
  - input: [GetUserOperationsRequest](#GetUserOperationsRequest)
  - output: [GetUserOperationsResponse](#GetUserOperationsResponse)

- LinkNPubThroughToken
  - auth type: __GuestWithPub__
  - input: [LinkNPubThroughTokenRequest](#LinkNPubThroughTokenRequest)
  - This methods has an __empty__ __response__ body

- ListChannels
  - auth type: __Admin__
  - This methods has an __empty__ __request__ body
  - output: [LndChannels](#LndChannels)

- LndGetInfo
  - auth type: __Admin__
  - input: [LndGetInfoRequest](#LndGetInfoRequest)
  - output: [LndGetInfoResponse](#LndGetInfoResponse)

- NewAddress
  - auth type: __User__
  - input: [NewAddressRequest](#NewAddressRequest)
  - output: [NewAddressResponse](#NewAddressResponse)

- NewInvoice
  - auth type: __User__
  - input: [NewInvoiceRequest](#NewInvoiceRequest)
  - output: [NewInvoiceResponse](#NewInvoiceResponse)

- NewProductInvoice
  - auth type: __User__
  - the request url __query__ can take the following string items:
    - id
  - This methods has an __empty__ __request__ body
  - output: [NewInvoiceResponse](#NewInvoiceResponse)

- OpenChannel
  - auth type: __Admin__
  - input: [OpenChannelRequest](#OpenChannelRequest)
  - output: [OpenChannelResponse](#OpenChannelResponse)

- PayAddress
  - auth type: __User__
  - input: [PayAddressRequest](#PayAddressRequest)
  - output: [PayAddressResponse](#PayAddressResponse)

- PayInvoice
  - auth type: __User__
  - input: [PayInvoiceRequest](#PayInvoiceRequest)
  - output: [PayInvoiceResponse](#PayInvoiceResponse)

- PingSubProcesses
  - auth type: __Metrics__
  - This methods has an __empty__ __request__ body
  - This methods has an __empty__ __response__ body

- ResetDebit
  - auth type: __User__
  - input: [DebitOperation](#DebitOperation)
  - This methods has an __empty__ __response__ body

- ResetMetricsStorages
  - auth type: __Metrics__
  - This methods has an __empty__ __request__ body
  - This methods has an __empty__ __response__ body

- RespondToDebit
  - auth type: __User__
  - input: [DebitResponse](#DebitResponse)
  - This methods has an __empty__ __response__ body

- SubToWebRtcCandidates
  - auth type: __Metrics__
  - This methods has an __empty__ __request__ body
  - output: [WebRtcCandidate](#WebRtcCandidate)

- SubmitWebRtcMessage
  - auth type: __Metrics__
  - input: [WebRtcMessage](#WebRtcMessage)
  - output: [WebRtcAnswer](#WebRtcAnswer)

- UpdateCallbackUrl
  - auth type: __User__
  - input: [CallbackUrl](#CallbackUrl)
  - output: [CallbackUrl](#CallbackUrl)

- UpdateChannelPolicy
  - auth type: __Admin__
  - input: [UpdateChannelPolicyRequest](#UpdateChannelPolicyRequest)
  - This methods has an __empty__ __response__ body

- UpdateUserOffer
  - auth type: __User__
  - input: [OfferConfig](#OfferConfig)
  - This methods has an __empty__ __response__ body

- UseInviteLink
  - auth type: __GuestWithPub__
  - input: [UseInviteLinkRequest](#UseInviteLinkRequest)
  - This methods has an __empty__ __response__ body

- UserHealth
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [UserHealthState](#UserHealthState)

- ZipMetricsStorages
  - auth type: __Metrics__
  - This methods has an __empty__ __request__ body
  - output: [ZippedMetrics](#ZippedMetrics)

# HTTP API DEFINITION

## Supported HTTP Auths
### These are the supported http auth types, to give different type of access to the API users

- __Admin__:
  - expected context content
    - __admin_id__: _string_

- __App__:
  - expected context content
    - __app_id__: _string_

- __Guest__:
  - expected context content

- __GuestWithPub__:
  - expected context content
    - __app_id__: _string_
    - __pub__: _string_

- __Metrics__:
  - expected context content
    - __app_id__: _string_
    - __operator_id__: _string_

- __User__:
  - expected context content
    - __app_id__: _string_
    - __app_user_id__: _string_
    - __user_id__: _string_

## HTTP Methods
### These are the http methods the client implements to communicate with the API

- AddApp
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/app/add__
  - input: [AddAppRequest](#AddAppRequest)
  - output: [AuthApp](#AuthApp)

- AddAppInvoice
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/add/invoice__
  - input: [AddAppInvoiceRequest](#AddAppInvoiceRequest)
  - output: [NewInvoiceResponse](#NewInvoiceResponse)

- AddAppUser
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/user/add__
  - input: [AddAppUserRequest](#AddAppUserRequest)
  - output: [AppUser](#AppUser)

- AddAppUserInvoice
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/user/add/invoice__
  - input: [AddAppUserInvoiceRequest](#AddAppUserInvoiceRequest)
  - output: [NewInvoiceResponse](#NewInvoiceResponse)

- AddPeer
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/peer__
  - input: [AddPeerRequest](#AddPeerRequest)
  - This methods has an __empty__ __response__ body

- AddProduct
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/product/add__
  - input: [AddProductRequest](#AddProductRequest)
  - output: [Product](#Product)

- AddUserOffer
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/offer/add__
  - input: [OfferConfig](#OfferConfig)
  - output: [OfferId](#OfferId)

- AuthApp
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/app/auth__
  - input: [AuthAppRequest](#AuthAppRequest)
  - output: [AuthApp](#AuthApp)

- AuthorizeDebit
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/debit/authorize__
  - input: [DebitAuthorizationRequest](#DebitAuthorizationRequest)
  - output: [DebitAuthorization](#DebitAuthorization)

- AuthorizeManage
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/manage/authorize__
  - input: [ManageAuthorizationRequest](#ManageAuthorizationRequest)
  - output: [ManageAuthorization](#ManageAuthorization)

- BanDebit
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/debit/ban__
  - input: [DebitOperation](#DebitOperation)
  - This methods has an __empty__ __response__ body

- BanUser
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/user/ban__
  - input: [BanUserRequest](#BanUserRequest)
  - output: [BanUserResponse](#BanUserResponse)

- BatchUser
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/batch__
  - This methods has an __empty__ __request__ body
  - This methods has an __empty__ __response__ body

- CloseChannel
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/channel/close__
  - input: [CloseChannelRequest](#CloseChannelRequest)
  - output: [CloseChannelResponse](#CloseChannelResponse)

- CreateOneTimeInviteLink
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/app/invite/create__
  - input: [CreateOneTimeInviteLinkRequest](#CreateOneTimeInviteLinkRequest)
  - output: [CreateOneTimeInviteLinkResponse](#CreateOneTimeInviteLinkResponse)

- DecodeInvoice
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/invoice/decode__
  - input: [DecodeInvoiceRequest](#DecodeInvoiceRequest)
  - output: [DecodeInvoiceResponse](#DecodeInvoiceResponse)

- DeleteUserOffer
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/offer/delete__
  - input: [OfferId](#OfferId)
  - This methods has an __empty__ __response__ body

- EditDebit
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/debit/edit__
  - input: [DebitAuthorizationRequest](#DebitAuthorizationRequest)
  - This methods has an __empty__ __response__ body

- EncryptionExchange
  - auth type: __Guest__
  - http method: __post__
  - http route: __/api/encryption/exchange__
  - input: [EncryptionExchangeRequest](#EncryptionExchangeRequest)
  - This methods has an __empty__ __response__ body

- EnrollAdminToken
  - auth type: __User__
  - http method: __post__
  - http route: __/api/guest/npub/enroll/admin__
  - input: [EnrollAdminTokenRequest](#EnrollAdminTokenRequest)
  - This methods has an __empty__ __response__ body

- GetApp
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/get__
  - This methods has an __empty__ __request__ body
  - output: [Application](#Application)

- GetAppUser
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/user/get__
  - input: [GetAppUserRequest](#GetAppUserRequest)
  - output: [AppUser](#AppUser)

- GetAppUserLNURLInfo
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/user/lnurl/pay/info__
  - input: [GetAppUserLNURLInfoRequest](#GetAppUserLNURLInfoRequest)
  - output: [LnurlPayInfoResponse](#LnurlPayInfoResponse)

- GetAppsMetrics
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/reports/apps__
  - input: [AppsMetricsRequest](#AppsMetricsRequest)
  - output: [AppsMetrics](#AppsMetrics)

- GetBundleMetrics
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/reports/bundle__
  - input: [LatestBundleMetricReq](#LatestBundleMetricReq)
  - output: [BundleMetrics](#BundleMetrics)

- GetDebitAuthorizations
  - auth type: __User__
  - http method: __get__
  - http route: __/api/user/debit/get__
  - This methods has an __empty__ __request__ body
  - output: [DebitAuthorizations](#DebitAuthorizations)

- GetErrorStats
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/reports/errors__
  - This methods has an __empty__ __request__ body
  - output: [ErrorStats](#ErrorStats)

- GetHttpCreds
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/http_creds__
  - This methods has an __empty__ __request__ body
  - output: [HttpCreds](#HttpCreds)

- GetInviteLinkState
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/app/invite/get__
  - input: [GetInviteTokenStateRequest](#GetInviteTokenStateRequest)
  - output: [GetInviteTokenStateResponse](#GetInviteTokenStateResponse)

- GetLNURLChannelLink
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/lnurl_channel/url__
  - This methods has an __empty__ __request__ body
  - output: [LnurlLinkResponse](#LnurlLinkResponse)

- GetLiveDebitRequests
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/debit/sub__
  - This methods has an __empty__ __request__ body
  - output: [LiveDebitRequest](#LiveDebitRequest)

- GetLiveManageRequests
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/manage/sub__
  - This methods has an __empty__ __request__ body
  - output: [LiveManageRequest](#LiveManageRequest)

- GetLiveUserOperations
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/operations/sub__
  - This methods has an __empty__ __request__ body
  - output: [LiveUserOperation](#LiveUserOperation)

- GetLndForwardingMetrics
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/reports/lnd/forwarding__
  - input: [LndMetricsRequest](#LndMetricsRequest)
  - output: [LndForwardingMetrics](#LndForwardingMetrics)

- GetLndMetrics
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/reports/lnd__
  - input: [LndMetricsRequest](#LndMetricsRequest)
  - output: [LndMetrics](#LndMetrics)

- GetLnurlPayInfo
  - auth type: __Guest__
  - http method: __get__
  - http route: __/api/guest/lnurl_pay/info__
  - the request url __query__ can take the following string items:
    - k1
  - This methods has an __empty__ __request__ body
  - output: [LnurlPayInfoResponse](#LnurlPayInfoResponse)

- GetLnurlPayLink
  - auth type: __User__
  - http method: __get__
  - http route: __/api/user/lnurl_pay/link__
  - This methods has an __empty__ __request__ body
  - output: [LnurlLinkResponse](#LnurlLinkResponse)

- GetLnurlWithdrawInfo
  - auth type: __Guest__
  - http method: __get__
  - http route: __/api/guest/lnurl_withdraw/info__
  - the request url __query__ can take the following string items:
    - k1
  - This methods has an __empty__ __request__ body
  - output: [LnurlWithdrawInfoResponse](#LnurlWithdrawInfoResponse)

- GetLnurlWithdrawLink
  - auth type: __User__
  - http method: __get__
  - http route: __/api/user/lnurl_withdraw/link__
  - This methods has an __empty__ __request__ body
  - output: [LnurlLinkResponse](#LnurlLinkResponse)

- GetManageAuthorizations
  - auth type: __User__
  - http method: __get__
  - http route: __/api/user/manage/get__
  - This methods has an __empty__ __request__ body
  - output: [ManageAuthorizations](#ManageAuthorizations)

- GetMigrationUpdate
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/migrations/sub__
  - This methods has an __empty__ __request__ body
  - output: [MigrationUpdate](#MigrationUpdate)

- GetNPubLinkingState
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/user/npub/state__
  - input: [GetNPubLinking](#GetNPubLinking)
  - output: [NPubLinking](#NPubLinking)

- GetPaymentState
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/payment/state__
  - input: [GetPaymentStateRequest](#GetPaymentStateRequest)
  - output: [PaymentState](#PaymentState)

- GetProvidersDisruption
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/metrics/providers/disruption__
  - This methods has an __empty__ __request__ body
  - output: [ProvidersDisruption](#ProvidersDisruption)

- GetSeed
  - auth type: __Admin__
  - http method: __get__
  - http route: __/api/admin/seed__
  - This methods has an __empty__ __request__ body
  - output: [LndSeed](#LndSeed)

- GetSingleBundleMetrics
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/reports/bundle/single__
  - input: [SingleMetricReq](#SingleMetricReq)
  - output: [BundleData](#BundleData)

- GetSingleUsageMetrics
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/reports/usage/single__
  - input: [SingleMetricReq](#SingleMetricReq)
  - output: [UsageMetricTlv](#UsageMetricTlv)

- GetUsageMetrics
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/reports/usage__
  - input: [LatestUsageMetricReq](#LatestUsageMetricReq)
  - output: [UsageMetrics](#UsageMetrics)

- GetUserInfo
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/info__
  - This methods has an __empty__ __request__ body
  - output: [UserInfo](#UserInfo)

- GetUserOffer
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/offer/get__
  - input: [OfferId](#OfferId)
  - output: [OfferConfig](#OfferConfig)

- GetUserOfferInvoices
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/offer/get/invoices__
  - input: [GetUserOfferInvoicesReq](#GetUserOfferInvoicesReq)
  - output: [OfferInvoices](#OfferInvoices)

- GetUserOffers
  - auth type: __User__
  - http method: __get__
  - http route: __/api/user/offers/get__
  - This methods has an __empty__ __request__ body
  - output: [UserOffers](#UserOffers)

- GetUserOperations
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/operations__
  - input: [GetUserOperationsRequest](#GetUserOperationsRequest)
  - output: [GetUserOperationsResponse](#GetUserOperationsResponse)

- HandleLnurlAddress
  - auth type: __Guest__
  - http method: __get__
  - http route: __/.well-known/lnurlp/:address_name__
  - the request url __params__ are the following string items:
    - address_name
  - This methods has an __empty__ __request__ body
  - output: [LnurlPayInfoResponse](#LnurlPayInfoResponse)

- HandleLnurlPay
  - auth type: __Guest__
  - http method: __get__
  - http route: __/api/guest/lnurl_pay/handle__
  - the request url __query__ can take the following string items:
    - amount
    - k1
    - lnurl
    - nostr
  - This methods has an __empty__ __request__ body
  - output: [HandleLnurlPayResponse](#HandleLnurlPayResponse)

- HandleLnurlWithdraw
  - auth type: __Guest__
  - http method: __get__
  - http route: __/api/guest/lnurl_withdraw/handle__
  - the request url __query__ can take the following string items:
    - k1
    - pr
  - This methods has an __empty__ __request__ body
  - This methods has an __empty__ __response__ body

- Health
  - auth type: __Guest__
  - http method: __get__
  - http route: __/api/health__
  - This methods has an __empty__ __request__ body
  - This methods has an __empty__ __response__ body

- LinkNPubThroughToken
  - auth type: __GuestWithPub__
  - http method: __post__
  - http route: __/api/guest/npub/link__
  - input: [LinkNPubThroughTokenRequest](#LinkNPubThroughTokenRequest)
  - This methods has an __empty__ __response__ body

- ListChannels
  - auth type: __Admin__
  - http method: __get__
  - http route: __/api/admin/channels__
  - This methods has an __empty__ __request__ body
  - output: [LndChannels](#LndChannels)

- LndGetInfo
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/lnd/getinfo__
  - input: [LndGetInfoRequest](#LndGetInfoRequest)
  - output: [LndGetInfoResponse](#LndGetInfoResponse)

- NewAddress
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/chain/new__
  - input: [NewAddressRequest](#NewAddressRequest)
  - output: [NewAddressResponse](#NewAddressResponse)

- NewInvoice
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/invoice/new__
  - input: [NewInvoiceRequest](#NewInvoiceRequest)
  - output: [NewInvoiceResponse](#NewInvoiceResponse)

- NewProductInvoice
  - auth type: __User__
  - http method: __get__
  - http route: __/api/user/product/get/invoice__
  - the request url __query__ can take the following string items:
    - id
  - This methods has an __empty__ __request__ body
  - output: [NewInvoiceResponse](#NewInvoiceResponse)

- OpenChannel
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/channel/open__
  - input: [OpenChannelRequest](#OpenChannelRequest)
  - output: [OpenChannelResponse](#OpenChannelResponse)

- PayAddress
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/chain/pay__
  - input: [PayAddressRequest](#PayAddressRequest)
  - output: [PayAddressResponse](#PayAddressResponse)

- PayAppUserInvoice
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/invoice/pay__
  - input: [PayAppUserInvoiceRequest](#PayAppUserInvoiceRequest)
  - output: [PayInvoiceResponse](#PayInvoiceResponse)

- PayInvoice
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/invoice/pay__
  - input: [PayInvoiceRequest](#PayInvoiceRequest)
  - output: [PayInvoiceResponse](#PayInvoiceResponse)

- PingSubProcesses
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/metrics/ping__
  - This methods has an __empty__ __request__ body
  - This methods has an __empty__ __response__ body

- RequestNPubLinkingToken
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/user/npub/token__
  - input: [RequestNPubLinkingTokenRequest](#RequestNPubLinkingTokenRequest)
  - output: [RequestNPubLinkingTokenResponse](#RequestNPubLinkingTokenResponse)

- ResetDebit
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/debit/reset__
  - input: [DebitOperation](#DebitOperation)
  - This methods has an __empty__ __response__ body

- ResetMetricsStorages
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/metrics/reset__
  - This methods has an __empty__ __request__ body
  - This methods has an __empty__ __response__ body

- ResetNPubLinkingToken
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/user/npub/token/reset__
  - input: [RequestNPubLinkingTokenRequest](#RequestNPubLinkingTokenRequest)
  - output: [RequestNPubLinkingTokenResponse](#RequestNPubLinkingTokenResponse)

- RespondToDebit
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/debit/finish__
  - input: [DebitResponse](#DebitResponse)
  - This methods has an __empty__ __response__ body

- SendAppUserToAppPayment
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/internal/pay__
  - input: [SendAppUserToAppPaymentRequest](#SendAppUserToAppPaymentRequest)
  - This methods has an __empty__ __response__ body

- SendAppUserToAppUserPayment
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/user/internal/pay__
  - input: [SendAppUserToAppUserPaymentRequest](#SendAppUserToAppUserPaymentRequest)
  - This methods has an __empty__ __response__ body

- SetMockAppBalance
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/mock/blance/set__
  - input: [SetMockAppBalanceRequest](#SetMockAppBalanceRequest)
  - This methods has an __empty__ __response__ body

- SetMockAppUserBalance
  - auth type: __App__
  - http method: __post__
  - http route: __/api/app/mock/user/blance/set__
  - input: [SetMockAppUserBalanceRequest](#SetMockAppUserBalanceRequest)
  - This methods has an __empty__ __response__ body

- SetMockInvoiceAsPaid
  - auth type: __Guest__
  - http method: __post__
  - http route: __/api/lnd/mock/invoice/paid__
  - input: [SetMockInvoiceAsPaidRequest](#SetMockInvoiceAsPaidRequest)
  - This methods has an __empty__ __response__ body

- SubToWebRtcCandidates
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/upgrade/wrtc/candidates__
  - This methods has an __empty__ __request__ body
  - output: [WebRtcCandidate](#WebRtcCandidate)

- SubmitWebRtcMessage
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/upgrade/wrtc__
  - input: [WebRtcMessage](#WebRtcMessage)
  - output: [WebRtcAnswer](#WebRtcAnswer)

- UpdateCallbackUrl
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/cb/update__
  - input: [CallbackUrl](#CallbackUrl)
  - output: [CallbackUrl](#CallbackUrl)

- UpdateChannelPolicy
  - auth type: __Admin__
  - http method: __post__
  - http route: __/api/admin/channel/policy/update__
  - input: [UpdateChannelPolicyRequest](#UpdateChannelPolicyRequest)
  - This methods has an __empty__ __response__ body

- UpdateUserOffer
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/offer/update__
  - input: [OfferConfig](#OfferConfig)
  - This methods has an __empty__ __response__ body

- UseInviteLink
  - auth type: __GuestWithPub__
  - http method: __post__
  - http route: __/api/guest/invite__
  - input: [UseInviteLinkRequest](#UseInviteLinkRequest)
  - This methods has an __empty__ __response__ body

- UserHealth
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/health__
  - This methods has an __empty__ __request__ body
  - output: [UserHealthState](#UserHealthState)

- ZipMetricsStorages
  - auth type: __Metrics__
  - http method: __post__
  - http route: __/api/metrics/zip__
  - This methods has an __empty__ __request__ body
  - output: [ZippedMetrics](#ZippedMetrics)

# INPUTS AND OUTPUTS

## Messages
### The content of requests and response from the methods

### AddAppInvoiceRequest
  - __http_callback_url__: _string_
  - __invoice_req__: _[NewInvoiceRequest](#NewInvoiceRequest)_
  - __payer_identifier__: _string_

### AddAppRequest
  - __allow_user_creation__: _boolean_
  - __name__: _string_

### AddAppUserInvoiceRequest
  - __http_callback_url__: _string_
  - __invoice_req__: _[NewInvoiceRequest](#NewInvoiceRequest)_
  - __offer_string__: _string_ *this field is optional
  - __payer_data__: _[PayerData](#PayerData)_ *this field is optional
  - __payer_identifier__: _string_
  - __receiver_identifier__: _string_

### AddAppUserRequest
  - __balance__: _number_
  - __fail_if_exists__: _boolean_
  - __identifier__: _string_

### AddPeerRequest
  - __host__: _string_
  - __port__: _number_
  - __pubkey__: _string_

### AddProductRequest
  - __name__: _string_
  - __price_sats__: _number_

### AppMetrics
  - __app__: _[Application](#Application)_
  - __available__: _number_
  - __fees__: _number_
  - __invoices__: _number_
  - __operations__: ARRAY of: _[UserOperation](#UserOperation)_
  - __received__: _number_
  - __spent__: _number_
  - __total_fees__: _number_
  - __users__: _[UsersInfo](#UsersInfo)_

### AppUsageMetrics
  - __app_metrics__: MAP with key: _string_ and value: _[UsageMetricTlv](#UsageMetricTlv)_

### AppUser
  - __identifier__: _string_
  - __info__: _[UserInfo](#UserInfo)_
  - __max_withdrawable__: _number_

### Application
  - __balance__: _number_
  - __id__: _string_
  - __name__: _string_
  - __npub__: _string_

### AppsMetrics
  - __apps__: ARRAY of: _[AppMetrics](#AppMetrics)_

### AppsMetricsRequest
  - __from_unix__: _number_ *this field is optional
  - __include_operations__: _boolean_ *this field is optional
  - __to_unix__: _number_ *this field is optional

### AuthApp
  - __app__: _[Application](#Application)_
  - __auth_token__: _string_

### AuthAppRequest
  - __allow_user_creation__: _boolean_ *this field is optional
  - __name__: _string_

### BanUserRequest
  - __user_id__: _string_

### BanUserResponse
  - __balance_sats__: _number_
  - __banned_app_users__: ARRAY of: _[BannedAppUser](#BannedAppUser)_

### BannedAppUser
  - __app_id__: _string_
  - __app_name__: _string_
  - __nostr_pub__: _string_
  - __user_identifier__: _string_

### BundleData
  - __available_chunks__: ARRAY of: _number_
  - __base_64_data__: ARRAY of: _string_
  - __current_chunk__: _number_

### BundleMetric
  - __app_bundles__: MAP with key: _string_ and value: _[BundleData](#BundleData)_

### BundleMetrics
  - __apps__: MAP with key: _string_ and value: _[BundleMetric](#BundleMetric)_

### CallbackUrl
  - __url__: _string_

### ChannelPolicy
  - __base_fee_msat__: _number_
  - __fee_rate_ppm__: _number_
  - __max_htlc_msat__: _number_
  - __min_htlc_msat__: _number_
  - __timelock_delta__: _number_

### CloseChannelRequest
  - __force__: _boolean_
  - __funding_txid__: _string_
  - __output_index__: _number_
  - __sat_per_v_byte__: _number_

### CloseChannelResponse
  - __closing_txid__: _string_

### ClosedChannel
  - __capacity__: _number_
  - __channel_id__: _string_
  - __close_tx_timestamp__: _number_
  - __closed_height__: _number_

### ClosureMigration
  - __closes_at_unix__: _number_

### CreateOneTimeInviteLinkRequest
  - __sats__: _number_ *this field is optional

### CreateOneTimeInviteLinkResponse
  - __invitation_link__: _string_

### DebitAuthorization
  - __authorized__: _boolean_
  - __debit_id__: _string_
  - __npub__: _string_
  - __rules__: ARRAY of: _[DebitRule](#DebitRule)_

### DebitAuthorizationRequest
  - __authorize_npub__: _string_
  - __request_id__: _string_ *this field is optional
  - __rules__: ARRAY of: _[DebitRule](#DebitRule)_

### DebitAuthorizations
  - __debits__: ARRAY of: _[DebitAuthorization](#DebitAuthorization)_

### DebitExpirationRule
  - __expires_at_unix__: _number_

### DebitOperation
  - __npub__: _string_

### DebitResponse
  - __npub__: _string_
  - __request_id__: _string_
  - __response__: _[DebitResponse_response](#DebitResponse_response)_

### DebitRule
  - __rule__: _[DebitRule_rule](#DebitRule_rule)_

### DecodeInvoiceRequest
  - __invoice__: _string_

### DecodeInvoiceResponse
  - __amount__: _number_

### Empty

### EncryptionExchangeRequest
  - __deviceId__: _string_
  - __publicKey__: _string_

### EnrollAdminTokenRequest
  - __admin_token__: _string_

### ErrorStat
  - __errors__: _number_
  - __from_unix__: _number_
  - __total__: _number_

### ErrorStats
  - __past10m__: _[ErrorStat](#ErrorStat)_
  - __past1h__: _[ErrorStat](#ErrorStat)_
  - __past1m__: _[ErrorStat](#ErrorStat)_
  - __past24h__: _[ErrorStat](#ErrorStat)_
  - __past6h__: _[ErrorStat](#ErrorStat)_

### FrequencyRule
  - __amount__: _number_
  - __interval__: _[IntervalType](#IntervalType)_
  - __number_of_intervals__: _number_

### GetAppUserLNURLInfoRequest
  - __base_url_override__: _string_
  - __user_identifier__: _string_

### GetAppUserRequest
  - __user_identifier__: _string_

### GetInviteTokenStateRequest
  - __invite_token__: _string_

### GetInviteTokenStateResponse
  - __used__: _boolean_

### GetNPubLinking
  - __user_identifier__: _string_

### GetPaymentStateRequest
  - __invoice__: _string_

### GetProductBuyLinkResponse
  - __link__: _string_

### GetUserOfferInvoicesReq
  - __include_unpaid__: _boolean_
  - __offer_id__: _string_

### GetUserOperationsRequest
  - __latestIncomingInvoice__: _number_
  - __latestIncomingTx__: _number_
  - __latestIncomingUserToUserPayment__: _number_
  - __latestOutgoingInvoice__: _number_
  - __latestOutgoingTx__: _number_
  - __latestOutgoingUserToUserPayment__: _number_
  - __max_size__: _number_

### GetUserOperationsResponse
  - __latestIncomingInvoiceOperations__: _[UserOperations](#UserOperations)_
  - __latestIncomingTxOperations__: _[UserOperations](#UserOperations)_
  - __latestIncomingUserToUserPayemnts__: _[UserOperations](#UserOperations)_
  - __latestOutgoingInvoiceOperations__: _[UserOperations](#UserOperations)_
  - __latestOutgoingTxOperations__: _[UserOperations](#UserOperations)_
  - __latestOutgoingUserToUserPayemnts__: _[UserOperations](#UserOperations)_

### GraphPoint
  - __x__: _number_
  - __y__: _number_

### HandleLnurlPayResponse
  - __pr__: _string_
  - __routes__: ARRAY of: _[Empty](#Empty)_

### HttpCreds
  - __token__: _string_
  - __url__: _string_

### LatestBundleMetricReq
  - __limit__: _number_ *this field is optional

### LatestUsageMetricReq
  - __limit__: _number_ *this field is optional

### LinkNPubThroughTokenRequest
  - __token__: _string_

### LiveDebitRequest
  - __debit__: _[LiveDebitRequest_debit](#LiveDebitRequest_debit)_
  - __npub__: _string_
  - __request_id__: _string_

### LiveManageRequest
  - __npub__: _string_
  - __request_id__: _string_

### LiveUserOperation
  - __operation__: _[UserOperation](#UserOperation)_

### LndChannels
  - __open_channels__: ARRAY of: _[OpenChannel](#OpenChannel)_

### LndForwardingEvent
  - __amt_in__: _number_
  - __amt_out__: _number_
  - __at_unix__: _number_
  - __chan_id_in__: _string_
  - __chan_id_out__: _string_
  - __fee__: _number_

### LndForwardingMetrics
  - __events__: ARRAY of: _[LndForwardingEvent](#LndForwardingEvent)_
  - __total_fees__: _number_

### LndGetInfoRequest
  - __nodeId__: _number_

### LndGetInfoResponse
  - __alias__: _string_
  - __synced_to_chain__: _boolean_
  - __synced_to_graph__: _boolean_
  - __watchdog_barking__: _boolean_

### LndMetrics
  - __nodes__: ARRAY of: _[LndNodeMetrics](#LndNodeMetrics)_

### LndMetricsRequest
  - __from_unix__: _number_ *this field is optional
  - __to_unix__: _number_ *this field is optional

### LndNodeMetrics
  - __chain_balance__: ARRAY of: _[GraphPoint](#GraphPoint)_
  - __channel_balance__: ARRAY of: _[GraphPoint](#GraphPoint)_
  - __closed_channels__: ARRAY of: _[ClosedChannel](#ClosedChannel)_
  - __closing_channels__: _number_
  - __external_balance__: ARRAY of: _[GraphPoint](#GraphPoint)_
  - __forwarding_events__: _number_
  - __forwarding_fees__: _number_
  - __offline_channels__: _number_
  - __online_channels__: _number_
  - __open_channels__: ARRAY of: _[OpenChannel](#OpenChannel)_
  - __pending_channels__: _number_
  - __root_ops__: ARRAY of: _[RootOperation](#RootOperation)_

### LndSeed
  - __seed__: ARRAY of: _string_

### LnurlLinkResponse
  - __k1__: _string_
  - __lnurl__: _string_

### LnurlPayInfoResponse
  - __allowsNostr__: _boolean_
  - __callback__: _string_
  - __maxSendable__: _number_
  - __metadata__: _string_
  - __minSendable__: _number_
  - __nostrPubkey__: _string_
  - __tag__: _string_

### LnurlWithdrawInfoResponse
  - __balanceCheck__: _string_
  - __callback__: _string_
  - __defaultDescription__: _string_
  - __k1__: _string_
  - __maxWithdrawable__: _number_
  - __minWithdrawable__: _number_
  - __payLink__: _string_
  - __tag__: _string_

### ManageAuthorization
  - __authorized__: _boolean_
  - __manage_id__: _string_
  - __npub__: _string_

### ManageAuthorizationRequest
  - __authorize_npub__: _string_
  - __ban__: _boolean_
  - __request_id__: _string_ *this field is optional

### ManageAuthorizations
  - __manages__: ARRAY of: _[ManageAuthorization](#ManageAuthorization)_

### MetricsFile

### MigrationUpdate
  - __closure__: _[ClosureMigration](#ClosureMigration)_ *this field is optional
  - __relays__: _[RelaysMigration](#RelaysMigration)_ *this field is optional

### NPubLinking
  - __state__: _[NPubLinking_state](#NPubLinking_state)_

### NewAddressRequest
  - __addressType__: _[AddressType](#AddressType)_

### NewAddressResponse
  - __address__: _string_

### NewInvoiceRequest
  - __amountSats__: _number_
  - __memo__: _string_
  - __zap__: _string_ *this field is optional

### NewInvoiceResponse
  - __invoice__: _string_

### OfferConfig
  - __callback_url__: _string_
  - __default_offer__: _boolean_
  - __expected_data__: MAP with key: _string_ and value: _[OfferDataType](#OfferDataType)_
  - __label__: _string_
  - __noffer__: _string_
  - __offer_id__: _string_
  - __price_sats__: _number_

### OfferId
  - __offer_id__: _string_

### OfferInvoice
  - __amount__: _number_
  - __data__: MAP with key: _string_ and value: _string_
  - __invoice__: _string_
  - __offer_id__: _string_
  - __paid_at_unix__: _number_

### OfferInvoices
  - __invoices__: ARRAY of: _[OfferInvoice](#OfferInvoice)_

### OpenChannel
  - __active__: _boolean_
  - __capacity__: _number_
  - __channel_id__: _string_
  - __channel_point__: _string_
  - __inactive_since_unix__: _number_
  - __label__: _string_
  - __lifetime__: _number_
  - __local_balance__: _number_
  - __policy__: _[ChannelPolicy](#ChannelPolicy)_ *this field is optional
  - __remote_balance__: _number_

### OpenChannelRequest
  - __close_address__: _string_ *this field is optional
  - __local_funding_amount__: _number_
  - __node_pubkey__: _string_
  - __push_sat__: _number_ *this field is optional
  - __sat_per_v_byte__: _number_

### OpenChannelResponse
  - __channel_id__: _string_

### PayAddressRequest
  - __address__: _string_
  - __amoutSats__: _number_
  - __satsPerVByte__: _number_

### PayAddressResponse
  - __network_fee__: _number_
  - __operation_id__: _string_
  - __service_fee__: _number_
  - __txId__: _string_

### PayAppUserInvoiceRequest
  - __amount__: _number_
  - __debit_npub__: _string_ *this field is optional
  - __invoice__: _string_
  - __user_identifier__: _string_

### PayInvoiceRequest
  - __amount__: _number_
  - __debit_npub__: _string_ *this field is optional
  - __invoice__: _string_

### PayInvoiceResponse
  - __amount_paid__: _number_
  - __network_fee__: _number_
  - __operation_id__: _string_
  - __preimage__: _string_
  - __service_fee__: _number_

### PayerData
  - __data__: MAP with key: _string_ and value: _string_

### PaymentState
  - __amount__: _number_
  - __network_fee__: _number_
  - __paid_at_unix__: _number_
  - __service_fee__: _number_

### Product
  - __id__: _string_
  - __name__: _string_
  - __noffer__: _string_
  - __price_sats__: _number_

### ProviderDisruption
  - __provider_pubkey__: _string_
  - __provider_type__: _string_
  - __since_unix__: _number_

### ProvidersDisruption
  - __disruptions__: ARRAY of: _[ProviderDisruption](#ProviderDisruption)_

### RelaysMigration
  - __relays__: ARRAY of: _string_

### RequestNPubLinkingTokenRequest
  - __user_identifier__: _string_

### RequestNPubLinkingTokenResponse
  - __token__: _string_

### RootOperation
  - __amount__: _number_
  - __created_at_unix__: _number_
  - __op_id__: _string_
  - __op_type__: _[OperationType](#OperationType)_

### RoutingEvent
  - __event_type__: _string_
  - __failure_string__: _string_
  - __forward_fail_event__: _boolean_
  - __incoming_amt_msat__: _number_
  - __incoming_channel_id__: _number_
  - __incoming_htlc_id__: _number_
  - __offchain__: _boolean_
  - __outgoing_amt_msat__: _number_
  - __outgoing_channel_id__: _number_
  - __outgoing_htlc_id__: _number_
  - __settled__: _boolean_
  - __timestamp_ns__: _number_

### SendAppUserToAppPaymentRequest
  - __amount__: _number_
  - __from_user_identifier__: _string_

### SendAppUserToAppUserPaymentRequest
  - __amount__: _number_
  - __from_user_identifier__: _string_
  - __to_user_identifier__: _string_

### SetMockAppBalanceRequest
  - __amount__: _number_

### SetMockAppUserBalanceRequest
  - __amount__: _number_
  - __user_identifier__: _string_

### SetMockInvoiceAsPaidRequest
  - __amount__: _number_
  - __invoice__: _string_

### SingleMetricReq
  - __app_id__: _string_
  - __metric_type__: _[SingleMetricType](#SingleMetricType)_
  - __metrics_name__: _string_
  - __page__: _number_
  - __request_id__: _number_ *this field is optional

### UpdateChannelPolicyRequest
  - __policy__: _[ChannelPolicy](#ChannelPolicy)_
  - __update__: _[UpdateChannelPolicyRequest_update](#UpdateChannelPolicyRequest_update)_

### UsageMetric
  - __app_id__: _string_ *this field is optional
  - __auth_in_nano__: _number_
  - __batch__: _boolean_
  - __batch_size__: _number_
  - __handle_in_nano__: _number_
  - __nostr__: _boolean_
  - __parsed_in_nano__: _number_
  - __processed_at_ms__: _number_
  - __rpc_name__: _string_
  - __success__: _boolean_
  - __validate_in_nano__: _number_

### UsageMetricTlv
  - __available_chunks__: ARRAY of: _number_
  - __base_64_tlvs__: ARRAY of: _string_
  - __current_chunk__: _number_

### UsageMetrics
  - __apps__: MAP with key: _string_ and value: _[AppUsageMetrics](#AppUsageMetrics)_

### UseInviteLinkRequest
  - __invite_token__: _string_

### UserHealthState
  - __downtime_reason__: _string_

### UserInfo
  - __balance__: _number_
  - __bridge_url__: _string_
  - __callback_url__: _string_
  - __max_withdrawable__: _number_
  - __ndebit__: _string_
  - __network_max_fee_bps__: _number_
  - __network_max_fee_fixed__: _number_
  - __noffer__: _string_
  - __service_fee_bps__: _number_
  - __userId__: _string_
  - __user_identifier__: _string_

### UserOffers
  - __offers__: ARRAY of: _[OfferConfig](#OfferConfig)_

### UserOperation
  - __amount__: _number_
  - __confirmed__: _boolean_
  - __identifier__: _string_
  - __inbound__: _boolean_
  - __internal__: _boolean_
  - __network_fee__: _number_
  - __operationId__: _string_
  - __paidAtUnix__: _number_
  - __service_fee__: _number_
  - __tx_hash__: _string_
  - __type__: _[UserOperationType](#UserOperationType)_

### UserOperations
  - __fromIndex__: _number_
  - __operations__: ARRAY of: _[UserOperation](#UserOperation)_
  - __toIndex__: _number_

### UsersInfo
  - __always_been_inactive__: _number_
  - __balance_avg__: _number_
  - __balance_median__: _number_
  - __negative_balance__: _number_
  - __no_balance__: _number_
  - __total__: _number_

### WebRtcAnswer
  - __answer__: _string_ *this field is optional

### WebRtcCandidate
  - __candidate__: _string_

### WebRtcMessage
  - __message__: _[WebRtcMessage_message](#WebRtcMessage_message)_

### ZippedMetrics
  - __path__: _string_
## Enums
### The enumerators used in the messages

### AddressType
  - __NESTED_PUBKEY_HASH__
  - __TAPROOT_PUBKEY__
  - __WITNESS_PUBKEY_HASH__

### IntervalType
  - __DAY__
  - __MONTH__
  - __WEEK__

### OfferDataType
  - __DATA_STRING__

### OperationType
  - __CHAIN_OP__
  - __INVOICE_OP__

### SingleMetricType
  - __BUNDLE_METRIC__
  - __USAGE_METRIC__

### UserOperationType
  - __INCOMING_INVOICE__
  - __INCOMING_TX__
  - __INCOMING_USER_TO_USER__
  - __OUTGOING_INVOICE__
  - __OUTGOING_TX__
  - __OUTGOING_USER_TO_USER__
