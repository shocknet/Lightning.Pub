"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicesClient = void 0;
const invoices_1 = require("./invoices");
const runtime_rpc_1 = require("@protobuf-ts/runtime-rpc");
/**
 * Invoices is a service that can be used to create, accept, settle and cancel
 * invoices.
 *
 * @generated from protobuf service invoicesrpc.Invoices
 */
class InvoicesClient {
    constructor(_transport) {
        this._transport = _transport;
        this.typeName = invoices_1.Invoices.typeName;
        this.methods = invoices_1.Invoices.methods;
        this.options = invoices_1.Invoices.options;
    }
    /**
     *
     * SubscribeSingleInvoice returns a uni-directional stream (server -> client)
     * to notify the client of state transitions of the specified invoice.
     * Initially the current invoice state is always sent out.
     *
     * @generated from protobuf rpc: SubscribeSingleInvoice(invoicesrpc.SubscribeSingleInvoiceRequest) returns (stream lnrpc.Invoice);
     */
    subscribeSingleInvoice(input, options) {
        const method = this.methods[0], opt = this._transport.mergeOptions(options);
        return (0, runtime_rpc_1.stackIntercept)("serverStreaming", this._transport, method, opt, input);
    }
    /**
     *
     * CancelInvoice cancels a currently open invoice. If the invoice is already
     * canceled, this call will succeed. If the invoice is already settled, it will
     * fail.
     *
     * @generated from protobuf rpc: CancelInvoice(invoicesrpc.CancelInvoiceMsg) returns (invoicesrpc.CancelInvoiceResp);
     */
    cancelInvoice(input, options) {
        const method = this.methods[1], opt = this._transport.mergeOptions(options);
        return (0, runtime_rpc_1.stackIntercept)("unary", this._transport, method, opt, input);
    }
    /**
     *
     * AddHoldInvoice creates a hold invoice. It ties the invoice to the hash
     * supplied in the request.
     *
     * @generated from protobuf rpc: AddHoldInvoice(invoicesrpc.AddHoldInvoiceRequest) returns (invoicesrpc.AddHoldInvoiceResp);
     */
    addHoldInvoice(input, options) {
        const method = this.methods[2], opt = this._transport.mergeOptions(options);
        return (0, runtime_rpc_1.stackIntercept)("unary", this._transport, method, opt, input);
    }
    /**
     *
     * SettleInvoice settles an accepted invoice. If the invoice is already
     * settled, this call will succeed.
     *
     * @generated from protobuf rpc: SettleInvoice(invoicesrpc.SettleInvoiceMsg) returns (invoicesrpc.SettleInvoiceResp);
     */
    settleInvoice(input, options) {
        const method = this.methods[3], opt = this._transport.mergeOptions(options);
        return (0, runtime_rpc_1.stackIntercept)("unary", this._transport, method, opt, input);
    }
}
exports.InvoicesClient = InvoicesClient;
//# sourceMappingURL=invoices.client.js.map