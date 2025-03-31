import { PubLogger, getLogger } from '../../helpers/logger.js';
import { TlvFilesStorage } from './tlvFilesStorage.js';

export type TlvStorageSettings = {
    path: string
    name: string
}

export type NewTlvStorageOperation = {
    type: 'newStorage'
    opId: string
    settings: TlvStorageSettings
    debug?: boolean
}

export type AddTlvOperation = {
    type: 'addTlv'
    opId: string
    storageName: string
    appId: string
    dataName: string
    tlv: Uint8Array
    debug?: boolean
}

export type LoadLatestTlvOperation = {
    type: 'loadLatestTlv'
    opId: string
    storageName: string
    limit?: number
    debug?: boolean
}

export type LoadTlvFileOperation = {
    type: 'loadTlvFile'
    opId: string
    storageName: string
    appId: string
    dataName: string
    chunk: number
    debug?: boolean
}

export type ErrorTlvOperationResponse = { success: false, error: string, opId: string }

export interface ITlvStorageOperation {
    opId: string
    type: string
    debug?: boolean
}

export type TlvStorageOperation = NewTlvStorageOperation | AddTlvOperation | LoadLatestTlvOperation | LoadTlvFileOperation

export type SuccessTlvOperationResponse<T> = { success: true, type: string, data: T, opId: string }
export type TlvOperationResponse<T> = SuccessTlvOperationResponse<T> | ErrorTlvOperationResponse

class TlvFilesStorageProcessor {
    private log: PubLogger = console.log
    private storages: Record<string, TlvFilesStorage> = {}
    constructor() {
        if (!process.send) {
            throw new Error('This process must be spawned as a child process');
        }
        process.on('message', (operation: TlvStorageOperation) => {
            this.handleOperation(operation);
        });

        process.on('error', (error: Error) => {
            console.error('Error in storage processor:', error);
        });
    }

    private async handleOperation(operation: TlvStorageOperation) {
        try {
            const opId = operation.opId;
            if (operation.type === 'addTlv') operation.tlv = new Uint8Array(operation.tlv)
            if (operation.debug) console.log('handleOperation', operation)
            switch (operation.type) {
                case 'newStorage':
                    await this.handleNewStorage(operation);
                    break;
                case 'addTlv':
                    await this.handleAddTlv(operation);
                    break;
                case 'loadLatestTlv':
                    await this.handleLoadLatestTlv(operation);
                    break;
                case 'loadTlvFile':
                    await this.handleLoadTlvFile(operation);
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

    private async handleNewStorage(operation: NewTlvStorageOperation) {
        if (this.storages[operation.settings.name]) {
            this.sendResponse({
                success: false,
                error: `Storage ${operation.settings.name} already exists`,
                opId: operation.opId
            })
            return
        }
        this.storages[operation.settings.name] = new TlvFilesStorage(operation.settings.path)
        this.sendResponse({
            success: true,
            type: 'newStorage',
            data: null,
            opId: operation.opId
        });
    }

    private async handleAddTlv(operation: AddTlvOperation) {
        if (!this.storages[operation.storageName]) {
            this.sendResponse({
                success: false,
                error: `Storage ${operation.storageName} does not exist`,
                opId: operation.opId
            })
            return
        }
        this.storages[operation.storageName].AddTlv(operation.appId, operation.dataName, operation.tlv)
        this.sendResponse({
            success: true,
            type: 'addTlv',
            data: null,
            opId: operation.opId
        });
    }

    private async handleLoadLatestTlv(operation: LoadLatestTlvOperation) {
        if (!this.storages[operation.storageName]) {
            this.sendResponse({
                success: false,
                error: `Storage ${operation.storageName} does not exist`,
                opId: operation.opId
            })
            return
        }
        const data = this.storages[operation.storageName].LoadLatest(operation.limit)
        this.sendResponse({
            success: true,
            type: 'loadLatest',
            data: data,
            opId: operation.opId
        });
    }

    private async handleLoadTlvFile(operation: LoadTlvFileOperation) {
        if (!this.storages[operation.storageName]) {
            this.sendResponse({
                success: false,
                error: `Storage ${operation.storageName} does not exist`,
                opId: operation.opId
            })
            return
        }
        const data = this.storages[operation.storageName].LoadFile(operation.appId, operation.dataName, operation.chunk)
        this.sendResponse({
            success: true,
            type: 'loadFile',
            data: data,
            opId: operation.opId
        });
    }

    private sendResponse(response: TlvOperationResponse<any>) {
        if (process.send) {
            process.send(response);
        }
    }
}

// Start the storage processor
new TlvFilesStorageProcessor();
