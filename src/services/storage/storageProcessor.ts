import { DataSource, EntityManager, DeepPartial, FindOptionsWhere, FindOptionsOrder, FindOperator } from 'typeorm';
import NewDB, { DbSettings, MainDbEntities, MainDbNames, newMetricsDb } from './db.js';
import { PubLogger, getLogger } from '../helpers/logger.js';
import { allMetricsMigrations, allMigrations } from './migrations/runner.js';
import transactionsQueue from './transactionsQueue.js';
import { PickKeysByType } from 'typeorm/common/PickKeysByType';
import { deserializeRequest, WhereCondition } from './serializationHelpers.js';


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
}

export type StartTxOperation = {
    type: 'startTx'
    opId: string
    description?: string
}

export type EndTxOperation<T> = {
    type: 'endTx'
    txId: string
    opId: string
} & ({ success: true, data: T } | { success: false })

export type DeleteOperation<T> = {
    type: 'delete'
    entity: MainDbNames
    opId: string
    q: number | FindOptionsWhere<T>
    txId?: string
}

export type RemoveOperation<T> = {
    type: 'remove'
    entity: MainDbNames
    opId: string
    q: T
    txId?: string
}

export type UpdateOperation<T> = {
    type: 'update'
    entity: MainDbNames
    opId: string
    toUpdate: DeepPartial<T>
    q: number | FindOptionsWhere<T>
    txId?: string
}

export type IncrementOperation<T> = {
    type: 'increment'
    entity: MainDbNames
    opId: string
    q: FindOptionsWhere<T>
    propertyPath: string,
    value: number | string
    txId?: string
}

export type DecrementOperation<T> = {
    type: 'decrement'
    entity: MainDbNames
    opId: string
    q: FindOptionsWhere<T>
    propertyPath: string,
    value: number | string
    txId?: string
}

export type FindOneOperation<T> = {
    type: 'findOne'
    entity: MainDbNames
    opId: string
    q: QueryOptions<T>
    txId?: string
}

export type FindOperation<T> = {
    type: 'find'
    entity: MainDbNames
    opId: string
    q: QueryOptions<T>
    txId?: string
}

export type SumOperation<T> = {
    type: 'sum'
    entity: MainDbNames
    opId: string
    columnName: PickKeysByType<T, number>
    q: WhereCondition<T>
    txId?: string
}

export type CreateAndSaveOperation<T> = {
    type: 'createAndSave'
    entity: MainDbNames
    opId: string
    toSave: DeepPartial<T>
    txId?: string
    description?: string
}

export type ErrorOperationResponse = { success: false, error: string, opId: string }

export interface IStorageOperation {
    opId: string
    type: string
}

export type StorageOperation<T> = ConnectOperation | StartTxOperation | EndTxOperation<T> | DeleteOperation<T> | RemoveOperation<T> | UpdateOperation<T> |
    FindOneOperation<T> | FindOperation<T> | CreateAndSaveOperation<T> | IncrementOperation<T> | DecrementOperation<T> | SumOperation<T>

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

    constructor() {
        if (!process.send) {
            throw new Error('This process must be spawned as a child process');
        }
        this.log = getLogger({ component: 'StorageProcessor' })
        process.on('message', (operation: StorageOperation<any>) => {
            this.handleOperation(operation);
        });

        process.on('error', (error: Error) => {
            console.error('Error in storage processor:', error);
        });
    }

    private async handleOperation(operation: StorageOperation<any>) {
        try {
            const opId = operation.opId;
            if ((operation as any).q) {
                (operation as any).q = deserializeRequest((operation as any).q)
            }
            switch (operation.type) {
                case 'connect':
                    return this.handleConnect(operation);
                case 'startTx':
                    return this.handleStartTx(operation);
                case 'endTx':
                    return this.handleEndTx(operation);
                case 'delete':
                    return this.handleDelete(operation);
                case 'remove':
                    return this.handleRemove(operation);
                case 'update':
                    return this.handleUpdate(operation);
                case 'increment':
                    return this.handleIncrement(operation);
                case 'decrement':
                    return this.handleDecrement(operation);
                case 'findOne':
                    return this.handleFindOne(operation);
                case 'find':
                    return this.handleFind(operation);
                case 'sum':
                    return this.handleSum(operation);
                case 'createAndSave':
                    return this.handleCreateAndSave(operation);
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

    private async handleConnect(operation: ConnectOperation) {
        const { source, executedMigrations } = await NewDB(operation.settings, allMigrations)
        this.DB = source
        this.txQueue = new transactionsQueue('StorageProcessorQueue', this.DB)
        if (executedMigrations.length > 0) {
            this.log(executedMigrations.length, "new migrations executed")
            this.log("-------------------")
        }
        this.sendResponse({
            success: true,
            type: 'connect',
            data: executedMigrations.length,
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

    private getManager(txId?: string): DataSource | EntityManager {
        if (txId) {
            return this.getTx(txId)
        }
        return this.DB
    }

    private async handleDelete(operation: DeleteOperation<any>) {

        const res = await this.handleWrite(operation.txId, eM => {
            return eM.getRepository(MainDbEntities[operation.entity]).delete(operation.q)
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
            return eM.getRepository(MainDbEntities[operation.entity]).remove(operation.q)
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
            return eM.getRepository(MainDbEntities[operation.entity]).update(operation.q, operation.toUpdate)
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
            return eM.getRepository(MainDbEntities[operation.entity]).increment(operation.q, operation.propertyPath, operation.value)
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
            return eM.getRepository(MainDbEntities[operation.entity]).decrement(operation.q, operation.propertyPath, operation.value)
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
            return eM.getRepository(MainDbEntities[operation.entity]).findOne(operation.q)
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
            return eM.getRepository(MainDbEntities[operation.entity]).find(operation.q)
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
            return eM.getRepository(MainDbEntities[operation.entity]).sum(operation.columnName, operation.q)
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
            const res = eM.getRepository(MainDbEntities[operation.entity]).create(operation.toSave)
            return eM.getRepository(MainDbEntities[operation.entity]).save(res)
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
            exec: write
        })
    }

    private sendResponse(response: OperationResponse<any>) {
        if (process.send) {
            process.send(response);
        }
    }
}

// Start the storage processor
new StorageProcessor();
