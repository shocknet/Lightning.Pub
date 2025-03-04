/// <reference types="node" />
/// <reference types="typeorm" />
/// <reference types="generic-pool" />
import "reflect-metadata"
import { DataSource, EntityManager, EntityTarget, ObjectLiteral, Repository } from "typeorm"
import { DbSettings } from "./db.js"
import { createPool, Pool } from 'generic-pool'
import { IDbOperations } from "./dbProxy.js"

type DbMessage = {
    id: string
    action: 'init' | 'query' | 'transaction' | 'repository'
    payload: any
}

type DbResponse = {
    id: string
    type: 'response'
    success: boolean
    data?: any
    error?: string
}

class DataSourceWrapper implements IDbOperations {
    private dataSource: DataSource;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
    }

    async initialize(settings: DbSettings, entities: any[], migrations: Function[]): Promise<void> {
        await this.dataSource.initialize();
    }

    async query(query: string, params?: any[]): Promise<any> {
        return this.dataSource.query(query, params);
    }

    async transaction<T>(runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T> {
        return this.dataSource.transaction(runInTransaction);
    }

    getRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): Repository<Entity> {
        return this.dataSource.getRepository(target);
    }

    async close(): Promise<void> {
        await this.dataSource.destroy();
    }

    async StartTransaction<T>(exec: (entityManager: EntityManager) => Promise<T>, description?: string): Promise<T> {
        return this.transaction(exec);
    }
}

// Create connection pool
const createConnectionPool = (settings: DbSettings, entities: any[], migrations: Function[]) => {
    return createPool({
        create: async () => {
            const source = await new DataSource({
                type: "sqlite",
                database: settings.databaseFile,
                entities: entities,
                migrations: migrations,
                // Enable WAL mode for better concurrent performance
                extra: {
                    pragma: [
                        "PRAGMA journal_mode = WAL",
                        "PRAGMA busy_timeout = 30000"
                    ]
                }
            }).initialize()
            return new DataSourceWrapper(source)
        },
        destroy: async (wrapper: DataSourceWrapper) => {
            await wrapper.close()
        }
    }, {
        max: 10, // Maximum 10 connections
        min: 2,  // Minimum 2 connections
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000
    })
}

let pool: Pool<DataSourceWrapper>

// Handle IPC messages
process.on('message', async (msg: DbMessage) => {
    if (!process.send) return

    try {
        const { id, action, payload } = msg

        switch (action) {
            case 'init':
                try {
                    const { settings, entities, migrations } = payload
                    pool = createConnectionPool(settings, entities, migrations)
                    // Ensure at least one connection is ready
                    await pool.acquire()
                    await pool.release(await pool.acquire())
                    process.send({ id, type: 'response', success: true } as DbResponse)
                } catch (error: any) {
                    console.error('Failed to initialize database pool:', error)
                    process.send({ 
                        id, 
                        type: 'response', 
                        success: false, 
                        error: `Failed to initialize database: ${error.message}` 
                    } as DbResponse)
                }
                break

            case 'query':
                if (!pool) {
                    process.send({ 
                        id, 
                        type: 'response', 
                        success: false, 
                        error: 'Database pool not initialized' 
                    } as DbResponse)
                    break
                }
                const { query, params } = payload
                const connection = await pool.acquire()
                try {
                    const result = await connection.query(query, params)
                    process.send({ id, type: 'response', success: true, data: result } as DbResponse)
                } catch (error: any) {
                    process.send({ id, type: 'response', success: false, error: error.message } as DbResponse)
                } finally {
                    await pool.release(connection)
                }
                break

            case 'transaction':
                const { callback } = payload
                const transactionConnection = await pool.acquire()
                try {
                    const result = await transactionConnection.StartTransaction(async (manager: EntityManager) => {
                        // Execute the transaction callback
                        const fn = new Function('manager', `return (${callback})(manager)`)
                        return fn(manager)
                    })
                    process.send({ id, type: 'response', success: true, data: result } as DbResponse)
                } catch (error: any) {
                    process.send({ id, type: 'response', success: false, error: error.message } as DbResponse)
                } finally {
                    await pool.release(transactionConnection)
                }
                break

            case 'repository':
                const { entity, method, args } = payload
                const repoConnection = await pool.acquire()
                try {
                    const repository = repoConnection.getRepository(entity)
                    const result = await (repository as any)[method](...args)
                    process.send({ id, type: 'response', success: true, data: result } as DbResponse)
                } catch (error: any) {
                    process.send({ id, type: 'response', success: false, error: error.message } as DbResponse)
                } finally {
                    await pool.release(repoConnection)
                }
                break
        }
    } catch (error: any) {
        if (process.send) {
            process.send({ id: msg.id, type: 'response', success: false, error: error.message } as DbResponse)
        }
    }
})

// Handle process shutdown
process.on('SIGTERM', async () => {
    if (pool) {
        await pool.drain()
        await pool.clear()
    }
    process.exit(0)
}) 