# Test Perspectives: src/dataSource.ts

> Source: `src/dataSource.ts`
> Generated: 2026-05-02T01:45:44Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: branch-worktree

## S9: checkoutBranch() -B flag

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 2.2
> Added: 2026-02-25
> Status: superseded
> Supersedes: -
> Superseded By: S41

**Signature**: `checkoutBranch(repo: string, branchName: string, remoteBranch: string | null): Promise<GitCommandStatus>`
**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                   | Notes                    |
| ------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------ |
| TC-068  | remoteBranch = "origin/feature/x", branchName = "feature/x" | Normal - remote checkout                                                   | git checkout -B feature/x origin/feature/x is run | -B, not -b               |
| TC-069  | remoteBranch = null, branchName = "main"                    | Normal - local checkout                                                    | git checkout main is run (without the -B flag)    | Existing behavior kept   |
| TC-070  | remoteBranch = "origin/invalid..branch"                     | Exception - handled error                                                  | git returns an error (invalid branch name)        | Relies on git validation |

## S10: pull() / push()

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 3.3
> Added: 2026-02-25
> Status: superseded
> Supersedes: -
> Superseded By: S43

**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                 | Notes                        |
| ------- | ---------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------- |
| TC-071  | Valid repo path                          | Normal - pull                                                              | git is run with ["pull"] as arguments                           | git pull without arguments   |
| TC-072  | pull succeeds (exit code 0)              | Normal - standard                                                          | Returns null (GitCommandStatus)                                 | null on success              |
| TC-073  | pull error (exit code != 0, with stderr) | Exception - pull failure                                                   | Returns the stderr message string                               | Merge conflicts and the like |
| TC-074  | Valid repo path                          | Normal - push                                                              | git is run with ["push"] as arguments                           | git push without arguments   |
| TC-075  | push succeeds (exit code 0)              | Normal - standard                                                          | Returns null (GitCommandStatus)                                 | null on success              |
| TC-076  | push error (exit code != 0, with stderr) | Exception - push failure                                                   | Returns the stderr message string                               | No upstream set and the like |
| TC-077  | push: no upstream set                    | Exception - no upstream                                                    | Returns "fatal: The current branch ... has no upstream branch." | Standard git error           |

## S11: deleteRemoteBranch() deleting a remote branch

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Signature**: `deleteRemoteBranch(repo: string, remoteName: string, branchName: string): Promise<GitCommandStatus>`
**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                           | Notes                                  |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------- |
| TC-078  | Valid remoteName="origin", branchName="feature/x" | Normal - standard                                                          | git args: `["push", "origin", "--delete", "feature/x"]`. Returns null     | Checks spawnGit arguments              |
| TC-079  | The git push --delete command exits abnormally    | Exception - handled error                                                  | Returns an error message string (not null)                                | Remote connection failure and the like |
| TC-080  | remoteName="upstream", branchName="fix/bug-123"   | Normal - another remote                                                    | git args: `["push", "upstream", "--delete", "fix/bug-123"]`. Returns null | A remote other than origin             |

## S12: rebaseBranch() running a rebase

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Signature**: `rebaseBranch(repo: string, branchName: string): Promise<GitCommandStatus>`
**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                         | Notes         |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------- |
| TC-081  | branchName="main"                                   | Normal - standard                                                          | git args: `["rebase", "main"]`. Returns null                                            | Normal rebase |
| TC-082  | A conflict occurs during the rebase                 | Exception - conflict                                                       | Returns an error message string that includes git's guidance (rebase --abort and so on) | stderr output |
| TC-083  | Rebase with uncommitted changes in the working tree | Exception - dirty tree                                                     | Returns an error message string                                                         | git refuses   |

