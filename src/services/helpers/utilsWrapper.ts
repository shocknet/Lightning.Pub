import { MainSettings } from "../main/settings.js";
import { StateBundler } from "../storage/stateBundler.js";

export class Utils {
    stateBundler: StateBundler
    settings: MainSettings
    constructor(settings: MainSettings) {
        this.settings = settings
        this.stateBundler = new StateBundler()
    }
}