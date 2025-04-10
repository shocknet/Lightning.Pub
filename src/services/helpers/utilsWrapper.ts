import { MainSettings } from "../main/settings.js";
import { StateBundler } from "../storage/tlv/stateBundler.js";
import { TlvStorageFactory } from "../storage/tlv/tlvFilesStorageFactory.js";
import { NostrSend } from "../nostr/handler.js";
import { ProcessMetricsCollector } from "../storage/tlv/processMetricsCollector.js";
type UtilsSettings = {
    noCollector?: boolean
    dataDir: string,
    allowResetMetricsStorages: boolean
}
export class Utils {
    tlvStorageFactory: TlvStorageFactory
    stateBundler: StateBundler
    _nostrSend: NostrSend = () => { throw new Error('nostr send not initialized yet') }
    constructor({ noCollector, dataDir, allowResetMetricsStorages }: UtilsSettings) {
        this.tlvStorageFactory = new TlvStorageFactory(allowResetMetricsStorages)
        this.stateBundler = new StateBundler(dataDir, this.tlvStorageFactory)
        if (!noCollector) {
            new ProcessMetricsCollector((metrics) => {
                this.tlvStorageFactory.ProcessMetrics(metrics, '')
            })
        }
    }

    attachNostrSend(f: NostrSend) {
        this._nostrSend = f
        this.tlvStorageFactory.attachNostrSend(f)
    }

    Stop() {
        this.stateBundler.Stop()
        this.tlvStorageFactory.disconnect()
    }
}