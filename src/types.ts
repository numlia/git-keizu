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
  committerEmail: string;
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
  commitOrdering?: RepoCommitOrdering;
  fileViewType?: "tree" | "list";
}

export interface GitUnsavedChanges {
  branch: string;
  changes: number;
}

export interface KeybindingConfig {
  find: string | null;
  refresh: string | null;
  scrollToHead: string | null;
  scrollToStash: string | null;
}

export interface MuteCommitsConfig {
  readonly mergeCommits: boolean;
  readonly commitsNotAncestorsOfHead: boolean;
}

export interface DialogDefaults {
  readonly merge: {
    readonly noFastForward: boolean;
    readonly squashCommits: boolean;
    readonly noCommit: boolean;
  };
  readonly cherryPick: {
    readonly recordOrigin: boolean;
    readonly noCommit: boolean;
  };
  readonly stashUncommittedChanges: {
    readonly includeUntracked: boolean;
  };
  readonly createWorktree: {
    readonly openTerminal: boolean;
  };
  readonly removeWorktree: {
    readonly deleteBranch: boolean;
  };
}

export interface GitKeizuViewState {
  commitOrdering: CommitOrdering;
  dateFormat: DateFormat;
  dialogDefaults: DialogDefaults;
  fetchAvatars: boolean;
  graphColours: string[];
  graphStyle: GraphStyle;
  initialLoadCommits: number;
  keybindings: KeybindingConfig;
  lastActiveRepo: string | null;
  loadMoreCommits: number;
  loadMoreCommitsAutomatically: boolean;
  mute: MuteCommitsConfig;
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

/* Worktree Types */

export interface WorktreeInfo {
  path: string;
  isMain: boolean;
}

export type WorktreeMap = { [branchName: string]: WorktreeInfo };
export type CommitOrdering = "date" | "topo" | "author-date";
export type RepoCommitOrdering = CommitOrdering | "default";
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
  recordOrigin: boolean;
  noCommit: boolean;
}
export interface ResponseCherrypickCommit {
  command: "cherrypickCommit";
  status: GitCommandStatus;
}

export interface RequestCommitDetails {
  command: "commitDetails";
  repo: string;
  commitHash: string;
  hasParents: boolean;
  isStash: boolean;
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
  checkout: boolean;
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
  deleteOnRemotes: string[];
}
export interface ResponseDeleteBranch {
  command: "deleteBranch";
  status: GitCommandStatus;
}

export interface RequestDeleteRemoteBranch {
  command: "deleteRemoteBranch";
  repo: string;
  remoteName: string;
  branchName: string;
}
export interface ResponseDeleteRemoteBranch {
  command: "deleteRemoteBranch";
  status: GitCommandStatus;
}

export interface RequestRebaseBranch {
  command: "rebaseBranch";
  repo: string;
  branchName: string;
}
export interface ResponseRebaseBranch {
  command: "rebaseBranch";
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
  branches: string[];
  maxCommits: number;
  showRemoteBranches: boolean;
  hard: boolean;
  authors: string[];
  commitOrdering: CommitOrdering;
}
export interface ResponseLoadCommits {
  command: "loadCommits";
  commits: GitCommitNode[];
  head: string | null;
  moreCommitsAvailable: boolean;
  hard: boolean;
  authors?: string[];
  worktrees?: WorktreeMap;
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
  squash: boolean;
  noCommit: boolean;
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
  squash: boolean;
  noCommit: boolean;
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

export interface ResponseSelectRepo {
  command: "selectRepo";
  repo: string;
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

export interface RequestCreateWorktree {
  command: "createWorktree";
  repo: string;
  path: string;
  branchName: string;
  commitHash?: string;
  openTerminal: boolean;
}
export interface ResponseCreateWorktree {
  command: "createWorktree";
  status: GitCommandStatus;
}

export interface RequestRemoveWorktree {
  command: "removeWorktree";
  repo: string;
  worktreePath: string;
  branchName: string;
  deleteBranch: boolean;
}
export interface ResponseRemoveWorktree {
  command: "removeWorktree";
  status: GitCommandStatus;
  branchStatus?: GitCommandStatus;
}

export interface RequestOpenTerminal {
  command: "openTerminal";
  repo: string;
  path: string;
  name: string;
}
export interface ResponseOpenTerminal {
  command: "openTerminal";
}

export interface RequestFetch {
  command: "fetch";
  repo: string;
}
export interface ResponseFetch {
  command: "fetch";
  status: GitCommandStatus;
}

export interface RequestPull {
  command: "pull";
  repo: string;
}
export interface ResponsePull {
  command: "pull";
  status: GitCommandStatus;
}

export interface RequestPush {
  command: "push";
  repo: string;
}
export interface ResponsePush {
  command: "push";
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
  | RequestCreateWorktree
  | RequestCompareCommits
  | RequestCopyToClipboard
  | RequestCreateBranch
  | RequestDeleteBranch
  | RequestDeleteRemoteBranch
  | RequestDeleteTag
  | RequestDropStash
  | RequestFetch
  | RequestFetchAvatar
  | RequestPull
  | RequestPush
  | RequestLoadBranches
  | RequestLoadCommits
  | RequestLoadRepos
  | RequestMergeBranch
  | RequestMergeCommit
  | RequestOpenTerminal
  | RequestPopStash
  | RequestPushStash
  | RequestPushTag
  | RequestRebaseBranch
  | RequestRemoveWorktree
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
  | ResponseCreateWorktree
  | ResponseCompareCommits
  | ResponseCopyToClipboard
  | ResponseCreateBranch
  | ResponseDeleteBranch
  | ResponseDeleteRemoteBranch
  | ResponseDeleteTag
  | ResponseDropStash
  | ResponseFetch
  | ResponseFetchAvatar
  | ResponsePull
  | ResponsePush
  | ResponseLoadBranches
  | ResponseLoadCommits
  | ResponseLoadRepos
  | ResponseMergeBranch
  | ResponseMergeCommit
  | ResponseOpenTerminal
  | ResponsePopStash
  | ResponsePushStash
  | ResponsePushTag
  | ResponseRebaseBranch
  | ResponseRefresh
  | ResponseRemoveWorktree
  | ResponseSelectRepo
  | ResponseRenameBranch
  | ResponseResetToCommit
  | ResponseResetUncommitted
  | ResponseRevertCommit
  | ResponseViewDiff;
