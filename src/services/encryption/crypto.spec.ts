import { AfterAll, BeforeAll, expect, Test, TestSuite } from 'testyts';

import {
  generateRandomString,
  convertBase64ToBuffer,
  convertBufferToBase64,
  killCryptoSubprocess
} from './crypto'
@TestSuite()
export class CryptoTestSuite {
  @Test()
  async generateRandomStringWithSpecifiedLength() {
    const base = Math.ceil(Math.random() * 100)
    const len = base % 2 !== 0 ? base + 1 : base
    const result = await generateRandomString(len)
    expect.toBeEqual(result.length, len)
  }

  @Test()
  async BufferToStringConvertPreserverValues() {
    const rnd = await generateRandomString(24)

    const asBuffer = convertBase64ToBuffer(rnd)

    const asStringAgain = convertBufferToBase64(asBuffer)

    expect.toBeEqual(asStringAgain, rnd)
  }

  @AfterAll()
  killCryptoSubProcess() {
    killCryptoSubprocess()
  }
}