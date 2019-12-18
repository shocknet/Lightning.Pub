module.exports = {
  unprotectedRoutes: {
    GET: {
      "/healthz": true,
      "/ping": true,
      // Errors out when viewing an API page from the browser
      "/favicon.ico": true,
      "/api/lnd/connect": true,
      "/api/lnd/wallet/status": true,
      "/api/lnd/auth": true
    },
    POST: {
      "/api/lnd/connect": true,
      "/api/lnd/wallet": true,
      "/api/lnd/wallet/existing": true,
      "/api/lnd/auth": true
    },
    PUT: {},
    DELETE: {}
  },
  sensitiveRoutes: {
    GET: {},
    POST: {
      "/api/lnd/connect": true,
      "/api/lnd/wallet": true
    },
    PUT: {},
    DELETE: {}
  }
}