/**
 * @prettier
 */
exports.ALREADY_AUTH = 'ALREADY_AUTH'

exports.NOT_AUTH = 'NOT_AUTH'

exports.COULDNT_ACCEPT_REQUEST = 'COULDNT_ACCEPT_REQUEST'

exports.COULDNT_SENT_REQUEST = 'COULDNT_SENT_REQUEST'

exports.COULDNT_PUT_REQUEST_RESPONSE = 'COULDNT_PUT_REQUEST_RESPONSE'

/**
 * Error thrown when trying to accept a request, and on retrieval of that
 * request invalid data (not resembling a request) is received.
 */
exports.TRIED_TO_ACCEPT_AN_INVALID_REQUEST =
  'TRIED_TO_ACCEPT_AN_INVALID_REQUEST'

exports.UNSUCCESSFUL_LOGOUT = 'UNSUCCESSFUL_LOGOUT'

exports.UNSUCCESSFUL_REQUEST_ACCEPT = 'UNSUCCESSFUL_REQUEST_ACCEPT'

/**
 * Error thrown when trying to send a handshake request to an user for which
 * there's already an successful handshake.
 */
exports.ALREADY_HANDSHAKED = 'ALREADY_HANDSHAKED'

/**
 * Error thrown when trying to send a handshake request to an user for which
 * there's already a handshake request on his current handshake node.
 */
exports.ALREADY_REQUESTED_HANDSHAKE = 'ALREADY_REQUESTED_HANDSHAKE'

/**
 * Error thrown when trying to send a handshake request to an user on an stale
 * handshake address.
 */
exports.STALE_HANDSHAKE_ADDRESS = 'STALE_HANDSHAKE_ADDRESS'

exports.TIMEOUT_ERR = 'TIMEOUT_ERR'

exports.ORDER_NOT_ANSWERED_IN_TIME = 'ORDER_NOT_ANSWERED_IN_TIME'
