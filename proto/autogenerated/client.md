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

- GetLNURLChannelLink
  - auth type: __User__
  - This methods has an __empty__ __request__ body
  - output: [LnurlLinkResponse](#LnurlLinkResponse)

# HTTP API DEFINITION

## Supported HTTP Auths
### These are the supported http auth types, to give different type of access to the API users

- __Guest__:
  - expected context content

- __User__:
  - expected context content
    - __user_id__: _string_

- __Admin__:
  - this auth type is __encrypted__
  - expected context content
    - __admin_id__: _string_

## HTTP Methods
### These are the http methods the client implements to communicate with the API

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

- LndGetInfo
  - auth type: __Admin__
  - this method is encrypted
  - http method: __post__
  - http route: __/api/lnd/getinfo__
  - input: [LndGetInfoRequest](#LndGetInfoRequest)
  - output: [LndGetInfoResponse](#LndGetInfoResponse)

- AddUser
  - auth type: __Guest__
  - http method: __post__
  - http route: __/api/user/add__
  - input: [AddUserRequest](#AddUserRequest)
  - output: [AddUserResponse](#AddUserResponse)

- AuthUser
  - auth type: __Guest__
  - http method: __post__
  - http route: __/api/user/auth__
  - input: [AuthUserRequest](#AuthUserRequest)
  - output: [AuthUserResponse](#AuthUserResponse)

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
  - This methods has an __empty__ __request__ body
  - output: [HandleLnurlPayResponse](#HandleLnurlPayResponse)

- GetLNURLChannelLink
  - auth type: __User__
  - http method: __post__
  - http route: __/api/user/lnurl_channel/url__
  - This methods has an __empty__ __request__ body
  - output: [LnurlLinkResponse](#LnurlLinkResponse)

# INPUTS AND OUTPUTS

## Messages
### The content of requests and response from the methods

### OpenChannelResponse
  - __channelId__: _string_

### UserInfo
  - __userId__: _string_
  - __balance__: _number_

### GetUserOperationsRequest
  - __latestIncomingInvoice__: _number_
  - __latestOutgoingInvoice__: _number_
  - __latestIncomingTx__: _number_
  - __latestOutgoingTx__: _number_

### AddProductRequest
  - __name__: _string_
  - __price_sats__: _number_

### Product
  - __id__: _string_
  - __name__: _string_
  - __price_sats__: _number_

### EncryptionExchangeRequest
  - __publicKey__: _string_
  - __deviceId__: _string_

### NewInvoiceRequest
  - __amountSats__: _number_
  - __memo__: _string_

### PayInvoiceResponse
  - __preimage__: _string_

### HandleLnurlPayResponse
  - __pr__: _string_
  - __routes__: ARRAY of: _[Empty](#Empty)_

### AuthUserRequest
  - __name__: _string_
  - __secret__: _string_

### UserOperations
  - __fromIndex__: _number_
  - __toIndex__: _number_
  - __operations__: ARRAY of: _[UserOperation](#UserOperation)_

### PayAddressRequest
  - __address__: _string_
  - __amoutSats__: _number_
  - __targetConf__: _number_

### OpenChannelRequest
  - __destination__: _string_
  - __fundingAmount__: _number_
  - __pushAmount__: _number_
  - __closeAddress__: _string_

### LnurlLinkResponse
  - __lnurl__: _string_
  - __k1__: _string_

### Empty

### NewInvoiceResponse
  - __invoice__: _string_

### DecodeInvoiceRequest
  - __invoice__: _string_

### AuthUserResponse
  - __userId__: _string_
  - __authToken__: _string_

### GetUserOperationsResponse
  - __latestOutgoingInvoiceOperations__: _[UserOperations](#UserOperations)_
  - __latestIncomingInvoiceOperations__: _[UserOperations](#UserOperations)_
  - __latestOutgoingTxOperations__: _[UserOperations](#UserOperations)_
  - __latestIncomingTxOperations__: _[UserOperations](#UserOperations)_

### LndGetInfoRequest
  - __nodeId__: _number_

### LndGetInfoResponse
  - __alias__: _string_

### AddUserResponse
  - __userId__: _string_
  - __authToken__: _string_

### LnurlWithdrawInfoResponse
  - __tag__: _string_
  - __callback__: _string_
  - __k1__: _string_
  - __defaultDescription__: _string_
  - __minWithdrawable__: _number_
  - __maxWithdrawable__: _number_
  - __balanceCheck__: _string_
  - __payLink__: _string_

### GetProductBuyLinkResponse
  - __link__: _string_

### AddUserRequest
  - __callbackUrl__: _string_
  - __name__: _string_
  - __secret__: _string_

### UserOperation
  - __paidAtUnix__: _number_
  - __type__: _[UserOperationType](#UserOperationType)_
  - __inbound__: _boolean_
  - __amount__: _number_

### NewAddressRequest
  - __addressType__: _[AddressType](#AddressType)_

### NewAddressResponse
  - __address__: _string_

### PayInvoiceRequest
  - __invoice__: _string_
  - __amount__: _number_

### PayAddressResponse
  - __txId__: _string_

### DecodeInvoiceResponse
  - __amount__: _number_

### LnurlPayInfoResponse
  - __tag__: _string_
  - __callback__: _string_
  - __maxSendable__: _number_
  - __minSendable__: _number_
  - __metadata__: _string_
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
