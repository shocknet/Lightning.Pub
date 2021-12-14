module.exports = {
  unprotectedRoutes: {
    GET: {
      '/healthz': true,
      '/ping': true,
      '/tunnel/status': true,
      // Errors out when viewing an API page from the browser
      '/favicon.ico': true,
      '/api/lnd/connect': true,
      '/api/lnd/wallet/status': true,
      '/api/lnd/auth': true,
      //
      '/api/gun/auth': true,
      '/api/subscribeStream': true,
      '/': true,
      '/api/accessInfo': true,
      '/qrCodeGenerator': true
    },
    POST: {
      '/api/lnd/connect': true,
      '/api/lnd/wallet': true,
      '/api/lnd/wallet/existing': true,
      '/api/lnd/auth': true,
      '/api/security/exchangeKeys': true,
      '/api/encryption/exchange': true
    },
    PUT: {},
    DELETE: {},
    // Preflight request (CORS)
    get OPTIONS() {
      return {
        ...this.POST,
        ...this.GET,
        ...this.PUT,
        ...this.DELETE
      }
    }
  },
  sensitiveRoutes: {
    GET: {},
    POST: {
      '/api/lnd/connect': true,
      '/api/lnd/wallet': true
    },
    PUT: {},
    DELETE: {}
  },
  nonEncryptedRoutes: [
    '/api/security/exchangeKeys',
    '/api/encryption/exchange',
    '/healthz',
    '/ping',
    '/tunnel/status',
    '/api/lnd/wallet/status',
    '/api/gun/auth',
    '/api/subscribeStream',
    '/',
    '/api/accessInfo',
    '/qrCodeGenerator',
    '/gun'
  ]
}
