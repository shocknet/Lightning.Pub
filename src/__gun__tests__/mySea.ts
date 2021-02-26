/**
 * @format
 */
import Gun from 'gun'
import uuid from 'uuid/v1'

import { mySEA } from '../../services/gunDB/Mediator'
import { UserGUNNode } from '../../services/gunDB/contact-api/SimpleGUN'

const setupUser = async (): Promise<[UserGUNNode]> => {
  const gun = Gun({
    file: 'GUN-TEST-' + uuid()
  })

  const user = (gun.user() as unknown) as UserGUNNode

  await new Promise<void>((res, rej) => {
    user.create('testAlias-' + uuid(), 'testPass', ack => {
      if (typeof ack.err === 'string') {
        rej(new Error(ack.err))
      } else {
        res()
      }
    })
  })

  return [user]
}

const encryptsDecryptsStrings = async () => {
  const [user] = await setupUser()

  const stringMessage = 'Lorem ipsum dolor'

  const sec = await mySEA.secret(user._.sea.epub, user._.sea)
  const encrypted = await mySEA.encrypt(stringMessage, sec)
  const decrypted = await mySEA.decrypt(encrypted, sec)

  if (decrypted !== stringMessage) {
    throw new Error()
  }
}

const encryptsDecryptsBooleans = async () => {
  const [user] = await setupUser()

  const truth = true
  const lie = false

  const sec = await mySEA.secret(user._.sea.epub, user._.sea)

  const encryptedTruth = await mySEA.encrypt(truth, sec)
  const decryptedTruth = await mySEA.decryptBoolean(encryptedTruth, sec)

  if (decryptedTruth !== truth) {
    throw new Error()
  }

  const encryptedLie = await mySEA.encrypt(lie, sec)
  const decryptedLie = await mySEA.decryptBoolean(encryptedLie, sec)

  if (decryptedLie !== lie) {
    throw new Error(
      `Expected false got: ${decryptedLie} - ${typeof decryptedLie}`
    )
  }
}

const encryptsDecryptsNumbers = async () => {
  const [user] = await setupUser()

  const number = Math.random() * 999999

  const sec = await mySEA.secret(user._.sea.epub, user._.sea)
  const encrypted = await mySEA.encrypt(number, sec)
  const decrypted = await mySEA.decryptNumber(encrypted, sec)

  if (decrypted !== number) {
    throw new Error()
  }
}

const encryptsDecryptsZero = async () => {
  const [user] = await setupUser()

  const zero = 0

  const sec = await mySEA.secret(user._.sea.epub, user._.sea)
  const encrypted = await mySEA.encrypt(zero, sec)
  const decrypted = await mySEA.decryptNumber(encrypted, sec)

  if (decrypted !== zero) {
    throw new Error()
  }
}

const runAllTests = async () => {
  await encryptsDecryptsStrings()
  await encryptsDecryptsBooleans()
  await encryptsDecryptsNumbers()
  await encryptsDecryptsZero()

  console.log('\n--------------------------------')
  console.log('All tests ran successfully')
  console.log('--------------------------------\n')
  process.exit(0)
}

runAllTests()
