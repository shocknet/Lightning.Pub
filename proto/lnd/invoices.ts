// @generated by protobuf-ts 2.5.0 with parameter long_type_string
// @generated from protobuf file "invoices.proto" (package "invoicesrpc", syntax proto3)
// tslint:disable
import { Invoice } from "./rpc";
import { ServiceType } from "@protobuf-ts/runtime-rpc";
import type { BinaryWriteOptions } from "@protobuf-ts/runtime";
import type { IBinaryWriter } from "@protobuf-ts/runtime";
import { WireType } from "@protobuf-ts/runtime";
import type { BinaryReadOptions } from "@protobuf-ts/runtime";
import type { IBinaryReader } from "@protobuf-ts/runtime";
import { UnknownFieldHandler } from "@protobuf-ts/runtime";
import type { PartialMessage } from "@protobuf-ts/runtime";
import { reflectionMergePartial } from "@protobuf-ts/runtime";
import { MESSAGE_TYPE } from "@protobuf-ts/runtime";
import { MessageType } from "@protobuf-ts/runtime";
import { RouteHint } from "./rpc";
/**
 * @generated from protobuf message invoicesrpc.CancelInvoiceMsg
 */
export interface CancelInvoiceMsg {
    /**
     * Hash corresponding to the (hold) invoice to cancel.
     *
     * @generated from protobuf field: bytes payment_hash = 1;
     */
    paymentHash: Uint8Array;
}
/**
 * @generated from protobuf message invoicesrpc.CancelInvoiceResp
 */
export interface CancelInvoiceResp {
}
/**
 * @generated from protobuf message invoicesrpc.AddHoldInvoiceRequest
 */
export interface AddHoldInvoiceRequest {
    /**
     *
     * An optional memo to attach along with the invoice. Used for record keeping
     * purposes for the invoice's creator, and will also be set in the description
     * field of the encoded payment request if the description_hash field is not
     * being used.
     *
     * @generated from protobuf field: string memo = 1;
     */
    memo: string;
    /**
     * The hash of the preimage
     *
     * @generated from protobuf field: bytes hash = 2;
     */
    hash: Uint8Array;
    /**
     *
     * The value of this invoice in satoshis
     *
     * The fields value and value_msat are mutually exclusive.
     *
     * @generated from protobuf field: int64 value = 3;
     */
    value: string;
    /**
     *
     * The value of this invoice in millisatoshis
     *
     * The fields value and value_msat are mutually exclusive.
     *
     * @generated from protobuf field: int64 value_msat = 10;
     */
    valueMsat: string;
    /**
     *
     * Hash (SHA-256) of a description of the payment. Used if the description of
     * payment (memo) is too long to naturally fit within the description field
     * of an encoded payment request.
     *
     * @generated from protobuf field: bytes description_hash = 4;
     */
    descriptionHash: Uint8Array;
    /**
     * Payment request expiry time in seconds. Default is 3600 (1 hour).
     *
     * @generated from protobuf field: int64 expiry = 5;
     */
    expiry: string;
    /**
     * Fallback on-chain address.
     *
     * @generated from protobuf field: string fallback_addr = 6;
     */
    fallbackAddr: string;
    /**
     * Delta to use for the time-lock of the CLTV extended to the final hop.
     *
     * @generated from protobuf field: uint64 cltv_expiry = 7;
     */
    cltvExpiry: string;
    /**
     *
     * Route hints that can each be individually used to assist in reaching the
     * invoice's destination.
     *
     * @generated from protobuf field: repeated lnrpc.RouteHint route_hints = 8;
     */
    routeHints: RouteHint[];
    /**
     * Whether this invoice should include routing hints for private channels.
     *
     * @generated from protobuf field: bool private = 9;
     */
    private: boolean;
}
/**
 * @generated from protobuf message invoicesrpc.AddHoldInvoiceResp
 */
export interface AddHoldInvoiceResp {
    /**
     *
     * A bare-bones invoice for a payment within the Lightning Network.  With the
     * details of the invoice, the sender has all the data necessary to send a
     * payment to the recipient.
     *
     * @generated from protobuf field: string payment_request = 1;
     */
    paymentRequest: string;
}
/**
 * @generated from protobuf message invoicesrpc.SettleInvoiceMsg
 */
export interface SettleInvoiceMsg {
    /**
     * Externally discovered pre-image that should be used to settle the hold
     * invoice.
     *
     * @generated from protobuf field: bytes preimage = 1;
     */
    preimage: Uint8Array;
}
/**
 * @generated from protobuf message invoicesrpc.SettleInvoiceResp
 */
export interface SettleInvoiceResp {
}
/**
 * @generated from protobuf message invoicesrpc.SubscribeSingleInvoiceRequest
 */
