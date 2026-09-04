import SettingsManager from "../services/main/settingsManager.js"
import {
    ADMIN_AUTOMATION_ENV,
    ADMIN_LSP_THRESHOLD_ENV,
    DEFAULT_LSP_CHANNEL_THRESHOLD,
    MAX_NODE_NAME_LEN,
    automationEnabled,
    disableLiquidityFromAutomation,
    isHttpsAvatarUrl,
    isValidLspThreshold,
    isValidNodeName,
    lspAutoBuyEnabled,
    persistLspThreshold,
    pickDefaultApp,
} from "../services/main/adminNodeSettings.js"
import { MAX_AVATAR_URL_LEN } from "../services/helpers/httpsAvatarUrl.js"
import { StorageTestBase } from "./testBase.js"

export const ignore = false
export const dev = false
export const requires = "storage" as const

type Harness = {
    T: StorageTestBase
    settings: SettingsManager
}

const setupHarness = async (T: StorageTestBase): Promise<Harness> => {
    const settings = new SettingsManager(T.storage)
    await settings.InitSettings()
    return { T, settings }
}

const testPolarityHelpers = (T: StorageTestBase) => {
    T.d("starting testPolarityHelpers")
    T.expect(automationEnabled(false)).to.equal(true)
    T.expect(automationEnabled(true)).to.equal(false)
    T.expect(disableLiquidityFromAutomation(true)).to.equal(false)
    T.expect(disableLiquidityFromAutomation(false)).to.equal(true)
    T.expect(pickDefaultApp([{ name: "other" }, { name: "wallet" }], "wallet")?.name).to.equal("wallet")
    T.expect(pickDefaultApp([{ name: "other" }], "wallet")).to.equal(undefined)
    T.expect(isHttpsAvatarUrl("")).to.equal(true)
    T.expect(isHttpsAvatarUrl("https://cdn.nostrcheck.me/x.png")).to.equal(true)
    T.expect(isHttpsAvatarUrl("http://cdn.nostrcheck.me/x.png")).to.equal(false)
    T.expect(isHttpsAvatarUrl("not-a-url")).to.equal(false)
    T.expect(isHttpsAvatarUrl("https://user:pass@cdn.nostrcheck.me/x.png")).to.equal(false)
    T.expect(isHttpsAvatarUrl("https://cdn.nostrcheck.me/x.png with space")).to.equal(false)
    T.expect(isHttpsAvatarUrl(`https://cdn.nostrcheck.me/${"a".repeat(MAX_AVATAR_URL_LEN)}`)).to.equal(false)
    T.expect(isValidNodeName("wallet")).to.equal(true)
    T.expect(isValidNodeName("")).to.equal(false)
    T.expect(isValidNodeName("a".repeat(MAX_NODE_NAME_LEN + 1))).to.equal(false)
    T.expect(lspAutoBuyEnabled(0)).to.equal(false)
    T.expect(lspAutoBuyEnabled(DEFAULT_LSP_CHANNEL_THRESHOLD)).to.equal(true)
    T.expect(persistLspThreshold(false, 500_000)).to.equal(0)
    T.expect(persistLspThreshold(true, 0)).to.equal(DEFAULT_LSP_CHANNEL_THRESHOLD)
    T.expect(persistLspThreshold(true, 500_000)).to.equal(500_000)
    T.expect(isValidLspThreshold(0)).to.equal(true)
    T.expect(isValidLspThreshold(-1)).to.equal(false)
    T.d("automation on means disableLiquidityProvider is false")
}

const testDefaultAutomationOn = async (h: Harness) => {
    h.T.d("starting testDefaultAutomationOn")
    const disable = h.settings.getSettings().liquiditySettings.disableLiquidityProvider
    h.T.expect(disable).to.equal(false)
    h.T.expect(automationEnabled(disable)).to.equal(true)
    h.T.d("no env set: automation defaults on")
}

