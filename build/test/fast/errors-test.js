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
const lib_1 = require("../../lib");
const helpers_1 = require("../helpers");
const fs_1 = require("fs");
const path_1 = require("path");
const errors_1 = require("../../lib/errors");
describe('detects errors', () => {
    it('RemoteAlreadyExists', () => __awaiter(this, void 0, void 0, function* () {
        const repoPath = yield helpers_1.initialize('remote-already-exists-test-repo');
        yield lib_1.GitProcess.exec(['remote', 'add', 'new-remote', 'https://github.com'], repoPath);
        const result = yield lib_1.GitProcess.exec(['remote', 'add', 'new-remote', 'https://gitlab.com'], repoPath);
        expect(result).toHaveGitError(lib_1.GitError.RemoteAlreadyExists);
    }));
    it('TagAlreadyExists', () => __awaiter(this, void 0, void 0, function* () {
        const repoPath = yield helpers_1.initialize('tag-already-exists-test-repo');
        const filePath = 'text.md';
        fs_1.writeFileSync(path_1.join(repoPath, filePath), 'some text');
        yield lib_1.GitProcess.exec(['add', filePath], repoPath);
        yield lib_1.GitProcess.exec(['commit', '-m', 'add a text file'], repoPath);
        yield lib_1.GitProcess.exec(['tag', 'v0.1'], repoPath);
        // try to make the same tag again
        const result = yield lib_1.GitProcess.exec(['tag', 'v0.1'], repoPath);
        expect(result).toHaveGitError(lib_1.GitError.TagAlreadyExists);
    }));
    it('BranchAlreadyExists', () => __awaiter(this, void 0, void 0, function* () {
        const path = yield helpers_1.initialize('branch-already-exists', 'foo');
        yield lib_1.GitProcess.exec(['commit', '-m', 'initial', '--allow-empty'], path);
        const result = yield lib_1.GitProcess.exec(['branch', 'foo'], path);
        expect(result).toHaveGitError(lib_1.GitError.BranchAlreadyExists);
    }));
    it('UnsafeDirectory', () => __awaiter(this, void 0, void 0, function* () {
        const repoName = 'branch-already-exists';
        const path = yield helpers_1.initialize(repoName);
        const result = yield lib_1.GitProcess.exec(['status'], path, {
            env: {
                GIT_TEST_ASSUME_DIFFERENT_OWNER: 1
            }
        });
        expect(result).toHaveGitError(lib_1.GitError.UnsafeDirectory);
        const errorEntry = Object.entries(errors_1.GitErrorRegexes).find(([_, v]) => v === lib_1.GitError.UnsafeDirectory);
        expect(errorEntry).not.toBe(null);
        const m = result.stderr.match(errorEntry[0]);
        // toContain because of realpath and we don't care about /private/ on macOS
        expect(m[1]).toContain(repoName);
    }));
});
//# sourceMappingURL=errors-test.js.map