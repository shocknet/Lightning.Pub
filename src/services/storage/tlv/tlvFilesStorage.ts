import fs from 'fs'
import { decodeListTLV, encodeListTLV, encodeTLV, parseTLV } from '../../helpers/tlv.js'
const chunkSizeBytes = 128 * 1024
export type LatestData = Record<string, Record<string, { tlvs: Uint8Array[], current_chunk: number, available_chunks: number[] }>>
export type TlvFile = { fileData: Buffer, chunks: number[] }
export class TlvFilesStorage {
    private storagePath: string
    private lastPersisted: number = 0
    private meta: Record<string, Record<string, { chunks: number[] }>> = {}
    private pending: Record<string, Record<string, { tlvs: Uint8Array[] }>> = {}
    private metaReady = false
    private interval: NodeJS.Timeout
    constructor(storagePath: string) {
        this.storagePath = storagePath
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
        this.init()
        process.on('exit', () => {
            this.persist()
        });
    }

    GetStoragePath = () => {
        return this.storagePath
    }

    init = () => {
        this.initMeta()
        this.interval = setInterval(() => {
            if (Date.now() - this.lastPersisted > 1000 * 60 * 4) {
                this.persist()
            }
        }, 1000 * 60 * 5)
    }

    Reset = () => {
        if (this.storagePath === "" && this.storagePath.startsWith("/")) {
            throw new Error("cannot delete root storage path")
        }
        clearInterval(this.interval)
        fs.rmSync(this.storagePath, { recursive: true, force: true })
        this.init()
    }

    LoadFile = (app: string, dataName: string, chunk: number): TlvFile => {
        if (!this.metaReady || !this.meta[app] || !this.meta[app][dataName] || !this.meta[app][dataName].chunks.includes(chunk)) {
            throw new Error(`tlv file for ${app} ${dataName} chunk ${chunk} not found`)
        }
        const fullPath = [this.storagePath, app, dataName, `${chunk}.mtlv`].filter(s => !!s).join("/")
        const fileData = fs.readFileSync(fullPath)
        return { fileData, chunks: this.meta[app][dataName].chunks }
    }

    AddTlv = (appId: string, dataName: string, tlv: Uint8Array) => {
        if (!this.metaReady) {
            throw new Error("meta metrics not ready")
        }
        if (!this.pending[appId]) {
            this.pending[appId] = {}
        }
        if (!this.pending[appId][dataName]) {
            this.pending[appId][dataName] = { tlvs: [] }
        }
        this.pending[appId][dataName].tlvs.push(tlv)
    }

    LoadLatest = (limit = 30): LatestData => {
        this.persist()
        const data: LatestData = {}
        this.foreachFile((app, dataName, tlvFiles) => {
            if (tlvFiles.length === 0) { return }
            const methodPath = [this.storagePath, app, dataName].filter(s => !!s).join("/")
            const latest = tlvFiles[tlvFiles.length - 1]
            const tlvFile = [methodPath, `${latest}.mtlv`].filter(s => !!s).join("/")
            const tlv = fs.readFileSync(tlvFile)
            const decoded = decodeListTLV(parseTLV(tlv))
            if (!data[app]) {
                data[app] = {}
            }
            if (decoded.length > limit) {
                decoded.splice(0, decoded.length - limit)
            }
            data[app][dataName] = {
                tlvs: decoded,
                current_chunk: latest,
                available_chunks: tlvFiles
            }
        })
        return data
    }

    PersistNow = () => {
        this.persist()
    }

    private persist = () => {
        if (!this.metaReady) {
            throw new Error("meta metrics not ready")
        }
        this.lastPersisted = Date.now()
        const tosync = this.pending
        this.pending = {}
        const apps = Object.keys(tosync)
        apps.map(app => {
            const appPath = [this.storagePath, app].filter(s => !!s).join("/")
            if (!fs.existsSync(appPath)) {
                fs.mkdirSync(appPath, { recursive: true });
            }
            const dataNames = Object.keys(tosync[app])
            dataNames.map(dataName => {
                const dataPath = [appPath, dataName].filter(s => !!s).join("/")
                if (!fs.existsSync(dataPath)) {
                    fs.mkdirSync(dataPath, { recursive: true });
                }
                const data = tosync[app][dataName]
                const meta = this.getMeta(app, dataName)
                const chunks = meta.chunks.length > 0 ? meta.chunks : [0]
                const latest = chunks[chunks.length - 1]
                const tlv = encodeTLV(encodeListTLV(data.tlvs))
                const tlvFile = [dataPath, `${latest}.mtlv`].filter(s => !!s).join("/")
                fs.appendFileSync(tlvFile, Buffer.from(tlv))
                if (fs.lstatSync(tlvFile).size > chunkSizeBytes) {
                    this.updateMeta(app, dataName, [...chunks, latest + 1])
                }
            })
        })
    }

    private getMeta = (appId: string, dataName: string) => {
        if (!this.meta[appId]) {
            return { chunks: [] }
        }
        return this.meta[appId][dataName] || { chunks: [] }
    }

    private initMeta = () => {
        this.foreachFile((app, dataName, tlvFiles) => {
            this.updateMeta(app, dataName, tlvFiles)
        })
        this.metaReady = true
    }

    private updateMeta = (appId: string, dataName: string, sortedChunks: number[]) => {
        if (!this.meta[appId]) {
            this.meta[appId] = {}
        }
        this.meta[appId][dataName] = { chunks: sortedChunks }
    }

    private foreachFile = (cb: (appId: string, dataName: string, tlvFiles: number[]) => void) => {
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
        const apps = fs.readdirSync(this.storagePath)
        apps.forEach(appDir => {
            const appPath = [this.storagePath, appDir].filter(s => !!s).join("/")
            if (!fs.lstatSync(appPath).isDirectory()) {
                return
            }
            const dataNames = fs.readdirSync(appPath)
            dataNames.forEach(dataName => {
                const dataPath = [appPath, dataName].filter(s => !!s).join("/")
                if (!fs.lstatSync(dataPath).isDirectory()) {
                    return
                }
                const tlvFiles = fs.readdirSync(dataPath)
                    .filter(f => f.endsWith(".mtlv"))
                    .map(f => +f.slice(0, -".mtlv".length))
                    .filter(n => !isNaN(n))
                    .sort((a, b) => a - b)
                cb(appDir, dataName, tlvFiles)
            })
        })
    }
}