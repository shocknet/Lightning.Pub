import crypto from 'crypto';
import { Between, FindOperator, IsNull, LessThanOrEqual, MoreThanOrEqual } from "typeorm"
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { Application } from "./entity/Application.js"
import UserStorage from './userStorage.js';
import { ApplicationUser } from './entity/ApplicationUser.js';
import { getLogger } from '../helpers/logger.js';
import { User } from './entity/User.js';
import { InviteToken } from './entity/InviteToken.js';
import { StorageInterface } from './db/storageInterface.js';
import { AppUserDevice } from './entity/AppUserDevice.js';
import { ApplicationRow, ApplicationUserRow, AppUserDeviceRow, InviteTokenRow, mapAppBackupRow, mapAppUserBackupRow, mapAppUserDeviceBackupRow, mapInviteTokenBackupRow } from '../backup/segments.js';
export default class {
    dbs: StorageInterface
    userStorage: UserStorage
    constructor(dbs: StorageInterface, userStorage: UserStorage) {
        this.dbs = dbs
        this.userStorage = userStorage
    }

    async AddApplication(name: string, allowUserCreation: boolean): Promise<Application> {
        return this.dbs.Tx(async txId => {
            const owner = await this.userStorage.AddUser(0, txId)
            return this.dbs.CreateAndSave<Application>('Application', {
                app_id: crypto.randomBytes(32).toString('hex'),
                name,
                owner,
                allow_user_creation: allowUserCreation
            }, txId)
        })
    }

    async GetApplicationByName(name: string, txId?: string) {
        const found = await this.dbs.FindOne<Application>('Application', { where: { name } }, txId)
        if (!found) {
            throw new Error(`application ${name} not found`)
        }
        return found
    }

    async GetApplications(txId?: string): Promise<Application[]> {
        return this.dbs.Find<Application>('Application', {}, txId)
    }

    async ExportApplications(): Promise<ApplicationRow[]> {
        const apps = await this.GetApplications()
        return apps.map(mapAppBackupRow)
    }

    async RestoreApplications(applications: ApplicationRow[], txId: string): Promise<number> {
        let restoredApplications = 0;
        for (const app of applications) {
            try {
                const owner = await this.userStorage.GetUser(app.owner_user_id, txId)
                await this.dbs.CreateAndSave<Application>('Application', {
                    app_id: app.app_id,
                    name: app.name,
                    owner,
                    allow_user_creation: app.allow_user_creation,
                    nostr_private_key: app.nostr_private_key || undefined,
                    nostr_public_key: app.nostr_public_key || undefined,
                }, txId)
                restoredApplications++;
            } catch (error: any) {
                getLogger({ component: "backupRestore" })("error restoring application", error.message)
            }
        }
        return restoredApplications;
    }


    async GetApplication(appId: string, txId?: string): Promise<Application> {
        if (!appId) {
            throw new Error("invalid app id provided")
        }


        const found = await this.dbs.FindOne<Application>('Application', { where: { app_id: appId } }, txId)
        if (!found) {
            throw new Error(`application ${appId} not found`)
        }
        return found
    }

    async UpdateApplication(app: Application, update: Partial<Application>, txId?: string) {
        await this.dbs.Update<Application>('Application', app.serial_id, update, txId)
    }

    async GenerateApplicationKeys(app: Application) {
        const priv = generateSecretKey()
        const pub = getPublicKey(priv)
        const privString = Buffer.from(priv).toString('hex')
        await this.UpdateApplication(app, { nostr_private_key: privString, nostr_public_key: pub })
        return { privateKey: privString, publicKey: pub, appId: app.app_id, name: app.name }
    }

    async AddApplicationUser(application: Application, userIdentifier: string, balance: number, nostrPub?: string) {
        return this.dbs.Tx(async txId => {
            const user = await this.userStorage.AddUser(balance, txId)
            return this.dbs.CreateAndSave<ApplicationUser>('ApplicationUser', {
                user: user,
                application,
                identifier: userIdentifier,
                nostr_public_key: nostrPub,
                topic_id: crypto.randomBytes(32).toString('hex')
            }, txId)
        })
    }

    async GetApplicationUserIfExists(application: Application, userIdentifier: string, txId?: string): Promise<ApplicationUser | null> {
        return this.dbs.FindOne<ApplicationUser>('ApplicationUser', { where: { identifier: userIdentifier, application: { serial_id: application.serial_id } } }, txId)
    }

