import { MainSettings } from "../main/settings.js";
import { StateBundler } from "../storage/tlv/stateBundler.js";
import { TlvStorageFactory } from "../storage/tlv/tlvFilesStorageFactory.js";

export class Utils {
    tlvStorageFactory: TlvStorageFactory
    stateBundler: StateBundler
    settings: MainSettings
    constructor(settings: MainSettings) {
        this.settings = settings
        this.tlvStorageFactory = new TlvStorageFactory()
        this.stateBundler = new StateBundler(settings.storageSettings, this.tlvStorageFactory)
    }

    Stop() {
        this.stateBundler.Stop()
        this.tlvStorageFactory.disconnect()
    }
}