/* Git Interfaces / Types */

export interface GitCommitStash {
  selector: string;
  baseHash: string;
  untrackedFilesHash: string | null;
}

export interface GitStash {
  hash: string;
  selector: string;
  baseHash: string;
  untrackedFilesHash: string | null;
  author: string;
  email: string;
  date: number;
  message: string;
}

export interface GitCommitNode {
  hash: string;
  parentHashes: string[];
  author: string;
  email: string;
  date: number;
  message: string;
  refs: GitRef[];
  stash: GitCommitStash | null;
}

export interface GitCommit {
  hash: string;
  parentHashes: string[];
  author: string;
  email: string;
  date: number;
  message: string;
}

export interface GitCommitDetails {
  hash: string;
  parents: string[];
  author: string;
  email: string;
  date: number;
  committer: string;
  body: string;
  fileChanges: GitFileChange[];
}

export interface GitRef {
  hash: string;
  name: string;
  type: "head" | "tag" | "remote";
}

export interface GitRefData {
  head: string | null;
  refs: GitRef[];
}

export type GitRepoSet = { [repo: string]: GitRepoState };
export interface GitRepoState {
  columnWidths: number[] | null;
}

export interface GitUnsavedChanges {
  branch: string;
  changes: number;
}

export interface GitGraphViewState {
  autoCenterCommitDetailsView: boolean;
  dateFormat: DateFormat;
  fetchAvatars: boolean;
  graphColours: string[];
  graphStyle: GraphStyle;
  initialLoadCommits: number;
  lastActiveRepo: string | null;
  loadMoreCommits: number;
  repos: GitRepoSet;
  showCurrentBranchByDefault: boolean;
}

export interface GitFileChange {
  oldFilePath: string;
  newFilePath: string;
  type: GitFileChangeType;
  additions: number | null;
  deletions: number | null;
}

export interface Avatar {
  image: string;
  timestamp: number;
  identicon: boolean;
}
export type AvatarCache = { [email: string]: Avatar };

export type DateFormat = "Date & Time" | "Date Only" | "Relative";
export type DateType = "Author Date" | "Commit Date";
export type GraphStyle = "rounded" | "angular";
export type TabIconColourTheme = "colour" | "grey";
export type GitCommandStatus = string | null;
export type GitResetMode = "soft" | "mixed" | "hard";
export type GitFileChangeType = "A" | "M" | "D" | "R";

/* Named Constants */

export const UNCOMMITTED_CHANGES_HASH = "*";
export const VALID_UNCOMMITTED_RESET_MODES: ReadonlySet<string> = new Set(["mixed", "hard"]);

/* Request / Response Messages */

export interface RequestAddTag {
  command: "addTag";
  repo: string;
  commitHash: string;
  tagName: string;
  lightweight: boolean;
  message: string;
}
export interface ResponseAddTag {
  command: "addTag";
  status: GitCommandStatus;
}

export interface RequestCheckoutBranch {
  command: "checkoutBranch";
  repo: string;
  branchName: string;
  remoteBranch: string | null;
}
export interface ResponseCheckoutBranch {
  command: "checkoutBranch";
  status: GitCommandStatus;
}

export interface RequestCheckoutCommit {
  command: "checkoutCommit";
  repo: string;
  commitHash: string;
}
export interface ResponseCheckoutCommit {
  command: "checkoutCommit";
  status: GitCommandStatus;
}

export interface RequestCherrypickCommit {
  command: "cherrypickCommit";
  repo: string;
  commitHash: string;
  parentIndex: number;
}
export interface ResponseCherrypickCommit {
  command: "cherrypickCommit";
  status: GitCommandStatus;
}

export interface RequestCommitDetails {
  command: "commitDetails";
  repo: string;
  commitHash: string;
}
export interface ResponseCommitDetails {
  command: "commitDetails";
  commitDetails: GitCommitDetails | null;
}

