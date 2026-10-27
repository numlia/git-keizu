# Test Perspectives: src/dataSource.ts

> Source: `src/dataSource.ts`
> Generated: 2026-05-02T01:45:44Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: history-diff

## S1: getStashes() stash data retrieval

> Origin: Feature 001 (menu-bar-enhancement) Task 3.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Signature**: `getStashes(repo: string): Promise<GitStash[]>`
**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                         | Notes                                                                 |
| ------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| TC-001  | The repository has 3 stashes                                     | Normal - standard                                                          | Returns an array of 3 GitStash objects                                  | Uses mocked git reflog output                                         |
| TC-002  | The repository has no stashes                                    | Boundary - empty                                                           | Returns an empty array `[]` (not an error)                              | The git command writes to stderr, but it falls back to an empty array |
| TC-003  | The repository has only 1 stash                                  | Boundary - min (1 entry)                                                   | Returns an array of 1 GitStash object                                   | Smallest valid count                                                  |
| TC-004  | The git reflog command exits abnormally                          | Exception - handled error                                                  | Returns an empty array or throws an error                               | A non-zero exit code is simulated with a spawn mock                   |
| TC-005  | The reflog output contains lines with the wrong number of fields | Boundary - malformed input                                                 | Invalid lines are skipped, and only valid lines are parsed              | STASH_FORMAT_FIELD_COUNT guard condition                              |
| TC-006  | The reflog output contains lines with an empty parent hash       | Boundary - empty parent                                                    | Lines with an empty parent are skipped, and only valid lines are parsed | line[1] === "" guard condition                                        |

## S2: Stash merge logic (inside getCommits)

> Origin: Feature 001 (menu-bar-enhancement) Task 3.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                  | Notes                                                   |
| ------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| TC-007  | The stash hash matches a hash in the commit array                         | Normal - standard                                                          | The stash information is attached to that commit node            | Uses a hash-to-index lookup map                         |
| TC-008  | The stash baseHash matches a hash in the commit array (the hash does not) | Normal - standard                                                          | A stash row is inserted right after the base commit              | Inserted as a new commit node                           |
| TC-009  | Neither the stash hash nor the baseHash is in the commit array            | Normal - out of range                                                      | The stash is skipped, and the commit array is unchanged          | Stash outside the visible range                         |
| TC-010  | 2 stashes with the same baseHash (dates: newer > older)                   | Normal - multiple                                                          | Inserted with the newer stash first and the older stash after it | Sorted by date descending                               |
| TC-011  | 0 stashes                                                                 | Boundary - zero                                                            | The commit array is returned as is (unchanged)                   | Case where getStashes returns an empty array            |
| TC-012  | 3 stashes, each with a different baseHash                                 | Normal - standard                                                          | Each is inserted right after its baseHash                        | Inserting in reverse order keeps the indexes consistent |

## S3: getCommitFile() file content retrieval

> Origin: test-plan (既存テスト)
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                               | Notes |
| ------- | ---------------------------- | -------------------------------------------------------------------------- | --------------------------------------------- | ----- |
| TC-013  | Valid commit hash            | Normal - standard                                                          | Returns the file content as a string          | -     |
| TC-014  | Commit hash with a ^ suffix  | Normal - standard                                                          | Returns the file content of the parent commit | -     |
| TC-015  | Invalid commit hash          | Boundary - invalid hash                                                    | Returns an empty string                       | -     |
| TC-016  | Path traversal containing .. | Boundary - path traversal                                                  | Returns an empty string (security guard)      | -     |
| TC-017  | The git show command fails   | Exception - handled error                                                  | Returns an empty string                       | -     |
| TC-018  | ^ only (no base hash)        | Boundary - invalid                                                         | Returns an empty string                       | -     |
| TC-019  | HEAD ref                     | Normal - standard                                                          | Returns the file content                      | -     |
| TC-020  | HEAD^ ref                    | Normal - standard                                                          | Returns the file content of the parent commit | -     |

## S4: Stash commands (apply/pop/drop/branch)

