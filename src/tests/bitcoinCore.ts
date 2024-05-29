// @ts-ignore
import BitcoinCore from 'bitcoin-core';
import { TestSettings } from '../services/main/settings';
export class BitcoinCoreWrapper {
    core: BitcoinCore
    addr: { address: string }
    constructor(settings: TestSettings) {
        this.core = new BitcoinCore({
            //network: 'regtest',
            host: '127.0.0.1',
            port: `${settings.bitcoinCoreSettings.port}`,
            username: settings.bitcoinCoreSettings.user,
            password: settings.bitcoinCoreSettings.pass,
            // use a long timeout due to the time it takes to mine a lot of blocks
            timeout: 5 * 60 * 1000,
        })
    }
    InitAddress = async () => {
        this.addr = await this.core.getNewAddress()
    }
    Init = async () => {
        const wallet = await this.core.createWallet('');
        console.log({ wallet })
        await this.InitAddress()
        console.log({ addr: this.addr })
        await this.Mine(101)
        const info = await this.core.getWalletInfo();
        console.log({ info })
    }

    Mine = async (blocks: number) => {
        await this.core.generateToAddress(blocks, this.addr)
    }

    SendToAddress = async (address: string, amount: number) => {
        const tx = await this.core.sendToAddress(address, amount)
        console.log({ tx })
    }
}