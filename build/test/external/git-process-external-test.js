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
const path_1 = require("path");
const find_git_exec_1 = require("find-git-exec");
const lib_1 = require("../../lib");
const helpers_1 = require("../helpers");
const temp = require('temp').track();
function setupGitEnvironment() {
    return __awaiter(this, void 0, void 0, function* () {
        let git = undefined;
        try {
            git = yield find_git_exec_1.default();
        }
        catch (_a) {
            return null;
        }
        if (!git || !git.path || !git.execPath) {
            return null;
        }
        else {
            const { path, execPath } = git;
            // Set the environment variable to be able to use an external Git.
            process.env.GIT_EXEC_PATH = execPath;
            process.env.LOCAL_GIT_DIRECTORY = path_1.dirname(path_1.dirname(path));
            return git;
        }
    });
}
describe('git-process [with external Git executable]', () => {
    describe('clone', () => {
        it('returns exit code when successful', (fn) => __awaiter(this, void 0, void 0, function* () {
            const git = yield setupGitEnvironment();
            if (git == null) {
                fn('External Git was not found on the host system.');
                return;
            }
            const testRepoPath = temp.mkdirSync('desktop-git-clone-valid-external');
            const result = yield lib_1.GitProcess.exec(['clone', '--', 'https://github.com/TypeFox/find-git-exec.git', '.'], testRepoPath);
            helpers_1.verify(result, r => {
                expect(r.exitCode).toEqual(0);
            });
            fn();
        }));
    });
});
//# sourceMappingURL=git-process-external-test.js.map