> Origin: Feature 001 (menu-bar-enhancement) Task 4.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                           | Notes                                 |
| ------- | ----------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------- |
| TC-021  | applyStash(repo, "stash@{0}", false)            | Normal - standard                                                          | git args: `["stash", "apply", "stash@{0}"]`               | reinstateIndex = false                |
| TC-022  | applyStash(repo, "stash@{0}", true)             | Normal - with option                                                       | git args: `["stash", "apply", "--index", "stash@{0}"]`    | reinstateIndex = true                 |
| TC-023  | popStash(repo, "stash@{1}", false)              | Normal - standard                                                          | git args: `["stash", "pop", "stash@{1}"]`                 | reinstateIndex = false                |
| TC-024  | popStash(repo, "stash@{1}", true)               | Normal - with option                                                       | git args: `["stash", "pop", "--index", "stash@{1}"]`      | reinstateIndex = true                 |
| TC-025  | dropStash(repo, "stash@{2}")                    | Normal - standard                                                          | git args: `["stash", "drop", "stash@{2}"]`                | -                                     |
| TC-026  | branchFromStash(repo, "my-branch", "stash@{0}") | Normal - standard                                                          | git args: `["stash", "branch", "my-branch", "stash@{0}"]` | -                                     |
| TC-027  | applyStash causes a conflict                    | Exception - handled error                                                  | Returns an error message string (not null)                | Message from stderr                   |
| TC-028  | dropStash with an invalid selector              | Exception - handled error                                                  | Returns an error message string                           | Does not normally happen, but guarded |

## S5: Uncommitted commands (push/reset/clean)

> Origin: Feature 001 (menu-bar-enhancement) Task 5.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                  | Notes                                |
| ------- | -------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------ |
| TC-029  | pushStash(repo, "WIP message", true)         | Normal - full options                                                      | git args: `["stash", "push", "--message", "WIP message", "--include-untracked"]` | Message + untracked                  |
| TC-030  | pushStash(repo, "WIP message", false)        | Normal - message only                                                      | git args: `["stash", "push", "--message", "WIP message"]`                        | Message only                         |
| TC-031  | pushStash(repo, "", true)                    | Normal - untracked only                                                    | git args: `["stash", "push", "--include-untracked"]`                             | No --message flag                    |
| TC-032  | pushStash(repo, "", false)                   | Boundary - minimal args                                                    | git args: `["stash", "push"]`                                                    | No options                           |
| TC-033  | resetUncommitted(repo, "mixed")              | Normal - standard                                                          | git args: `["reset", "--mixed", "HEAD"]`                                         | -                                    |
| TC-034  | resetUncommitted(repo, "hard")               | Normal - standard                                                          | git args: `["reset", "--hard", "HEAD"]`                                          | -                                    |
| TC-035  | resetUncommitted(repo, "soft")               | Normal - invalid mode                                                      | Errors or is rejected                                                            | Not in VALID_UNCOMMITTED_RESET_MODES |
| TC-036  | resetUncommitted(repo, "invalid")            | Normal - invalid mode                                                      | Errors or is rejected                                                            | Invalid string                       |
| TC-037  | resetUncommitted(repo, "")                   | Boundary - empty                                                           | Errors or is rejected                                                            | Empty string                         |
| TC-038  | cleanUntrackedFiles(repo, false)             | Normal - standard                                                          | git args: `["clean", "-f"]`                                                      | Directories excluded                 |
| TC-039  | cleanUntrackedFiles(repo, true)              | Normal - with option                                                       | git args: `["clean", "-f", "-d"]`                                                | Directories included                 |
| TC-040  | The git command fails in pushStash           | Exception - handled error                                                  | Returns an error message string (not null)                                       | Message from stderr                  |
| TC-041  | The git command fails in cleanUntrackedFiles | Exception - handled error                                                  | Returns an error message string (not null)                                       | Message from stderr                  |

