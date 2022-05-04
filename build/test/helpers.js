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
const lib_1 = require("../lib");
// NOTE: bump these versions to the latest stable releases
exports.gitVersion = '2.35.3';
exports.gitForWindowsVersion = '2.35.3.windows.1';
exports.gitLfsVersion = '3.1.2';
const temp = require('temp').track();
function initialize(repositoryName, defaultBranch) {
    return __awaiter(this, void 0, void 0, function* () {
        const testRepoPath = temp.mkdirSync(`desktop-git-test-${repositoryName}`);
        const branchArgs = defaultBranch !== undefined ? ['-b', defaultBranch] : [];
        yield lib_1.GitProcess.exec(['init', ...branchArgs], testRepoPath);
        yield lib_1.GitProcess.exec(['config', 'user.email', '"some.user@email.com"'], testRepoPath);
        yield lib_1.GitProcess.exec(['config', 'user.name', '"Some User"'], testRepoPath);
        return testRepoPath;
    });
}
exports.initialize = initialize;
/**
 * Initialize a repository with a remote pointing to a local bare repository.
 * If the remotePath is not specified, the remote repository will get automatically created.
 *
 * @param repositoryName    The name of the repository to create
 * @param remotePath        The path of the remote reposiry (when null a new repository will get created)
 */
function initializeWithRemote(repositoryName, remotePath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (remotePath === null) {
            const path = temp.mkdirSync(`desktop-git-test-remote-${repositoryName}`);
            yield lib_1.GitProcess.exec(['init', '--bare'], path);
            remotePath = path;
        }
        if (remotePath === null) {
            throw new Error('for TypeScript');
        }
        const testRepoPath = yield initialize(repositoryName);
        yield lib_1.GitProcess.exec(['remote', 'add', 'origin', remotePath], testRepoPath);
        return { path: testRepoPath, remote: remotePath };
    });
}
exports.initializeWithRemote = initializeWithRemote;
function verify(result, callback) {
    try {
        callback(result);
    }
    catch (e) {
        console.log('error encountered while verifying; poking at response from Git:');
        console.log(` - exitCode: ${result.exitCode}`);
        console.log(` - stdout: ${result.stdout.trim()}`);
        console.log(` - stderr: ${result.stderr.trim()}`);
        console.log();
        throw e;
    }
}
exports.verify = verify;
/**
 * Reverse maps the provided GitError to print a friendly name for debugging tests.
 *
 * @param gitError GitError
 */
function getFriendlyGitError(gitError) {
    const found = Object.entries(lib_1.GitError).find(([key, value]) => {
        return value === gitError;
    });
    if (found === undefined) {
        return gitError.toString();
    }
    return found[0];
}
expect.extend({
    toHaveGitError(result, expectedError) {
        let gitError = lib_1.GitProcess.parseError(result.stderr);
        if (gitError === null) {
            gitError = lib_1.GitProcess.parseError(result.stdout);
        }
        const message = () => {
            return [
                this.utils.matcherHint(`${this.isNot ? '.not' : ''}.toHaveGitError`, 'result', 'gitError'),
                '',
                'Expected',
                `  ${this.utils.printExpected(getFriendlyGitError(expectedError))}`,
                'Received:',
                `  ${this.utils.printReceived(gitError ? getFriendlyGitError(gitError) : null)}`
            ].join('\n');
        };
        if (gitError === expectedError) {
            return {
                pass: true,
                message
            };
        }
        return {
            pass: false,
            message
        };
    }
});
//# sourceMappingURL=helpers.js.map