const testToggleAutomationPersists = async (h: Harness) => {
    h.T.d("starting testToggleAutomationPersists")
    const off = await h.settings.updateDisableLiquidityProvider(disableLiquidityFromAutomation(false))
    h.T.expect(off).to.equal(true)
    h.T.expect(automationEnabled(h.settings.getSettings().liquiditySettings.disableLiquidityProvider)).to.equal(false)

    const on = await h.settings.updateDisableLiquidityProvider(disableLiquidityFromAutomation(true))
    h.T.expect(on).to.equal(true)
    h.T.expect(automationEnabled(h.settings.getSettings().liquiditySettings.disableLiquidityProvider)).to.equal(true)
    h.T.d("toggling use-automation writes the inverted disable flag")
}

const testEnvLockRefusesDisable = async (h: Harness) => {
    h.T.d("starting testEnvLockRefusesDisable")
    const enabled = await h.settings.updateDisableLiquidityProvider(disableLiquidityFromAutomation(true))
    h.T.expect(enabled || automationEnabled(h.settings.getSettings().liquiditySettings.disableLiquidityProvider)).to.equal(true)

    process.env[ADMIN_AUTOMATION_ENV] = "false"
    try {
        const refused = await h.settings.updateDisableLiquidityProvider(true)
        h.T.expect(refused).to.equal(false)
        h.T.expect(automationEnabled(h.settings.getSettings().liquiditySettings.disableLiquidityProvider)).to.equal(true)
    } finally {
        delete process.env[ADMIN_AUTOMATION_ENV]
    }
    h.T.d("env DISABLE_LIQUIDITY_PROVIDER blocks turning automation off")
}

const testLspThresholdToggle = async (h: Harness) => {
    h.T.d("starting testLspThresholdToggle")
    h.T.expect(h.settings.getSettings().lspSettings.channelThreshold).to.equal(DEFAULT_LSP_CHANNEL_THRESHOLD)
    const off = await h.settings.updateLspChannelThreshold(persistLspThreshold(false, DEFAULT_LSP_CHANNEL_THRESHOLD))
    h.T.expect(off).to.equal(true)
    h.T.expect(h.settings.getSettings().lspSettings.channelThreshold).to.equal(0)
    h.T.expect(lspAutoBuyEnabled(h.settings.getSettings().lspSettings.channelThreshold)).to.equal(false)

    const on = await h.settings.updateLspChannelThreshold(persistLspThreshold(true, 2_000_000))
    h.T.expect(on).to.equal(true)
    h.T.expect(h.settings.getSettings().lspSettings.channelThreshold).to.equal(2_000_000)
    h.T.d("toggle off writes 0, toggle on writes the custom sat amount")
}

const testLspThresholdEnvLock = async (h: Harness) => {
    h.T.d("starting testLspThresholdEnvLock")
    await h.settings.updateLspChannelThreshold(DEFAULT_LSP_CHANNEL_THRESHOLD)
    process.env[ADMIN_LSP_THRESHOLD_ENV] = "0"
    try {
        const refused = await h.settings.updateLspChannelThreshold(0)
        h.T.expect(refused).to.equal(false)
        h.T.expect(h.settings.getSettings().lspSettings.channelThreshold).to.equal(DEFAULT_LSP_CHANNEL_THRESHOLD)
    } finally {
        delete process.env[ADMIN_LSP_THRESHOLD_ENV]
    }
    h.T.d("env LSP_CHANNEL_THRESHOLD blocks changing auto-buy")
}

const testLspThresholdZeroReloads = async (h: Harness) => {
    h.T.d("starting testLspThresholdZeroReloads")
    const off = await h.settings.updateLspChannelThreshold(0)
    h.T.expect(off).to.equal(true)
    const reloaded = new SettingsManager(h.T.storage)
    await reloaded.InitSettings()
    h.T.expect(reloaded.getSettings().lspSettings.channelThreshold).to.equal(0)
    h.T.expect(lspAutoBuyEnabled(reloaded.getSettings().lspSettings.channelThreshold)).to.equal(false)
    h.T.d("stored 0 reloads as 0, not the 1M default")
}

export default async (T: StorageTestBase) => {
    testPolarityHelpers(T)
    const h = await setupHarness(T)
    await testDefaultAutomationOn(h)
    await testToggleAutomationPersists(h)
    await testEnvLockRefusesDisable(h)
    await testLspThresholdToggle(h)
    await testLspThresholdEnvLock(h)
    await testLspThresholdZeroReloads(h)
}