## S19: mergeBranch/mergeCommit squash/noCommit extension

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**Signature**: `mergeBranch(repo: string, branchName: string, createNewCommit: boolean, squash: boolean, noCommit: boolean): Promise<GitCommandStatus>`
**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                    | Notes                  |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------- |
| TC-110  | createNewCommit=true, squash=false, noCommit=false           | Normal - standard                                                          | git args: `["merge", "--no-ff", ref]`                              | Previous behavior      |
| TC-111  | createNewCommit=false, squash=false, noCommit=false          | Normal - standard                                                          | git args: `["merge", ref]`                                         | No flags               |
| TC-112  | createNewCommit=true, squash=true, noCommit=false            | Normal - squash override                                                   | git args: `["merge", "--squash", ref]` (no --no-ff)                | squash overrides no-ff |
| TC-113  | createNewCommit=false, squash=true, noCommit=false           | Normal - standard                                                          | git args: `["merge", "--squash", ref]`                             | squash only            |
| TC-114  | createNewCommit=true, squash=false, noCommit=true            | Normal - standard                                                          | git args: `["merge", "--no-ff", "--no-commit", ref]`               | Independent options    |
| TC-115  | createNewCommit=false, squash=false, noCommit=true           | Normal - standard                                                          | git args: `["merge", "--no-commit", ref]`                          | noCommit only          |
| TC-116  | createNewCommit=true, squash=true, noCommit=true             | Normal - all flags                                                         | git args: `["merge", "--squash", "--no-commit", ref]` (no --no-ff) | All flags, squash wins |
| TC-117  | createNewCommit=false, squash=true, noCommit=true            | Normal - standard                                                          | git args: `["merge", "--squash", "--no-commit", ref]`              | squash + noCommit      |
| TC-118  | mergeCommit: invalid commit hash, squash=true, noCommit=true | Boundary - invalid hash                                                    | Returns INVALID_COMMIT_HASH_MESSAGE                                | Input validation kept  |

## S20: cherrypickCommit recordOrigin/noCommit extension

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**Signature**: `cherrypickCommit(repo: string, commitHash: string, parentIndex: number, recordOrigin: boolean, noCommit: boolean): Promise<GitCommandStatus>`
**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                   | Notes                        |
| ------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------- |
| TC-119  | parentIndex=0, recordOrigin=false, noCommit=false      | Normal - standard                                                          | git args: `["cherry-pick", hash]`                                 | Previous behavior            |
| TC-120  | parentIndex=0, recordOrigin=true, noCommit=false       | Normal - standard                                                          | git args: `["cherry-pick", "-x", hash]`                           | recordOrigin only            |
| TC-121  | parentIndex=0, recordOrigin=false, noCommit=true       | Normal - standard                                                          | git args: `["cherry-pick", "--no-commit", hash]`                  | noCommit only                |
| TC-122  | parentIndex=0, recordOrigin=true, noCommit=true        | Normal - both flags                                                        | git args: `["cherry-pick", "-x", "--no-commit", hash]`            | Independent options          |
| TC-123  | parentIndex=2, recordOrigin=true, noCommit=true        | Normal - merge commit                                                      | git args: `["cherry-pick", "-m", "2", "-x", "--no-commit", hash]` | All flags for a merge commit |
| TC-124  | Invalid commit hash, recordOrigin=true, noCommit=false | Boundary - invalid hash                                                    | Returns INVALID_COMMIT_HASH_MESSAGE                               | Validation kept              |
| TC-125  | parentIndex=-1, recordOrigin=false, noCommit=false     | Boundary - invalid parentIndex                                             | Returns "Invalid parent index."                                   | Validation kept              |

## S21: getGitLog() commit display order (commitOrdering parameter)

> Origin: Feature 015 (commit-sort-order) (aidd-spec-tasks-test)
> Added: 2026-03-10
> Status: active
> Supersedes: -

**Signature**: `private getGitLog(repo: string, branches: string[], num: number, showRemoteBranches: boolean, authors: string[], commitOrdering: CommitOrdering)`
**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                      | Notes                                              |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| TC-126  | commitOrdering="date"                                        | Normal - standard                                                          | The git log arguments include "--date-order"                                         | Same behavior as the default                       |
| TC-127  | commitOrdering="topo"                                        | Normal - standard                                                          | The git log arguments include "--topo-order"                                         | Topological order                                  |
| TC-128  | commitOrdering="author-date"                                 | Normal - standard                                                          | The git log arguments include "--author-date-order"                                  | Author date order                                  |
| TC-129  | COMMIT_ORDER_FLAGS constant mapping                          | Normal - exhaustive                                                        | The 3 keys (date, topo, author-date) exist and map to the corresponding flag strings | Covers every value of the CommitOrdering type      |
| TC-130  | getCommits(repo, branches, max, showRemote, authors, "topo") | Normal - passthrough                                                       | commitOrdering="topo" is passed to getGitLog correctly                               | Parameter relay from getCommits to getGitLog       |
| TC-131  | commitOrdering="date" (backward compatibility check)         | Normal - backward                                                          | The same git log arguments as the previously hard-coded "--date-order" are produced  | Guarantees the same behavior as v0.5.4 and earlier |

## S22: getWorktrees() listing worktrees

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: superseded
> Supersedes: -
> Superseded By: S47

