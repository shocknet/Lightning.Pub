module.exports = {
  MACAROON_PATH: path => `
    The specified macaroon path "${path}" was not found.
    This issue can be caused by:

    1. Setting an invalid path for your Macaroon file.
    2. Not initializing your wallet before using the ShockAPI
  `,
  CERT_PATH: path => `
    The specified LND certificate file "${path}" was not found.
    This issue can be caused by:

    1. Setting an invalid path for your Certificates.
    2. Not initializing your wallet before using the ShockAPI
  `,
  CERT_MISSING: () =>
    "Required LND certificate path missing from application configuration."
};
