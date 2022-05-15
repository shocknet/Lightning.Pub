"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//const grpc = require('@grpc/grpc-js');
const grpc_js_1 = require("@grpc/grpc-js");
const grpc_transport_1 = require("@protobuf-ts/grpc-transport");
const fs_1 = __importDefault(require("fs"));
const rpc_client_1 = require("../../../proto/lnd/rpc.client");
const invoices_client_1 = require("../../../proto/lnd/invoices.client");
const router_client_1 = require("../../../proto/lnd/router.client");
const lndAddr = process.env.LND_ADDRESS;
const lndCertPath = process.env.LND_CERT_PATH;
const lndMacaroonPath = process.env.LND_MACAROON_PATH;
if (!lndAddr || !lndCertPath || !lndMacaroonPath) {
    throw new Error(`Something missing from ADDR/TLS/MACAROON`);
}
const lndCert = fs_1.default.readFileSync(lndCertPath);
const macaroon = fs_1.default.readFileSync(lndMacaroonPath).toString('hex');
const sslCreds = grpc_js_1.credentials.createSsl(lndCert);
const macaroonCreds = grpc_js_1.credentials.createFromMetadataGenerator(function (args, callback) {
    let metadata = new grpc_js_1.Metadata();
    metadata.add('macaroon', macaroon);
    callback(null, metadata);
});
const creds = grpc_js_1.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
const transport = new grpc_transport_1.GrpcTransport({ host: lndAddr, channelCredentials: creds });
const lightning = new rpc_client_1.LightningClient(transport);
const invoices = new invoices_client_1.InvoicesClient(transport);
const router = new router_client_1.RouterClient(transport);
const DefaultMetadata = (deadline = 10 * 1000) => ({ deadline: Date.now() + deadline });
exports.default = {
    getInfo: () => __awaiter(void 0, void 0, void 0, function* () { return (yield lightning.getInfo({}, DefaultMetadata())).response; })
};
//# sourceMappingURL=index.js.map