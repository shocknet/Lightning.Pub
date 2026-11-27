type SyncInfo = {
    blockHeight: number
    syncedToChain: boolean
    syncedToGraph: boolean
}

/** Mining and a Pub balance update don't guarantee that every LND has caught up. */
export async function waitForLndSync(
    lnd: { GetInfo(): Promise<SyncInfo> },
    minHeight: number,
    timeoutMs = 30_000,
    pollMs = 100,
): Promise<SyncInfo> {
    const deadline = Date.now() + timeoutMs
    while (true) {
        const info = await lnd.GetInfo()
        if (info.blockHeight >= minHeight && info.syncedToChain && info.syncedToGraph) return info
        if (Date.now() >= deadline) {
            throw new Error(`LND did not sync to height ${minHeight}: height=${info.blockHeight}, syncedToChain=${info.syncedToChain}, syncedToGraph=${info.syncedToGraph}`)
        }
        await new Promise(resolve => setTimeout(resolve, Math.min(pollMs, deadline - Date.now())))
    }
}