    async GetOrCreateNostrAppUser(application: Application, nostrPub: string, txId?: string): Promise<ApplicationUser> {
        if (!nostrPub) {
            throw new Error("no nostrPub provided")
        }
        const user = await this.dbs.FindOne<ApplicationUser>('ApplicationUser', { where: { nostr_public_key: nostrPub } }, txId)
        if (user) {
            return user
        }
        if (!application.allow_user_creation) {
            throw new Error("user creation by client is not allowed in this app")
        }
        return this.AddApplicationUser(application, crypto.randomBytes(32).toString('hex'), 0, nostrPub)
    }

    async FindNostrAppUser(nostrPub: string, txId?: string) {
        return this.dbs.FindOne<ApplicationUser>('ApplicationUser', { where: { nostr_public_key: nostrPub } }, txId)
    }

    async GetOrCreateApplicationUser(application: Application, userIdentifier: string, balance: number): Promise<{ user: ApplicationUser, created: boolean }> {
        const user = await this.GetApplicationUserIfExists(application, userIdentifier)
        if (user) {
            return { user, created: false }
        }
        return { user: await this.AddApplicationUser(application, userIdentifier, balance), created: true }
    }

    async GetApplicationUser(application: Application, userIdentifier: string, txId?: string): Promise<ApplicationUser> {
        const found = await this.GetApplicationUserIfExists(application, userIdentifier, txId)
        if (!found) {
            getLogger({ appName: application.name })("user", userIdentifier, "not found", application.name)
            throw new Error(`application user not found`)
        }

        if (found.application.app_id !== application.app_id) {
            throw new Error("requested user does not belong to requestor application")
        }
        return found
    }

    async GetAllApplicationUsers(txId?: string) {
        return this.dbs.Find<ApplicationUser>('ApplicationUser', {}, txId)
    }

    async ExportApplicationUsers(): Promise<ApplicationUserRow[]> {
        const appUsers = await this.GetAllApplicationUsers()
        return appUsers.map(mapAppUserBackupRow)
    }

    async RestoreApplicationUsers(appUsers: ApplicationUserRow[], txId: string): Promise<number> {
        let restoredAppUsers = 0;
        for (const appUser of appUsers) {
            try {
                const user = await this.userStorage.GetUser(appUser.user_id, txId)
                const application = await this.GetApplication(appUser.app_id, txId)
                await this.dbs.CreateAndSave<ApplicationUser>('ApplicationUser', {
                    user,
                    application,
                    identifier: appUser.identifier,
                    nostr_public_key: appUser.nostr_public_key || undefined,
                    callback_url: appUser.callback_url,
                    topic_id: appUser.topic_id,
                }, txId)
                restoredAppUsers++;
            } catch (error: any) {
                getLogger({ component: "backupRestore" })("error restoring application user", error.message)
            }
        }
        return restoredAppUsers;
    }

    async GetApplicationUsers(application: Application | null, { from, to }: { from?: number, to?: number }, txId?: string) {
        const q = application ? { app_id: application.app_id } : IsNull()
        let time: { created_at?: FindOperator<Date> } = {}
        if (!!from && !!to) {
            time.created_at = Between<Date>(new Date(from * 1000), new Date(to * 1000))
        } else if (!!from) {
            time.created_at = MoreThanOrEqual<Date>(new Date(from * 1000))
        } else if (!!to) {
            time.created_at = LessThanOrEqual<Date>(new Date(to * 1000))
        }
        return this.dbs.Find<ApplicationUser>('ApplicationUser', { where: { application: q, ...time } }, txId)
    }

    async GetAppUserFromUser(application: Application, userId: string, txId?: string): Promise<ApplicationUser | null> {
        return this.dbs.FindOne<ApplicationUser>('ApplicationUser', { where: { user: { user_id: userId }, application: { app_id: application.app_id } } }, txId)
    }

    async GetAllAppUsersFromUser(userId: string, txId?: string): Promise<ApplicationUser[]> {
        return this.dbs.Find<ApplicationUser>('ApplicationUser', { where: { user: { user_id: userId } } }, txId)
    }

    async IsApplicationOwner(userId: string, txId?: string) {
        return this.dbs.FindOne<Application>('Application', { where: { owner: { user_id: userId } } }, txId)
    }


    async AddNPubToApplicationUser(serialId: number, nPub: string, txId?: string) {
        return this.dbs.Update<ApplicationUser>('ApplicationUser', serialId, { nostr_public_key: nPub }, txId)
    }

    async UpdateUserCallbackUrl(application: Application, userIdentifier: string, callbackUrl: string, txId?: string) {
        return this.dbs.Update<ApplicationUser>('ApplicationUser', { application: { app_id: application.app_id }, identifier: userIdentifier }, { callback_url: callbackUrl }, txId)
    }

