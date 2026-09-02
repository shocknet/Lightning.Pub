import crypto from 'crypto'
import { Application } from '../services/storage/entity/Application.js'
import { expectThrowsAsync, StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

const nostrPub = (n: number) => n.toString(16).padStart(64, 'b')

type Harness = {
    T: StorageTestBase
    app: Application
}

const setupApp = async (T: StorageTestBase, name: string) => {
    return T.storage.applicationStorage.AddApplication(`${name}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`, true)
}

const setupHarness = async (T: StorageTestBase): Promise<Harness> => {
    return { T, app: await setupApp(T, 'invite-app') }
}

const addInvite = (h: Harness) => h.T.storage.applicationStorage.AddInviteToken(h.app)

const consume = (h: Harness, token: string, pub: string, appId = h.app.app_id) =>
    h.T.storage.applicationStorage.ConsumeInviteToken(appId, token, pub)

const tokenUsed = async (h: Harness, token: string) => {
    const row = await h.T.storage.applicationStorage.FindInviteToken(token)
    return !!row?.used
}

const testConsumeMarksUsedAndCreatesUser = async (h: Harness) => {
    h.T.d('starting testConsumeMarksUsedAndCreatesUser')
    const invite = await addInvite(h)
    const pub = nostrPub(1)
    await consume(h, invite.inviteToken, pub)
    h.T.expect(await tokenUsed(h, invite.inviteToken)).to.equal(true)
    const user = await h.T.storage.applicationStorage.FindNostrAppUser(pub)
    h.T.expect(user).to.not.equal(null)
    h.T.expect(user!.application.app_id).to.equal(h.app.app_id)
    h.T.d('invite consume created a user and marked the token used')
}

const testSecondConsumeRejected = async (h: Harness) => {
    h.T.d('starting testSecondConsumeRejected')
    const invite = await addInvite(h)
    await consume(h, invite.inviteToken, nostrPub(2))
    await expectThrowsAsync(consume(h, invite.inviteToken, nostrPub(3)), 'Invite token not found')
    h.T.expect(await tokenUsed(h, invite.inviteToken)).to.equal(true)
    h.T.expect(await h.T.storage.applicationStorage.FindNostrAppUser(nostrPub(3))).to.equal(null)
    h.T.d('second consume of the same token failed and created no extra user')
}

const testParallelConsumeCreatesOneUser = async (h: Harness) => {
    h.T.d('starting testParallelConsumeCreatesOneUser')
    const invite = await addInvite(h)
    const pubs = [nostrPub(4), nostrPub(5)]
    const results = await Promise.allSettled(pubs.map(pub => consume(h, invite.inviteToken, pub)))
    const succeeded = results.filter(r => r.status === 'fulfilled')
    const failed = results.filter(r => r.status === 'rejected')
    h.T.expect(succeeded.length).to.equal(1)
    h.T.expect(failed.length).to.equal(1)
    const created = (await Promise.all(pubs.map(pub => h.T.storage.applicationStorage.FindNostrAppUser(pub)))).filter(u => u)
    h.T.expect(created.length).to.equal(1)
    h.T.expect(await tokenUsed(h, invite.inviteToken)).to.equal(true)
    h.T.d('parallel consume created one user and marked the token used')
}

const testAlreadyLinkedDoesNotClaim = async (h: Harness) => {
    h.T.d('starting testAlreadyLinkedDoesNotClaim')
    const pub = nostrPub(6)
    await h.T.storage.applicationStorage.AddApplicationUser(h.app, crypto.randomBytes(32).toString('hex'), 0, pub)
    const invite = await addInvite(h)
    await expectThrowsAsync(consume(h, invite.inviteToken, pub), 'This key is already linked')
    h.T.expect(await tokenUsed(h, invite.inviteToken)).to.equal(false)
    h.T.d('already-linked key was rejected and left the invite unused')
}

const testWrongAppDoesNotClaim = async (h: Harness) => {
    h.T.d('starting testWrongAppDoesNotClaim')
    const other = await setupApp(h.T, 'invite-other')
    const invite = await addInvite(h)
    await expectThrowsAsync(consume(h, invite.inviteToken, nostrPub(7), other.app_id), 'Invite token not found')
    h.T.expect(await tokenUsed(h, invite.inviteToken)).to.equal(false)
    h.T.expect(await h.T.storage.applicationStorage.FindNostrAppUser(nostrPub(7))).to.equal(null)
    h.T.d('consume for a different app left the token unused')
}

export default async (T: StorageTestBase) => {
    const h = await setupHarness(T)
    await testConsumeMarksUsedAndCreatesUser(h)
    await testSecondConsumeRejected(h)
    await testParallelConsumeCreatesOneUser(h)
    await testAlreadyLinkedDoesNotClaim(h)
    await testWrongAppDoesNotClaim(h)
}
