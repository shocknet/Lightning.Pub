import { ChildProcess, fork } from 'child_process';
import { EventEmitter } from 'events';
import { DbSettings, MainDbNames } from './db.js';
import { DeepPartial, FindOptionsWhere } from 'typeorm';
import {
    ConnectOperation, DeleteOperation, RemoveOperation, FindOneOperation,
    FindOperation, UpdateOperation, CreateAndSaveOperation, StartTxOperation,
    EndTxOperation, QueryOptions, OperationResponse,
    IStorageOperation,
    IncrementOperation,
    DecrementOperation,
    SumOperation,
    DBNames,
    SuccessOperationResponse,
    PingOperation,
} from './storageProcessor.js';
import { PickKeysByType } from 'typeorm/common/PickKeysByType.js';
import { deserializeResponseData, serializeRequest, WhereCondition } from './serializationHelpers.js';
import { Utils } from '../../helpers/utilsWrapper.js';
import { ProcessMetrics } from '../tlv/processMetricsCollector.js';
import { getLogger, ERROR } from '../../helpers/logger.js';


export type TX<T> = (txId: string) => Promise<T>

export class StorageInterface extends EventEmitter {
    private process: ChildProcess;
    private isConnected: boolean = false;
    private debug: boolean = false;
    private utils: Utils
    private dbType: 'main' | 'metrics'
    private log = getLogger({ component: 'StorageInterface' })
    constructor(utils: Utils) {
        super();
        this.initializeSubprocess();
        this.utils = utils
    }

    setDebug(debug: boolean) {
        this.debug = debug;
    }

    private handleCollectedProcessMetrics(metrics: SuccessOperationResponse<ProcessMetrics>) {
        if (!this.dbType) return
        this.utils.tlvStorageFactory.ProcessMetrics(metrics.data, this.dbType + '_storage')
    }

    private initializeSubprocess() {
        this.process = fork('./build/src/services/storage/db/storageProcessor');

        this.process.on('message', (response: OperationResponse<any>) => {
            if (response.success && response.type === 'processMetrics') {
                this.handleCollectedProcessMetrics(response)
            } else {
                this.emit(response.opId, response);
            }
        });

        this.process.on('error', (error: Error) => {
            this.log(ERROR, 'Storage processor error:', error);
            this.isConnected = false;
        });

        this.process.on('exit', (code: number, signal: string) => {
            this.log(ERROR, `Storage processor exited with code ${code} and signal ${signal}`);
            this.isConnected = false;
            if (code === 0) {
                return
            }
            throw new Error(`Storage processor exited with code ${code} and signal ${signal}`)
        });

        this.isConnected = true;
    }

    Ping(): Promise<void> {
        const opId = Math.random().toString()
        const pingOp: PingOperation = { type: 'ping', opId }
        return this.handleOp<void>(pingOp)
    }

    Connect(settings: DbSettings, dbType: 'main' | 'metrics'): Promise<number> {
        const opId = Math.random().toString()
        this.dbType = dbType
        const connectOp: ConnectOperation = { type: 'connect', opId, settings, dbType }
        return this.handleOp<number>(connectOp)
    }

    Delete<T>(entity: DBNames, q: number | FindOptionsWhere<T>, txId?: string): Promise<number> {
        const opId = Math.random().toString()
        const deleteOp: DeleteOperation<T> = { type: 'delete', entity, opId, q, txId }
        return this.handleOp<number>(deleteOp)
    }

    Remove<T>(entity: DBNames, q: T, txId?: string): Promise<T> {
        const opId = Math.random().toString()
        const removeOp: RemoveOperation<T> = { type: 'remove', entity, opId, q, txId }
        return this.handleOp<T>(removeOp)
    }

    FindOne<T>(entity: DBNames, q: QueryOptions<T>, txId?: string): Promise<T | null> {
        const opId = Math.random().toString()
        const findOp: FindOneOperation<T> = { type: 'findOne', entity, opId, q, txId }
        return this.handleOp<T | null>(findOp)
    }

