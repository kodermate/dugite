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
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const lib_1 = require("../../lib");
const errors_1 = require("../../lib/errors");
const helpers_1 = require("../helpers");
const helpers_2 = require("../helpers");
const temp = require('temp').track();
describe('git-process', () => {
    it('can launch git', () => __awaiter(this, void 0, void 0, function* () {
        const result = yield lib_1.GitProcess.exec(['--version'], __dirname);
        expect(result.stderr).toBe('');
        if (result.stdout.includes('windows')) {
            expect(result.stdout).toContain(`git version ${helpers_1.gitForWindowsVersion}`);
        }
        else {
            expect(result.stdout).toContain(`git version ${helpers_2.gitVersion}`);
        }
        expect(result.exitCode).toBe(0);
    }));
    describe('exitCode', () => {
        it('returns exit code when folder is empty', () => __awaiter(this, void 0, void 0, function* () {
            const testRepoPath = temp.mkdirSync('desktop-git-test-blank');
            const result = yield lib_1.GitProcess.exec(['show', 'HEAD'], testRepoPath);
            helpers_1.verify(result, r => {
                expect(r.exitCode).toBe(128);
            });
        }));
        it('handles stdin closed errors', () => __awaiter(this, void 0, void 0, function* () {
            const testRepoPath = temp.mkdirSync('desktop-git-test-blank');
            // Pass an unknown arg to Git, forcing it to terminate immediately
            // and then try to write to stdin. Without the ignoreClosedInputStream
            // workaround this will crash the process (timing related) with an
            // EPIPE/EOF error thrown from process.stdin
            const result = yield lib_1.GitProcess.exec(['--trololol'], testRepoPath, {
                stdin: '\n'.repeat(1024 * 1024)
            });
            helpers_1.verify(result, r => {
                expect(r.exitCode).toBe(129);
            });
        }));
        describe('diff', () => {
            it('returns expected error code for initial commit when creating diff', () => __awaiter(this, void 0, void 0, function* () {
                const testRepoPath = yield helpers_1.initialize('blank-no-commits');
                const file = path.join(testRepoPath, 'new-file.md');
                fs.writeFileSync(file, 'this is a new file');
                const result = yield lib_1.GitProcess.exec(['diff', '--no-index', '--patch-with-raw', '-z', '--', '/dev/null', 'new-file.md'], testRepoPath);
                helpers_1.verify(result, r => {
                    expect(r.exitCode).toBe(1);
                    expect(r.stdout.length).toBeGreaterThan(0);
                });
            }));
            it('returns expected error code for repository with history when creating diff', () => __awaiter(this, void 0, void 0, function* () {
                const testRepoPath = yield helpers_1.initialize('blank-then-commit');
                const readme = path.join(testRepoPath, 'README.md');
                fs.writeFileSync(readme, 'hello world!');
                yield lib_1.GitProcess.exec(['add', '.'], testRepoPath);
                const commit = yield lib_1.GitProcess.exec(['commit', '-F', '-'], testRepoPath, {
                    stdin: 'hello world!'
                });
                expect(commit.exitCode).toBe(0);
                const file = path.join(testRepoPath, 'new-file.md');
                fs.writeFileSync(file, 'this is a new file');
                const result = yield lib_1.GitProcess.exec(['diff', '--no-index', '--patch-with-raw', '-z', '--', '/dev/null', 'new-file.md'], testRepoPath);
                helpers_1.verify(result, r => {
                    expect(r.exitCode).toBe(1);
                    expect(r.stdout.length).toBeGreaterThan(0);
                });
            }));
            it('throws error when exceeding the output range', () => __awaiter(this, void 0, void 0, function* () {
                const testRepoPath = temp.mkdirSync('blank-then-large-file');
                // NOTE: if we change the default buffer size in git-process
                // this test may no longer fail as expected - see https://git.io/v1dq3
                const output = crypto.randomBytes(10 * 1024 * 1024).toString('hex');
                const file = path.join(testRepoPath, 'new-file.md');
                fs.writeFileSync(file, output);
                // TODO: convert this to assert the error was thrown
                let throws = false;
                try {
                    yield lib_1.GitProcess.exec(['diff', '--no-index', '--patch-with-raw', '-z', '--', '/dev/null', 'new-file.md'], testRepoPath);
                }
                catch (_a) {
                    throws = true;
                }
                expect(throws).toBe(true);
            }));
        });
        describe('show', () => {
            it('exiting file', () => __awaiter(this, void 0, void 0, function* () {
                const testRepoPath = yield helpers_1.initialize('desktop-show-existing');
                const filePath = path.join(testRepoPath, 'file.txt');
                fs.writeFileSync(filePath, 'some content', { encoding: 'utf8' });
                yield lib_1.GitProcess.exec(['add', '.'], testRepoPath);
                yield lib_1.GitProcess.exec(['commit', '-m', '"added a file"'], testRepoPath);
                const result = yield lib_1.GitProcess.exec(['show', ':file.txt'], testRepoPath);
                helpers_1.verify(result, r => {
                    expect(r.exitCode).toBe(0);
                    expect(r.stdout.trim()).toBe('some content');
                });
            }));
            it('missing from index', () => __awaiter(this, void 0, void 0, function* () {
                const testRepoPath = yield helpers_1.initialize('desktop-show-missing-index');
                const result = yield lib_1.GitProcess.exec(['show', ':missing.txt'], testRepoPath);
                expect(result).toHaveGitError(lib_1.GitError.PathDoesNotExist);
            }));
            it('missing from commitish', () => __awaiter(this, void 0, void 0, function* () {
                const testRepoPath = yield helpers_1.initialize('desktop-show-missing-commitish');
                const filePath = path.join(testRepoPath, 'file.txt');
                fs.writeFileSync(filePath, 'some content', { encoding: 'utf8' });
                yield lib_1.GitProcess.exec(['add', '.'], testRepoPath);
                yield lib_1.GitProcess.exec(['commit', '-m', '"added a file"'], testRepoPath);
                const result = yield lib_1.GitProcess.exec(['show', 'HEAD:missing.txt'], testRepoPath);
                expect(result).toHaveGitError(lib_1.GitError.PathDoesNotExist);
            }));
            it('invalid object name - empty repository', () => __awaiter(this, void 0, void 0, function* () {
                const testRepoPath = yield helpers_1.initialize('desktop-show-invalid-object-empty');
                const result = yield lib_1.GitProcess.exec(['show', 'HEAD:missing.txt'], testRepoPath);
                expect(result).toHaveGitError(lib_1.GitError.InvalidObjectName);
            }));
            it('outside repository', () => __awaiter(this, void 0, void 0, function* () {
                const testRepoPath = yield helpers_1.initialize('desktop-show-outside');
                const filePath = path.join(testRepoPath, 'file.txt');
                fs.writeFileSync(filePath, 'some content', { encoding: 'utf8' });
                yield lib_1.GitProcess.exec(['add', '.'], testRepoPath);
                yield lib_1.GitProcess.exec(['commit', '-m', '"added a file"'], testRepoPath);
                const result = yield lib_1.GitProcess.exec(['show', '--', '/missing.txt'], testRepoPath);
                expect(result).toHaveGitError(lib_1.GitError.OutsideRepository);
            }));
        });
    });
    describe('errors', () => {
        it('each error code should have its corresponding regexp', () => {
            const difference = (left, right) => left.filter(item => right.indexOf(item) === -1);
            const errorCodes = Object.keys(lib_1.GitError)
                .map(key => lib_1.GitError[key])
                .filter(ordinal => Number.isInteger(ordinal));
            const regexes = Object.keys(errors_1.GitErrorRegexes).map(key => errors_1.GitErrorRegexes[key]);
            const errorCodesWithoutRegex = difference(errorCodes, regexes);
            const regexWithoutErrorCodes = difference(regexes, errorCodes);
            expect(errorCodesWithoutRegex).toHaveLength(0);
            expect(regexWithoutErrorCodes).toHaveLength(0);
        });
        it('raises error when folder does not exist', () => __awaiter(this, void 0, void 0, function* () {
            const testRepoPath = path.join(temp.path(), 'desktop-does-not-exist');
            let error = null;
            try {
                yield lib_1.GitProcess.exec(['show', 'HEAD'], testRepoPath);
            }
            catch (e) {
                error = e;
            }
            expect(error.message).toBe('Unable to find path to repository on disk.');
            expect(error.code).toBe(lib_1.RepositoryDoesNotExistErrorCode);
        }));
        it('can parse errors', () => {
            const error = lib_1.GitProcess.parseError('fatal: Authentication failed');
            expect(error).toBe(lib_1.GitError.SSHAuthenticationFailed);
        });
        it('can parse bad revision errors', () => {
            const error = lib_1.GitProcess.parseError("fatal: bad revision 'beta..origin/beta'");
            expect(error).toBe(lib_1.GitError.BadRevision);
        });
        it('can parse unrelated histories error', () => {
            const stderr = `fatal: refusing to merge unrelated histories`;
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.CannotMergeUnrelatedHistories);
        });
        it('can parse GH001 push file size error', () => {
            const stderr = `remote: error: GH001: Large files detected. You may want to try Git Large File Storage - https://git-lfs.github.com.
remote: error: Trace: 2bd2bfca1605d4e0847936332f1b6c07
remote: error: See http://git.io/iEPt8g for more information.
remote: error: File some-file.mp4 is 292.85 MB; this exceeds GitHub's file size limit of 100.00 MB
To https://github.com/shiftkey/too-large-repository.git
 ! [remote rejected] master -> master (pre-receive hook declined)
error: failed to push some refs to 'https://github.com/shiftkey/too-large-repository.git'`;
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.PushWithFileSizeExceedingLimit);
        });
        it('can parse GH002 branch name error', () => {
            const stderr = `remote: error: GH002: Sorry, branch or tag names consisting of 40 hex characters are not allowed.
remote: error: Invalid branch or tag name "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
To https://github.com/shiftkey/too-large-repository.git
 ! [remote rejected] aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa -> aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa (pre-receive hook declined)
error: failed to push some refs to 'https://github.com/shiftkey/too-large-repository.git'`;
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.HexBranchNameRejected);
        });
        it('can parse GH003 force push error', () => {
            const stderr = `remote: error: GH003: Sorry, force-pushing to my-cool-branch is not allowed.
To https://github.com/shiftkey/too-large-repository.git
 ! [remote rejected]  my-cool-branch ->  my-cool-branch (pre-receive hook declined)
error: failed to push some refs to 'https://github.com/shiftkey/too-large-repository.git'`;
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.ForcePushRejected);
        });
        it('can parse GH005 ref length error', () => {
            const stderr = `remote: error: GH005: Sorry, refs longer than 255 bytes are not allowed.
To https://github.com/shiftkey/too-large-repository.git
...`;
            // there's probably some output here missing but I couldn't trigger this locally
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.InvalidRefLength);
        });
        it('can parse GH006 protected branch push error', () => {
            const stderr = `remote: error: GH006: Protected branch update failed for refs/heads/master.
remote: error: At least one approved review is required
To https://github.com/shiftkey-tester/protected-branches.git
 ! [remote rejected] master -> master (protected branch hook declined)
error: failed to push some refs to 'https://github.com/shiftkey-tester/protected-branches.git'`;
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.ProtectedBranchRequiresReview);
        });
        it('can parse GH006 protected branch force push error', () => {
            const stderr = `remote: error: GH006: Protected branch update failed for refs/heads/master.
remote: error: Cannot force-push to a protected branch
To https://github.com/shiftkey/too-large-repository.git
 ! [remote rejected] master -> master (protected branch hook declined)
error: failed to push some refs to 'https://github.com/shiftkey/too-large-repository.git'`;
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.ProtectedBranchForcePush);
        });
        it('can parse GH006 protected branch delete error', () => {
            const stderr = `remote: error: GH006: Protected branch update failed for refs/heads/dupe.
remote: error: Cannot delete a protected branch
To https://github.com/tierninho-tester/trterdgdfgdf.git
  ! [remote rejected] dupe (protected branch hook declined)
error: failed to push some refs to 'https://github.com/tierninho-tester/trterdgdfgdf.git'`;
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.ProtectedBranchDeleteRejected);
        });
        it('can parse GH006 required status check error', () => {
            const stderr = `remote: error: GH006: Protected branch update failed for refs/heads/master.
remote: error: Required status check "continuous-integration/travis-ci" is expected.
To https://github.com/Raul6469/EclipseMaven.git
  ! [remote rejected] master -> master (protected branch hook declined)
error: failed to push some refs to 'https://github.com/Raul6469/EclipseMaven.git`;
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.ProtectedBranchRequiredStatus);
        });
        it('can parse GH007 push with private email error', () => {
            const stderr = `remote: error: GH007: Your push would publish a private email address.
remote: You can make your email public or disable this protection by visiting:
remote: http://github.com/settings/emails`;
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.PushWithPrivateEmail);
        });
        it('can parse LFS attribute does not match error', () => {
            const stderr = `The filter.lfs.clean attribute should be "git-lfs clean -- %f" but is "git lfs clean %f"`;
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.LFSAttributeDoesNotMatch);
        });
        it('can parse rename Branch error', () => {
            const stderr = `error: refname refs/heads/adding-renamefailed-error not found
      fatal: Branch rename failed`;
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.BranchRenameFailed);
        });
        it('can parse path does not exist error - neither on disk nor in the index', () => {
            const stderr = "fatal: path 'missing.txt' does not exist (neither on disk nor in the index).\n";
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.PathDoesNotExist);
        });
        it('can parse path does not exist error - in commitish', () => {
            const stderr = "fatal: path 'missing.txt' does not exist in 'HEAD'\n";
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.PathDoesNotExist);
        });
        it('can parse invalid object name error', () => {
            const stderr = "fatal: invalid object name 'HEAD'.\n";
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.InvalidObjectName);
        });
        it('can parse is outside repository error', () => {
            const stderr = "fatal: /missing.txt: '/missing.txt' is outside repository\n";
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.OutsideRepository);
        });
        it('can parse lock file exists error', () => {
            const stderr = `Unable to create  'path_to_repo/.git/index.lock: File exists.

Another git process seems to be running in this repository, e.g.
an editor opened by 'git commit'. Please make sure all processes
are terminated then try again. If it still fails, a git process
may have crashed in this repository earlier:
remove the file manually to continue.`;
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.LockFileAlreadyExists);
        });
        it('can parse the previous not found repository error', () => {
            const stderr = 'fatal: Not a git repository (or any of the parent directories): .git';
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.NotAGitRepository);
        });
        it('can parse the current found repository error', () => {
            const stderr = 'fatal: not a git repository (or any of the parent directories): .git';
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.NotAGitRepository);
        });
        it('can parse the no merge to abort error', () => {
            const stderr = 'fatal: There is no merge to abort (MERGE_HEAD missing).\n';
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.NoMergeToAbort);
        });
        it('can parse the pulling non-existent remote branch error', () => {
            const stderr = "Your configuration specifies to merge with the ref 'refs/heads/tierninho-patch-1'\nfrom the remote, but no such ref was fetched.\n";
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.NoExistingRemoteBranch);
        });
        it('can parse the local files overwritten error', () => {
            let stderr = 'error: Your local changes to the following files would be overwritten by checkout:\n';
            let error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.LocalChangesOverwritten);
            stderr =
                'error: The following untracked working tree files would be overwritten by checkout:\n';
            error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.LocalChangesOverwritten);
        });
        it('can parse the unresovled conflicts error', () => {
            const stderr = `2-simple-rebase-conflict/LICENSE.md: needs merge
You must edit all merge conflicts and then
mark them as resolved using git add`;
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.UnresolvedConflicts);
        });
        it('can parse the failed to sign data error within a rebase', () => {
            const stderr = `Rebasing (1/4)
      Rebasing (2/4)
      error: gpg failed to sign the data`;
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.GPGFailedToSignData);
        });
        it('can parse the could not resolve host error', () => {
            const stderr = `"Cloning into '/cloneablepath/'...\nfatal: unable to access 'https://github.com/Daniel-McCarthy/dugite.git/': Could not resolve host: github.com\n"`;
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.HostDown);
        });
        it('can parse an error when merging with local changes', () => __awaiter(this, void 0, void 0, function* () {
            const repoPath = yield helpers_1.initialize('desktop-merge-with-local-changes');
            const readmePath = path.join(repoPath, 'Readme.md');
            // Add a commit to the default branch.
            fs.writeFileSync(readmePath, '# README', { encoding: 'utf8' });
            yield lib_1.GitProcess.exec(['add', '.'], repoPath);
            yield lib_1.GitProcess.exec(['commit', '-m', '"added README"'], repoPath);
            // Create another branch and add commit.
            yield lib_1.GitProcess.exec(['checkout', '-b', 'some-other-branch'], repoPath);
            fs.writeFileSync(readmePath, '# README modified in branch', { encoding: 'utf8' });
            yield lib_1.GitProcess.exec(['add', '.'], repoPath);
            yield lib_1.GitProcess.exec(['commit', '-m', '"updated README"'], repoPath);
            // Go back to the default branch and modify a file.
            yield lib_1.GitProcess.exec(['checkout', '-'], repoPath);
            fs.writeFileSync(readmePath, '# README modified in master', { encoding: 'utf8' });
            // Execute a merge.
            const result = yield lib_1.GitProcess.exec(['merge', 'some-other-branch'], repoPath);
            expect(result).toHaveGitError(lib_1.GitError.MergeWithLocalChanges);
        }));
        it('can parse an error when renasing with local changes', () => __awaiter(this, void 0, void 0, function* () {
            const repoPath = yield helpers_1.initialize('desktop-merge-with-local-changes');
            const readmePath = path.join(repoPath, 'Readme.md');
            // Add a commit to the default branch.
            fs.writeFileSync(readmePath, '# README', { encoding: 'utf8' });
            yield lib_1.GitProcess.exec(['add', '.'], repoPath);
            yield lib_1.GitProcess.exec(['commit', '-m', '"added README"'], repoPath);
            // Create another branch and add commit.
            yield lib_1.GitProcess.exec(['checkout', '-b', 'some-other-branch'], repoPath);
            fs.writeFileSync(readmePath, '# README modified in branch', { encoding: 'utf8' });
            yield lib_1.GitProcess.exec(['add', '.'], repoPath);
            yield lib_1.GitProcess.exec(['commit', '-m', '"updated README"'], repoPath);
            // Go back to the default branch and modify a file.
            yield lib_1.GitProcess.exec(['checkout', '-'], repoPath);
            fs.writeFileSync(readmePath, '# README modified in master', { encoding: 'utf8' });
            // Execute a rebase.
            const result = yield lib_1.GitProcess.exec(['rebase', 'some-other-branch'], repoPath);
            expect(result).toHaveGitError(lib_1.GitError.RebaseWithLocalChanges);
        }));
        it('can parse an error when pulling with merge with local changes', () => __awaiter(this, void 0, void 0, function* () {
            const { path: repoPath, remote: remoteRepositoryPath } = yield helpers_1.initializeWithRemote('desktop-pullrebase-with-local-changes', null);
            const { path: forkRepoPath } = yield helpers_1.initializeWithRemote('desktop-pullrebase-with-local-changes-fork', remoteRepositoryPath);
            yield lib_1.GitProcess.exec(['config', 'pull.rebase', 'false'], forkRepoPath);
            const readmePath = path.join(repoPath, 'Readme.md');
            const readmePathInFork = path.join(forkRepoPath, 'Readme.md');
            // Add a commit to the default branch.
            fs.writeFileSync(readmePath, '# README', { encoding: 'utf8' });
            yield lib_1.GitProcess.exec(['add', '.'], repoPath);
            yield lib_1.GitProcess.exec(['commit', '-m', '"added README"'], repoPath);
            // Push the commit and fetch it from the fork.
            yield lib_1.GitProcess.exec(['push', 'origin', 'HEAD', '-u'], repoPath);
            yield lib_1.GitProcess.exec(['pull', 'origin', 'HEAD'], forkRepoPath);
            // Add another commit and push it
            fs.writeFileSync(readmePath, '# README modified from upstream', { encoding: 'utf8' });
            yield lib_1.GitProcess.exec(['add', '.'], repoPath);
            yield lib_1.GitProcess.exec(['commit', '-m', '"updated README"'], repoPath);
            yield lib_1.GitProcess.exec(['push', 'origin'], repoPath);
            // Modify locally the Readme file in the fork.
            fs.writeFileSync(readmePathInFork, '# README modified from fork', { encoding: 'utf8' });
            // Pull from the fork
            const result = yield lib_1.GitProcess.exec(['pull', 'origin', 'HEAD'], forkRepoPath);
            expect(result).toHaveGitError(lib_1.GitError.MergeWithLocalChanges);
        }));
        it('can parse an error when pulling with rebase with local changes', () => __awaiter(this, void 0, void 0, function* () {
            const { path: repoPath, remote: remoteRepositoryPath } = yield helpers_1.initializeWithRemote('desktop-pullrebase-with-local-changes', null);
            const { path: forkRepoPath } = yield helpers_1.initializeWithRemote('desktop-pullrebase-with-local-changes-fork', remoteRepositoryPath);
            yield lib_1.GitProcess.exec(['config', 'pull.rebase', 'true'], forkRepoPath);
            const readmePath = path.join(repoPath, 'Readme.md');
            const readmePathInFork = path.join(forkRepoPath, 'Readme.md');
            // Add a commit to the default branch.
            fs.writeFileSync(readmePath, '# README', { encoding: 'utf8' });
            yield lib_1.GitProcess.exec(['add', '.'], repoPath);
            yield lib_1.GitProcess.exec(['commit', '-m', '"added README"'], repoPath);
            // Push the commit and fetch it from the fork.
            yield lib_1.GitProcess.exec(['push', 'origin', 'HEAD', '-u'], repoPath);
            yield lib_1.GitProcess.exec(['pull', 'origin', 'HEAD'], forkRepoPath);
            // Add another commit and push it
            fs.writeFileSync(readmePath, '# README modified from upstream', { encoding: 'utf8' });
            yield lib_1.GitProcess.exec(['add', '.'], repoPath);
            yield lib_1.GitProcess.exec(['commit', '-m', '"updated README"'], repoPath);
            yield lib_1.GitProcess.exec(['push', 'origin'], repoPath);
            // Modify locally the Readme file in the fork.
            fs.writeFileSync(readmePathInFork, '# README modified from fork', { encoding: 'utf8' });
            // Pull from the fork
            const result = yield lib_1.GitProcess.exec(['pull', 'origin', 'HEAD'], forkRepoPath);
            expect(result).toHaveGitError(lib_1.GitError.RebaseWithLocalChanges);
        }));
        it('can parse an error when there is a conflict while merging', () => __awaiter(this, void 0, void 0, function* () {
            const repoPath = yield helpers_1.initialize('desktop-pullrebase-with-local-changes');
            const readmePath = path.join(repoPath, 'Readme.md');
            // Create a commit on the default branch.
            fs.writeFileSync(readmePath, '# README', { encoding: 'utf8' });
            yield lib_1.GitProcess.exec(['add', '.'], repoPath);
            yield lib_1.GitProcess.exec(['commit', '-m', '"initial commit"'], repoPath);
            // Create a branch and add another commit.
            yield lib_1.GitProcess.exec(['checkout', '-b', 'my-branch'], repoPath);
            fs.writeFileSync(readmePath, '# README from my-branch', { encoding: 'utf8' });
            yield lib_1.GitProcess.exec(['add', '.'], repoPath);
            yield lib_1.GitProcess.exec(['commit', '-m', '"modify README in my-branch"'], repoPath);
            // Go back to the default branch and add a commit that conflicts.
            yield lib_1.GitProcess.exec(['checkout', '-'], repoPath);
            fs.writeFileSync(readmePath, '# README from default', { encoding: 'utf8' });
            yield lib_1.GitProcess.exec(['add', '.'], repoPath);
            yield lib_1.GitProcess.exec(['commit', '-m', '"modifiy README in default branch"'], repoPath);
            // Try to merge the branch.
            const result = yield lib_1.GitProcess.exec(['merge', 'my-branch'], repoPath);
            expect(result).toHaveGitError(lib_1.GitError.MergeConflicts);
        }));
        it('can parse an error when there is a conflict while rebasing', () => __awaiter(this, void 0, void 0, function* () {
            const repoPath = yield helpers_1.initialize('desktop-pullrebase-with-local-changes');
            const readmePath = path.join(repoPath, 'Readme.md');
            // Create a commit on the default branch.
            fs.writeFileSync(readmePath, '# README', { encoding: 'utf8' });
            yield lib_1.GitProcess.exec(['add', '.'], repoPath);
            yield lib_1.GitProcess.exec(['commit', '-m', '"initial commit"'], repoPath);
            // Create a branch and add another commit.
            yield lib_1.GitProcess.exec(['checkout', '-b', 'my-branch'], repoPath);
            fs.writeFileSync(readmePath, '# README from my-branch', { encoding: 'utf8' });
            yield lib_1.GitProcess.exec(['add', '.'], repoPath);
            yield lib_1.GitProcess.exec(['commit', '-m', '"modify README in my-branch"'], repoPath);
            // Go back to the default branch and add a commit that conflicts.
            yield lib_1.GitProcess.exec(['checkout', '-'], repoPath);
            fs.writeFileSync(readmePath, '# README from default', { encoding: 'utf8' });
            yield lib_1.GitProcess.exec(['add', '.'], repoPath);
            yield lib_1.GitProcess.exec(['commit', '-m', '"modifiy README in default branch"'], repoPath);
            // Try to merge the branch.
            const result = yield lib_1.GitProcess.exec(['rebase', 'my-branch'], repoPath);
            expect(result).toHaveGitError(lib_1.GitError.RebaseConflicts);
        }));
        it('can parse conflict modify delete error', () => {
            const stderr = 'CONFLICT (modify/delete): a/path/to/a/file.md deleted in HEAD and modified in 1234567 (A commit message). Version 1234567 (A commit message) of a/path/to/a/file.md left in tree.';
            const error = lib_1.GitProcess.parseError(stderr);
            expect(error).toBe(lib_1.GitError.ConflictModifyDeletedInBranch);
        });
    });
});
//# sourceMappingURL=git-process-test.js.map