export interface SubscribeSingleInvoiceRequest {
    /**
     * Hash corresponding to the (hold) invoice to subscribe to.
     *
     * @generated from protobuf field: bytes r_hash = 2;
     */
    rHash: Uint8Array;
}
// @generated message type with reflection information, may provide speed optimized methods
class CancelInvoiceMsg$Type extends MessageType<CancelInvoiceMsg> {
    constructor() {
        super("invoicesrpc.CancelInvoiceMsg", [
            { no: 1, name: "payment_hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value?: PartialMessage<CancelInvoiceMsg>): CancelInvoiceMsg {
        const message = { paymentHash: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            reflectionMergePartial<CancelInvoiceMsg>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: CancelInvoiceMsg): CancelInvoiceMsg {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes payment_hash */ 1:
                    message.paymentHash = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: CancelInvoiceMsg, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* bytes payment_hash = 1; */
        if (message.paymentHash.length)
            writer.tag(1, WireType.LengthDelimited).bytes(message.paymentHash);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message invoicesrpc.CancelInvoiceMsg
 */
export const CancelInvoiceMsg = new CancelInvoiceMsg$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CancelInvoiceResp$Type extends MessageType<CancelInvoiceResp> {
    constructor() {
        super("invoicesrpc.CancelInvoiceResp", []);
    }
    create(value?: PartialMessage<CancelInvoiceResp>): CancelInvoiceResp {
        const message = {};
        globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            reflectionMergePartial<CancelInvoiceResp>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: CancelInvoiceResp): CancelInvoiceResp {
        return target ?? this.create();
    }
    internalBinaryWrite(message: CancelInvoiceResp, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message invoicesrpc.CancelInvoiceResp
 */
export const CancelInvoiceResp = new CancelInvoiceResp$Type();
// @generated message type with reflection information, may provide speed optimized methods
class AddHoldInvoiceRequest$Type extends MessageType<AddHoldInvoiceRequest> {
    constructor() {
        super("invoicesrpc.AddHoldInvoiceRequest", [
            { no: 1, name: "memo", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 3, name: "value", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 10, name: "value_msat", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 4, name: "description_hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 5, name: "expiry", kind: "scalar", T: 3 /*ScalarType.INT64*/ },
            { no: 6, name: "fallback_addr", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 7, name: "cltv_expiry", kind: "scalar", T: 4 /*ScalarType.UINT64*/ },
            { no: 8, name: "route_hints", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => RouteHint },
            { no: 9, name: "private", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value?: PartialMessage<AddHoldInvoiceRequest>): AddHoldInvoiceRequest {
        const message = { memo: "", hash: new Uint8Array(0), value: "0", valueMsat: "0", descriptionHash: new Uint8Array(0), expiry: "0", fallbackAddr: "", cltvExpiry: "0", routeHints: [], private: false };
        globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            reflectionMergePartial<AddHoldInvoiceRequest>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: AddHoldInvoiceRequest): AddHoldInvoiceRequest {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string memo */ 1:
                    message.memo = reader.string();
                    break;
                case /* bytes hash */ 2:
                    message.hash = reader.bytes();
                    break;
                case /* int64 value */ 3:
                    message.value = reader.int64().toString();
                    break;
                case /* int64 value_msat */ 10:
                    message.valueMsat = reader.int64().toString();
                    break;
                case /* bytes description_hash */ 4:
                    message.descriptionHash = reader.bytes();
                    break;
                case /* int64 expiry */ 5:
                    message.expiry = reader.int64().toString();
                    break;
                case /* string fallback_addr */ 6:
                    message.fallbackAddr = reader.string();
                    break;
                case /* uint64 cltv_expiry */ 7:
                    message.cltvExpiry = reader.uint64().toString();
                    break;
                case /* repeated lnrpc.RouteHint route_hints */ 8:
                    message.routeHints.push(RouteHint.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* bool private */ 9:
                    message.private = reader.bool();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: AddHoldInvoiceRequest, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* string memo = 1; */
        if (message.memo !== "")
            writer.tag(1, WireType.LengthDelimited).string(message.memo);
        /* bytes hash = 2; */
        if (message.hash.length)
            writer.tag(2, WireType.LengthDelimited).bytes(message.hash);
        /* int64 value = 3; */
        if (message.value !== "0")
            writer.tag(3, WireType.Varint).int64(message.value);
        /* int64 value_msat = 10; */
        if (message.valueMsat !== "0")
            writer.tag(10, WireType.Varint).int64(message.valueMsat);
        /* bytes description_hash = 4; */
        if (message.descriptionHash.length)
            writer.tag(4, WireType.LengthDelimited).bytes(message.descriptionHash);
        /* int64 expiry = 5; */
        if (message.expiry !== "0")
            writer.tag(5, WireType.Varint).int64(message.expiry);
        /* string fallback_addr = 6; */
        if (message.fallbackAddr !== "")
            writer.tag(6, WireType.LengthDelimited).string(message.fallbackAddr);
        /* uint64 cltv_expiry = 7; */
        if (message.cltvExpiry !== "0")
            writer.tag(7, WireType.Varint).uint64(message.cltvExpiry);
        /* repeated lnrpc.RouteHint route_hints = 8; */
        for (let i = 0; i < message.routeHints.length; i++)
            RouteHint.internalBinaryWrite(message.routeHints[i], writer.tag(8, WireType.LengthDelimited).fork(), options).join();
        /* bool private = 9; */
        if (message.private !== false)
            writer.tag(9, WireType.Varint).bool(message.private);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message invoicesrpc.AddHoldInvoiceRequest
 */
export const AddHoldInvoiceRequest = new AddHoldInvoiceRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class AddHoldInvoiceResp$Type extends MessageType<AddHoldInvoiceResp> {
    constructor() {
        super("invoicesrpc.AddHoldInvoiceResp", [
            { no: 1, name: "payment_request", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value?: PartialMessage<AddHoldInvoiceResp>): AddHoldInvoiceResp {
        const message = { paymentRequest: "" };
        globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            reflectionMergePartial<AddHoldInvoiceResp>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: AddHoldInvoiceResp): AddHoldInvoiceResp {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string payment_request */ 1:
                    message.paymentRequest = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: AddHoldInvoiceResp, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* string payment_request = 1; */
        if (message.paymentRequest !== "")
            writer.tag(1, WireType.LengthDelimited).string(message.paymentRequest);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message invoicesrpc.AddHoldInvoiceResp
 */
export const AddHoldInvoiceResp = new AddHoldInvoiceResp$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SettleInvoiceMsg$Type extends MessageType<SettleInvoiceMsg> {
    constructor() {
        super("invoicesrpc.SettleInvoiceMsg", [
            { no: 1, name: "preimage", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value?: PartialMessage<SettleInvoiceMsg>): SettleInvoiceMsg {
        const message = { preimage: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            reflectionMergePartial<SettleInvoiceMsg>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: SettleInvoiceMsg): SettleInvoiceMsg {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes preimage */ 1:
                    message.preimage = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: SettleInvoiceMsg, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* bytes preimage = 1; */
        if (message.preimage.length)
            writer.tag(1, WireType.LengthDelimited).bytes(message.preimage);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message invoicesrpc.SettleInvoiceMsg
 */
export const SettleInvoiceMsg = new SettleInvoiceMsg$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SettleInvoiceResp$Type extends MessageType<SettleInvoiceResp> {
    constructor() {
        super("invoicesrpc.SettleInvoiceResp", []);
    }
    create(value?: PartialMessage<SettleInvoiceResp>): SettleInvoiceResp {
        const message = {};
        globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            reflectionMergePartial<SettleInvoiceResp>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: SettleInvoiceResp): SettleInvoiceResp {
        return target ?? this.create();
    }
    internalBinaryWrite(message: SettleInvoiceResp, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message invoicesrpc.SettleInvoiceResp
 */
export const SettleInvoiceResp = new SettleInvoiceResp$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SubscribeSingleInvoiceRequest$Type extends MessageType<SubscribeSingleInvoiceRequest> {
    constructor() {
        super("invoicesrpc.SubscribeSingleInvoiceRequest", [
            { no: 2, name: "r_hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value?: PartialMessage<SubscribeSingleInvoiceRequest>): SubscribeSingleInvoiceRequest {
        const message = { rHash: new Uint8Array(0) };
        globalThis.Object.defineProperty(message, MESSAGE_TYPE, { enumerable: false, value: this });
        if (value !== undefined)
            reflectionMergePartial<SubscribeSingleInvoiceRequest>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: SubscribeSingleInvoiceRequest): SubscribeSingleInvoiceRequest {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes r_hash */ 2:
                    message.rHash = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: SubscribeSingleInvoiceRequest, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* bytes r_hash = 2; */
        if (message.rHash.length)
            writer.tag(2, WireType.LengthDelimited).bytes(message.rHash);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message invoicesrpc.SubscribeSingleInvoiceRequest
 */
export const SubscribeSingleInvoiceRequest = new SubscribeSingleInvoiceRequest$Type();
/**
 * @generated ServiceType for protobuf service invoicesrpc.Invoices
 */
export const Invoices = new ServiceType("invoicesrpc.Invoices", [
    { name: "SubscribeSingleInvoice", serverStreaming: true, options: {}, I: SubscribeSingleInvoiceRequest, O: Invoice },
    { name: "CancelInvoice", options: {}, I: CancelInvoiceMsg, O: CancelInvoiceResp },
    { name: "AddHoldInvoice", options: {}, I: AddHoldInvoiceRequest, O: AddHoldInvoiceResp },
    { name: "SettleInvoice", options: {}, I: SettleInvoiceMsg, O: SettleInvoiceResp }
]);