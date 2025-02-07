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
const fs = require("fs");
const process_1 = require("process");
const child_process_1 = require("child_process");
const errors_1 = require("./errors");
const git_environment_1 = require("./git-environment");
class GitProcess {
    static pathExists(path) {
        try {
            fs.accessSync(path, fs.F_OK);
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Execute a command and interact with the process outputs directly.
     *
     * The returned promise will reject when the git executable fails to launch,
     * in which case the thrown Error will have a string `code` property. See
     * `errors.ts` for some of the known error codes.
     */
    static spawn(args, path, options) {
        let customEnv = {};
        if (options && options.env) {
            customEnv = options.env;
        }
        const { env, gitLocation } = git_environment_1.setupEnvironment(customEnv);
        const spawnArgs = {
            env,
            cwd: path
        };
        const spawnedProcess = child_process_1.spawn(gitLocation, args, spawnArgs);
        ignoreClosedInputStream(spawnedProcess);
        return spawnedProcess;
    }
    /**
     * Execute a command and read the output using the embedded Git environment.
     *
     * The returned promise will reject when the git executable fails to launch,
     * in which case the thrown Error will have a string `code` property. See
     * `errors.ts` for some of the known error codes.
     *
     * See the result's `stderr` and `exitCode` for any potential git error
     * information.
     */
    static exec(args, path, options) {
        return this.execTask(args, path, options).result;
    }
    /**
     * Execute a command and read the output using the embedded Git environment.
     *
     * The returned GitTask will will contain `result`, `setPid`, `cancel`
     * `result` will be a promise, which will reject when the git
     * executable fails to launch, in which case the thrown Error will
     * have a string `code` property. See `errors.ts` for some of the
     * known error codes.
     * See the result's `stderr` and `exitCode` for any potential git error
     * information.
     *
     * As for, `setPid(pid)`, this is to set the PID
     *
     * And `cancel()` will try to cancel the git process
     */
    static execTask(args, path, options) {
        let pidResolve;
        const pidPromise = new Promise(function (resolve) {
            pidResolve = resolve;
        });
        let result = new GitTask(new Promise(function (resolve, reject) {
            let customEnv = {};
            if (options && options.env) {
                customEnv = options.env;
            }
            const { env, gitLocation } = git_environment_1.setupEnvironment(customEnv);
            // Explicitly annotate opts since typescript is unable to infer the correct
            // signature for execFile when options is passed as an opaque hash. The type
            // definition for execFile currently infers based on the encoding parameter
            // which could change between declaration time and being passed to execFile.
            // See https://git.io/vixyQ
            const execOptions = {
                cwd: path,
                encoding: 'utf8',
                maxBuffer: options ? options.maxBuffer : 10 * 1024 * 1024,
                env
            };
            const spawnedProcess = child_process_1.execFile(gitLocation, args, execOptions, function (err, stdout, stderr) {
                result.updateProcessEnded();
                if (!err) {
                    resolve({ stdout, stderr, exitCode: 0 });
                    return;
                }
                const errWithCode = err;
                let code = errWithCode.code;
                // If the error's code is a string then it means the code isn't the
                // process's exit code but rather an error coming from Node's bowels,
                // e.g., ENOENT.
                if (typeof code === 'string') {
                    if (code === 'ENOENT') {
                        let message = err.message;
                        if (GitProcess.pathExists(path) === false) {
                            message = 'Unable to find path to repository on disk.';
                            code = errors_1.RepositoryDoesNotExistErrorCode;
                        }
                        else {
                            message = `Git could not be found at the expected path: '${gitLocation}'. This might be a problem with how the application is packaged, so confirm this folder hasn't been removed when packaging.`;
                            code = errors_1.GitNotFoundErrorCode;
                        }
                        const error = new Error(message);
                        error.name = err.name;
                        error.code = code;
                        reject(error);
                    }
                    else {
                        reject(err);
                    }
                    return;
                }
                if (typeof code === 'number') {
                    resolve({ stdout, stderr, exitCode: code });
                    return;
                }
                // Git has returned an output that couldn't fit in the specified buffer
                // as we don't know how many bytes it requires, rethrow the error with
                // details about what it was previously set to...
                if (err.message === 'stdout maxBuffer exceeded') {
                    reject(new Error(`The output from the command could not fit into the allocated stdout buffer. Set options.maxBuffer to a larger value than ${execOptions.maxBuffer} bytes`));
                }
                else {
                    reject(err);
                }
            });
            pidResolve(spawnedProcess.pid);
            ignoreClosedInputStream(spawnedProcess);
            if (options && options.stdin !== undefined) {
                // See https://github.com/nodejs/node/blob/7b5ffa46fe4d2868c1662694da06eb55ec744bde/test/parallel/test-stdin-pipe-large.js
                spawnedProcess.stdin.end(options.stdin, options.stdinEncoding);
            }
            if (options && options.processCallback) {
                options.processCallback(spawnedProcess);
            }
        }), pidPromise);
        return result;
    }
    /** Try to parse an error type from stderr. */
    static parseError(stderr) {
        for (const [regex, error] of Object.entries(errors_1.GitErrorRegexes)) {
            if (stderr.match(regex)) {
                return error;
            }
        }
        return null;
    }
}
exports.GitProcess = GitProcess;
/**
 * Prevent errors originating from the stdin stream related
 * to the child process closing the pipe from bubbling up and
 * causing an unhandled exception when no error handler is
 * attached to the input stream.
 *
 * The common scenario where this happens is if the consumer
 * is writing data to the stdin stream of a child process and
 * the child process for one reason or another decides to either
 * terminate or simply close its standard input. Imagine this
 * scenario
 *
 *  cat /dev/zero | head -c 1
 *
 * The 'head' command would close its standard input (by terminating)
 * the moment it has read one byte. In the case of Git this could
 * happen if you for example pass badly formed input to apply-patch.
 *
 * Since consumers of dugite using the `exec` api are unable to get
 * a hold of the stream until after we've written data to it they're
 * unable to fix it themselves so we'll just go ahead and ignore the
 * error for them. By supressing the stream error we can pick up on
 * the real error when the process exits when we parse the exit code
 * and the standard error.
 *
 * See https://github.com/desktop/desktop/pull/4027#issuecomment-366213276
 */
function ignoreClosedInputStream(process) {
    // If Node fails to spawn due to a runtime error (EACCESS, EAGAIN, etc)
    // it will not setup the stdio streams, see
    // https://github.com/nodejs/node/blob/v10.16.0/lib/internal/child_process.js#L342-L354
    // The error itself will be emitted asynchronously but we're still in
    // the synchronous path so if we attempts to call `.on` on `.stdin`
    // (which is undefined) that error would be thrown before the underlying
    // error.
    if (!process.stdin) {
        return;
    }
    process.stdin.on('error', err => {
        const code = err.code;
        // Is the error one that we'd expect from the input stream being
        // closed, i.e. EPIPE on macOS and EOF on Windows. We've also
        // seen ECONNRESET failures on Linux hosts so let's throw that in
        // there for good measure.
        if (code === 'EPIPE' || code === 'EOF' || code === 'ECONNRESET') {
            return;
        }
        // Nope, this is something else. Are there any other error listeners
        // attached than us? If not we'll have to mimic the behavior of
        // EventEmitter.
        //
        // See https://nodejs.org/api/errors.html#errors_error_propagation_and_interception
        //
        // "For all EventEmitter objects, if an 'error' event handler is not
        //  provided, the error will be thrown"
        if (process.stdin.listeners('error').length <= 1) {
            throw err;
        }
    });
}
var GitTaskCancelResult;
(function (GitTaskCancelResult) {
    GitTaskCancelResult[GitTaskCancelResult["successfulCancel"] = 0] = "successfulCancel";
    GitTaskCancelResult[GitTaskCancelResult["processAlreadyEnded"] = 1] = "processAlreadyEnded";
    GitTaskCancelResult[GitTaskCancelResult["noProcessIdDefined"] = 2] = "noProcessIdDefined";
    GitTaskCancelResult[GitTaskCancelResult["failedToCancel"] = 3] = "failedToCancel";
})(GitTaskCancelResult = exports.GitTaskCancelResult || (exports.GitTaskCancelResult = {}));
class GitTask {
    constructor(result, pid) {
        this.result = result;
        this.pid = pid;
        this.processEnded = false;
    }
    updateProcessEnded() {
        this.processEnded = true;
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.processEnded) {
                return GitTaskCancelResult.processAlreadyEnded;
            }
            const pid = yield this.pid;
            if (pid === undefined) {
                return GitTaskCancelResult.noProcessIdDefined;
            }
            try {
                process_1.kill(pid);
                return GitTaskCancelResult.successfulCancel;
            }
            catch (e) { }
            return GitTaskCancelResult.failedToCancel;
        });
    }
}
//# sourceMappingURL=git-process.js.map