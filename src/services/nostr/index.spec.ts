import 'dotenv/config' // TODO - test env
import { Buffer } from 'buffer'
import { generatePrivateKey, getPublicKey } from 'nostr-tools'

import NostrHandler, { LoadNosrtSettingsFromEnv } from './index.js'
import { expect } from 'chai'
export const ignore = true
const settings = LoadNosrtSettingsFromEnv(true)

const clientPrivateKey = generatePrivateKey()
const clientPublicKey = getPublicKey(Buffer.from(clientPrivateKey, "hex"))

const serverPrivateKey = generatePrivateKey()
const serverPublicKey = getPublicKey(Buffer.from(serverPrivateKey, "hex"))
let clientNostr: NostrHandler
let serverNostr: NostrHandler

let receivedServerEvents = 0
let latestReceivedServerEvent = ""
export const setup = () => {
    clientNostr = new NostrHandler({
        allowedPubs: [],
        privateKey: clientPrivateKey,
        publicKey: clientPublicKey,
        relays: settings.relays
    }, (event) => {

    })
    serverNostr = new NostrHandler({
        allowedPubs: [clientPublicKey],
        privateKey: serverPrivateKey,
        publicKey: serverPublicKey,
        relays: settings.relays
    }, (event) => {
        receivedServerEvents++
        latestReceivedServerEvent = event.content
    })
}
export const teardown = () => {
    clientNostr.Stop()
    serverNostr.Stop()
}

export default async (d: (message: string, failure?: boolean) => void) => {
    await new Promise(res => setTimeout(res, 2000))
    clientNostr.Send(serverPublicKey, "test")
    await new Promise(res => setTimeout(res, 1000))
    console.log(receivedServerEvents, latestReceivedServerEvent)
    expect(receivedServerEvents).to.equal(1)
    expect(latestReceivedServerEvent).to.equal("test")
    d("nostr ok")
}