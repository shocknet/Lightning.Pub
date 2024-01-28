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

# HTTP API DEFINITION

## Supported HTTP Auths
### These are the supported http auth types, to give different type of access to the API users

- __Guest__:
  - expected context content

- __Wallet__:
  - expected context content
    - __wallet_token__: _string_

- __Pub__:
  - expected context content
    - __pub_secret__: _string_

## HTTP Methods
### These are the http methods the client implements to communicate with the API

- PubNewmapping
  - auth type: __Pub__
  - http method: __post__
  - http route: __/api/pub/new/mapping__
  - input: [PubNewMappingRequest](#PubNewMappingRequest)
  - This methods has an __empty__ __response__ body

- WalletGetVanityName
  - auth type: __Wallet__
  - http method: __post__
  - http route: __/api/pub/get/mapping__
  - input: [WalletGetVanityNameRequest](#WalletGetVanityNameRequest)
  - output: [WalletGetVanityNameResponse](#WalletGetVanityNameResponse)

# INPUTS AND OUTPUTS

## Messages
### The content of requests and response from the methods

### PubNewMappingRequest
  - __user_id__: _string_

### WalletGetVanityNameRequest
  - __user_id__: _string_

### WalletGetVanityNameResponse
  - __vanity_name__: _string_

### Empty
## Enums
### The enumerators used in the messages
