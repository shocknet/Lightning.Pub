import { ChannelEvent } from '../services/storage/entity/ChannelEvent.js'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage'

export default async (T: StorageTestBase) => {
    await testEmptyStampIsNoop(T)
    await testBatchCreateAndUpdate(T)
    await testDebounceSkipsRecentStamps(T)
}

const testEmptyStampIsNoop = async (T: StorageTestBase) => {
    T.d('Starting testEmptyStampIsNoop')
    await T.storage.metricsStorage.MarkChannelsSeen([])
    await T.storage.metricsStorage.MarkChannelsSeen(['', ''])
    T.d('Finished testEmptyStampIsNoop')
}

const testBatchCreateAndUpdate = async (T: StorageTestBase) => {
    T.d('Starting testBatchCreateAndUpdate')
    const suffix = Date.now().toString()
    const newA = `chan-new-a-${suffix}`
    const newB = `chan-new-b-${suffix}`
    const stale = `chan-stale-${suffix}`
    await T.storage.metricsStorage.dbs.CreateAndSave<ChannelEvent>('ChannelEvent', {
        channel_id: stale,
        event_type: 'activity',
        inactive_since_unix: 1_000,
    })

    await T.storage.metricsStorage.MarkChannelsSeen([newA, newB, stale, newA], 0)

    const activity = await T.storage.metricsStorage.GetChannelsActivity()
    T.expect(activity[newA]).to.be.greaterThan(1_000)
    T.expect(activity[newB]).to.equal(activity[newA])
    T.expect(activity[stale]).to.equal(activity[newA])

    const rows = await T.storage.metricsStorage.dbs.Find<ChannelEvent>('ChannelEvent', {
        where: { event_type: 'activity', channel_id: newA },
    })
    T.expect(rows).to.have.length(1)
    T.d('Finished testBatchCreateAndUpdate')
}

const testDebounceSkipsRecentStamps = async (T: StorageTestBase) => {
    T.d('Starting testDebounceSkipsRecentStamps')
    const suffix = Date.now().toString()
    const chanId = `chan-debounce-${suffix}`
    await T.storage.metricsStorage.MarkChannelsSeen([chanId], 60)
    const first = (await T.storage.metricsStorage.GetChannelsActivity())[chanId]
    T.expect(first).to.be.greaterThan(0)

    await T.storage.metricsStorage.MarkChannelsSeen([chanId], 60)
    const second = (await T.storage.metricsStorage.GetChannelsActivity())[chanId]
    T.expect(second).to.equal(first)
    T.d('Finished testDebounceSkipsRecentStamps')
}
