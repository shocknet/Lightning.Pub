import {
    And, Between, Equal, ILike, In, IsNull, LessThan, LessThanOrEqual,
    MoreThan, MoreThanOrEqual, Not, Like,
} from 'typeorm'
import { User } from '../services/storage/entity/User.js'
import { Application } from '../services/storage/entity/Application.js'
import { InviteToken } from '../services/storage/entity/InviteToken.js'
import { StorageTestBase } from './testBase.js'
import crypto from 'crypto'

export const ignore = false
export const dev = false
export const requires = 'storage'

type SeedData = {
    low: User
    mid: User
    high: User
    locked: User
    app: Application
    inviteWithSats: InviteToken
    inviteWithoutSats: InviteToken
}

const userIds = (users: User[]) => users.map(u => u.user_id).sort()

export default async (T: StorageTestBase) => {
    const seed = await seedData(T)
    await testPing(T)
    await testComparisonOperators(T, seed)
    await testBetweenOperator(T, seed)
    await testInOperator(T, seed)
    await testEqualAndNotOperators(T, seed)
    await testAndOperator(T, seed)
    await testLikeOperators(T, seed)
    await testIsNullOperator(T, seed)
    await testOrConditions(T, seed)
    await testFindAndCount(T, seed)
    await testSum(T, seed)
    await testIncrementDecrement(T, seed)
    await testDeleteById(T)
    await testRemove(T)
    await testDateRoundTrip(T, seed)
    await testQueryPagination(T, seed)
    await testOperatorsInsideTransaction(T, seed)
}

const seedData = async (T: StorageTestBase): Promise<SeedData> => {
    const suffix = Date.now().toString()
    const low = await T.storage.dbs.CreateAndSave<User>('User', {
        user_id: `op-test-low-${suffix}`,
        balance_sats: 100,
        locked: false,
    })
    const mid = await T.storage.dbs.CreateAndSave<User>('User', {
        user_id: `op-test-mid-${suffix}`,
        balance_sats: 500,
        locked: false,
    })
    const high = await T.storage.dbs.CreateAndSave<User>('User', {
        user_id: `op-test-high-${suffix}`,
        balance_sats: 1000,
        locked: false,
    })
    const locked = await T.storage.dbs.CreateAndSave<User>('User', {
        user_id: `op-test-locked-${suffix}`,
        balance_sats: 200,
        locked: true,
    })
    const app = await T.storage.dbs.CreateAndSave<Application>('Application', {
        app_id: crypto.randomBytes(32).toString('hex'),
        name: `op-test-app-${suffix}`,
        owner: low,
        allow_user_creation: false,
    })
    const inviteWithSats = await T.storage.dbs.CreateAndSave<InviteToken>('InviteToken', {
        inviteToken: `token-with-sats-${suffix}`,
        used: false,
        sats: 42,
        application: app,
    })
    const inviteWithoutSats = await T.storage.dbs.CreateAndSave<InviteToken>('InviteToken', {
        inviteToken: `token-without-sats-${suffix}`,
        used: false,
        sats: undefined,
        application: app,
    })
    return { low, mid, high, locked, app, inviteWithSats, inviteWithoutSats }
}

const testPing = async (T: StorageTestBase) => {
    T.d('Starting testPing')
    await T.storage.dbs.Ping()
    T.d('Finished testPing')
}

const testComparisonOperators = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testComparisonOperators')
    const { low, mid, high, locked } = seed

    const lessThan = await T.storage.dbs.Find<User>('User', {
        where: { balance_sats: LessThan(500) },
    })
    T.expect(userIds(lessThan)).to.deep.equal(userIds([low, locked]))

    const moreThan = await T.storage.dbs.Find<User>('User', {
        where: { balance_sats: MoreThan(400) },
    })
    T.expect(userIds(moreThan)).to.deep.equal(userIds([mid, high]))

    const lessThanOrEqual = await T.storage.dbs.Find<User>('User', {
        where: { balance_sats: LessThanOrEqual(200) },
    })
    T.expect(userIds(lessThanOrEqual)).to.deep.equal(userIds([low, locked]))

    const moreThanOrEqual = await T.storage.dbs.Find<User>('User', {
        where: { balance_sats: MoreThanOrEqual(500) },
    })
    T.expect(userIds(moreThanOrEqual)).to.deep.equal(userIds([mid, high]))

    const one = await T.storage.dbs.FindOne<User>('User', {
        where: { user_id: low.user_id, balance_sats: LessThan(200) },
    })
    T.expect(one?.user_id).to.equal(low.user_id)

    T.d('Finished testComparisonOperators')
}

