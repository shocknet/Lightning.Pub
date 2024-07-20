import fs, { watchFile } from "fs";
import crypto from 'crypto'
import { getLogger } from "../helpers/logger.js";
import { MainSettings, getDataPath } from "./settings.js";
import Storage from "../storage/index.js";
export class AdminManager {
    storage: Storage
    log = getLogger({ component: "adminManager" })
    adminNpub = ""
    dataDir: string
    adminNpubPath: string
    adminEnrollTokenPath: string
    interval: NodeJS.Timer
    constructor(mainSettings: MainSettings, storage: Storage) {
        this.storage = storage
        this.dataDir = mainSettings.storageSettings.dataDir
        this.adminNpubPath = getDataPath(this.dataDir, 'admin.npub')
        this.adminEnrollTokenPath = getDataPath(this.dataDir, '.admin_enroll')
        this.start()
    }
    Stop = () => {
        clearInterval(this.interval)
    }

    GenerateAdminEnrollToken = async () => {
        const token = crypto.randomBytes(32).toString('hex')
        fs.writeFileSync(this.adminEnrollTokenPath, token)
        return token
    }

    start = () => {
        const adminNpub = this.ReadAdminNpub()
        if (adminNpub) {
            this.adminNpub = adminNpub
        } else if (!fs.existsSync(this.adminEnrollTokenPath)) {
            this.GenerateAdminEnrollToken()
        }
        this.interval = setInterval(() => {
            if (!this.adminNpub) {
                return
            }
            const deleted = !fs.existsSync(this.adminNpubPath)
            if (deleted) {
                this.adminNpub = ""
                this.log("admin npub file deleted")
                this.GenerateAdminEnrollToken()
            }
        })
    }

    ReadAdminEnrollToken = () => {
        try {
            return fs.readFileSync(this.adminEnrollTokenPath, 'utf8').trim()
        } catch (err: any) {
            return ""
        }
    }

    ReadAdminNpub = () => {
        try {
            return fs.readFileSync(this.adminNpubPath, 'utf8').trim()
        } catch (err: any) {
            return ""
        }
    }

    GetAdminNpub = () => {
        return this.adminNpub
    }

    ClearExistingAdmin = () => {
        try {
            fs.unlinkSync(this.adminNpubPath)
        } catch (err: any) { }
    }

    PromoteUserToAdmin = async (appId: string, appUserId: string, token: string) => {
        const app = await this.storage.applicationStorage.GetApplication(appId)
        const appUser = await this.storage.applicationStorage.GetApplicationUser(app, appUserId)
        const npub = appUser.nostr_public_key
        if (!npub) {
            throw new Error("no npub found for user")
        }
        let actualToken
        try {
            actualToken = fs.readFileSync(this.adminEnrollTokenPath, 'utf8').trim()
        } catch (err: any) {
            throw new Error("invalid enroll token")
        }
        if (token !== actualToken) {
            throw new Error("invalid enroll token")
        }
        fs.writeFileSync(this.adminNpubPath, npub)
        fs.unlinkSync(this.adminEnrollTokenPath)
        this.adminNpub = npub
    }
}