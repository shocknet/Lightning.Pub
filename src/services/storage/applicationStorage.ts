import crypto from 'crypto';
import { DataSource, EntityManager } from "typeorm"
import { generatePrivateKey, getPublicKey } from 'nostr-tools';
import { Application } from "./entity/Application.js"
import UserStorage from './userStorage.js';
import { ApplicationUser } from './entity/ApplicationUser.js';
import { getLogger } from '../helpers/logger.js';
export default class {
    DB: DataSource | EntityManager
    userStorage: UserStorage
    constructor(DB: DataSource | EntityManager, userStorage: UserStorage) {
        this.DB = DB
        this.userStorage = userStorage
    }

    async AddApplication(name: string, allowUserCreation: boolean, entityManager = this.DB): Promise<Application> {
        const owner = await this.userStorage.AddUser(0, entityManager)
        const repo = entityManager.getRepository(Application)
        const newApplication = repo.create({
            app_id: crypto.randomBytes(32).toString('hex'),
            name,
            owner,
            allow_user_creation: allowUserCreation
        })
        return repo.save(newApplication)
    }

    async GetApplicationByName(name: string, entityManager = this.DB) {
        const found = await entityManager.getRepository(Application).findOne({
            where: {
                name
            }
        })
        if (!found) {
            throw new Error(`application ${name} not found`)
        }
        return found
    }

    async GetApplications(entityManager = this.DB): Promise<Application[]> {
        return entityManager.getRepository(Application).find()
    }
    async GetApplication(appId: string, entityManager = this.DB): Promise<Application> {
        if (!appId) {
            throw new Error("invalid app id provided")
        }
        const found = await entityManager.getRepository(Application).findOne({
            where: {
                app_id: appId
            }
        })
        if (!found) {
            throw new Error(`application ${appId} not found`)
        }
        return found
    }

    async UpdateApplication(app: Application, update: Partial<Application>, entityManager = this.DB) {
        await entityManager.getRepository(Application).update(app.serial_id, update)
    }

    async GenerateApplicationKeys(app: Application) {
        const priv = generatePrivateKey()
        const pub = getPublicKey(priv)
        await this.UpdateApplication(app, { nostr_private_key: priv, nostr_public_key: pub })
        return { privateKey: priv, publicKey: pub, appId: app.app_id, name: app.name }
    }

    async AddApplicationUser(application: Application, userIdentifier: string, balance: number, nostrPub?: string) {
        return this.DB.transaction(async tx => {
            const user = await this.userStorage.AddUser(balance, tx)
            const repo = tx.getRepository(ApplicationUser)
            const appUser = repo.create({
                user: user,
                application,
                identifier: userIdentifier,
                nostr_public_key: nostrPub
            })
            return repo.save(appUser)
        })
    }

    async GetApplicationUserIfExists(application: Application, userIdentifier: string, entityManager = this.DB): Promise<ApplicationUser | null> {
        return entityManager.getRepository(ApplicationUser).findOne({ where: { identifier: userIdentifier, application: { serial_id: application.serial_id } } })
    }

    async GetOrCreateNostrAppUser(application: Application, nostrPub: string, entityManager = this.DB): Promise<ApplicationUser> {
        if (!nostrPub) {
            throw new Error("no nostrPub provided")
        }
        const user = await entityManager.getRepository(ApplicationUser).findOne({ where: { nostr_public_key: nostrPub } })
        if (user) {
            return user
        }
        if (!application.allow_user_creation) {
            throw new Error("user creation by client is not allowed in this app")
        }
        return this.AddApplicationUser(application, crypto.randomBytes(32).toString('hex'), 0, nostrPub)
    }

    async FindNostrAppUser(nostrPub: string, entityManager = this.DB) {
        return entityManager.getRepository(ApplicationUser).findOne({ where: { nostr_public_key: nostrPub } })
    }

    async GetOrCreateApplicationUser(application: Application, userIdentifier: string, balance: number, entityManager = this.DB): Promise<{ user: ApplicationUser, created: boolean }> {
        const user = await this.GetApplicationUserIfExists(application, userIdentifier, entityManager)
        if (user) {
            return { user, created: false }
        }
        return { user: await this.AddApplicationUser(application, userIdentifier, balance), created: true }
    }

    async GetApplicationUser(application: Application, userIdentifier: string, entityManager = this.DB): Promise<ApplicationUser> {
        const found = await this.GetApplicationUserIfExists(application, userIdentifier, entityManager)
        if (!found) {
            getLogger({ appName: application.name })("user", userIdentifier, "not found", application.name)
            throw new Error(`application user not found`)
        }

        if (found.application.app_id !== application.app_id) {
            throw new Error("requested user does not belong to requestor application")
        }
        return found
    }

    async GetAppUserFromUser(application: Application, userId: string, entityManager = this.DB): Promise<ApplicationUser | null> {
        return await entityManager.getRepository(ApplicationUser).findOne({ where: { user: { user_id: userId }, application: { app_id: application.app_id } } })
    }

    async IsApplicationOwner(userId: string, entityManager = this.DB) {
        return entityManager.getRepository(Application).findOne({ where: { owner: { user_id: userId } } })
    }
}