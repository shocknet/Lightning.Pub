import { DataSource, EntityManager, DeepPartial, FindOptionsWhere, FindOptionsOrder, FindOperator } from 'typeorm';
import NewDB, { DbSettings, MainDbEntities, MainDbNames, MetricsDbEntities, MetricsDbNames, newMetricsDb } from './db.js';
import { PubLogger, getLogger } from '../../helpers/logger.js';
import { allMetricsMigrations, allMigrations } from '../migrations/runner.js';
import transactionsQueue from './transactionsQueue.js';
import { PickKeysByType } from 'typeorm/common/PickKeysByType';
import { deserializeRequest, serializeResponseData, WhereCondition } from './serializationHelpers.js';
import { ProcessMetricsCollector } from '../tlv/processMetricsCollector.js';

export type DBNames = MainDbNames | MetricsDbNames
export type QueryOptions<T> = {
    where?: WhereCondition<T>
    order?: FindOptionsOrder<T>
    take?: number
    skip?: number
}
export type ConnectOperation = {
    type: 'connect'
    opId: string
    settings: DbSettings
    dbType: 'main' | 'metrics'
    debug?: boolean
}

export type PingOperation = {
    type: 'ping'
    opId: string
    debug?: boolean
}

export type StartTxOperation = {
    type: 'startTx'
    opId: string
    description?: string
    debug?: boolean
}

export type EndTxOperation<T> = {
    type: 'endTx'
    txId: string
    opId: string
    debug?: boolean
} & ({ success: true, data: T } | { success: false })

export type DeleteOperation<T> = {
    type: 'delete'
    entity: DBNames
    opId: string
    q: number | FindOptionsWhere<T>
    txId?: string
    debug?: boolean
}

export type RemoveOperation<T> = {
    type: 'remove'
    entity: DBNames
    opId: string
    q: T
    txId?: string
    debug?: boolean
}

export type UpdateOperation<T> = {
    type: 'update'
    entity: DBNames
    opId: string
    toUpdate: DeepPartial<T>
    q: number | FindOptionsWhere<T>
    txId?: string
    debug?: boolean
}

export type IncrementOperation<T> = {
    type: 'increment'
    entity: DBNames
    opId: string
    q: FindOptionsWhere<T>
    propertyPath: string,
    value: number | string
    txId?: string
    debug?: boolean
}

export type DecrementOperation<T> = {
    type: 'decrement'
    entity: DBNames
    opId: string
    q: FindOptionsWhere<T>
    propertyPath: string,
    value: number | string
    txId?: string
    debug?: boolean
}

export type FindOneOperation<T> = {
    type: 'findOne'
    entity: DBNames
    opId: string
    q: QueryOptions<T>
    txId?: string
    debug?: boolean
}

export type FindOperation<T> = {
    type: 'find'
    entity: DBNames
    opId: string
    q: QueryOptions<T>
    txId?: string
    debug?: boolean
}

export type SumOperation<T> = {
    type: 'sum'
    entity: DBNames
    opId: string
    columnName: PickKeysByType<T, number>
    q: WhereCondition<T>
    txId?: string
    debug?: boolean
}

export type CreateAndSaveOperation<T> = {
    type: 'createAndSave'
    entity: DBNames
    opId: string
    toSave: DeepPartial<T>
    txId?: string
    description?: string
    debug?: boolean
}

export type ErrorOperationResponse = { success: false, error: string, opId: string }

export interface IStorageOperation {
    opId: string
    type: string
    debug?: boolean
}

export type StorageOperation<T> = ConnectOperation | StartTxOperation | EndTxOperation<T> | DeleteOperation<T> | RemoveOperation<T> | UpdateOperation<T> |
    FindOneOperation<T> | FindOperation<T> | CreateAndSaveOperation<T> | IncrementOperation<T> | DecrementOperation<T> | SumOperation<T> | PingOperation

export type SuccessOperationResponse<T> = { success: true, type: string, data: T, opId: string }
export type OperationResponse<T> = SuccessOperationResponse<T> | ErrorOperationResponse

type ActiveTransaction = {
    txId: string
    manager: EntityManager | DataSource
    resolve: (value: any) => void
    reject: (reason?: any) => void
}

class StorageProcessor {
    private log: PubLogger = console.log
    private DB: DataSource
    private txQueue: transactionsQueue
    //private locked: boolean = false
    private activeTransaction: ActiveTransaction | null = null
    //private queue: StartTxOperation[] = []
    private mode: 'main' | 'metrics' | '' = ''

    constructor() {
        if (!process.send) {
            throw new Error('This process must be spawned as a child process');
        }
        process.on('message', (operation: StorageOperation<any>) => {
            this.handleOperation(operation);
        });

        process.on('error', (error: Error) => {
            console.error('Error in storage processor:', error);
        });

        new ProcessMetricsCollector((pMetrics) => {
            this.sendResponse({
                success: true,
                type: 'processMetrics',
                data: pMetrics,
                opId: Math.random().toString()
            })
        })
    }