const testBetweenOperator = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testBetweenOperator')
    const { low, mid, locked } = seed

    const found = await T.storage.dbs.Find<User>('User', {
        where: { balance_sats: Between(100, 500) },
    })
    T.expect(userIds(found)).to.deep.equal(userIds([low, mid, locked]))

    T.d('Finished testBetweenOperator')
}

const testInOperator = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testInOperator')
    const { low, high } = seed

    const found = await T.storage.dbs.Find<User>('User', {
        where: { balance_sats: In([100, 1000]) },
    })
    T.expect(userIds(found)).to.deep.equal(userIds([low, high]))

    T.d('Finished testInOperator')
}

const testEqualAndNotOperators = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testEqualAndNotOperators')
    const { low, mid, high, locked } = seed

    const lockedUsers = await T.storage.dbs.Find<User>('User', {
        where: { locked: Equal(true) },
    })
    T.expect(userIds(lockedUsers)).to.deep.equal([locked.user_id])

    const unlocked = await T.storage.dbs.Find<User>('User', {
        where: { locked: Not(Equal(true)) },
    })
    T.expect(userIds(unlocked)).to.deep.equal(userIds([low, mid, high]))

    T.d('Finished testEqualAndNotOperators')
}

const testAndOperator = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testAndOperator')
    const { mid } = seed

    const found = await T.storage.dbs.Find<User>('User', {
        where: {
            balance_sats: And(MoreThan(400), LessThan(600)),
            locked: Equal(false),
        },
    })
    T.expect(found.length).to.equal(1)
    T.expect(found[0].user_id).to.equal(mid.user_id)

    T.d('Finished testAndOperator')
}

const testLikeOperators = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testLikeOperators')
    const { low, mid, high, locked } = seed

    const likeFound = await T.storage.dbs.Find<User>('User', {
        where: { user_id: Like('op-test-%') },
    })
    T.expect(userIds(likeFound)).to.deep.equal(userIds([low, mid, high, locked]))

    const ilikeFound = await T.storage.dbs.Find<User>('User', {
        where: { user_id: ILike('OP-TEST-LOW-%') },
    })
    T.expect(ilikeFound.length).to.equal(1)
    T.expect(ilikeFound[0].user_id).to.equal(low.user_id)

    T.d('Finished testLikeOperators')
}

const testIsNullOperator = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testIsNullOperator')
    const { inviteWithSats, inviteWithoutSats } = seed

    const nullSats = await T.storage.dbs.Find<InviteToken>('InviteToken', {
        where: { sats: IsNull() },
    })
    T.expect(nullSats.length).to.equal(1)
    T.expect(nullSats[0].inviteToken).to.equal(inviteWithoutSats.inviteToken)

    const notNullSats = await T.storage.dbs.Find<InviteToken>('InviteToken', {
        where: { sats: Not(IsNull()) },
    })
    T.expect(notNullSats.length).to.equal(1)
    T.expect(notNullSats[0].inviteToken).to.equal(inviteWithSats.inviteToken)

    T.d('Finished testIsNullOperator')
}

const testOrConditions = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testOrConditions')
    const { low, high } = seed

    const found = await T.storage.dbs.Find<User>('User', {
        where: [
            { balance_sats: LessThan(150) },
            { balance_sats: MoreThan(900) },
        ],
    })
    T.expect(userIds(found)).to.deep.equal(userIds([low, high]))

    T.d('Finished testOrConditions')
}

const testFindAndCount = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testFindAndCount')
    const { low, mid, high, locked } = seed

    const [users, count] = await T.storage.dbs.FindAndCount<User>('User', {
        where: { locked: Equal(false) },
        order: { balance_sats: 'ASC' },
    })
    T.expect(count).to.equal(3)
    T.expect(userIds(users)).to.deep.equal(userIds([low, mid, high]))

    T.d('Finished testFindAndCount')
}

const testSum = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testSum')
    const { low, mid, high, locked } = seed
    const expected = low.balance_sats + mid.balance_sats + high.balance_sats + locked.balance_sats

    const total = await T.storage.dbs.Sum<User>('User', 'balance_sats', {
        user_id: Like('op-test-%'),
    })
    T.expect(total).to.equal(expected)

    const unlockedTotal = await T.storage.dbs.Sum<User>('User', 'balance_sats', {
        locked: Equal(false),
        user_id: Like('op-test-%'),
    })
    T.expect(unlockedTotal).to.equal(low.balance_sats + mid.balance_sats + high.balance_sats)

    T.d('Finished testSum')
}

