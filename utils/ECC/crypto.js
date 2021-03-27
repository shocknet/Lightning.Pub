const { Buffer } = require("buffer");
const FieldError = require("../fieldError")

const convertUTF8ToBuffer = (value) => Buffer.from(value, 'utf-8');

const convertBase64ToBuffer = (value) => Buffer.from(value, 'base64');

const convertBufferToBase64 = (buffer) => buffer.toString("base64");

const processKey = (key) => {
    if (Buffer.isBuffer(key)) {
        return key;
    }
    const convertedKey = convertBase64ToBuffer(key);
    return convertedKey;
};

const convertToEncryptedMessageResponse = (encryptedMessage) => {
    if (typeof encryptedMessage.ciphertext === "string") {
        return encryptedMessage;
    }
  
    if (Buffer.isBuffer(encryptedMessage.ciphertext) &&
        Buffer.isBuffer(encryptedMessage.iv) &&
        Buffer.isBuffer(encryptedMessage.mac) &&
        Buffer.isBuffer(encryptedMessage.ephemPublicKey)) {
        return {
            ciphertext: convertBufferToBase64(encryptedMessage.ciphertext),
            iv: convertBufferToBase64(encryptedMessage.iv),
            mac: convertBufferToBase64(encryptedMessage.mac),
            ephemPublicKey: convertBufferToBase64(encryptedMessage.ephemPublicKey)
        };
    }
    throw new FieldError({
        field: "encryptedMessage",
        message: "Unknown encrypted message format"
    });
};

const convertToEncryptedMessage = (encryptedMessage) => {
    if (encryptedMessage.ciphertext instanceof Buffer &&
        encryptedMessage.iv instanceof Buffer &&
        encryptedMessage.mac instanceof Buffer &&
        encryptedMessage.ephemPublicKey instanceof Buffer) {
        // @ts-ignore
        return encryptedMessage;
    }
    if (typeof encryptedMessage.ciphertext === "string" &&
        typeof encryptedMessage.iv === "string" &&
        typeof encryptedMessage.mac === "string" &&
        typeof encryptedMessage.ephemPublicKey === "string") {
        return {
            ciphertext: convertBase64ToBuffer(encryptedMessage.ciphertext),
            iv: convertBase64ToBuffer(encryptedMessage.iv),
            mac: convertBase64ToBuffer(encryptedMessage.mac),
            ephemPublicKey: convertBase64ToBuffer(encryptedMessage.ephemPublicKey)
        };
    }
    throw new FieldError({
        field: "encryptedMessage",
        message: "Unknown encrypted message format"
    });
};

module.exports = {
  convertUTF8ToBuffer,
  convertBase64ToBuffer,
  convertBufferToBase64,
  convertToEncryptedMessage,
  convertToEncryptedMessageResponse,
  processKey
}