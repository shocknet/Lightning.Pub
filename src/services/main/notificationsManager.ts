import { PushPair, ShockPush, ShockPushNotification } from "../ShockPush/index.js"
import { getLogger, PubLogger } from "../helpers/logger.js"
import SettingsManager from "./settingsManager.js"

export class NotificationsManager {
    private settings: SettingsManager
    private clients: Record<string, ShockPush> = {}
    private logger: PubLogger
    constructor(settings: SettingsManager) {
        this.settings = settings
        this.logger = getLogger({ component: 'notificationsManager' })
    }

    private getClient = (pair: PushPair) => {
        const client = this.clients[pair.pubkey]
        if (client) {
            return client
        }
        const newClient = new ShockPush(this.settings.getSettings().serviceSettings.shockPushBaseUrl, pair)
        this.clients[pair.pubkey] = newClient
        return newClient
    }

    SendNotification = async (notification: ShockPushNotification, messagingTokens: string[], pair: PushPair) => {
        if (!this.settings.getSettings().serviceSettings.shockPushBaseUrl) {
            this.logger("ShockPush is not configured, skipping notification")
            return
        }
        const client = this.getClient(pair)
        await client.SendNotification(notification, messagingTokens)
    }
}