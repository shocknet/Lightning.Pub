#!/usr/bin/env node

import { decodeBech32, nip19 } from '@shocknet/clink-sdk'

const nip19String = process.argv[2]

if (!nip19String) {
    console.error('Usage: node decode.js <nip19_string>')
    console.error('Example: node decode.js nprofile1qyd8wumn8ghj7um5wfn8y7fwwd5x7cmt9ehx2arhdaexkqpqwmk5tuqvafa6ckwc6zmaypyy3af3n4aeds2ql7m0ew42kzsn638q9s9z8p')
    process.exit(1)
}

try {
    // Check prefix to determine which decoder to use
    const prefix = nip19String.split('1')[0]
    const decoded = (prefix === 'noffer' || prefix === 'ndebit' || prefix === 'nmanage')
        ? decodeBech32(nip19String)
        : nip19.decode(nip19String)
    
    console.log('\nDecoded:')
    console.log('Type:', decoded.type)
    console.log('\nData:')
    console.log(JSON.stringify(decoded.data, null, 2))
    
    if (decoded.type === 'nprofile') {
        console.log('\nDetails:')
        console.log('  Pubkey:', decoded.data.pubkey)
        if (decoded.data.relays) {
            console.log('  Relays:')
            decoded.data.relays.forEach((relay, i) => {
                console.log(`    ${i + 1}. ${relay}`)
            })
        }
    } else if (decoded.type === 'npub') {
        console.log('\nDetails:')
        console.log('  Pubkey:', decoded.data)
    } else if (decoded.type === 'nsec') {
        console.log('\nDetails:')
        console.log('  Private Key:', decoded.data)
    } else if (decoded.type === 'note') {
        console.log('\nDetails:')
        console.log('  Event ID:', decoded.data)
    } else if (decoded.type === 'noffer') {
        console.log('\nDetails:')
        console.log('  Pubkey:', decoded.data.pubkey)
        console.log('  Offer:', decoded.data.offer)
        if (decoded.data.relay) {
            console.log('  Relay:', decoded.data.relay)
        }
        if (decoded.data.priceType) {
            console.log('  Price Type:', decoded.data.priceType)
        }
    } else if (decoded.type === 'ndebit') {
        console.log('\nDetails:')
        console.log('  Pubkey:', decoded.data.pubkey)
        console.log('  Pointer:', decoded.data.pointer)
        if (decoded.data.relay) {
            console.log('  Relay:', decoded.data.relay)
        }
    } else if (decoded.type === 'nmanage') {
        console.log('\nDetails:')
        console.log('  Pubkey:', decoded.data.pubkey)
        console.log('  Pointer:', decoded.data.pointer)
        if (decoded.data.relay) {
            console.log('  Relay:', decoded.data.relay)
        }
    }
    
} catch (error) {
    console.error('Error decoding bech32 string:', error.message)
    process.exit(1)
}

