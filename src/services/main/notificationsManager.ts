import { PushPair, ShockPush } from "../ShockPush/index.js"
import { getLogger, PubLogger } from "../helpers/logger.js"

export class NotificationsManager {
    private shockPushBaseUrl: string
    private clients: Record<string, ShockPush> = {}
    private logger: PubLogger
    constructor(shockPushBaseUrl: string) {
        this.shockPushBaseUrl = shockPushBaseUrl
        this.logger = getLogger({ component: 'notificationsManager' })
    }

    private getClient = (pair: PushPair) => {
        const client = this.clients[pair.pubkey]
        if (client) {
            return client
        }
        const newClient = new ShockPush(this.shockPushBaseUrl, pair)
        this.clients[pair.pubkey] = newClient
        return newClient
    }

    SendNotification = async (message: string, messagingToken: string, pair: PushPair) => {
        if (!this.shockPushBaseUrl) {
            this.logger("ShockPush is not configured, skipping notification")
            return
        }
        const client = this.getClient(pair)
        await client.SendNotification(message, messagingToken)
    }
}