const testIncrementDecrement = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testIncrementDecrement')
    const { low } = seed

    const incAffected = await T.storage.dbs.Increment<User>('User',
        { user_id: low.user_id },
        'balance_sats',
        50,
    )
    T.expect(incAffected).to.equal(1)

    const afterInc = await T.storage.dbs.FindOne<User>('User', {
        where: { user_id: low.user_id },
    })
    T.expect(afterInc?.balance_sats).to.equal(150)

    const decAffected = await T.storage.dbs.Decrement<User>('User',
        { user_id: low.user_id },
        'balance_sats',
        25,
    )
    T.expect(decAffected).to.equal(1)

    const afterDec = await T.storage.dbs.FindOne<User>('User', {
        where: { user_id: low.user_id },
    })
    T.expect(afterDec?.balance_sats).to.equal(125)

    T.d('Finished testIncrementDecrement')
}

const testDeleteById = async (T: StorageTestBase) => {
    T.d('Starting testDeleteById')
    const user = await T.storage.dbs.CreateAndSave<User>('User', {
        user_id: `op-test-delete-${Date.now()}`,
        balance_sats: 1,
        locked: false,
    })

    const affected = await T.storage.dbs.Delete<User>('User', user.serial_id)
    T.expect(affected).to.equal(1)

    const found = await T.storage.dbs.FindOne<User>('User', {
        where: { user_id: user.user_id },
    })
    T.expect(found).to.equal(null)

    T.d('Finished testDeleteById')
}

const testRemove = async (T: StorageTestBase) => {
    T.d('Starting testRemove')
    const user = await T.storage.dbs.CreateAndSave<User>('User', {
        user_id: `op-test-remove-${Date.now()}`,
        balance_sats: 1,
        locked: false,
    })

    const loaded = await T.storage.dbs.FindOne<User>('User', {
        where: { user_id: user.user_id },
    })
    T.expect(loaded).to.not.equal(null)

    const removed = await T.storage.dbs.Remove<User>('User', loaded!)
    T.expect(removed.user_id).to.equal(user.user_id)

    const found = await T.storage.dbs.FindOne<User>('User', {
        where: { user_id: user.user_id },
    })
    T.expect(found).to.equal(null)

    T.d('Finished testRemove')
}

const testDateRoundTrip = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testDateRoundTrip')
    const { low } = seed

    const found = await T.storage.dbs.FindOne<User>('User', {
        where: {
            user_id: low.user_id,
            created_at: MoreThan(new Date(0)),
        },
    })
    T.expect(found).to.not.equal(null)
    T.expect(found!.created_at).to.be.instanceOf(Date)
    T.expect(found!.updated_at).to.be.instanceOf(Date)

    T.d('Finished testDateRoundTrip')
}

const testQueryPagination = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testQueryPagination')
    const { low, mid, high } = seed

    const page = await T.storage.dbs.Find<User>('User', {
        where: { locked: Equal(false), user_id: Like('op-test-%') },
        order: { balance_sats: 'ASC' },
        take: 2,
        skip: 1,
    })
    T.expect(page.length).to.equal(2)
    T.expect(page[0].user_id).to.equal(mid.user_id)
    T.expect(page[1].user_id).to.equal(high.user_id)

    T.d('Finished testQueryPagination')
}

const testOperatorsInsideTransaction = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testOperatorsInsideTransaction')
    const { mid } = seed
    const originalBalance = mid.balance_sats

    await T.storage.StartTransaction(async txId => {
        const found = await T.storage.dbs.FindOne<User>('User', {
            where: { user_id: mid.user_id, balance_sats: Equal(originalBalance) },
        }, txId)
        T.expect(found?.user_id).to.equal(mid.user_id)

        await T.storage.dbs.Update<User>('User',
            { user_id: mid.user_id, balance_sats: Equal(originalBalance) },
            { balance_sats: 777 },
            txId,
        )
        return null
    }, 'storage-operators-tx')

    const updated = await T.storage.dbs.FindOne<User>('User', {
        where: { user_id: mid.user_id },
    })
    T.expect(updated?.balance_sats).to.equal(777)

    await T.storage.dbs.Update<User>('User',
        { user_id: mid.user_id },
        { balance_sats: originalBalance },
    )

    try {
        await T.storage.StartTransaction(async txId => {
            await T.storage.dbs.Update<User>('User',
                { user_id: mid.user_id },
                { invalid_column: 'test' } as any,
                txId,
            )
            return null
        }, 'storage-operators-tx-error')
        T.expect.fail('Should have thrown an error')
    } catch (error) {
        T.expect(error).to.not.equal(null)
    }

    const afterFailedTx = await T.storage.dbs.FindOne<User>('User', {
        where: { user_id: mid.user_id },
    })
    T.expect(afterFailedTx?.balance_sats).to.equal(originalBalance)

    T.d('Finished testOperatorsInsideTransaction')
}
