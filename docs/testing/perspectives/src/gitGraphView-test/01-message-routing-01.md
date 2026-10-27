# Test Perspectives: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-05-02T01:45:44Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: message-routing

## S1: Stash message routing

> Origin: Feature 001 (menu-bar-enhancement) Task 4.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                 | Notes               |
| ------- | --------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------- |
| TC-001  | RequestApplyStash message received      | Normal - standard                                                          | DataSource.applyStash is called with the correct arguments      | mute/unmute pattern |
| TC-002  | RequestPopStash message received        | Normal - standard                                                          | DataSource.popStash is called with the correct arguments        | mute/unmute pattern |
| TC-003  | RequestDropStash message received       | Normal - standard                                                          | DataSource.dropStash is called with the correct arguments       | mute/unmute pattern |
| TC-004  | RequestBranchFromStash message received | Normal - standard                                                          | DataSource.branchFromStash is called with the correct arguments | mute/unmute pattern |

## S2: Uncommitted message routing

> Origin: Feature 001 (menu-bar-enhancement) Task 5.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                     | Notes               |
| ------- | ------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------- |
| TC-005  | RequestPushStash message received           | Normal - standard                                                          | DataSource.pushStash is called with the correct arguments           | mute/unmute pattern |
| TC-006  | RequestResetUncommitted message received    | Normal - standard                                                          | DataSource.resetUncommitted is called with the correct arguments    | mute/unmute pattern |
| TC-007  | RequestCleanUntrackedFiles message received | Normal - standard                                                          | DataSource.cleanUntrackedFiles is called with the correct arguments | mute/unmute pattern |

## S3: compareCommits message routing

> Origin: Feature 002 (menubar-search-diff) Task 2.4
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                        | Notes |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----- |
| TC-008  | RequestCompareCommits message received (valid fromHash, toHash) | Normal - standard                                                          | DataSource.getCommitComparison() is called with repo, fromHash, toHash                 | -     |
| TC-009  | getCommitComparison() returns GitFileChange[]                   | Normal - standard                                                          | ResponseCompareCommits containing fileChanges, fromHash, toHash is sent to the webview | -     |
| TC-010  | getCommitComparison() returns null                              | Exception - handled error                                                  | ResponseCompareCommits is sent to the webview with fileChanges null                    | -     |

## S4: viewDiff compare mode extension

> Origin: Feature 002 (menubar-search-diff) Task 2.4
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                | Notes                                |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------ |
| TC-011  | RequestViewDiff with compareWithHash                | Normal - standard                                                          | encodeDiffDocUri builds two URIs using fromHash and toHash     | Diff Editor for comparing two points |
| TC-012  | RequestViewDiff without compareWithHash (undefined) | Normal - standard                                                          | The existing behavior (diff against the parent commit) is kept | Backward compatibility               |

## S5: pull/push message routing

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 3.3
> Added: 2026-02-25
> Status: superseded
> Supersedes: -
> Superseded By: S28

**Target path**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                          | Notes                       |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------- |
| TC-013  | { command: "pull", repo: "..." } message received | Normal - standard                                                          | dataSource.pull(repo) is called and ResponsePull is sent | Follows the pushTag pattern |
| TC-014  | { command: "push", repo: "..." } message received | Normal - standard                                                          | dataSource.push(repo) is called and ResponsePush is sent | Follows the pushTag pattern |

## S8: deleteRemoteBranch/rebaseBranch message routing

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Target path**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                           | Notes               |
| ------- | -------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------- |
| TC-021  | RequestDeleteRemoteBranch message received   | Normal - standard                                                          | DataSource.deleteRemoteBranch is called with repo, remoteName, branchName | mute/unmute pattern |
| TC-022  | RequestRebaseBranch message received         | Normal - standard                                                          | DataSource.rebaseBranch is called with repo, branchName                   | mute/unmute pattern |
| TC-023  | deleteRemoteBranch succeeds (returns null)   | Normal - standard                                                          | ResponseDeleteRemoteBranch is sent to the webview with status: null       | -                   |
| TC-024  | rebaseBranch fails (returns an error string) | Exception - handled error                                                  | ResponseRebaseBranch is sent to the webview with status: "error message"  | -                   |

## S9: deleteBranch extension (delete on remotes at the same time)

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Target path**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                   | Notes                      |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------- |
| TC-025  | deleteOnRemotes = ["origin"], local delete succeeds        | Normal - standard                                                          | After the local delete a refresh is sent, then deleteRemoteBranch("origin", branchName) is called | Partial success considered |
| TC-026  | deleteOnRemotes = [] (empty array)                         | Normal - no remote                                                         | Only the local delete runs. deleteRemoteBranch is not called                                      | Existing behavior kept     |
| TC-027  | deleteOnRemotes = ["origin"], local succeeds, remote fails | Normal - partial success                                                   | After the graph refresh, the remote delete error is shown in a separate error dialog              | The local delete is kept   |
| TC-028  | Local delete fails                                         | Exception - handled error                                                  | An error response is returned. deleteRemoteBranch is not called                                   | No remote delete attempted |

## S10: loadCommits extension (Author filter)

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Target path**: `src/gitGraphView.ts`