## S6: fetch() --prune

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 4.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Signature**: `fetch(repo: string): Promise<GitCommandStatus>`
**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                           | Notes                           |
| ------- | ---------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------- |
| TC-042  | Valid repo path              | Normal - standard                                                          | git runs with the arguments ["fetch", "--all", "--prune"] | --prune is added                |
| TC-043  | fetch succeeds (exit code 0) | Normal - standard                                                          | Returns null                                              | null on success                 |
| TC-044  | fetch error (exit code != 0) | Exception - handled error                                                  | Returns the stderr message string                         | Remote connection failure, etc. |
| TC-045  | spawn emits an error event   | Exception - spawn                                                          | Returns an error message string                           | spawn error event               |

## S7: getCommitComparison() diff retrieval

> Origin: Feature 002 (menubar-search-diff) Task 2.2
> Added: 2026-02-25
> Status: superseded
> Superseded By: S35
> Supersedes: -

**Signature**: `getCommitComparison(repo: string, fromHash: string, toHash: string): Promise<GitFileChange[] | null>`
**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                        | Notes                                                    |
| ------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| TC-046  | fromHash: valid hash, toHash: valid hash                                 | Normal - standard                                                          | Returns GitFileChange[]                                                                                | nameStatus + numStat run in parallel                     |
| TC-047  | The diff includes a renamed file (R)                                     | Normal - standard                                                          | Returns a GitFileChange whose oldFilePath and newFilePath differ                                       | Detected by --find-renames                               |
| TC-048  | The diff includes all of A/M/D/R                                         | Normal - standard                                                          | Each change type is classified correctly                                                               | --diff-filter=AMDR                                       |
| TC-049  | numStat added and deleted line counts                                    | Normal - standard                                                          | additions and deletions are set to the correct numbers                                                 | Verifies numStat parsing                                 |
| TC-050  | toHash: empty string (compare with the working tree)                     | Boundary - empty toHash                                                    | toHash is not in the git diff arguments. Returns the diff against the working tree. ls-files also runs | isToWorkingTree=true                                     |
| TC-051  | fromHash: UNCOMMITTED_CHANGES_HASH ("\*")                                | Boundary - special hash                                                    | toHash is used as the diff base                                                                        | Special handling for UNCOMMITTED                         |
| TC-052  | 0 changed files                                                          | Boundary - empty result                                                    | Returns an empty array [] (not null)                                                                   | Same commit on both sides, or no diff                    |
| TC-053  | The git diff command exits with an error                                 | Exception - handled error                                                  | Returns null                                                                                           | The catch block returns null when spawn throws           |
| TC-054  | numStat output lines do not match nameStatus                             | Boundary - malformed                                                       | Builds the result from whatever data is available                                                      | Parsing robustness                                       |
| TC-055  | fromHash=UNCOMMITTED_CHANGES_HASH + untracked files exist                | Normal - standard                                                          | ls-files runs, and the result includes the untracked files                                             | ls-files runs only when isToWorkingTree=true             |
| TC-056  | toHash="" (compare with the working tree) + untracked files exist        | Normal - standard                                                          | ls-files runs, and the result includes the untracked files                                             | isToWorkingTree=true also when toHash is an empty string |
| TC-057  | Compare 2 commits (fromHash and toHash both valid hashes)                | Boundary - no ls-files                                                     | ls-files does not run (spawn is called only twice)                                                     | isToWorkingTree=false                                    |
| TC-058  | Working tree comparison + untracked files that duplicate the diff output | Boundary - dedup                                                           | Duplicate files are included only once                                                                 | fileLookup skips existing entries                        |
| TC-059  | Working tree comparison + 0 untracked files                              | Boundary - empty untracked                                                 | The result is built from the diff output only                                                          | -                                                        |
| TC-060  | Working tree comparison + empty lines in the ls-files output             | Boundary - empty line                                                      | Empty lines are skipped, and only valid file paths are added                                           | filePath === "" guard                                    |

## S8: getUncommittedDetails() uncommitted details

> Origin: Feature 002 (menubar-search-diff) Task 2.2
> Added: 2026-02-25
> Status: superseded
> Superseded By: S36
> Supersedes: -