export interface RequestCopyToClipboard {
  command: "copyToClipboard";
  type: string;
  data: string;
}
export interface ResponseCopyToClipboard {
  command: "copyToClipboard";
  type: string;
  success: boolean;
}

export interface RequestCreateBranch {
  command: "createBranch";
  repo: string;
  commitHash: string;
  branchName: string;
}
export interface ResponseCreateBranch {
  command: "createBranch";
  status: GitCommandStatus;
}

export interface RequestDeleteBranch {
  command: "deleteBranch";
  repo: string;
  branchName: string;
  forceDelete: boolean;
}
export interface ResponseDeleteBranch {
  command: "deleteBranch";
  status: GitCommandStatus;
}

export interface RequestDeleteTag {
  command: "deleteTag";
  repo: string;
  tagName: string;
}
export interface ResponseDeleteTag {
  command: "deleteTag";
  status: GitCommandStatus;
}

export interface RequestFetchAvatar {
  command: "fetchAvatar";
  repo: string;
  email: string;
  commits: string[];
}
export interface ResponseFetchAvatar {
  command: "fetchAvatar";
  email: string;
  image: string;
}

export interface RequestLoadBranches {
  command: "loadBranches";
  repo: string;
  showRemoteBranches: boolean;
  hard: boolean;
}
export interface ResponseLoadBranches {
  command: "loadBranches";
  branches: string[];
  head: string | null;
  hard: boolean;
  isRepo: boolean;
}

export interface RequestLoadCommits {
  command: "loadCommits";
  repo: string;
  branchName: string;
  maxCommits: number;
  showRemoteBranches: boolean;
  hard: boolean;
}
export interface ResponseLoadCommits {
  command: "loadCommits";
  commits: GitCommitNode[];
  head: string | null;
  moreCommitsAvailable: boolean;
  hard: boolean;
}

export interface RequestLoadRepos {
  command: "loadRepos";
  check: boolean;
}
export interface ResponseLoadRepos {
  command: "loadRepos";
  repos: GitRepoSet;
  lastActiveRepo: string | null;
}

export interface RequestMergeBranch {
  command: "mergeBranch";
  repo: string;
  branchName: string;
  createNewCommit: boolean;
}
export interface ResponseMergeBranch {
  command: "mergeBranch";
  status: GitCommandStatus;
}

export interface RequestMergeCommit {
  command: "mergeCommit";
  repo: string;
  commitHash: string;
  createNewCommit: boolean;
}
export interface ResponseMergeCommit {
  command: "mergeCommit";
  status: GitCommandStatus;
}

export interface RequestPushTag {
  command: "pushTag";
  repo: string;
  tagName: string;
}
export interface ResponsePushTag {
  command: "pushTag";
  status: GitCommandStatus;
}

export interface ResponseRefresh {
  command: "refresh";
}

export interface RequestRenameBranch {
  command: "renameBranch";
  repo: string;
  oldName: string;
  newName: string;
}
export interface ResponseRenameBranch {
  command: "renameBranch";
  status: GitCommandStatus;
}

export interface RequestResetToCommit {
  command: "resetToCommit";
  repo: string;
  commitHash: string;
  resetMode: GitResetMode;
}
export interface ResponseResetToCommit {
  command: "resetToCommit";
  status: GitCommandStatus;
}

export interface RequestRevertCommit {
  command: "revertCommit";
  repo: string;
  commitHash: string;
  parentIndex: number;
}
export interface ResponseRevertCommit {
  command: "revertCommit";
  status: GitCommandStatus;
}

export interface RequestSaveRepoState {
  command: "saveRepoState";
  repo: string;
  state: GitRepoState;
}

export interface RequestCompareCommits {
  command: "compareCommits";
  repo: string;
  fromHash: string;
  toHash: string;
}
export interface ResponseCompareCommits {
  command: "compareCommits";
  fileChanges: GitFileChange[] | null;
  fromHash: string;
  toHash: string;
}

