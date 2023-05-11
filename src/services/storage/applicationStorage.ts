import crypto from 'crypto';
import { DataSource, EntityManager } from "typeorm"
import { Application } from "./entity/Application.js"
import UserStorage from './userStorage.js';
import { ApplicationUser } from './entity/ApplicationUser.js';
export default class {
    DB: DataSource | EntityManager
    userStorage: UserStorage
    constructor(DB: DataSource | EntityManager, userStorage: UserStorage) {
        this.DB = DB
        this.userStorage = userStorage
    }

    async AddApplication(name: string, entityManager = this.DB): Promise<Application> {
        const owner = await this.userStorage.AddUser(0, entityManager)
        const repo = entityManager.getRepository(Application)
        const newApplication = repo.create({
            app_id: crypto.randomBytes(32).toString('hex'),
            name,
            owner
        })
        return repo.save(newApplication)
    }

    async GetApplication(appId: string, entityManager = this.DB): Promise<Application> {
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

    async AddApplicationUser(appId: string, userIdentifier: string, balance: number) {
        return this.DB.transaction(async tx => {
            const user = await this.userStorage.AddUser(balance, tx)
            const repo = tx.getRepository(ApplicationUser)
            const appUser = repo.create({
                user: user,
                application: await this.GetApplication(appId),
                identifier: userIdentifier,
            })
            return repo.save(appUser)
        })
    }

    GetApplicationUserIfExists(appId: string, userIdentifier: string, entityManager = this.DB): Promise<ApplicationUser | null> {
        return entityManager.getRepository(ApplicationUser).findOne({ where: { identifier: userIdentifier, application: { app_id: appId } } })
    }

    async GetOrCreateApplicationUser(appId: string, userIdentifier: string, balance: number, entityManager = this.DB): Promise<ApplicationUser> {
        const found = await this.GetApplicationUserIfExists(appId, userIdentifier, entityManager)
        if (found) {
            return found
        }
        return this.AddApplicationUser(appId, userIdentifier, balance)
    }

    async GetApplicationUser(appId: string, userIdentifier: string, entityManager = this.DB): Promise<ApplicationUser> {
        const found = await this.GetApplicationUserIfExists(appId, userIdentifier, entityManager)
        if (!found) {
            throw new Error(`application user not found`)
        }

        if (found.application.app_id !== appId) {
            throw new Error("requested user does not belong to requestor application")
        }
        return found
    }

    async IsApplicationUser(userId: string, entityManager = this.DB): Promise<ApplicationUser | null> {
        return await entityManager.getRepository(ApplicationUser).findOne({ where: { user: { user_id: userId } } })
    }

    async IsApplicationOwner(userId: string, entityManager = this.DB) {
        return entityManager.getRepository(Application).findOne({ where: { owner: { user_id: userId } } })
    }
}