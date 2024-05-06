import { EnvMustBeNonEmptyString, EnvMustBeInteger, EnvCanBeBoolean } from '../helpers/envParser.js'
import { LndSettings } from './settings.js'
export const LoadLndSettingsFromEnv = (): LndSettings => {
    const lndAddr = EnvMustBeNonEmptyString("LND_ADDRESS")
    const lndCertPath = EnvMustBeNonEmptyString("LND_CERT_PATH")
    const lndMacaroonPath = EnvMustBeNonEmptyString("LND_MACAROON_PATH")
    const feeRateLimit = EnvMustBeInteger("OUTBOUND_MAX_FEE_BPS") / 10000
    const feeFixedLimit = EnvMustBeInteger("OUTBOUND_MAX_FEE_EXTRA_SATS")
    const mockLnd = EnvCanBeBoolean("MOCK_LND")
    return { mainNode: { lndAddr, lndCertPath, lndMacaroonPath }, feeRateLimit, feeFixedLimit, mockLnd }
}
