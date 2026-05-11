interface AppToSelect {
    name: string
}
export const selectDefaultApp = <T extends AppToSelect>(apps: T[], defaultName: string): T | undefined => {
    const defaultNames = ['wallet', 'wallet-test', defaultName]
    const existingWalletApp = apps.find(app => defaultNames.includes(app.name))
    return existingWalletApp
}