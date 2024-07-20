import { EnvMustBeNonEmptyString, EnvMustBeInteger, EnvCanBeBoolean, EnvCanBeInteger } from '../helpers/envParser.js'
import { LndSettings } from './settings.js'
import os from 'os'
import path from 'path'

const resolveHome = (filepath: string) => {
  let homeDir;
  if (process.env.SUDO_USER) {
    homeDir = path.join('/home', process.env.SUDO_USER);
  } else {
    homeDir = os.homedir();
  }
  return path.join(homeDir, filepath);
}

export const LoadLndSettingsFromEnv = (): LndSettings => {
  const lndAddr = process.env.LND_ADDRESS || "127.0.0.1:10009"
  const lndCertPath = process.env.LND_CERT_PATH || resolveHome("/.lnd/tls.cert")
  const lndMacaroonPath = process.env.LND_MACAROON_PATH || resolveHome("/.lnd/data/chain/bitcoin/mainnet/admin.macaroon")
  const feeRateBps = EnvCanBeInteger("OUTBOUND_MAX_FEE_BPS", 60)
  const feeRateLimit = feeRateBps / 10000
  const feeFixedLimit = EnvCanBeInteger("OUTBOUND_MAX_FEE_EXTRA_SATS", 100)
  const mockLnd = EnvCanBeBoolean("MOCK_LND")
  return { mainNode: { lndAddr, lndCertPath, lndMacaroonPath }, feeRateLimit, feeFixedLimit, feeRateBps, mockLnd }
}
