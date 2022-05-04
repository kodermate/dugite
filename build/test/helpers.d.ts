/// <reference types="jest" />
import { IGitResult, GitError } from '../lib';
export declare const gitVersion = "2.35.3";
export declare const gitForWindowsVersion = "2.35.3.windows.1";
export declare const gitLfsVersion = "3.1.2";
export declare function initialize(repositoryName: string, defaultBranch?: string): Promise<string>;
/**
 * Initialize a repository with a remote pointing to a local bare repository.
 * If the remotePath is not specified, the remote repository will get automatically created.
 *
 * @param repositoryName    The name of the repository to create
 * @param remotePath        The path of the remote reposiry (when null a new repository will get created)
 */
export declare function initializeWithRemote(repositoryName: string, remotePath: string | null): Promise<{
    path: string;
    remote: string;
}>;
export declare function verify(result: IGitResult, callback: (result: IGitResult) => void): void;
declare global {
    namespace jest {
        interface Matchers<R = IGitResult> {
            toHaveGitError(result: GitError): CustomMatcherResult;
        }
    }
}