**Signature**: `getWorktrees(repo: string): Promise<WorktreeMap>`
**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                   | Notes                                 |
| ------- | ------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------- |
| TC-132  | spawnGit succeeds with porcelain output     | Normal - standard                                                          | The result of parseWorktreeList is returned as is | spawnGit → parseWorktreeList pipeline |
| TC-133  | spawnGit error (non-zero exit code)         | Exception - handled error                                                  | Returns an empty map `{}`                         | Fallback on error                     |
| TC-134  | The repository has no worktrees (main only) | Boundary - single                                                          | A map with only the main worktree                 | Minimal valid result                  |

## S23: addWorktree() creating a worktree

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**Signature**: `addWorktree(repo: string, path: string, branchName: string, commitHash?: string): Promise<GitCommandStatus>`
**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                   | Notes                   |
| ------- | ------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------- |
| TC-135  | path + branchName (no commitHash)     | Normal - existing branch                                                   | git args: `["worktree", "add", path, branchName]`. Returns null                   | REQ-3.2 existing branch |
| TC-136  | path + branchName + commitHash        | Normal - new branch                                                        | git args: `["worktree", "add", "-b", branchName, path, commitHash]`. Returns null | REQ-3.1 new branch      |
| TC-137  | Creation succeeds (exit code 0)       | Normal - standard                                                          | Returns null (GitCommandStatus)                                                   | -                       |
| TC-138  | git errors on a duplicate branch name | Exception - handled error                                                  | Returns an error message string                                                   | REQ-3.1-TC4             |
| TC-139  | git errors on an existing path        | Exception - handled error                                                  | Returns an error message string                                                   | REQ-3.1-TC5             |

## S24: removeWorktree() removing a worktree

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**Signature**: `removeWorktree(repo: string, worktreePath: string): Promise<GitCommandStatus>`
**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                | Notes       |
| ------- | -------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------- |
| TC-140  | Valid worktreePath                           | Normal - standard                                                          | git args: `["worktree", "remove", worktreePath]`. Returns null | REQ-4.1     |
| TC-141  | Removing a worktree with uncommitted changes | Exception - handled error                                                  | Returns an error message string                                | REQ-4.1-TC5 |

## S25: getNewPathOfRenamedFile() rename tracking

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: superseded
> Supersedes: -
> Superseded By: S27

**Signature**: `getNewPathOfRenamedFile(repo: string, commitHash: string, oldFilePath: string): Promise<string | null>`
**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                            | Notes                                |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| TC-142  | diff output for a renamed file (old.ts → new.ts)     | Normal - rename found                                                      | "new.ts" is returned                                                                                       | Null-byte-separated parsing          |
| TC-143  | A file that was not renamed (empty diff output)      | Normal - no rename                                                         | null is returned                                                                                           | No match                             |
| TC-144  | Invalid commit hash (a non-hex string)               | Validation - invalid hash                                                  | null is returned. Verifies that cp.spawn is not called                                                     | isValidCommitHash() guard            |
| TC-145  | File path containing ".."                            | Validation - path traversal                                                | null is returned. Verifies that cp.spawn is not called                                                     | Path traversal guard                 |
| TC-146  | The git diff command exits with a non-zero exit code | Exception - git error                                                      | null is returned                                                                                           | spawnGit errorValue fallback         |
| TC-147  | spawn emits an error event                           | Exception - spawn error                                                    | null is returned                                                                                           | Process error                        |
| TC-148  | git diff stdout is empty                             | Boundary - empty output                                                    | null is returned                                                                                           | Empty output                         |
| TC-149  | Run git diff with valid input                        | Normal - args verification                                                 | cp.spawn is called with ["diff", "--diff-filter=R", "--find-renames", "-z", hash, "HEAD", "--", "file.ts"] | Checks the git arguments are correct |

## S27: getNewPathOfRenamedFile() rename tracking (pathspec removed + cursor parsing of name-status)

> Origin: フェーズ1 修正 H2 (rename-tracking-repair)
> Added: 2026-07-04T01:35:00Z
> Status: active
> Supersedes: S25
> Signature: `getNewPathOfRenamedFile(repo: string, commitHash: string, oldFilePath: string): Promise<string | null>`
> Target Path: `src/dataSource.ts:567-610`

Replaces the implementation with new args that drop the pathspec restriction (`"--", oldFilePath`) and add `--name-status`, and with parsing of NUL-separated name-status (`R<score>\0old\0new\0`) using a cursor (+3 for R, +2 for others). It returns new of the record where `getPathFromStr(old) === oldFilePath`. The old S25 fixed the args with a pathspec and a simple loop, so it is superseded.