    async RemoveApplicationUserAndBaseUser(appUser: ApplicationUser, txId?: string) {
        const baseUser = appUser.user;
        this.dbs.Remove<ApplicationUser>('ApplicationUser', appUser, txId)
        this.dbs.Remove<User>('User', baseUser, txId)
    }

    async RemoveAppUsersAndBaseUsers(appUserIds: string[], baseUser: string, txId?: string) {
        for (const appUserId of appUserIds) {
            const appUser = await this.dbs.FindOne<ApplicationUser>('ApplicationUser', { where: { identifier: appUserId } }, txId)
            if (appUser) {
                await this.dbs.Delete<ApplicationUser>('ApplicationUser', appUser.serial_id, txId)
            }
        }
        const user = await this.userStorage.FindUser(baseUser, txId)
        if (!user) return
        await this.dbs.Delete<User>('User', user.serial_id, txId)
    }


    async AddInviteToken(app: Application, sats?: number) {
        return this.dbs.CreateAndSave<InviteToken>('InviteToken', {
            inviteToken: crypto.randomBytes(32).toString('hex'),
            used: false,
            sats: sats,
            application: app
        })
    }

    async FindInviteToken(token: string) {
        return this.dbs.FindOne<InviteToken>('InviteToken', { where: { inviteToken: token } })
    }


    async SetInviteTokenAsUsed(inviteToken: InviteToken) {
        return this.dbs.Update<InviteToken>('InviteToken', inviteToken, { used: true })

    }

    async GetAllInviteTokens(txId?: string) {
        return this.dbs.Find<InviteToken>('InviteToken', {}, txId)
    }

    async ExportInviteTokens(): Promise<InviteTokenRow[]> {
        const tokens = await this.GetAllInviteTokens()
        return tokens.map(mapInviteTokenBackupRow)
    }

    async RestoreInviteTokens(tokens: InviteTokenRow[], txId: string): Promise<number> {
        let restoredTokens = 0;
        for (const token of tokens) {
            try {
                const application = await this.GetApplication(token.app_id, txId)
                await this.dbs.CreateAndSave<InviteToken>('InviteToken', {
                    inviteToken: token.inviteToken,
                    application,
                    sats: token.sats || 0,
                    used: token.used,
                }, txId)
                restoredTokens++;
            } catch (error: any) {
                getLogger({ component: "backupRestore" })("error restoring invite token", error.message)
            }
        }
        return restoredTokens;
    }

    async UpdateAppUserMessagingToken(appUserId: string, deviceId: string, firebaseMessagingToken: string) {
        const existing = await this.dbs.FindOne<AppUserDevice>('AppUserDevice', { where: { app_user_id: appUserId, device_id: deviceId } })
        if (!existing) {
            return this.dbs.CreateAndSave<AppUserDevice>('AppUserDevice', {
                app_user_id: appUserId,
                device_id: deviceId,
                firebase_messaging_token: firebaseMessagingToken
            })
        }
        if (existing.firebase_messaging_token === firebaseMessagingToken) {
            return
        }
        return this.dbs.Update<AppUserDevice>('AppUserDevice', existing.serial_id, { firebase_messaging_token: firebaseMessagingToken })
    }

    async GetAppUserDevices(appUserId: string, txId?: string) {
        return this.dbs.Find<AppUserDevice>('AppUserDevice', { where: { app_user_id: appUserId } }, txId)
    }

    async RemoveAppUserDevices(appUserId: string, txId?: string) {
        return this.dbs.Delete<AppUserDevice>('AppUserDevice', { app_user_id: appUserId }, txId)
    }
    async GetAllAppUserDevices(txId?: string) {
        return this.dbs.Find<AppUserDevice>('AppUserDevice', {}, txId)
    }

    async ExportAppUserDevices(): Promise<AppUserDeviceRow[]> {
        const devices = await this.GetAllAppUserDevices()
        return devices.map(mapAppUserDeviceBackupRow)
    }

    async RestoreAppUserDevices(devices: AppUserDeviceRow[], txId: string): Promise<number> {
        let restoredDevices = 0;
        for (const device of devices) {
            try {
                await this.dbs.CreateAndSave<AppUserDevice>('AppUserDevice', {
                    app_user_id: device.app_user_id,
                    device_id: device.device_id,
                    firebase_messaging_token: device.firebase_messaging_token,
                }, txId)
                restoredDevices++;
            } catch (error: any) {
                getLogger({ component: "backupRestore" })("error restoring app user device", error.message)
            }
        }
        return restoredDevices;
    }
}