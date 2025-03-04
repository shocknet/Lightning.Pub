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
    StartTransaction<T>(exec: (entityManager: EntityManager) => Promise<T>, description?: string): Promise<T>
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
            // Attempt to restart the process
            this.restartProcess()
        })

        this.process.on('exit', (code: number | null) => {
            console.error('Database service process exited with code:', code)
            for (const [id, pending] of this.pendingRequests) {
                pending.reject(new Error(`Database service process exited with code: ${code}`))
                this.pendingRequests.delete(id)
            }
            // Attempt to restart the process if it wasn't a clean exit
            if (code !== 0) {
                this.restartProcess()
            }
        })
    }

    private restartProcess() {
        try {
            if (!this.process.killed) {
                this.process.kill()
            }
            this.process = fork(path.join(__dirname, 'dbService.js'))
        } catch (error) {
            console.error('Failed to restart database service process:', error)
        }
    }

    private async sendMessage(action: string, payload: any): Promise<any> {
        if (!this.process || this.process.killed) {
            throw new Error('Database service process is not running')
        }
        
        return new Promise((resolve, reject) => {
            const id = uuidv4()
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id)
                reject(new Error('Database request timed out'))
            }, 5000) // Back to 5 second timeout
            this.pendingRequests.set(id, { 
                resolve: (data: any) => {
                    clearTimeout(timeout)
                    resolve(data)
                }, 
                reject: (error: Error) => {
                    clearTimeout(timeout)
                    reject(error)
                } 
            })
            try {
                this.process.send({ id, action, payload })
            } catch (error) {
                clearTimeout(timeout)
                this.pendingRequests.delete(id)
                reject(new Error('Failed to send message to database service'))
            }
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

    async StartTransaction<T>(exec: (entityManager: EntityManager) => Promise<T>, description?: string): Promise<T> {
        return this.transaction(exec);
    }
} 