| Case ID | Input / Precondition                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                           | Notes                                       |
| ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| TC-156  | stdout=`"R100\0old.ts\0new.ts\0"`, oldFilePath=`"old.ts"`                                    | Normal - single rename match                                               | `"new.ts"` is returned (`getPathFromStr(fields[2])`)                                                                                                      | old matches in a single R record            |
| TC-157  | Run with a valid commitHash and oldFilePath                                                  | Normal - args (no pathspec)                                                | cp.spawn is called with `["diff", "--name-status", "--diff-filter=R", "--find-renames", "-z", commitHash, "HEAD"]`, with no trailing `"--"` / oldFilePath | Checks that the pathspec is removed         |
| TC-158  | stdout=`"R100\0a.ts\0b.ts\0R100\0old.ts\0new.ts\0"`, oldFilePath=`"old.ts"`                  | Normal - multiple records second match                                     | The 1st record (a.ts→b.ts) does not match old so cursor+=3, and the 2nd record matches old and `"new.ts"` is returned                                     | Cursor advance and scanning several records |
| TC-159  | stdout=`"R100\0other.ts\0renamed.ts\0"`, oldFilePath=`"old.ts"`                              | Validation - no matching old path                                          | The cursor reaches the end without an old match and `null` is returned                                                                                    | No matching record                          |
| TC-160  | stdout=`""` (empty string), oldFilePath=`"old.ts"`                                           | Boundary - empty output                                                    | With `fields=[""]`, the while condition `fields[0] !== ""` is false and `null` is returned                                                                | Empty diff output                           |
| TC-161  | stdout=`"X\0a.ts\0b.ts\0"` (a status outside VALID_FILE_CHANGE_TYPES), oldFilePath=`"a.ts"`  | Type - invalid status char                                                 | `VALID_FILE_CHANGE_TYPES.has("X")` is false, so it breaks and `null` is returned                                                                          | Defensive stop on an unexpected status      |
| TC-162  | commitHash=`"not-a-hex-hash"` (not hex)                                                      | Validation - invalid hash guard                                            | `null` is returned. cp.spawn is not called (0 times)                                                                                                      | `isValidCommitHash()` guard (L572)          |
| TC-163  | oldFilePath=`"../secret.ts"` (contains a ".." segment)                                       | Validation - path traversal guard                                          | `null` is returned. cp.spawn is not called (0 times)                                                                                                      | Path traversal guard (L575)                 |
| TC-164  | git diff exits with a non-zero exit code                                                     | Exception - git error fallback                                             | `null` is returned through spawnGit's errorValue                                                                                                          | Fallback when the external process fails    |
| TC-165  | stdout=`"R100\0old.ts\0"` (a truncated record missing the new field), oldFilePath=`"old.ts"` | Boundary - truncated record missing new path                               | `fields[cursor+2]` is undefined, so `getPathFromStr("")`, that is, the empty string `""`, is returned                                                     | `?? ""` fallback for a missing new field    |

## S51: removeWorktree() without force and without retry

> Origin: Feature 053 (detached-worktree-menu) (light-spec-plan)
> Added: 2026-09-13
> Status: active
> Supersedes: -
> Signature: `removeWorktree(repo: string, worktreePath: string): Promise<GitCommandStatus>`
> Target Path: `src/dataSource.ts:1202-1204`
> Test File: `tests/src/dataSource.test.ts`

S24 TC-140 / TC-141 are kept. This section fixes the number of spawn calls.

| Case ID | Input / Precondition                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                 | Notes |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----- |
| TC-369  | `removeWorktree(REPO, "/tmp/wt")`, spawn succeeds         | Normal - single non-force spawn                                            | `spawn` called once, args `toEqual(["worktree", "remove", "/tmp/wt"])` (without `--force`), return value `null` | -     |
| TC-370  | spawn exits with 128, stderr `fatal: '/tmp/wt' is locked` | External - refusal without retry                                           | `spawn` is still called only once, and the return value contains `is locked`                                    | -     |

### Failure-source inventory (include-or-justify) — added by Feature 053 (S51)

| Failure source         | Covering case or reason for exclusion |
| ---------------------- | ------------------------------------- |
| `--force` added        | TC-369                                |
| Retry or extra command | TC-370                                |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(arguments are validated on the handler side. This method has no branch)
- External: TC-370
- Boundary: excluded(same as above)
- Type: excluded(same as above)
