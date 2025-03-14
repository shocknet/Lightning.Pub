import { User } from '../services/storage/entity/User.js'
import { defaultInvoiceExpiry } from '../services/storage/paymentStorage.js'
import { runSanityCheck, safelySetUserBalance, StorageTestBase, TestBase } from './testBase.js'
import { FindOptionsWhere } from 'typeorm'
export const ignore = false
export const dev = false
export const requires = 'storage'

export default async (T: StorageTestBase) => {
    const u = await testCanCreateUser(T)
    await testCanReadUser(T, u)
    await testConcurrentReads(T, u)

    // RWMutex specific tests
    await testMultipleConcurrentReads(T, u)
    await testWriteDuringReads(T, u)
    await testSequentialWrites(T, u)
    await testTransactionWithConcurrentReads(T, u)

    await testUserCRUD(T)
    await testErrorHandling(T, u)
}

const testCanCreateUser = async (T: StorageTestBase) => {
    T.d('Starting testCanCreateUser')
    const u = await T.storage.dbs.CreateAndSave<User>('User', {
        user_id: 'test-user-' + Date.now(),
        balance_sats: 0,
        locked: false,
    })
    T.expect(u).to.not.be.equal(null)
    T.d('Finished testCanCreateUser')
    return u
}

const testCanReadUser = async (T: StorageTestBase, user: User) => {
    T.d('Starting testCanReadUser')
    const u = await T.storage.dbs.FindOne<User>('User', { where: { user_id: user.user_id } })
    T.expect(u).to.not.be.equal(null)
    T.expect(u?.user_id).to.be.equal(user.user_id)
    T.d('Finished testCanReadUser')
}

const testConcurrentReads = async (T: StorageTestBase, user: User) => {
    T.d('Starting testConcurrentReads')
    // Test multiple concurrent read operations
    const promises = [
        T.storage.dbs.FindOne<User>('User', { where: { user_id: user.user_id } }),
        T.storage.dbs.Find<User>('User', {})
    ] as const

    const results = await Promise.all(promises)

    // Type assertions to handle possible null values
    const [user1, allUsers] = results

    T.expect(user1?.user_id).to.be.equal(user.user_id)
    T.expect(allUsers).to.not.be.equal(null)
    T.expect(allUsers.length).to.be.equal(1)
    T.d('Finished testConcurrentReads')
}

const testUserCRUD = async (T: StorageTestBase) => {
    T.d('Starting testUserCRUD')
    // Create
    const newUser = {
        user_id: 'test-user-' + Date.now(),
        balance_sats: 0,
        locked: false,
    }

    await T.storage.dbs.CreateAndSave<User>('User', newUser)

    // Read
    const createdUser = await T.storage.dbs.FindOne<User>('User',
        { where: { user_id: newUser.user_id } as FindOptionsWhere<User> }
    )
    T.expect(createdUser).to.not.be.equal(null)
    T.expect(createdUser?.user_id).to.be.equal(newUser.user_id)

    // Update
    const newBalance = 500
    await T.storage.dbs.Update<User>('User',
        { user_id: newUser.user_id } as FindOptionsWhere<User>,
        { balance_sats: newBalance }
    )

    const updatedUser = await T.storage.dbs.FindOne<User>('User',
        { where: { user_id: newUser.user_id } as FindOptionsWhere<User> }
    )
    T.expect(updatedUser?.balance_sats).to.be.equal(newBalance)

    // Delete
    await T.storage.dbs.Delete<User>('User',
        { user_id: newUser.user_id } as FindOptionsWhere<User>
    )

    const deletedUser = await T.storage.dbs.FindOne<User>('User',
        { where: { user_id: newUser.user_id } as FindOptionsWhere<User> }
    )
    T.expect(deletedUser).to.be.equal(null)
    T.d('Finished testUserCRUD')
}