**Signature**: `getUncommittedDetails(repo: string): Promise<GitCommitDetails | null>`
**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                              | Notes                                               |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| TC-061  | staged/unstaged changes + untracked files exist               | Normal - standard                                                          | fileChanges includes the diff result + the untracked files   | nameStatus + numStat + ls-files run in parallel (3) |
| TC-062  | Only staged/unstaged changes, no untracked files              | Normal - standard                                                          | fileChanges includes only the diff result                    | -                                                   |
| TC-063  | No diff output; only untracked files exist                    | Boundary - diff empty                                                      | fileChanges includes only the untracked files                | -                                                   |
| TC-064  | An untracked file duplicates a newFilePath in the diff result | Boundary - dedup                                                           | Duplicate files are included only once                       | fileLookup skips existing entries                   |
| TC-065  | Empty lines in the ls-files output                            | Boundary - empty line                                                      | Empty lines are skipped, and only valid file paths are added | filePath === "" guard                               |
| TC-066  | git diff or ls-files throws an exception                      | Exception - handled error                                                  | Returns null                                                 | The catch block returns null                        |
| TC-067  | Normal diff output (including renames)                        | Normal - standard                                                          | Returns GitCommitDetails with the correct type/path set      | Basic verification of nameStatus parsing            |

## S28: runGitCommandSpawn() / spawnGit() decode output buffers after concatenation

> Origin: フェーズ1 修正 M2 (spawn-buffer-concat)
> Added: 2026-07-04T01:35:00Z
> Status: active
> Supersedes: -
> Signature: `private runGitCommandSpawn(args: string[], repo: string): Promise<GitCommandStatus>` / `private spawnGit<T>(args, repo, successValue, errorValue): Promise<T>`
> Target Path: `src/dataSource.ts:1100-1153`

Changes the implementation that accumulated stdout/stderr by string concatenation (`stdout += d`) to a Buffer array (`stdoutChunks.push(Buffer.from(d))`) + a single decode with `Buffer.concat(chunks).toString()`. These added perspectives ensure that a multibyte character split across a chunk boundary is restored without garbling (no U+FFFD replacement character).

| Case ID | Input / Precondition                                                                                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                       | Notes                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-166  | spawnGit, exit 0. The UTF-8 3-byte character "あ" (E3 81 82) is emitted split across 2 data events, `[E3,81]` and `[82]` | Normal - multibyte chunk boundary restore                                  | successValue is called once with `"あ"` after concatenation and decoding. Contains no U+FFFD (`�`)    | Boundary restoration through Buffer.concat |
| TC-167  | spawnGit, exit 0. ASCII `"abc"` is emitted in a single data event                                                        | Normal - single chunk decode                                               | successValue is called once with `"abc"`                                                              | Normal path with a single chunk            |
| TC-168  | spawnGit, exit 0. No data event is emitted                                                                               | Boundary - no data events                                                  | `Buffer.concat([])` gives an empty string, and successValue is called once with `""`                  | No-output boundary                         |
| TC-169  | spawnGit, non-zero exit code (close code=1)                                                                              | Exception - error value fallback                                           | errorValue is resolved as is. successValue is not called (0 times)                                    | Fallback on abnormal exit                  |
| TC-170  | runGitCommandSpawn, non-zero exit code. A multibyte character in stdout is emitted split into 2 chunks                   | Exception - error stdout multibyte restore                                 | Resolves to the concatenated and decoded stdout, split by eol with the last line removed. No garbling | stdout path when close code≠0 (L1121-1124) |
| TC-171  | runGitCommandSpawn, non-zero exit code. stdout is empty, and stderr is emitted in 2 chunks                               | Exception - stderr concat fallback                                         | Because stdout is empty, resolves to a string from the concatenated and decoded stderr                | stderr fallback when stdout is empty       |
| TC-172  | runGitCommandSpawn, exit code 0                                                                                          | Normal - success null                                                      | Resolves to `null` (success)                                                                          | On normal exit                             |

## S30: getBranches() broader detection of detached HEAD pseudo-branch lines (headRegex)

> Origin: フェーズ2 修正 M3 (detached-head-detection)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `const headRegex = /^\(HEAD detached (at\|from) .+\)$/` / the `stdout` parser of `getBranches()`
> Target Path: `src/dataSource.ts:25, 129-132`

