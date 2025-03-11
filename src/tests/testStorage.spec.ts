import { User } from '../services/storage/entity/User.js'
import { defaultInvoiceExpiry } from '../services/storage/paymentStorage.js'
import { runSanityCheck, safelySetUserBalance, TestBase } from './testBase.js'
import { FindOptionsWhere } from 'typeorm'
export const ignore = false
export const dev = false
export const storageOnly = false

export default async (T: TestBase) => {
    T.main.storage.dbs.setDebug(true)
    await testCanReadUser(T)
    await testConcurrentReads(T)
    await testTransactionIsolation(T)
    await testUserCRUD(T)
    await testErrorHandling(T)
}

const testCanReadUser = async (T: TestBase) => {
    T.d('Starting testCanReadUser')
    const u = await T.main.storage.dbs.FindOne<User>('User', { where: { user_id: T.user1.userId } })
    T.expect(u).to.not.be.equal(null)
    T.expect(u?.user_id).to.be.equal(T.user1.userId)
    T.d('Finished testCanReadUser')
}

const testConcurrentReads = async (T: TestBase) => {
    T.d('Starting testConcurrentReads')
    // Test multiple concurrent read operations
    const promises = [
        T.main.storage.dbs.FindOne<User>('User', { where: { user_id: T.user1.userId } }),
        T.main.storage.dbs.FindOne<User>('User', { where: { user_id: T.user2.userId } }),
        T.main.storage.dbs.Find<User>('User', {})
    ] as const

    const results = await Promise.all(promises)

    // Type assertions to handle possible null values
    const [user1, user2, allUsers] = results

    T.expect(user1?.user_id).to.be.equal(T.user1.userId)
    T.expect(user2?.user_id).to.be.equal(T.user2.userId)
    T.expect(allUsers).to.not.be.equal(null)
    T.expect(allUsers.length).to.be.greaterThan(1)
    T.d('Finished testConcurrentReads')
}

const testTransactionIsolation = async (T: TestBase) => {
    T.d('Starting testTransactionIsolation')
    // Start a transaction
    // Check initial balance before transaction
    const userBefore = await T.main.storage.dbs.FindOne<User>('User', {
        where: { user_id: T.user1.userId }
    })
    T.expect(userBefore?.balance_sats).to.not.equal(1000, 'User should not start with balance of 1000')

    const txId = await T.main.storage.dbs.StartTx('test-transaction')

    try {
        // Update user balance in transaction
        const initialBalance = 1000
        const where: FindOptionsWhere<User> = { user_id: T.user1.userId }

        await T.main.storage.dbs.Update<User>('User',
            where,
            { balance_sats: initialBalance },
            txId
        )

        // Verify balance is updated in transaction
        const userInTx = await T.main.storage.dbs.FindOne<User>('User',
            { where },
            txId
        )
        T.expect(userInTx?.balance_sats).to.be.equal(initialBalance)

        // Verify balance is not visible outside transaction
        const userOutsideTx = await T.main.storage.dbs.FindOne<User>('User',
            { where }
        )
        T.expect(userOutsideTx?.balance_sats).to.not.equal(initialBalance)

        // Commit the transaction
        await T.main.storage.dbs.EndTx(txId, true, null)

        // Verify balance is now visible
        const userAfterCommit = await T.main.storage.dbs.FindOne<User>('User',
            { where }
        )
        T.expect(userAfterCommit?.balance_sats).to.be.equal(initialBalance)
    } catch (error) {
        // Rollback on error
        await T.main.storage.dbs.EndTx(txId, false, error instanceof Error ? error.message : 'Unknown error')
        throw error
    }
    T.d('Finished testTransactionIsolation')
}

const testUserCRUD = async (T: TestBase) => {
    T.d('Starting testUserCRUD')
    // Create
    const newUser = {
        user_id: 'test-user-' + Date.now(),
        balance_sats: 0,
        locked: false,
    }

    await T.main.storage.dbs.CreateAndSave<User>('User', newUser)

    // Read
    const createdUser = await T.main.storage.dbs.FindOne<User>('User',
        { where: { user_id: newUser.user_id } as FindOptionsWhere<User> }
    )
    T.expect(createdUser).to.not.be.equal(null)
    T.expect(createdUser?.user_id).to.be.equal(newUser.user_id)

    // Update
    const newBalance = 500
    await T.main.storage.dbs.Update<User>('User',
        { user_id: newUser.user_id } as FindOptionsWhere<User>,
        { balance_sats: newBalance }
    )

    const updatedUser = await T.main.storage.dbs.FindOne<User>('User',
        { where: { user_id: newUser.user_id } as FindOptionsWhere<User> }
    )
    T.expect(updatedUser?.balance_sats).to.be.equal(newBalance)

    // Delete
    await T.main.storage.dbs.Delete<User>('User',
        { user_id: newUser.user_id } as FindOptionsWhere<User>
    )

    const deletedUser = await T.main.storage.dbs.FindOne<User>('User',
        { where: { user_id: newUser.user_id } as FindOptionsWhere<User> }
    )
    T.expect(deletedUser).to.be.equal(null)
    T.d('Finished testUserCRUD')
}

const testErrorHandling = async (T: TestBase) => {
    T.d('Starting testErrorHandling')
    // Test null result (not an error)
    const nonExistentUser = await T.main.storage.dbs.FindOne<User>('User',
        { where: { user_id: 'does-not-exist' } as FindOptionsWhere<User> }
    )
    T.expect(nonExistentUser).to.be.equal(null)

    // Test actual error case - invalid column name should throw an error
    try {
        await T.main.storage.dbs.Update<User>('User',
            { user_id: T.user1.userId } as FindOptionsWhere<User>,
            { nonexistent_column: 'value' } as any
        )
        T.expect.fail('Should have thrown an error')
    } catch (error) {
        T.expect(error).to.not.be.equal(null)
    }

    // Test transaction rollback
    const txId = await T.main.storage.dbs.StartTx('test-error-transaction')
    try {
        // Try to update with an invalid column which should cause an error
        await T.main.storage.dbs.Update<User>('User',
            { user_id: T.user1.userId } as FindOptionsWhere<User>,
            { invalid_column: 'test' } as any,
            txId
        )
        await T.main.storage.dbs.EndTx(txId, false, 'Rolling back test transaction')

        // Verify no changes were made
        const user = await T.main.storage.dbs.FindOne<User>('User',
            { where: { user_id: T.user1.userId } }
        )
        T.expect(user).to.not.be.equal(null)
        T.expect((user as any).invalid_column).to.be.equal(undefined)
    } catch (error) {
        await T.main.storage.dbs.EndTx(txId, false, error instanceof Error ? error.message : 'Unknown error')
        T.expect(error).to.not.be.equal(null)
    }
    T.d('Finished testErrorHandling')
}
