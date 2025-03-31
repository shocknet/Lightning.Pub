import { MainSettings } from "../main/settings.js";
import { StateBundler } from "../storage/tlv/stateBundler.js";
import { TlvStorageFactory } from "../storage/tlv/tlvFilesStorageFactory.js";

export class Utils {

    stateBundler: StateBundler
    settings: MainSettings
    constructor(settings: MainSettings, tlvStorageFactory: TlvStorageFactory) {
        this.settings = settings
        this.stateBundler = new StateBundler(settings.storageSettings, tlvStorageFactory)
    }

    Stop() {
        this.stateBundler.Stop()
    }
}