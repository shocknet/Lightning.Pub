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
const lnd_1 = __importDefault(require("../lnd"));
const methods = {
    EncryptionExchange: (ctx, req) => __awaiter(void 0, void 0, void 0, function* () { }),
    Health: (ctx) => __awaiter(void 0, void 0, void 0, function* () { }),
    LndGetInfo: (ctx) => __awaiter(void 0, void 0, void 0, function* () {
        const info = yield lnd_1.default.getInfo();
        return { alias: info.alias };
    })
};
exports.default = methods;
//# sourceMappingURL=index.js.map