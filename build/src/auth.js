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
Object.defineProperty(exports, "__esModule", { value: true });
const serverOptions = {
    AdminAuthGuard: (authHeader) => __awaiter(void 0, void 0, void 0, function* () { console.log("admin auth login with header: " + authHeader); return { pub: "__pubkey__" }; }),
    GuestAuthGuard: (authHeader) => __awaiter(void 0, void 0, void 0, function* () { console.log("guest auth login with header: " + authHeader); return { token: "__token__" }; }),
    NoAuthAuthGuard: (_) => __awaiter(void 0, void 0, void 0, function* () { return ({}); }),
    encryptionCallback: (_, b) => b
};
exports.default = serverOptions;
//# sourceMappingURL=auth.js.map