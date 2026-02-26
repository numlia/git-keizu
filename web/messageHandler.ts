import type {
  GitCommitDetails,
  GitCommitNode,
  GitFileChange,
  GitRepoSet,
  ResponseMessage
} from "../src/types";
import { showErrorDialog } from "./dialogs";
import { generateGitFileTree } from "./fileTree";
import { refreshGraphOrDisplayError } from "./utils";

export interface GitGraphViewAPI {
  hideCommitDetails(): void;
  showCommitDetails(commitDetails: GitCommitDetails, fileTree: GitFolder): void;
  showCompareResult(fileChanges: GitFileChange[], fromHash: string, toHash: string): void;
  loadAvatar(email: string, image: string): void;
  loadBranches(branches: string[], head: string | null, hard: boolean, isRepo: boolean): void;
  loadCommits(
    commits: GitCommitNode[],
    head: string | null,
    moreAvailable: boolean,
    hard: boolean
  ): void;
  loadRepos(repos: GitRepoSet, lastActiveRepo: string | null): void;
  refresh(hard: boolean): void;
}

export function handleMessage(msg: ResponseMessage, gitGraph: GitGraphViewAPI): void {
  switch (msg.command) {
    case "addTag":
      refreshOrError(gitGraph, msg.status, "Unable to Add Tag");
      break;
    case "applyStash":
      refreshOrError(gitGraph, msg.status, "Unable to Apply Stash");
      break;
    case "branchFromStash":
      refreshOrError(gitGraph, msg.status, "Unable to Create Branch from Stash");
      break;
    case "checkoutBranch":
      refreshOrError(gitGraph, msg.status, "Unable to Checkout Branch");
      break;
    case "checkoutCommit":
      refreshOrError(gitGraph, msg.status, "Unable to Checkout Commit");
      break;
    case "cherrypickCommit":
      refreshOrError(gitGraph, msg.status, "Unable to Cherry Pick Commit");
      break;
    case "cleanUntrackedFiles":
      refreshOrError(gitGraph, msg.status, "Unable to Clean Untracked Files");
      break;
    case "commitDetails":
      if (msg.commitDetails === null) {
        gitGraph.hideCommitDetails();
        showErrorDialog("Unable to load commit details", null, null);
      } else {
        gitGraph.showCommitDetails(
          msg.commitDetails,
          generateGitFileTree(msg.commitDetails.fileChanges)
        );
      }
      break;
    case "compareCommits":
      if (msg.fileChanges === null) {
        showErrorDialog("Unable to load commit comparison", null, null);
      } else {
        gitGraph.showCompareResult(msg.fileChanges, msg.fromHash, msg.toHash);
      }
      break;
    case "copyToClipboard":
      if (msg.success === false)
        showErrorDialog(`Unable to Copy ${msg.type} to Clipboard`, null, null);
      break;
    case "createBranch":
      refreshOrError(gitGraph, msg.status, "Unable to Create Branch");
      break;
    case "deleteBranch":
      refreshOrError(gitGraph, msg.status, "Unable to Delete Branch");
      break;
    case "deleteTag":
      refreshOrError(gitGraph, msg.status, "Unable to Delete Tag");
      break;
    case "dropStash":
      refreshOrError(gitGraph, msg.status, "Unable to Drop Stash");
      break;
    case "fetch":
      refreshOrError(gitGraph, msg.status, "Unable to Fetch");
      break;
    case "fetchAvatar":
      gitGraph.loadAvatar(msg.email, msg.image);
      break;
    case "loadBranches":
      gitGraph.loadBranches(msg.branches, msg.head, msg.hard, msg.isRepo);
      break;
    case "loadCommits":
      gitGraph.loadCommits(msg.commits, msg.head, msg.moreCommitsAvailable, msg.hard);
      break;
    case "loadRepos":
      gitGraph.loadRepos(msg.repos, msg.lastActiveRepo);
      break;
    case "mergeBranch":
      refreshOrError(gitGraph, msg.status, "Unable to Merge Branch");
      break;
    case "mergeCommit":
      refreshOrError(gitGraph, msg.status, "Unable to Merge Commit");
      break;
    case "popStash":
      refreshOrError(gitGraph, msg.status, "Unable to Pop Stash");
      break;
    case "pull":
      refreshOrError(gitGraph, msg.status, "Unable to Pull");
      break;
    case "push":
      refreshOrError(gitGraph, msg.status, "Unable to Push");
      break;
    case "pushStash":
      refreshOrError(gitGraph, msg.status, "Unable to Stash Changes");
      break;
    case "pushTag":
      refreshOrError(gitGraph, msg.status, "Unable to Push Tag");
      break;
    case "renameBranch":
      refreshOrError(gitGraph, msg.status, "Unable to Rename Branch");
      break;
    case "refresh":
      gitGraph.refresh(false);
      break;
    case "resetToCommit":
      refreshOrError(gitGraph, msg.status, "Unable to Reset to Commit");
      break;
    case "resetUncommitted":
      refreshOrError(gitGraph, msg.status, "Unable to Reset Uncommitted Changes");
      break;
    case "revertCommit":
      refreshOrError(gitGraph, msg.status, "Unable to Revert Commit");
      break;
    case "viewDiff":
      if (msg.success === false) showErrorDialog("Unable to view diff of file", null, null);
      break;
  }
}

function refreshOrError(gitGraph: GitGraphViewAPI, status: string | null, errorMessage: string) {
  refreshGraphOrDisplayError(status, errorMessage, () => gitGraph.refresh(false), showErrorDialog);
}
