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
const Fs = require("fs");
const Path = require("path");
const lib_1 = require("../../lib");
const helpers_1 = require("../helpers");
const auth_1 = require("./auth");
const temp = require('temp').track();
describe('git-process', () => {
    describe('clone', () => {
        it("returns exit code when repository doesn't exist", () => __awaiter(this, void 0, void 0, function* () {
            const testRepoPath = temp.mkdirSync('desktop-git-test-blank');
            const options = {
                env: auth_1.setupNoAuth()
            };
            // GitHub will prompt for (and validate) credentials for non-public
            // repositories, to prevent leakage of information.
            // Bitbucket will not prompt for credentials, and will immediately
            // return whether this non-public repository exists.
            //
            // This is an easier to way to test for the specific error than to
            // pass live account credentials to Git.
            const result = yield lib_1.GitProcess.exec(['clone', '--', 'https://bitbucket.org/shiftkey/testing-non-existent.git', '.'], testRepoPath, options);
            helpers_1.verify(result, r => {
                expect(r.exitCode).toBe(128);
            });
        }));
        it('returns exit code and error when repository requires credentials', () => __awaiter(this, void 0, void 0, function* () {
            const testRepoPath = temp.mkdirSync('desktop-git-test-blank');
            const options = {
                env: auth_1.setupAskPass('error', 'error')
            };
            const result = yield lib_1.GitProcess.exec(['clone', '--', 'https://github.com/shiftkey/repository-private.git', '.'], testRepoPath, options);
            helpers_1.verify(result, r => {
                expect(r.exitCode).toBe(128);
            });
            const error = lib_1.GitProcess.parseError(result.stderr);
            expect(error).toBe(lib_1.GitError.HTTPSAuthenticationFailed);
        }));
        it('returns exit code when successful', () => __awaiter(this, void 0, void 0, function* () {
            const testRepoPath = temp.mkdirSync('desktop-git-clone-valid');
            const options = {
                env: auth_1.setupNoAuth()
            };
            const result = yield lib_1.GitProcess.exec(['clone', '--', 'https://github.com/shiftkey/friendly-bassoon.git', '.'], testRepoPath, options);
            helpers_1.verify(result, r => {
                expect(r.exitCode).toBe(0);
            });
        }));
    });
    describe('fetch', () => {
        it("returns exit code when repository doesn't exist", () => __awaiter(this, void 0, void 0, function* () {
            const testRepoPath = yield helpers_1.initialize('desktop-git-fetch-failure');
            // GitHub will prompt for (and validate) credentials for non-public
            // repositories, to prevent leakage of information.
            // Bitbucket will not prompt for credentials, and will immediately
            // return whether this non-public repository exists.
            //
            // This is an easier to way to test for the specific error than to
            // pass live account credentials to Git.
            const addRemote = yield lib_1.GitProcess.exec(['remote', 'add', 'origin', 'https://bitbucket.org/shiftkey/testing-non-existent.git'], testRepoPath);
            helpers_1.verify(addRemote, r => {
                expect(r.exitCode).toBe(0);
            });
            const options = {
                env: auth_1.setupNoAuth()
            };
            const result = yield lib_1.GitProcess.exec(['fetch', 'origin'], testRepoPath, options);
            helpers_1.verify(result, r => {
                expect(r.exitCode).toBe(128);
            });
        }));
        it('returns exit code and error when repository requires credentials', () => __awaiter(this, void 0, void 0, function* () {
            const testRepoPath = yield helpers_1.initialize('desktop-git-fetch-failure');
            const addRemote = yield lib_1.GitProcess.exec(['remote', 'add', 'origin', 'https://github.com/shiftkey/repository-private.git'], testRepoPath);
            helpers_1.verify(addRemote, r => {
                expect(r.exitCode).toBe(0);
            });
            const options = {
                env: auth_1.setupAskPass('error', 'error')
            };
            const result = yield lib_1.GitProcess.exec(['fetch', 'origin'], testRepoPath, options);
            helpers_1.verify(result, r => {
                expect(r.exitCode).toBe(128);
            });
            const error = lib_1.GitProcess.parseError(result.stderr);
            expect(error).toBe(lib_1.GitError.HTTPSAuthenticationFailed);
        }));
        it('returns exit code when successful', () => __awaiter(this, void 0, void 0, function* () {
            const testRepoPath = yield helpers_1.initialize('desktop-git-fetch-valid');
            const addRemote = yield lib_1.GitProcess.exec(['remote', 'add', 'origin', 'https://github.com/shiftkey/friendly-bassoon.git'], testRepoPath);
            helpers_1.verify(addRemote, r => {
                expect(r.exitCode).toBe(0);
            });
            const options = {
                env: auth_1.setupNoAuth()
            };
            const result = yield lib_1.GitProcess.exec(['fetch', 'origin'], testRepoPath, options);
            helpers_1.verify(result, r => {
                expect(r.exitCode).toBe(0);
            });
        }));
    });
    describe('checkout', () => {
        it('runs hook without error', () => __awaiter(this, void 0, void 0, function* () {
            const testRepoPath = yield helpers_1.initialize('desktop-git-checkout-hooks', 'main');
            const readme = Path.join(testRepoPath, 'README.md');
            Fs.writeFileSync(readme, '# README', { encoding: 'utf8' });
            yield lib_1.GitProcess.exec(['add', '.'], testRepoPath);
            yield lib_1.GitProcess.exec(['commit', '-m', '"added README"'], testRepoPath);
            yield lib_1.GitProcess.exec(['checkout', '-b', 'some-other-branch'], testRepoPath);
            const postCheckoutScript = `#!/bin/sh
echo 'post-check out hook ran'`;
            const postCheckoutFile = Path.join(testRepoPath, '.git', 'hooks', 'post-checkout');
            Fs.writeFileSync(postCheckoutFile, postCheckoutScript, { encoding: 'utf8', mode: '755' });
            const result = yield lib_1.GitProcess.exec(['checkout', 'main'], testRepoPath);
            helpers_1.verify(result, r => {
                expect(r.exitCode).toBe(0);
                expect(r.stderr).toContain('post-check out hook ran');
            });
        }));
    });
});
//# sourceMappingURL=git-process-test.js.map