import { EnvSetting, SettingsJson } from "../helpers/envParser.js";
import { StorageInterface } from "./db/storageInterface.js";
import { AdminSettings } from "./entity/AdminSettings.js";
export default class SettingsStorage {
    dbs: StorageInterface
    constructor(dbs: StorageInterface) {
        this.dbs = dbs
    }

    async getAllDbEnvs(): Promise<Record<string, string>> {
        const settings = await this.dbs.Find<AdminSettings>('AdminSettings', {});
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
        const setting = await this.dbs.FindOne<AdminSettings>('AdminSettings', { where: { env_name: envName } });
        if (!setting) {
            await this.dbs.CreateAndSave<AdminSettings>('AdminSettings', { env_name: envName, env_value: envValue });
        } else if (setting.env_value !== envValue) {
            setting.env_value = envValue;
            await this.dbs.Update<AdminSettings>('AdminSettings', setting.serial_id, setting);
        }
    }
}