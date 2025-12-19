import { StateBundler } from "../storage/tlv/stateBundler.js";
import { TlvStorageFactory } from "../storage/tlv/tlvFilesStorageFactory.js";
import { ProcessMetricsCollector } from "../storage/tlv/processMetricsCollector.js";
import { NostrSender } from "../nostr/sender.js";
type UtilsSettings = {
    noCollector?: boolean
    dataDir: string,
    allowResetMetricsStorages: boolean
}
export class Utils {
    tlvStorageFactory: TlvStorageFactory
    stateBundler: StateBundler
    nostrSender: NostrSender

    constructor({ noCollector, dataDir, allowResetMetricsStorages }: UtilsSettings, nostrSender: NostrSender) {
        this.nostrSender = nostrSender
        this.tlvStorageFactory = new TlvStorageFactory(allowResetMetricsStorages, nostrSender)
        this.stateBundler = new StateBundler(dataDir, this.tlvStorageFactory)
        if (!noCollector) {
            new ProcessMetricsCollector((metrics) => {
                this.tlvStorageFactory.ProcessMetrics(metrics, '')
            })
        }
    }

    Stop() {
        this.stateBundler.Stop()
        this.tlvStorageFactory.disconnect()
    }
}