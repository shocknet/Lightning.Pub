import { AdminManager } from '../main/adminManager.js'
import {
    ADMIN_NODE_NAME_ENV,
    assertNodeName,
    isEnvLocked,
    pickDefaultApp,
    trimNodeName,
} from '../main/adminNodeSettings.js'
import SettingsManager from '../main/settingsManager.js'
import Storage from '../storage/index.js'
import { Application } from '../storage/entity/Application.js'

const applyWizardDefaultAppAvatar = async (
    adminManager: AdminManager,
    storage: Storage,
    app: Application,
    avatarUrl?: string,
) => {
    if (avatarUrl === undefined || avatarUrl === (app.avatar_url || "")) {
        return
    }
    await storage.applicationStorage.UpdateApplication(app, { avatar_url: avatarUrl })
    void adminManager.backupManager?.notifyBackupTable('applications')
}

export const applyWizardDefaultApp = async (
    adminManager: AdminManager,
    settings: SettingsManager,
    storage: Storage,
    sourceName: string,
    avatarUrl?: string,
): Promise<boolean> => {
    assertNodeName(sourceName)
    const name = trimNodeName(sourceName)
    const currentName = settings.getSettings().serviceSettings.defaultAppName
    const appsList = await storage.applicationStorage.GetApplications()
    const existingDefaultApp = pickDefaultApp(appsList, currentName)
    const envLocked = isEnvLocked(ADMIN_NODE_NAME_ENV)

    if (existingDefaultApp) {
        if (!envLocked) {
            await adminManager.commitDefaultAppName(existingDefaultApp, name)
        }
        await applyWizardDefaultAppAvatar(adminManager, storage, existingDefaultApp, avatarUrl)
        return currentName !== settings.getSettings().serviceSettings.defaultAppName
    }

    if (!envLocked) {
        if (appsList.some(app => app.name === name)) {
            throw new Error("that name is already in use")
        }
        await adminManager.commitDefaultAppName(undefined, name)
    }
    const createdName = settings.getSettings().serviceSettings.defaultAppName
    const newApp = await storage.applicationStorage.AddApplication(createdName, true)
    await applyWizardDefaultAppAvatar(adminManager, storage, newApp, avatarUrl)
    // First-time configure runs before BackupManager exists; boot flush covers that path.
    void adminManager.backupManager?.notifyBackupTable('applications')
    return currentName !== settings.getSettings().serviceSettings.defaultAppName
}
