"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib/");
function getError() {
    return __awaiter(this, void 0, void 0, function* () {
        const branch = 'master';
        const path = 'C:/path/to/repo/';
        const result = yield lib_1.GitProcess.exec(['pull', 'origin', branch], path);
        if (result.exitCode !== 0) {
            const error = lib_1.GitProcess.parseError(result.stderr);
            if (error) {
                if (error === lib_1.GitError.HTTPSAuthenticationFailed) {
                    // invalid credentials
                }
                // TODO: other scenarios
            }
        }
    });
}
//# sourceMappingURL=parsing-errors.js.map