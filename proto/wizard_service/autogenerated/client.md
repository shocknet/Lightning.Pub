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

## HTTP Methods
### These are the http methods the client implements to communicate with the API

- WizardState
  - auth type: __Guest__
  - http method: __get__
  - http route: __/wizard/state__
  - This methods has an __empty__ __request__ body
  - output: [StateResponse](#StateResponse)

- WizardConfig
  - auth type: __Guest__
  - http method: __post__
  - http route: __/wizard/config__
  - input: [ConfigRequest](#ConfigRequest)
  - This methods has an __empty__ __response__ body

- GetAdminConnectInfo
  - auth type: __Guest__
  - http method: __get__
  - http route: __/wizard/admin_connect_info__
  - This methods has an __empty__ __request__ body
  - output: [AdminConnectInfoResponse](#AdminConnectInfoResponse)

- GetServiceState
  - auth type: __Guest__
  - http method: __get__
  - http route: __/wizard/service_state__
  - This methods has an __empty__ __request__ body
  - output: [ServiceStateResponse](#ServiceStateResponse)

# INPUTS AND OUTPUTS

## Messages
### The content of requests and response from the methods

### StateResponse
  - __config_sent__: _boolean_
  - __admin_linked__: _boolean_

### ConfigRequest
  - __source_name__: _string_
  - __relay_url__: _string_
  - __automate_liquidity__: _boolean_
  - __push_backups_to_nostr__: _boolean_

### AdminConnectInfoResponse
  - __nprofile__: _string_
  - __connect_info__: _AdminConnectInfoResponse_connect_info_

### ServiceStateResponse
  - __http_url__: _string_
  - __nprofile__: _string_
  - __provider_name__: _string_
  - __relays__: ARRAY of: _string_
  - __admin_npub__: _string_
  - __relay_connected__: _boolean_
  - __lnd_state__: _[LndState](#LndState)_
  - __watchdog_ok__: _boolean_

### Empty
## Enums
### The enumerators used in the messages

### LndState
  - __OFFLINE__
  - __SYNCING__
  - __ONLINE__
