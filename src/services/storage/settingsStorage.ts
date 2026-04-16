import { AdminSettingRow, mapAdminSettingBackupRow } from "../backup/segments.js";
import { getLogger } from "../helpers/logger.js";
import { StorageInterface } from "./db/storageInterface.js";
import { AdminSettings } from "./entity/AdminSettings.js";
export default class SettingsStorage {
    dbs: StorageInterface
    constructor(dbs: StorageInterface) {
        this.dbs = dbs
    }

    async GetallSettings(txId?: string) {
        return this.dbs.Find<AdminSettings>('AdminSettings', {}, txId)
    }

    async ExportSettings(): Promise<AdminSettingRow[]> {
        const settings = await this.GetallSettings()
        return settings.map(mapAdminSettingBackupRow).filter(s => s !== null)
    }

    async RestoreSettings(settings: AdminSettingRow[], txId: string): Promise<number> {
        let restoredSettings = 0;
        for (const setting of settings) {
            try {
                await this.dbs.CreateAndSave<AdminSettings>('AdminSettings', {
                    env_name: setting.env_name,
                    env_value: setting.env_value,
                }, txId)
                restoredSettings++;
            } catch (error: any) {
                getLogger({ component: "backupRestore" })("error restoring admin setting", error.message)
            }
        }
        return restoredSettings;
    }

    async getAllDbEnvs(): Promise<Record<string, string>> {
        const settings = await this.GetallSettings();
        const envs: Record<string, string> = {};
        for (const setting of settings) {
            envs[setting.env_name] = setting.env_value;
        }
        return envs;
    }

    async getDbEnv(envName: string): Promise<string | undefined> {
        const setting = await this.dbs.FindOne<AdminSettings>('AdminSettings', { where: { env_name: envName } });
        if (!setting) return undefined;
        return setting.env_value;
    }

    async setDbEnvIFNeeded(envName: string, envValue: string): Promise<void> {
        await this.dbs.Tx(async tx => {
            const setting = await this.dbs.FindOne<AdminSettings>('AdminSettings', { where: { env_name: envName } }, tx);
            if (!setting) {
                await this.dbs.CreateAndSave<AdminSettings>('AdminSettings', { env_name: envName, env_value: envValue }, tx);
            } else if (setting.env_value !== envValue) {
                setting.env_value = envValue;
                await this.dbs.Update<AdminSettings>('AdminSettings', setting.serial_id, setting, tx);
            }
        })
    }
}