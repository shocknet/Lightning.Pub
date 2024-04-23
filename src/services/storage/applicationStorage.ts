import crypto from 'crypto';
import { Between, DataSource, EntityManager, FindOperator, IsNull, LessThanOrEqual, MoreThanOrEqual } from "typeorm"
import { generatePrivateKey, getPublicKey } from 'nostr-tools';
import { Application } from "./entity/Application.js"
import UserStorage from './userStorage.js';
import { ApplicationUser } from './entity/ApplicationUser.js';
import { getLogger } from '../helpers/logger.js';
import TransactionsQueue, { TX } from "./transactionsQueue.js";
import { User } from './entity/User.js';
export default class {
    DB: DataSource | EntityManager
    userStorage: UserStorage
    txQueue: TransactionsQueue
    constructor(DB: DataSource | EntityManager, userStorage: UserStorage, txQueue: TransactionsQueue) {
        this.DB = DB
        this.userStorage = userStorage
        this.txQueue = txQueue
    }

    async AddApplication(name: string, allowUserCreation: boolean): Promise<Application> {
        return this.DB.transaction(async tx => {
            const owner = await this.userStorage.AddUser(0, tx)
            const repo = this.DB.getRepository(Application)
            const newApplication = repo.create({
                app_id: crypto.randomBytes(32).toString('hex'),
                name,
                owner,
                allow_user_creation: allowUserCreation
            })
            return tx.getRepository(Application).save(newApplication)
        })
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
            //if (user.application.app_id !== application.app_id) {
            //    throw new Error("tried to access a user of application:" + user.application.app_id + "from application:" + application.app_id)
            //}
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

    async GetApplicationUsers(application: Application | null, { from, to }: { from?: number, to?: number }, entityManager = this.DB) {
        const q = application ? { app_id: application.app_id } : IsNull()
        let time: { created_at?: FindOperator<Date> } = {}
        if (!!from && !!to) {
            time.created_at = Between<Date>(new Date(from * 1000), new Date(to * 1000))
        } else if (!!from) {
            time.created_at = MoreThanOrEqual<Date>(new Date(from * 1000))
        } else if (!!to) {
            time.created_at = LessThanOrEqual<Date>(new Date(to * 1000))
        }
        return entityManager.getRepository(ApplicationUser).find({ where: { application: q, ...time } })
    }

    async GetAppUserFromUser(application: Application, userId: string, entityManager = this.DB): Promise<ApplicationUser | null> {
        return entityManager.getRepository(ApplicationUser).findOne({ where: { user: { user_id: userId }, application: { app_id: application.app_id } } })
    }

    async GetAllAppUsersFromUser(userId: string, entityManager = this.DB): Promise<ApplicationUser[]> {
        return entityManager.getRepository(ApplicationUser).find({ where: { user: { user_id: userId } } })
    }

    async IsApplicationOwner(userId: string, entityManager = this.DB) {
        return entityManager.getRepository(Application).findOne({ where: { owner: { user_id: userId } } })
    }


    async AddNPubToApplicationUser(serialId: number, nPub: string, entityManager = this.DB) {
        return entityManager.getRepository(ApplicationUser).update(serialId, { nostr_public_key: nPub })

    }


    async RemoveApplicationUserAndBaseUser(appUser: ApplicationUser, entityManager = this.DB) {
        const baseUser = appUser.user;
        await entityManager.getRepository(ApplicationUser).remove(appUser);
        await entityManager.getRepository(User).remove(baseUser);
    }
}