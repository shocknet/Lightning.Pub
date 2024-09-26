import { base64 } from "@scure/base";
import { randomBytes } from "@noble/hashes/utils";
import { streamXOR as xchacha20 } from "@stablelib/xchacha20";
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
export type EncryptedData = {
    ciphertext: Uint8Array;
    nonce: Uint8Array;
}
export const getSharedSecret = (privateKey: string, publicKey: string) => {
    const key = secp256k1.getSharedSecret(privateKey, "02" + publicKey);
    return sha256(key.slice(1, 33));
}

export const encrypt = (content: string, sharedSecret: Uint8Array) => {
    const nonce = randomBytes(24);
    const plaintext = new TextEncoder().encode(content);
    const ciphertext = xchacha20(sharedSecret, nonce, plaintext, plaintext);
    return encodePayload({ ciphertext, nonce });
}

export const decrypt = (content: string, sharedSecret: Uint8Array) => {
    const payload = decodePayload(content);
    const dst = xchacha20(sharedSecret, payload.nonce, payload.ciphertext, payload.ciphertext);
    const decoded = new TextDecoder().decode(dst);
    return decoded;
}
const xchacha20EncryptionVersion = 1
export const decodePayload = (p: string) => {
    if (p.startsWith("{") && p.endsWith("}")) {
        const pj = JSON.parse(p) as { v: number; nonce: string; ciphertext: string };
        if (pj.v !== xchacha20EncryptionVersion) {
            throw new Error("Encryption version unsupported")
        }
        return {
            nonce: base64.decode(pj.nonce),
            ciphertext: base64.decode(pj.ciphertext),
        } as EncryptedData;
    } else {
        const buf = base64.decode(p);
        if (buf[0] !== xchacha20EncryptionVersion) {
            throw new Error("Encryption version unsupported")
        }
        return {
            nonce: buf.subarray(1, 25),
            ciphertext: buf.subarray(25),
        } as EncryptedData;
    }
}

export const encodePayload = (p: EncryptedData) => {
    return base64.encode(new Uint8Array([xchacha20EncryptionVersion, ...p.nonce, ...p.ciphertext]));
}