    Find<T>(entity: DBNames, q: QueryOptions<T>, txId?: string, debug = false): Promise<T[]> {
        if (debug) console.log("Find", { entity })
        const opId = Math.random().toString()
        const findOp: FindOperation<T> = { type: 'find', entity, opId, q, txId, debug }
        return this.handleOp<T[]>(findOp)
    }

    Sum<T>(entity: DBNames, columnName: PickKeysByType<T, number>, q: WhereCondition<T>, txId?: string): Promise<number> {
        const opId = Math.random().toString()
        const sumOp: SumOperation<T> = { type: 'sum', entity, opId, columnName, q, txId }
        return this.handleOp<number>(sumOp)
    }

    Update<T>(entity: DBNames, q: number | FindOptionsWhere<T>, toUpdate: DeepPartial<T>, txId?: string): Promise<number> {
        const opId = Math.random().toString()
        const updateOp: UpdateOperation<T> = { type: 'update', entity, opId, toUpdate, q, txId }
        return this.handleOp<number>(updateOp)
    }

    Increment<T>(entity: DBNames, q: FindOptionsWhere<T>, propertyPath: string, value: number | string, txId?: string): Promise<number> {
        const opId = Math.random().toString()
        const incrementOp: IncrementOperation<T> = { type: 'increment', entity, opId, q, propertyPath, value, txId }
        return this.handleOp<number>(incrementOp)
    }

    Decrement<T>(entity: DBNames, q: FindOptionsWhere<T>, propertyPath: string, value: number | string, txId?: string): Promise<number> {
        const opId = Math.random().toString()
        const decrementOp: DecrementOperation<T> = { type: 'decrement', entity, opId, q, propertyPath, value, txId }
        return this.handleOp<number>(decrementOp)
    }

    CreateAndSave<T>(entity: DBNames, toSave: DeepPartial<T>, txId?: string): Promise<T> {
        const opId = Math.random().toString()
        const createAndSaveOp: CreateAndSaveOperation<T> = { type: 'createAndSave', entity, opId, toSave, txId }
        return this.handleOp<T>(createAndSaveOp)
    }

    async StartTx(description?: string): Promise<string> {
        const opId = Math.random().toString()
        const startTxOp: StartTxOperation = { type: 'startTx', opId, description }
        await this.handleOp<void>(startTxOp)
        return opId
    }

    async EndTx<T>(txId: string, success: boolean, data: T): Promise<T> {
        const opId = Math.random().toString()
        const endTxOp: EndTxOperation<T> = success ? { type: 'endTx', opId, txId, success, data } : { type: 'endTx', opId, txId, success }
        return this.handleOp<T>(endTxOp)
    }

    async Tx<T>(exec: TX<T>, description?: string): Promise<T> {
        const txId = await this.StartTx(description)
        try {
            const res = await exec(txId)
            await this.EndTx(txId, true, res)
            return res
        } catch (err: any) {
            await this.EndTx(txId, false, err.message)
            throw err
        }
    }

    private handleOp<T>(op: IStorageOperation): Promise<T> {
        if (this.debug || op.debug) console.log('handleOp', op)
        this.checkConnected()
        return new Promise<T>((resolve, reject) => {
            const responseHandler = (response: OperationResponse<T>) => {
                if (this.debug || op.debug) console.log('responseHandler', response)
                if (!response.success) {
                    reject(new Error(response.error));
                    return
                }
                if (this.debug || op.debug) console.log("response", response, op)
                if (response.type !== op.type) {
                    reject(new Error('Invalid storage response type'));
                    return
                }
                resolve(deserializeResponseData(response.data));
            }
            this.once(op.opId, responseHandler)
            this.process.send(this.serializeOperation(op))
        })
    }

    private serializeOperation(operation: IStorageOperation, debug = false): IStorageOperation {
        const serialized = { ...operation };
        if ('q' in serialized) {
            (serialized as any).q = serializeRequest((serialized as any).q, debug);
        }
        if (this.debug || debug) {
            serialized.debug = true
        }
        return serialized;
    }

    private checkConnected() {
        if (!this.isConnected) {
            throw new Error('Storage processor is not connected');
        }
    }

    public disconnect() {
        if (this.process) {
            this.process.kill(0);
            this.isConnected = false;
            this.debug = false;
        }
    }
}