A fix that replaces `headRegex`, from the old `/^\(HEAD detached at [0-9A-Za-z]+\)/g` (`at` only, hex alphanumerics only, unanchored, global) to `/^\(HEAD detached (at\|from) .+\)$/` (both `at` and `from`, any characters, anchored at the end of line, not global). It reliably detects the detached HEAD pseudo-branch lines that appear in `git branch` output (`(HEAD detached at <hash>)` / `(HEAD detached from <ref>)`) and skips them with `continue` so that they do not get into the real branch list. Removing the global flag means `String.match` keeps no `lastIndex` state.

| Case ID | Input / Precondition                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                               | Notes                                                                     |
| ------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| TC-179  | branch line name=`(HEAD detached at 1a2b3c4)`                                          | Normal - detached at skipped                                               | `headRegex.match` is non-null and the loop does `continue`. This line is not added to the `branches` array    | Detached HEAD line in the existing `at` form                              |
| TC-180  | branch line name=`(HEAD detached from origin/main)`                                    | Normal - detached from variant                                             | Matches `headRegex` and does `continue`. Not added to `branches` (the old `at`-only regex missed it)          | Added case for detecting the `from` form                                  |
| TC-181  | branch line name=`(HEAD detached at v1.0-rc.1)` (ref with non-alphanumeric characters) | Boundary - non-alphanumeric ref                                            | `.+` matches even a ref containing `.`/`-`, and the loop does `continue`. Not added to `branches`             | Boundary that the old `[0-9A-Za-z]+` did not match                        |
| TC-182  | branch line name=`main` (regular branch)                                               | Normal - real branch retained                                              | `headRegex.match` is null, there is no `continue`, and `main` is added to `branches`                          | Real branches are not skipped by mistake                                  |
| TC-183  | branch line name=`feature/(HEAD detached at x)` (branch name containing the phrase)    | Boundary - start anchor                                                    | Because of the `^` anchor and the first character not being `(`, it does not match and is added to `branches` | The `^` anchor avoids over-matching real branches that contain the phrase |

## S31: Adding a fixed-locale env to the spawn options (LC_ALL=C)

> Origin: フェーズ2 修正 M3 (spawn-locale-lc-all-c)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `private runGitCommandSpawn(args, repo)` / `private spawnGit<T>(args, repo, successValue, errorValue)`
> Target Path: `src/dataSource.ts:1107-1110, 1147-1150`

A fix that changes the 3rd argument of `cp.spawn` in both spawn helpers from `{ cwd: repo }` to `{ cwd: repo, env: { ...process.env, LC_ALL: "C" } }`. It pins git's messages and porcelain output to the C locale so that behaviour (such as headRegex matching English text) is deterministic regardless of the locale of the environment. `process.env` is spread to keep the existing environment variables, and only `LC_ALL` is overridden with `"C"`.

| Case ID | Input / Precondition                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                         | Notes                                               |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| TC-184  | Run runGitCommandSpawn, repo=`/r`                                       | Normal - env option present                                                | `cp.spawn` is called once with the 3rd argument `{ cwd: "/r", env: objectContaining({ LC_ALL: "C" }) }` | spawn options on the run side                       |
| TC-185  | Run spawnGit, repo=`/r`                                                 | Normal - env option present                                                | In the 3rd argument of `cp.spawn`, `cwd` is `"/r"` and `env.LC_ALL` is `"C"`                            | spawn options on the spawnGit side                  |
| TC-186  | Run spawnGit while `process.env.PATH="/usr/bin"` exists                 | Boundary - existing env preserved                                          | `env.PATH` passed to spawn stays `"/usr/bin"`, and `env.LC_ALL` is `"C"`                                | Spreading `...process.env` keeps existing variables |
| TC-187  | Run spawnGit while `process.env.LC_ALL="ja_JP.UTF-8"` is set beforehand | Boundary - override precedence                                             | `env.LC_ALL` passed to spawn is overridden with `"C"`, not the inherited value `"ja_JP.UTF-8"`          | Override precedence (LC_ALL set after the spread)   |
