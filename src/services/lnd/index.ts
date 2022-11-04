//const grpc = require('@grpc/grpc-js');
import { credentials, Metadata } from '@grpc/grpc-js'
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import fs from 'fs'
import { LightningClient } from '../../../proto/lnd/rpc.client'
import { InvoicesClient } from '../../../proto/lnd/invoices.client'
import { RouterClient } from '../../../proto/lnd/router.client'
import { GetInfoResponse } from '../../../proto/lnd/rpc'
const DefaultMetadata = (deadline = 10 * 1000) => ({ deadline: Date.now() + deadline })
export default class {
    lightning: LightningClient
    invoices: InvoicesClient
    router: RouterClient
    constructor() {
        const lndAddr = process.env.LND_ADDRESS;
        const lndCertPath = process.env.LND_CERT_PATH;
        const lndMacaroonPath = process.env.LND_MACAROON_PATH;
        if (!lndAddr || !lndCertPath || !lndMacaroonPath) {
            throw new Error(`Something missing from ADDR/TLS/MACAROON`);
        }
        const lndCert = fs.readFileSync(lndCertPath);
        const macaroon = fs.readFileSync(lndMacaroonPath).toString('hex');
        const sslCreds = credentials.createSsl(lndCert);
        const macaroonCreds = credentials.createFromMetadataGenerator(
            function (args: any, callback: any) {
                let metadata = new Metadata();
                metadata.add('macaroon', macaroon);
                callback(null, metadata);
            },
        );
        const creds = credentials.combineChannelCredentials(
            sslCreds,
            macaroonCreds,
        );
        const transport = new GrpcTransport({ host: lndAddr, channelCredentials: creds })
        this.lightning = new LightningClient(transport)
        this.invoices = new InvoicesClient(transport)
        this.router = new RouterClient(transport)
    }
    async GetInfo(): Promise<GetInfoResponse> {
        const res = await this.lightning.getInfo({}, DefaultMetadata())
        return res.response
    }
    async OpenChannel(destination: string, closeAddress: string, fundingAmount: number, pushSats) {
        const stream = this.lightning.openChannel({
            nodePubkey: Buffer.from(destination, 'hex'),
            closeAddress: closeAddress,
            localFundingAmount: fundingAmount,
            pushSats: pushSats,
            sa: satPerByte
        })

        return new Promise(res => {
            stream.on('data', response => {
                if (response) {
                    res(true)
                }
            })
            stream.on('error', err => {
                if (err) {
                    console.error("err")
                    console.error(err)
                    this.statusAll(true)
                        // move to next client after the refresh
                        .then(() => this.nextPreferredClient())
                    res(false)
                }
            })
        })
    }
}