    private async handleOperation(operation: StorageOperation<any>) {
        try {
            const opId = operation.opId;
            if ((operation as any).q) {
                (operation as any).q = deserializeRequest((operation as any).q)
                if (operation.debug) {
                    this.log(operation.type, opId, (operation as any).q)
                }
            }
            switch (operation.type) {
                case 'connect':
                    await this.handleConnect(operation);
                    break;
                case 'startTx':
                    await this.handleStartTx(operation);
                    break;
                case 'endTx':
                    await this.handleEndTx(operation);
                    break;
                case 'delete':
                    await this.handleDelete(operation);
                    break;
                case 'remove':
                    await this.handleRemove(operation);
                    break;
                case 'update':
                    await this.handleUpdate(operation);
                    break;
                case 'increment':
                    await this.handleIncrement(operation);
                    break;
                case 'decrement':
                    await this.handleDecrement(operation);
                    break;
                case 'findOne':
                    await this.handleFindOne(operation);
                    break;
                case 'find':
                    await this.handleFind(operation);
                    break;
                case 'sum':
                    await this.handleSum(operation);
                    break;
                case 'createAndSave':
                    await this.handleCreateAndSave(operation);
                    break;
                case 'ping':
                    await this.handlePing(operation);
                    break;
                default:
                    this.sendResponse({
                        success: false,
                        error: `Unknown operation type: ${(operation as any).type}`,
                        opId
                    })
                    return
            }
        } catch (error) {
            this.sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                opId: operation.opId
            });
        }
    }

    private async handlePing(operation: PingOperation) {
        this.sendResponse({
            success: true,
            type: 'ping',
            data: null,
            opId: operation.opId
        });
    }
    private async handleConnect(operation: ConnectOperation) {
        let migrationsExecuted = 0
        if (this.mode !== '') {
            throw new Error('Already connected to a database')
        }
        this.log = getLogger({ component: 'StorageProcessor_' + operation.dbType })
        if (operation.dbType === 'main') {
            const { source, executedMigrations } = await NewDB(operation.settings, allMigrations)
            this.DB = source
            this.txQueue = new transactionsQueue('StorageProcessorQueue', this.DB)
            migrationsExecuted = executedMigrations.length
            if (executedMigrations.length > 0) {
                this.log(executedMigrations.length, "new migrations executed")
                this.log("-------------------")
            }
            this.mode = 'main'
        } else if (operation.dbType === 'metrics') {
            const { source, executedMigrations } = await newMetricsDb(operation.settings, allMetricsMigrations)
            this.DB = source
            this.txQueue = new transactionsQueue('MetricsStorageProcessorQueue', this.DB)
            migrationsExecuted = executedMigrations.length
            if (executedMigrations.length > 0) {
                this.log(executedMigrations.length, "new metrics migrations executed")
                this.log("-------------------")
            }
            this.mode = 'metrics'
        } else {
            throw new Error('Unknown database type')
        }
        this.sendResponse({
            success: true,
            type: 'connect',
            data: migrationsExecuted,
            opId: operation.opId
        });
    }


    private async handleStartTx(operation: StartTxOperation) {
        try {
            await this.txQueue.PushToQueue({
                dbTx: false,
                description: operation.description || "startTx",
                exec: tx => {
                    this.sendResponse({
                        success: true,
                        type: 'startTx',
                        data: operation.opId,
                        opId: operation.opId
                    });
                    return new Promise((resolve, reject) => {
                        this.activeTransaction = {
                            txId: operation.opId,
                            manager: tx,
                            resolve,
                            reject
                        }
                    })
                }
            })
        } catch (error: any) {
            this.sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                opId: operation.opId
            });
        }
    }

    private async handleEndTx(operation: EndTxOperation<any>) {
        const activeTx = this.activeTransaction
        if (!activeTx || activeTx.txId !== operation.txId) {
            throw new Error('Transaction to end not found');
        }
        if (operation.success) {
            activeTx.resolve(true)
        } else {
            activeTx.reject(new Error('Transaction failed'))
        }
        this.activeTransaction = null
        this.sendResponse({
            success: true,
            type: 'endTx',
            data: operation.success,
            opId: operation.opId
        });

    }

    private getTx(txId: string) {
        if (!this.activeTransaction || this.activeTransaction.txId !== txId) {
            throw new Error('Transaction not found');
        }
        return this.activeTransaction.manager
    }

    private getEntity(entityName: DBNames) {
        if (this.mode === 'main') {
            const e = MainDbEntities[entityName as MainDbNames]
            if (!e) {
                throw new Error(`Unknown entity type for main db: ${entityName}`)
            }
            return e
        } else if (this.mode === 'metrics') {
            const e = MetricsDbEntities[entityName as MetricsDbNames]
            if (!e) {
                throw new Error(`Unknown entity type for metrics db: ${entityName}`)
            }
            return e
        } else {
            throw new Error('Unknown database mode')
        }
    }

    private async handleDelete(operation: DeleteOperation<any>) {

        const res = await this.handleWrite(operation.txId, eM => {
            return eM.getRepository(this.getEntity(operation.entity)).delete(operation.q)
        })
        this.sendResponse({
            success: true,
            type: 'delete',
            data: res.affected || 0,
            opId: operation.opId
        });
    }

    private async handleRemove(operation: RemoveOperation<any>) {
        const res = await this.handleWrite(operation.txId, eM => {
            return eM.getRepository(this.getEntity(operation.entity)).remove(operation.q)
        })

        this.sendResponse({
            success: true,
            type: 'remove',
            data: res,
            opId: operation.opId
        });
    }

    private async handleUpdate(operation: UpdateOperation<any>) {
        const res = await this.handleWrite(operation.txId, eM => {
            return eM.getRepository(this.getEntity(operation.entity)).update(operation.q, operation.toUpdate)
        })

        this.sendResponse({
            success: true,
            type: 'update',
            data: res.affected || 0,
            opId: operation.opId
        });
    }

    private async handleIncrement(operation: IncrementOperation<any>) {
        const res = await this.handleWrite(operation.txId, eM => {
            return eM.getRepository(this.getEntity(operation.entity)).increment(operation.q, operation.propertyPath, operation.value)
        })

        this.sendResponse({
            success: true,
            type: 'increment',
            data: res.affected || 0,
            opId: operation.opId
        });
    }

    private async handleDecrement(operation: DecrementOperation<any>) {
        const res = await this.handleWrite(operation.txId, eM => {
            return eM.getRepository(this.getEntity(operation.entity)).decrement(operation.q, operation.propertyPath, operation.value)
        })

        this.sendResponse({
            success: true,
            type: 'decrement',
            data: res.affected || 0,
            opId: operation.opId
        });
    }

    private async handleFindOne(operation: FindOneOperation<any>) {
        const res = await this.handleRead(operation.txId, eM => {
            return eM.getRepository(this.getEntity(operation.entity)).findOne(operation.q)
        })

        this.sendResponse({
            success: true,
            type: 'findOne',
            data: res,
            opId: operation.opId
        });
    }

    private async handleFind(operation: FindOperation<any>) {
        const res = await this.handleRead(operation.txId, eM => {
            return eM.getRepository(this.getEntity(operation.entity)).find(operation.q)
        })

        this.sendResponse({
            success: true,
            type: 'find',
            data: res,
            opId: operation.opId
        });
    }

    private async handleSum(operation: SumOperation<object>) {
        const res = await this.handleRead(operation.txId, eM => {
            return eM.getRepository(this.getEntity(operation.entity)).sum(operation.columnName, operation.q)
        })
        this.sendResponse({
            success: true,
            type: 'sum',
            data: res || 0,
            opId: operation.opId
        });
    }

    private async handleCreateAndSave(operation: CreateAndSaveOperation<any>) {
        const saved = await this.handleWrite(operation.txId, async eM => {
            const res = eM.getRepository(this.getEntity(operation.entity)).create(operation.toSave)
            return eM.getRepository(this.getEntity(operation.entity)).save(res)
        })

        this.sendResponse({
            success: true,
            type: 'createAndSave',
            data: saved,
            opId: operation.opId
        });
    }

    private async handleRead(txId: string | undefined, read: (tx: DataSource | EntityManager) => Promise<any>) {
        if (txId) {
            const tx = this.getTx(txId)
            return read(tx)
        }
        return this.txQueue.Read(read)
    }

    private async handleWrite(txId: string | undefined, write: (tx: DataSource | EntityManager) => Promise<any>) {
        if (txId) {
            const tx = this.getTx(txId)
            return write(tx)
        }
        return this.txQueue.PushToQueue({
            dbTx: false,
            description: "write",
            exec: tx => {
                return write(tx)
            }
        })
    }

    private sendResponse(response: OperationResponse<any>) {
        let finalResponse = response
        if (finalResponse.success && finalResponse.data) {
            const datesFlaggedData = serializeResponseData(finalResponse.data)
            finalResponse = { ...finalResponse, data: datesFlaggedData }
        }

        try {
            if (process.send) {
                process.send(finalResponse, undefined, undefined, err => {
                    if (err) {
                        console.error("failed to send response to main process from storage processor, killing sub process")
                        process.exit(1)
                    }
                });
            }
        } catch (error) {
            console.error("failed to send response to main process from storage processor, killing sub process")
            process.exit(1)
        }
    }
}

// Start the storage processor
new StorageProcessor();
