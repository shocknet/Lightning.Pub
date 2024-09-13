/* 
  This file contains functions that deal with encoding and decoding nprofiles,
  but with he addition of bridge urls in the nprofile.
  These functions are basically the same functions from nostr-tools package
  but with some tweaks to allow for the bridge inclusion.
*/
import { bytesToHex, concatBytes, hexToBytes } from '@noble/hashes/utils';
import { bech32 } from 'bech32';
import { LoadNosrtSettingsFromEnv } from './services/nostr/index.js';

export const utf8Decoder = new TextDecoder('utf-8')
export const utf8Encoder = new TextEncoder()


export type CustomProfilePointer = {
  pubkey: string
  relays?: string[]
  bridge?: string[] // one bridge
}

export type OfferPointer = {
  pubkey: string,
  relay: string,
  offer: string
  priceType: PriceType,
  price?: number
}
export enum PriceType {
  fixed = 0,
  variable = 1,
  spontaneous = 2,
}
export type DebitPointer = {
  pubkey: string,
  relay: string,
  pointerId?: string,
}

type TLV = { [t: number]: Uint8Array[] }


const encodeTLV = (tlv: TLV): Uint8Array => {
  const entries: Uint8Array[] = []

  Object.entries(tlv)
    /* 
      the original function does a reverse() here,
      but here it causes the nprofile string to be different,
      even though it would still decode to the correct original inputs
    */
    //.reverse() 
    .forEach(([t, vs]) => {
      vs.forEach(v => {
        const entry = new Uint8Array(v.length + 2)
        entry.set([parseInt(t)], 0)
        entry.set([v.length], 1)
        entry.set(v, 2)
        entries.push(entry)
      })
    })
  return concatBytes(...entries);
}

export const encodeNprofile = (profile: CustomProfilePointer): string => {
  const data = encodeTLV({
    0: [hexToBytes(profile.pubkey)],
    1: (profile.relays || []).map(url => utf8Encoder.encode(url)),
    2: (profile.bridge || []).map(url => utf8Encoder.encode(url))
  });
  const words = bech32.toWords(data)
  return bech32.encode("nprofile", words, 5000);
}

export const encodeNoffer = (offer: OfferPointer): string => {
  let relay = offer.relay
  if (!relay) {
    const settings = LoadNosrtSettingsFromEnv()
    relay = settings.relays[0]
  }
  const o: TLV = {
    0: [hexToBytes(offer.pubkey)],
    1: [utf8Encoder.encode(relay)],
    2: [utf8Encoder.encode(offer.offer)],
    3: [new Uint8Array([Number(offer.priceType)])],
  }
  if (offer.price) {
    o[4] = [new Uint8Array(new BigUint64Array([BigInt(offer.price)]).buffer)]
  }
  const data = encodeTLV(o);
  const words = bech32.toWords(data)
  return bech32.encode("noffer", words, 5000);
}
export const encodeNdebit = (debit: DebitPointer): string => {
  let relay = debit.relay
  if (!relay) {
    const settings = LoadNosrtSettingsFromEnv()
    relay = settings.relays[0]
  }
  const o: TLV = {
    0: [hexToBytes(debit.pubkey)],
    1: [utf8Encoder.encode(relay)],
  }
  if (debit.pointerId) {
    o[2] = [utf8Encoder.encode(debit.pointerId)]
  }
  const data = encodeTLV(o);
  const words = bech32.toWords(data)
  return bech32.encode("ndebit", words, 5000);
}

const parseTLV = (data: Uint8Array): TLV => {
  const result: TLV = {}
  let rest = data
  while (rest.length > 0) {
    const t = rest[0]
    const l = rest[1]
    const v = rest.slice(2, 2 + l)
    rest = rest.slice(2 + l)
    if (v.length < l) throw new Error(`not enough data to read on TLV ${t}`)
    result[t] = result[t] || []
    result[t].push(v)
  }
  return result
}

export const decodeNoffer = (noffer: string): OfferPointer => {
  const { prefix, words } = bech32.decode(noffer, 5000)
  if (prefix !== "noffer") {
    throw new Error("Expected nprofile prefix");
  }
  const data = new Uint8Array(bech32.fromWords(words))

  const tlv = parseTLV(data);
  if (!tlv[0]?.[0]) throw new Error('missing TLV 0 for noffer')
  if (tlv[0][0].length !== 32) throw new Error('TLV 0 should be 32 bytes')
  if (!tlv[1]?.[0]) throw new Error('missing TLV 1 for noffer')
  if (!tlv[2]?.[0]) throw new Error('missing TLV 2 for noffer')
  if (!tlv[3]?.[0]) throw new Error('missing TLV 3 for noffer')
  return {
    pubkey: bytesToHex(tlv[0][0]),
    relay: utf8Decoder.decode(tlv[1][0]),
    offer: utf8Decoder.decode(tlv[2][0]),
    priceType: tlv[3][0][0],
    price: tlv[4] ? Number(new BigUint64Array(tlv[4][0])[0]) : undefined
  }
}
export const decodeNdebit = (noffer: string): DebitPointer => {
  const { prefix, words } = bech32.decode(noffer, 5000)
  if (prefix !== "ndebit") {
    throw new Error("Expected nprofile prefix");
  }
  const data = new Uint8Array(bech32.fromWords(words))

  const tlv = parseTLV(data);
  if (!tlv[0]?.[0]) throw new Error('missing TLV 0 for noffer')
  if (tlv[0][0].length !== 32) throw new Error('TLV 0 should be 32 bytes')
  if (!tlv[1]?.[0]) throw new Error('missing TLV 1 for noffer')
  return {
    pubkey: bytesToHex(tlv[0][0]),
    relay: utf8Decoder.decode(tlv[1][0]),
    pointerId: tlv[2] ? utf8Decoder.decode(tlv[2][0]) : undefined
  }
}

export const decodeNprofile = (nprofile: string): CustomProfilePointer => {
  const { prefix, words } = bech32.decode(nprofile, 5000)
  if (prefix !== "nprofile") {
    throw new Error("Expected nprofile prefix");
  }
  const data = new Uint8Array(bech32.fromWords(words))

  const tlv = parseTLV(data);
  if (!tlv[0]?.[0]) throw new Error('missing TLV 0 for nprofile')
  if (tlv[0][0].length !== 32) throw new Error('TLV 0 should be 32 bytes')

  return {
    pubkey: bytesToHex(tlv[0][0]),
    relays: tlv[1] ? tlv[1].map(d => utf8Decoder.decode(d)) : [],
    bridge: tlv[2] ? tlv[2].map(d => utf8Decoder.decode(d)) : []
  }
}
