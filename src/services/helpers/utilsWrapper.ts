import { MainSettings } from "../main/settings.js";
import { StateBundler } from "../storage/tlv/stateBundler.js";
import { TlvStorageFactory } from "../storage/tlv/tlvFilesStorageFactory.js";
import { NostrSend } from "../nostr/handler.js";
export class Utils {
    tlvStorageFactory: TlvStorageFactory
    stateBundler: StateBundler
    settings: MainSettings
    _nostrSend: NostrSend = () => { throw new Error('nostr send not initialized yet') }
    constructor(settings: MainSettings) {
        this.settings = settings
        this.tlvStorageFactory = new TlvStorageFactory()
        this.stateBundler = new StateBundler(settings.storageSettings, this.tlvStorageFactory)
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