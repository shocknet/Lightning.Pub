/// <reference types="node" />
/// <reference types="typeorm" />
/// <reference types="uuid" />
import { fork, ChildProcess } from 'child_process'
import { DbSettings } from './db.js'
import { DataSource, EntityManager, EntityTarget, ObjectLiteral, Repository, QueryRunner, Logger } from 'typeorm'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type DbMessage = {
    id: string
    type: 'response'
    success: boolean
    data?: any
    error?: string
}

// Define interface that matches required TypeORM functionality
export interface IDbOperations {
    query(query: string, params?: any[]): Promise<any>
    transaction<T>(runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T>
    getRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): Repository<Entity>
    initialize(settings: DbSettings, entities: any[], migrations: Function[]): Promise<void>
    close(): Promise<void>
}

export class DbProxy implements IDbOperations {
    private process: ChildProcess
    private pendingRequests: Map<string, { resolve: Function, reject: Function }> = new Map()
    private repositoryCache: Map<string, Repository<any>> = new Map()

    constructor() {
        this.process = fork(path.join(__dirname, 'dbService.js'))
        
        this.process.on('message', (msg: DbMessage) => {
            const { id, type, success, data, error } = msg
            const pending = this.pendingRequests.get(id)
            if (pending) {
                if (success) {
                    pending.resolve(data)
                } else {
                    pending.reject(new Error(error))
                }
                this.pendingRequests.delete(id)
            }
        })

        this.process.on('error', (error: Error) => {
            console.error('Database service process error:', error)
            for (const [id, pending] of this.pendingRequests) {
                pending.reject(error)
                this.pendingRequests.delete(id)
            }
        })

        this.process.on('exit', (code: number | null) => {
            console.error('Database service process exited with code:', code)
            for (const [id, pending] of this.pendingRequests) {
                pending.reject(new Error('Database service process exited'))
                this.pendingRequests.delete(id)
            }
        })
    }

    private async sendMessage(action: string, payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = uuidv4()
            this.pendingRequests.set(id, { resolve, reject })
            this.process.send({ id, action, payload })
        })
    }

    async initialize(settings: DbSettings, entities: any[], migrations: Function[]): Promise<void> {
        await this.sendMessage('init', { settings, entities, migrations })
    }

    async query(query: string, params?: any[]): Promise<any> {
        return this.sendMessage('query', { query, params })
    }

    async transaction<T>(
        runInTransaction: (entityManager: EntityManager) => Promise<T>
    ): Promise<T> {
        return this.sendMessage('transaction', { callback: runInTransaction.toString() })
    }

    getRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): Repository<Entity> {
        const key = typeof target === 'function' ? target.name : 
                   typeof target === 'string' ? target :
                   'name' in target ? target.name : target.toString()

        if (!this.repositoryCache.has(key)) {
            // Create a proxy repository that forwards operations to the database service
            const repository = new Proxy({} as Repository<Entity>, {
                get: (target, prop: string) => {
                    if (prop === 'then') {
                        return undefined // Make the proxy non-thenable
                    }
                    return async (...args: any[]) => {
                        return this.sendMessage('repository', {
                            entity: key,
                            method: prop,
                            args
                        })
                    }
                }
            })
            this.repositoryCache.set(key, repository)
        }
        return this.repositoryCache.get(key) as Repository<Entity>
    }

    async close(): Promise<void> {
        this.process.kill('SIGTERM')
        return new Promise((resolve) => {
            this.process.on('exit', resolve)
        })
    }
} 