export interface RequestViewDiff {
  command: "viewDiff";
  repo: string;
  commitHash: string;
  oldFilePath: string;
  newFilePath: string;
  type: GitFileChangeType;
  compareWithHash?: string;
}
export interface ResponseViewDiff {
  command: "viewDiff";
  success: boolean;
}

export interface RequestApplyStash {
  command: "applyStash";
  repo: string;
  selector: string;
  reinstateIndex: boolean;
}
export interface ResponseApplyStash {
  command: "applyStash";
  status: GitCommandStatus;
}

export interface RequestPopStash {
  command: "popStash";
  repo: string;
  selector: string;
  reinstateIndex: boolean;
}
export interface ResponsePopStash {
  command: "popStash";
  status: GitCommandStatus;
}

export interface RequestDropStash {
  command: "dropStash";
  repo: string;
  selector: string;
}
export interface ResponseDropStash {
  command: "dropStash";
  status: GitCommandStatus;
}

export interface RequestBranchFromStash {
  command: "branchFromStash";
  repo: string;
  selector: string;
  branchName: string;
}
export interface ResponseBranchFromStash {
  command: "branchFromStash";
  status: GitCommandStatus;
}

export interface RequestPushStash {
  command: "pushStash";
  repo: string;
  message: string;
  includeUntracked: boolean;
}
export interface ResponsePushStash {
  command: "pushStash";
  status: GitCommandStatus;
}

export interface RequestFetch {
  command: "fetch";
  repo: string;
}
export interface ResponseFetch {
  command: "fetch";
  status: GitCommandStatus;
}

export interface RequestResetUncommitted {
  command: "resetUncommitted";
  repo: string;
  mode: string;
}
export interface ResponseResetUncommitted {
  command: "resetUncommitted";
  status: GitCommandStatus;
}

export interface RequestCleanUntrackedFiles {
  command: "cleanUntrackedFiles";
  repo: string;
  directories: boolean;
}
export interface ResponseCleanUntrackedFiles {
  command: "cleanUntrackedFiles";
  status: GitCommandStatus;
}

export type RequestMessage =
  | RequestAddTag
  | RequestApplyStash
  | RequestBranchFromStash
  | RequestCheckoutBranch
  | RequestCheckoutCommit
  | RequestCherrypickCommit
  | RequestCleanUntrackedFiles
  | RequestCommitDetails
  | RequestCompareCommits
  | RequestCopyToClipboard
  | RequestCreateBranch
  | RequestDeleteBranch
  | RequestDeleteTag
  | RequestDropStash
  | RequestFetch
  | RequestFetchAvatar
  | RequestLoadBranches
  | RequestLoadCommits
  | RequestLoadRepos
  | RequestMergeBranch
  | RequestMergeCommit
  | RequestPopStash
  | RequestPushStash
  | RequestPushTag
  | RequestRenameBranch
  | RequestResetToCommit
  | RequestResetUncommitted
  | RequestRevertCommit
  | RequestSaveRepoState
  | RequestViewDiff;

export type ResponseMessage =
  | ResponseAddTag
  | ResponseApplyStash
  | ResponseBranchFromStash
  | ResponseCheckoutBranch
  | ResponseCheckoutCommit
  | ResponseCherrypickCommit
  | ResponseCleanUntrackedFiles
  | ResponseCommitDetails
  | ResponseCompareCommits
  | ResponseCopyToClipboard
  | ResponseCreateBranch
  | ResponseDeleteBranch
  | ResponseDeleteTag
  | ResponseDropStash
  | ResponseFetch
  | ResponseFetchAvatar
  | ResponseLoadBranches
  | ResponseLoadCommits
  | ResponseLoadRepos
  | ResponseMergeBranch
  | ResponseMergeCommit
  | ResponsePopStash
  | ResponsePushStash
  | ResponsePushTag
  | ResponseRefresh
  | ResponseRenameBranch
  | ResponseResetToCommit
  | ResponseResetUncommitted
  | ResponseRevertCommit
  | ResponseViewDiff;