const testErrorHandling = async (T: StorageTestBase, user: User) => {
    T.d('Starting testErrorHandling')
    // Test null result (not an error)
    const nonExistentUser = await T.storage.dbs.FindOne<User>('User',
        { where: { user_id: 'does-not-exist' } as FindOptionsWhere<User> }
    )
    T.expect(nonExistentUser).to.be.equal(null)

    // Test actual error case - invalid column name should throw an error
    try {
        await T.storage.dbs.Update<User>('User',
            { user_id: user.user_id } as FindOptionsWhere<User>,
            { nonexistent_column: 'value' } as any
        )
        T.expect.fail('Should have thrown an error')
    } catch (error) {
        T.expect(error).to.not.be.equal(null)
    }

    // Test transaction rollback
    const txId = await T.storage.dbs.StartTx('test-error-transaction')
    try {
        // Try to update with an invalid column which should cause an error
        await T.storage.dbs.Update<User>('User',
            { user_id: user.user_id } as FindOptionsWhere<User>,
            { invalid_column: 'test' } as any,
            txId
        )
        await T.storage.dbs.EndTx(txId, false, 'Rolling back test transaction')

        // Verify no changes were made
        const userAfterTx = await T.storage.dbs.FindOne<User>('User',
            { where: { user_id: user.user_id } }
        )
        T.expect(userAfterTx).to.not.be.equal(null)
        T.expect((userAfterTx as any).invalid_column).to.be.equal(undefined)
    } catch (error) {
        await T.storage.dbs.EndTx(txId, false, error instanceof Error ? error.message : 'Unknown error')
        T.expect(error).to.not.be.equal(null)
    }
    T.d('Finished testErrorHandling')
}

const testMultipleConcurrentReads = async (T: StorageTestBase, user: User) => {
    T.d('Starting testMultipleConcurrentReads')

    // Create multiple concurrent read operations
    const readPromises = Array(5).fill(null).map(() =>
        T.storage.dbs.FindOne<User>('User', {
            where: { user_id: user.user_id }
        })
    )

    // All reads should complete successfully
    const results = await Promise.all(readPromises)
    results.forEach(result => {
        T.expect(result?.user_id).to.be.equal(user.user_id)
    })

    T.d('Finished testMultipleConcurrentReads')
}

const testWriteDuringReads = async (T: StorageTestBase, user: User) => {
    T.d('Starting testWriteDuringReads')

    // Start multiple read operations
    const readPromises = Array(3).fill(null).map(() =>
        T.storage.dbs.FindOne<User>('User', {
            where: { user_id: user.user_id }
        })
    )

    // Start a write operation that should wait for reads to complete
    const writePromise = T.storage.dbs.Update<User>('User',
        { user_id: user.user_id },
        { balance_sats: 100 }
    )

    // All operations should complete without errors
    await Promise.all([...readPromises, writePromise])

    // Verify the write completed
    const finalState = await T.storage.dbs.FindOne<User>('User', {
        where: { user_id: user.user_id }
    })
    T.expect(finalState?.balance_sats).to.be.equal(100)

    T.d('Finished testWriteDuringReads')
}

const testSequentialWrites = async (T: StorageTestBase, user: User) => {
    T.d('Starting testSequentialWrites')

    const initialBalance = 200
    const finalBalance = 300

    // First write operation
    await T.storage.dbs.Update<User>('User',
        { user_id: user.user_id },
        { balance_sats: initialBalance }
    )

    // Verify first write
    const midResult = await T.storage.dbs.FindOne<User>('User', {
        where: { user_id: user.user_id }
    })
    T.expect(midResult?.balance_sats).to.be.equal(initialBalance)

    // Second write operation
    await T.storage.dbs.Update<User>('User',
        { user_id: user.user_id },
        { balance_sats: finalBalance }
    )

    // Verify second write
    const finalResult = await T.storage.dbs.FindOne<User>('User', {
        where: { user_id: user.user_id }
    })
    T.expect(finalResult?.balance_sats).to.be.equal(finalBalance)

    T.d('Finished testSequentialWrites')
}

const testTransactionWithConcurrentReads = async (T: StorageTestBase, user: User) => {
    T.d('Starting testTransactionWithConcurrentReads')

    const txId = await T.storage.dbs.StartTx('rwmutex-test')
    try {
        // Start the write operation in transaction
        await T.storage.dbs.Update<User>('User',
            { user_id: user.user_id },
            { balance_sats: 400 },
            txId
        )

        // Attempt concurrent reads (should wait for transaction)
        const readPromises = Array(3).fill(null).map(() =>
            T.storage.dbs.FindOne<User>('User', {
                where: { user_id: user.user_id }
            })
        )

        // Complete transaction
        await T.storage.dbs.EndTx(txId, true, null)

        // Now reads should complete and see the updated value
        const results = await Promise.all(readPromises)
        results.forEach(result => {
            T.expect(result?.balance_sats).to.be.equal(400)
        })
    } catch (error) {
        await T.storage.dbs.EndTx(txId, false, error instanceof Error ? error.message : 'Unknown error')
        throw error
    }

    T.d('Finished testTransactionWithConcurrentReads')
}
