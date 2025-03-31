import { ChildProcess, fork } from 'child_process';
import { EventEmitter } from 'events';
import { AddTlvOperation, ITlvStorageOperation, LoadLatestTlvOperation, LoadTlvFileOperation, NewTlvStorageOperation, TlvOperationResponse, TlvStorageSettings } from './tlvFilesStorageProcessor';
import { LatestData, TlvFile } from './tlvFilesStorage';

export type TlvStorageInterface = {
    AddTlv: (appId: string, dataName: string, tlv: Uint8Array) => Promise<number>
    LoadLatest: (limit?: number) => Promise<LatestData>
    LoadFile: (appId: string, dataName: string, chunk: number) => Promise<TlvFile>
}

export class TlvStorageFactory extends EventEmitter {
    private process: ChildProcess;
    private isConnected: boolean = false;
    private debug: boolean = true;

    constructor() {
        super();
        this.initializeSubprocess();
    }

    setDebug(debug: boolean) {
        this.debug = debug;
    }

    private initializeSubprocess() {
        this.process = fork('./build/src/services/storage/tlv/tlvFilesStorageProcessor');

        this.process.on('message', (response: TlvOperationResponse<any>) => {
            this.emit(response.opId, response);
        });

        this.process.on('error', (error: Error) => {
            console.error('Tlv Storage processor error:', error);
            this.isConnected = false;
        });

        this.process.on('exit', (code: number) => {
            console.log(`Tlv Storage processor exited with code ${code}`);
            this.isConnected = false;
        });

        this.isConnected = true;
    }

    NewStorage(settings: TlvStorageSettings): TlvStorageInterface {
        const opId = Math.random().toString()
        const op: NewTlvStorageOperation = { type: 'newStorage', opId, settings }
        this.handleOp<void>(op)
        return {
            AddTlv: (appId: string, dataName: string, tlv: Uint8Array) => this.AddTlv(settings.name, appId, dataName, tlv),
            LoadLatest: (limit?: number) => this.LoadLatest(settings.name, limit),
            LoadFile: (appId: string, dataName: string, chunk: number) => this.LoadFile(settings.name, appId, dataName, chunk)
        }
    }

    AddTlv(storageName: string, appId: string, dataName: string, tlv: Uint8Array): Promise<number> {
        const opId = Math.random().toString()
        const op: AddTlvOperation = { type: 'addTlv', opId, storageName, appId, dataName, tlv }
        return this.handleOp<number>(op)
    }

    LoadLatest(storageName: string, limit?: number): Promise<LatestData> {
        const opId = Math.random().toString()
        const op: LoadLatestTlvOperation = { type: 'loadLatestTlv', opId, storageName, limit }
        return this.handleOp<LatestData>(op)
    }

    LoadFile(storageName: string, appId: string, dataName: string, chunk: number): Promise<TlvFile> {
        const opId = Math.random().toString()
        const op: LoadTlvFileOperation = { type: 'loadTlvFile', opId, storageName, appId, dataName, chunk }
        return this.handleOp<TlvFile>(op)
    }

    private handleOp<T>(op: ITlvStorageOperation): Promise<T> {
        if (this.debug) console.log('handleOp', op)
        this.checkConnected()
        return new Promise<T>((resolve, reject) => {
            const responseHandler = (response: TlvOperationResponse<T>) => {
                if (this.debug) console.log('tlv responseHandler', response)
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
            this.process.send(op)
        })
    }

    private checkConnected() {
        if (!this.isConnected) {
            throw new Error('Tlv Storage processor is not connected');
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