/// <reference types="node" />
/// <reference types="typeorm" />
/// <reference types="generic-pool" />
import "reflect-metadata"
import { DataSource, EntityManager } from "typeorm"
import { DbSettings } from "./db.js"
import { createPool, Pool } from 'generic-pool'

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
                        "PRAGMA busy_timeout = 5000"
                    ]
                }
            }).initialize()
            return source
        },
        destroy: async (source: DataSource) => {
            await source.destroy()
        }
    }, {
        max: 10, // Maximum 10 connections
        min: 2,  // Minimum 2 connections
        acquireTimeoutMillis: 5000
    })
}

let pool: Pool<DataSource>

// Handle IPC messages
process.on('message', async (msg: DbMessage) => {
    if (!process.send) return

    try {
        const { id, action, payload } = msg

        switch (action) {
            case 'init':
                const { settings, entities, migrations } = payload
                pool = createConnectionPool(settings, entities, migrations)
                process.send({ id, type: 'response', success: true } as DbResponse)
                break

            case 'query':
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
                    const result = await transactionConnection.transaction(async (manager: EntityManager) => {
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