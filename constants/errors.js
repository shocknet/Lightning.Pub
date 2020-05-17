module.exports = {
  /**
   * @param {string} path
   */
  MACAROON_PATH: path => `
    The specified macaroon path "${path}" was not found.
    This issue can be caused by:

    1. Setting an invalid path for your Macaroon file.
    2. Not initializing your wallet before using the ShockAPI
  `,
  /**
   * @param {string} path
   */
  CERT_PATH: path => `
    The specified LND certificate file "${path}" was not found.
    This issue can be caused by:

    1. Setting an invalid path for your Certificates.
    2. Not initializing your wallet before using the ShockAPI
  `,
  CERT_MISSING: () =>
    "Required LND certificate path missing from application configuration.",
  /**
   * @param {string|null} macaroonPath
   * @param {string} lndCertPath
   */
  CERT_AND_MACAROON_MISSING: (macaroonPath, lndCertPath) =>
    `
    You neither specified an LND cert path nor a Macaroon path. Please make sure both files exist in the paths you've specified:
    
    Macaroon Path: ${macaroonPath ? macaroonPath : "N/A"}
    LND Certificates path: ${lndCertPath ? lndCertPath : "N/A"}
    `
};
