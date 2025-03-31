import { fork } from 'child_process';
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
} from './storageProcessor.js';
import { PickKeysByType } from 'typeorm/common/PickKeysByType.js';
import { serializeRequest, WhereCondition } from './serializationHelpers.js';


export type TX<T> = (txId: string) => Promise<T>

export class StorageInterface extends EventEmitter {
    private process: any;
    private isConnected: boolean = false;
    private debug: boolean = false;

    constructor() {
        super();
        this.initializeSubprocess();
    }

    setDebug(debug: boolean) {
        this.debug = debug;
    }

    private initializeSubprocess() {
        this.process = fork('./build/src/services/storage/db/storageProcessor');

        this.process.on('message', (response: OperationResponse<any>) => {
            this.emit(response.opId, response);
        });

        this.process.on('error', (error: Error) => {
            console.error('Storage processor error:', error);
            this.isConnected = false;
        });

        this.process.on('exit', (code: number) => {
            console.log(`Storage processor exited with code ${code}`);
            this.isConnected = false;
        });

        this.isConnected = true;
    }

    Connect(settings: DbSettings, dbType: 'main' | 'metrics'): Promise<number> {
        const opId = Math.random().toString()
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

    Find<T>(entity: DBNames, q: QueryOptions<T>, txId?: string): Promise<T[]> {
        const opId = Math.random().toString()
        const findOp: FindOperation<T> = { type: 'find', entity, opId, q, txId }
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
        if (this.debug) console.log('handleOp', op)
        this.checkConnected()
        return new Promise<T>((resolve, reject) => {
            const responseHandler = (response: OperationResponse<T>) => {
                if (this.debug) console.log('responseHandler', response)
                if (!response.success) {
                    reject(new Error(response.error));
                    return
                }
                if (response.type !== op.type) {
                    reject(new Error('Invalid response type'));
                    return
                }
                resolve(response.data);
            }
            this.once(op.opId, responseHandler)
            this.process.send(this.serializeOperation(op))
        })
    }

    private serializeOperation(operation: IStorageOperation): IStorageOperation {
        const serialized = { ...operation };
        if ('q' in serialized) {
            (serialized as any).q = serializeRequest((serialized as any).q);
        }
        if (this.debug) {
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
            this.process.kill();
            this.isConnected = false;
            this.debug = false;
        }
    }
}