| Case ID | Input / Precondition         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                 | Notes                  |
| ------- | ---------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------- |
| TC-029  | msg.authorFilter = "Alice"   | Normal - standard                                                          | "Alice" is passed to the authorFilter parameter of dataSource.getCommits()      | -                      |
| TC-030  | msg.authorFilter = undefined | Normal - no filter                                                         | dataSource.getCommits() is called without authorFilter (existing behavior kept) | Backward compatibility |

## S11: createBranch + checkout orchestration

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: superseded
> Supersedes: -
> Superseded By: S29

**Target path**: `src/gitGraphView.ts:223-228`

| Case ID | Input / Precondition                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                   | Notes                    |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------ |
| TC-031  | checkout=true, createBranch succeeds                          | Normal - standard                                                          | checkoutBranch(repo, branchName, null) is called                                  | -                        |
| TC-032  | checkout=true, createBranch succeeds, checkoutBranch succeeds | Normal - standard                                                          | status: null is returned (full success)                                           | -                        |
| TC-033  | checkout=true, createBranch succeeds, checkoutBranch fails    | Normal - partial success                                                   | A partial success message is returned in status (branch created, checkout failed) | -                        |
| TC-034  | checkout=false, createBranch succeeds                         | Normal - standard                                                          | checkoutBranch is not called, status: null                                        | -                        |
| TC-035  | createBranch fails (returns an error message)                 | Exception - handled error                                                  | status holds the error message and checkoutBranch is not called                   | -                        |
| TC-036  | checkout not given (undefined)                                | Boundary - legacy compat                                                   | checkoutBranch is not called (backward compatible, previous behavior)             | Supports legacy messages |

## S15: loadCommits input normalization (Feature 040)

> Origin: Feature 040 (settings-and-copy-polish) (light-spec-plan)
> Added: 2026-05-17
> Status: active
> Supersedes: -
> Signature: the message handler for `case "loadCommits":`
> Target Path: `src/gitGraphView.ts`
> Test File: `tests/src/gitGraphView.test.ts`

Verifies that even when `maxCommits` of a `loadCommits` message from the webview is 0 or negative, the value passed to `DataSource.getCommits()` is always 1 or more.

| Case ID | Input / Precondition   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                      | Notes                                  |
| ------- | ---------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| TC-068  | `msg.maxCommits = 0`   | Boundary - lower bound                                                     | The 3rd argument of `DataSource.getCommits()` is `1` | 0 → 1 normalization (message boundary) |
| TC-069  | `msg.maxCommits = -10` | Validation - negative                                                      | The 3rd argument of `DataSource.getCommits()` is `1` | Negative → 1 normalization             |

## S16: viewDiff error handling

> Origin: test-plan (既存コード網羅)
> Added: 2026-05-17
> Status: superseded
> Supersedes: -
> Superseded By: S24
> Signature: `private async viewDiff(repo, commitHash, oldFilePath, newFilePath, type, compareWithHash?): Promise<boolean>`
> Target Path: `src/gitGraphView.ts`

The `vscode.commands.executeCommand("vscode.diff", ...)` calls are wrapped in 3 try/catch blocks (with compareWithHash, Uncommitted mode, normal commit comparison), and each returns `false` on an exception.

| Case ID | Input / Precondition                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                            | Notes              |
| ------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------ |
| TC-070  | `compareWithHash !== undefined`, `vscode.commands.executeCommand("vscode.diff", ...)` rejects     | Exception - vscode.diff failure (compare mode)                             | `viewDiff` returns `false`. The exception does not propagate to the caller | catch at L727-L741 |
| TC-071  | `compareWithHash === undefined`, `commitHash === UNCOMMITTED_CHANGES_HASH`, `vscode.diff` rejects | Exception - vscode.diff failure (uncommitted)                              | `viewDiff` returns `false`                                                 | catch at L748-L763 |
| TC-072  | `compareWithHash === undefined`, normal commit, `vscode.diff` rejects                             | Exception - vscode.diff failure (normal commit)                            | `viewDiff` returns `false`                                                 | catch at L775-L786 |

## S17: Message guard for unregistered repositories

> Origin: test-plan (既存コード網羅)
> Added: 2026-05-17
> Status: active
> Supersedes: -
> Signature: the early-return guard in `onDidReceiveMessage`
> Target Path: `src/gitGraphView.ts:148-154`

When `msg.command` is neither `copyToClipboard` nor `loadRepos` and `"repo" in msg` holds, the guard checks whether `msg.repo` is a key of `RepoManager.getRepos()`, and if it is not registered, returns early without calling DataSource.

| Case ID | Input / Precondition                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                 | Notes                                    |
| ------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------- |
| TC-073  | `msg.command = "loadCommits"`, `msg.repo` is not a key of `RepoManager.getRepos()` | Validation - unregistered repo                                             | `DataSource.getCommits` is not called and `repoFileWatcher.unmute` does not run | Only registered repositories are allowed |
| TC-074  | `msg.command = "copyToClipboard"`, `msg.repo` is not registered                    | Normal - bypass guard                                                      | The guard is bypassed and the `copyToClipboard` utility is called               | Command not covered by the guard         |
| TC-075  | `msg.command = "loadRepos"`, no `msg.repo` property                                | Normal - bypass guard (no repo key)                                        | `respondLoadRepos` is called                                                    | `"repo" in msg` is false                 |
