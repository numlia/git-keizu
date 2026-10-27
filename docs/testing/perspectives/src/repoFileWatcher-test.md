# Test Perspectives: src/repoFileWatcher.ts

> Source: `src/repoFileWatcher.ts`
> Generated: 2026-05-02T01:46:44Z
> Language: TypeScript
> Test Framework: Vitest

## S1: constructor()

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `constructor(repoChangeCallback: () => void)`
**Target path**: `src/repoFileWatcher.ts:16-18`

| Case ID | Input / Precondition       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                | Notes |
| ------- | -------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----- |
| TC-001  | repoChangeCallback=vi.fn() | Normal - standard                                                          | A RepoFileWatcher instance is created. Internal state: fsWatcher=null, muted=false, resumeAt=0 | -     |

## S2: start(repo) starts file watching

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public start(repo: string)`
**Target path**: `src/repoFileWatcher.ts:20-30`

| Case ID | Input / Precondition                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                         | Notes                   |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| TC-002  | repo="/path/to/repo", fsWatcher=null (first call)   | Normal - standard                                                          | createFileSystemWatcher is called once with `/path/to/repo/**`. 3 event listeners are registered: onDidCreate, onDidChange, onDidDelete | L26-29                  |
| TC-003  | repo="/new/repo", fsWatcher=existing (called again) | Normal - branch                                                            | After dispose() of the existing watcher is called once, a new watcher is created with `/new/repo/**`                                    | L21 true branch         |
| TC-004  | repo="" (empty string)                              | Boundary - empty                                                           | createFileSystemWatcher is called with `/**`. May result in an unexpected watch scope                                                   | Template literal on L26 |
| TC-005  | repo="/path/to/repo/" (trailing slash)              | Boundary - format                                                          | createFileSystemWatcher is called with `/path/to/repo//**`. A glob containing a double slash                                            | L26                     |

## S3: stop() stops file watching

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public stop()`
**Target path**: `src/repoFileWatcher.ts:32-37`

| Case ID | Input / Precondition                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                               | Notes            |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------- |
| TC-006  | fsWatcher=an active watcher                    | Normal - standard                                                          | fsWatcher.dispose() is called once. fsWatcher is set to null                  | L34-35           |
| TC-007  | fsWatcher=null (not started / already stopped) | Validation - rejected precondition                                         | Nothing runs. No error occurs                                                 | L33 false branch |
| TC-008  | stop() called twice in a row                   | Boundary - repeated call                                                   | 1st call: dispose is called and null is set. 2nd call: nothing runs. No error | L33              |

## S4: mute() sets mute

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: superseded
> Supersedes: -
> Superseded By: S11

**Signature**: `public mute()`
**Target path**: `src/repoFileWatcher.ts:39-41`

| Case ID | Input / Precondition        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                 | Notes |
| ------- | --------------------------- | -------------------------------------------------------------------------- | ------------------------------- | ----- |
| TC-009  | Initial state (muted=false) | Normal - standard                                                          | The muted property becomes true | L40   |

## S5: unmute() clears mute

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: superseded
> Supersedes: -
> Superseded By: S11

**Signature**: `public unmute()`
**Target path**: `src/repoFileWatcher.ts:43-46`

| Case ID | Input / Precondition                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                         | Notes                                                  |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| TC-010  | After calling mute()                          | Normal - standard                                                          | muted becomes false. resumeAt is set to about the current time + 1500ms | L44-45                                                 |
| TC-011  | Precision of resumeAt when unmute() is called | Boundary - timing                                                          | The value of resumeAt is within ±50ms of Date.now()+1500                | L45: verifies the precision of the 1500ms grace period |

## S6: refresh(uri) mute / grace period guard

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `private async refresh(uri: vscode.Uri)`
**Target path**: `src/repoFileWatcher.ts:48-58`

| Case ID | Input / Precondition                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                               | Notes             |
| ------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------- |
| TC-012  | muted=true, uri=a valid matching path                                       | Validation - rejected precondition                                         | Early return. repoChangeCallback is not called                                                | L49               |
| TC-013  | muted=false, current time < resumeAt (within the grace period)              | Validation - rejected precondition                                         | Early return. repoChangeCallback is not called                                                | L51               |
| TC-014  | muted=false, current time == resumeAt (exactly at the boundary)             | Boundary - exact                                                           | No early return. `<` is a strict comparison, so equality passes and the callback is scheduled | L51: `<` not `<=` |
| TC-015  | muted=false, current time > resumeAt (after the grace period), matching URI | Normal - standard                                                          | Passes the grace period check, and the callback is scheduled                                  | Passes L51        |

## S7: refresh(uri) fileChangeRegex filter

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: superseded
> Supersedes: -
> Superseded By: S13

**Target path**: `src/repoFileWatcher.ts:50` (regex: L5-6)

fileChangeRegex is an OR of 3 patterns:

1. Specific files under `.git/` (config, index, HEAD, refs/stash, refs/heads/\*, refs/remotes/\*, refs/tags/\*)
2. All files that do not start with `.git`
3. Files named `.git` followed by non-slash characters (.gitignore and similar)

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                   | Notes                                 |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| TC-016  | uri path=".git/config" (after replace)                       | Normal - standard                                                          | Matches pattern 1. The callback is scheduled                                                                                                                                      | Git config file                       |
| TC-017  | uri path=".git/refs/heads/main" (after replace)              | Normal - standard                                                          | Matches pattern 1. The callback is scheduled                                                                                                                                      | Branch ref                            |
| TC-018  | uri path="src/index.ts" (after replace)                      | Normal - standard                                                          | Matches pattern 2. The callback is scheduled                                                                                                                                      | Ordinary source file                  |
| TC-019  | uri path=".gitignore" (after replace)                        | Normal - standard                                                          | Matches pattern 3. The callback is scheduled                                                                                                                                      | .git dotfile                          |
| TC-020  | uri path=".git/objects/ab/cd1234" (after replace)            | Validation - rejected precondition                                         | Matches no pattern. Early return                                                                                                                                                  | L50: Git object                       |
| TC-021  | uri path=".git/hooks/pre-commit" (after replace)             | Validation - rejected precondition                                         | Matches no pattern. Early return                                                                                                                                                  | L50: Git hook                         |
| TC-022  | uri path=".git/logs/HEAD" (after replace)                    | Validation - rejected precondition                                         | Matches no pattern. Early return                                                                                                                                                  | L50: Git log                          |
| TC-023  | uri path=".git/COMMIT_EDITMSG" (after replace)               | Validation - rejected precondition                                         | Matches no pattern. Early return                                                                                                                                                  | L50: commit message editing           |
| TC-024  | uri path=".git/" (directory only)                            | Boundary - edge                                                            | Pattern 1: does not match config and the others. Pattern 2: does not match because it starts with `.git`. Pattern 3: does not match because it contains a slash. Early return     | None of the 3 patterns match          |
| TC-025  | uri path=".git" (no slash)                                   | Boundary - edge                                                            | Pattern 1: does not match for lack of a slash. Pattern 2: does not match because it starts with `.git`. Pattern 3: does not match because `[^/]+` gets 0 characters. Early return | Boundary of exactly `.git`            |
| TC-026  | uri path="" (empty after removing the repo prefix)           | Boundary - empty                                                           | Matches pattern 2 `^(?!\.git).*$` (an empty string does not start with `.git`). The callback is scheduled                                                                         | L50: when the replace result is empty |
| TC-027  | uri path=".git/refs/heads/" (trailing slash, no branch name) | Boundary - format                                                          | Matches `refs\/heads\/.*` of pattern 1 (`.*` also allows an empty string). The callback is scheduled                                                                              | L5: empty match of `.*`               |

## S8: refresh(uri) debounce behavior

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Target path**: `src/repoFileWatcher.ts:53-58`

| Case ID | Input / Precondition                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                | Notes              |
| ------- | -------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------ |
| TC-028  | One matching URI, refreshTimeout=null        | Normal - standard                                                          | repoChangeCallback is scheduled with setTimeout(750ms). clearTimeout is not called             | L53 false → L56-58 |
| TC-029  | 3 matching URI changes in a row within 500ms | Normal - standard                                                          | clearTimeout is called twice. After 750ms, repoChangeCallback runs only once, for the last one | Debounce at L53-54 |
| TC-030  | refreshTimeout=null (first time)             | Normal - standard                                                          | clearTimeout is not called. Only setTimeout is called                                          | L53 false branch   |
| TC-031  | refreshTimeout=an existing timeout           | Normal - standard                                                          | After clearTimeout(existing ID) is called once, a new setTimeout is set                        | L53 true → L54     |

## S9: Watching limited to the Git directory, and multiple watch roots

> Origin: Feature 033 (watch-refresh-scope) Task 2
> Added: 2026-05-02T01:46:44Z
> Status: active
> Supersedes: S2, S3, S6, S7, S8
> Signature: `public start(watchRoots: string[]): void`
> Target Path: `src/repoFileWatcher.ts`

| Case ID | Input / Precondition                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                        | Notes                                       |
| ------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| TC-032  | watchRoots=[`/path/to/main/.git/worktrees/feature-x`, `/path/to/main/.git`]                       | Normal - multi-root start                                                  | `createFileSystemWatcher` is called twice, and `onDidCreate` / `onDidChange` / `onDidDelete` are each registered once on both watchers | linked worktree                             |
| TC-033  | After a watcher has started, run `start()` again with different watchRoots                        | Normal - restart                                                           | After `dispose()` of the old watcher is called once, watchers are recreated for the new roots                                          | Restart                                     |
| TC-034  | Started with multiple roots                                                                       | Normal - stop all                                                          | `stop()` calls `dispose()` once on each watcher                                                                                        | Dispose all                                 |
| TC-035  | watchRoot=`/path/to/repo/.git`, changed path=`src/index.ts`                                       | Validation - non-git working tree path                                     | `repoChangeCallback` is not called                                                                                                     | Working tree changes are ignored            |
| TC-036  | watchRoot=`/path/to/repo/.git`, changed path=`.gitignore`                                         | Validation - ignored dotfile                                               | `repoChangeCallback` is not called                                                                                                     | Dotfiles are not watched                    |
| TC-037  | watchRoot=`/path/to/repo/.git`, changed path=`HEAD`                                               | Normal - head update                                                       | `repoChangeCallback` is called once after 750ms                                                                                        | Git-managed file                            |
| TC-038  | watchRoot=`/path/to/repo/.git`, changed path=`packed-refs`                                        | Normal - packed refs                                                       | `repoChangeCallback` is called once after 750ms                                                                                        | packed refs update                          |
| TC-039  | watchRoot=`/path/to/repo/.git`, changed path=`refs/remotes/origin/main`                           | Normal - remote ref                                                        | `repoChangeCallback` is called once after 750ms                                                                                        | remote-tracking ref                         |
| TC-040  | watchRoot=`/path/to/repo/.git`, changed path=`refs/heads/`                                        | Boundary - empty ref suffix                                                | `repoChangeCallback` is not called                                                                                                     | `refs/heads/*` does not allow an empty name |
| TC-041  | muted=true, changed path=`HEAD`                                                                   | Validation - muted                                                         | `repoChangeCallback` is not called                                                                                                     | Mute kept                                   |
| TC-042  | Right after `unmute()`, current time < `resumeAt`, changed path=`HEAD`                            | Boundary - grace period                                                    | `repoChangeCallback` is not called                                                                                                     | 1500ms grace period kept                    |
| TC-043  | watchRoots=[linked git-dir, common-dir], `refs/heads/main` changes in common-dir                  | Normal - second watch root                                                 | An event on the common root also calls `repoChangeCallback` once after 750ms                                                           | shared refs                                 |
| TC-044  | Changes to `HEAD` and `refs/remotes/origin/main` arrive in a row from multiple roots within 750ms | Normal - cross-root debounce                                               | `clearTimeout` is called once, and `repoChangeCallback` runs only once in total after 750ms                                            | Debounce kept                               |
| TC-045  | watchRoots=[linked git-dir], `refs/heads/main` under common-dir passed by mistake                 | Validation - outside configured roots                                      | `repoChangeCallback` is not called                                                                                                     | Events outside the roots are rejected       |

## S10: Separator normalization when building the start() glob (Windows backslashes)

> Origin: フェーズ1 修正 M4 (watcher-glob-separator-normalize)
> Added: 2026-07-04T01:35:00Z
> Status: active
> Supersedes: -
> Signature: `public start(watchRoots: string[]): void`
> Target Path: `src/repoFileWatcher.ts:41-49`

A fix that normalizes each watchRoot with `getPathFromStr(path.normalize(watchRoot))` before concatenating `` `${watchRoot}/**` ``. `getPathFromStr` replaces backslashes `\` with `/`, so glob separators become forward slashes even for Windows-style paths (when running on POSIX, `path.normalize` does not treat `\` as a separator, and `getPathFromStr` does the conversion).

| Case ID | Input / Precondition                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                    | Notes                                                                                                                                                                                                                        |
| ------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-046  | watchRoots=[`C:\\repo\\.git`] (backslash separators)                         | Normal - backslash normalized                                              | `createFileSystemWatcher` is called once with `C:/repo/.git/**`. The glob argument contains no backslash `\`                                       | `\`→`/` conversion by getPathFromStr                                                                                                                                                                                         |
| TC-047  | watchRoots=[`/path/to/repo/.git`] (already forward slashes)                  | Normal - posix path unchanged                                              | `createFileSystemWatcher` is called once with `/path/to/repo/.git/**`. Separators do not change                                                    | Nothing to convert                                                                                                                                                                                                           |
| TC-048  | watchRoots=[`/path/to/repo/./.git`] (redundant `./` segment)                 | Normal - redundant segment collapsed                                       | `path.normalize` collapses `/./`, and `createFileSystemWatcher` is called with `/path/to/repo/.git/**`                                             | Verifies normalization by normalize                                                                                                                                                                                          |
| TC-049  | watchRoots=[] (empty array)                                                  | Boundary - empty roots array                                               | `createFileSystemWatcher` is not called (0 times). `fsWatchers.length === 0`                                                                       | map returns an empty array                                                                                                                                                                                                   |
| TC-050  | watchRoots=[`""`] (empty string)                                             | Boundary - empty string root                                               | `path.normalize("")` returns `"."`, and `createFileSystemWatcher` is called once with `./**`                                                       | Boundary of an empty-string root                                                                                                                                                                                             |
| TC-051  | watchRoots=[`C:\\repo\\.git\\`] (trailing backslash)                         | Boundary - trailing separator                                              | `path.normalize` removes the trailing separator, and `createFileSystemWatcher` is called with `C:/repo/.git/**`. Contains neither `\**` nor `//**` | Trailing separator + `\`→`/`. Not covered by tests: the expected value assumes the behavior of `path.normalize` on Windows, and it cannot be reproduced in a POSIX environment (CI), which does not treat `\` as a separator |
| TC-052  | watchRoots=[`C:\\a\\.git`, `/b/.git`] (multiple roots with mixed separators) | Boundary - mixed separators multi-root                                     | `createFileSystemWatcher` is called twice, with globs `C:/a/.git/**` and `/b/.git/**`. Neither contains a backslash                                | Each root is normalized separately                                                                                                                                                                                           |

## S11: mute()/unmute() with reference counting (muteCount)

> Origin: フェーズ2 修正 L7 (watcher-ref-counted-mute)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: S4, S5
> Signature: `public mute(): void` / `public unmute(): void` / `private refresh(uri)`
> Target Path: `src/repoFileWatcher.ts:34, 60-72`

A fix that changes `muted: boolean` to `muteCount: number`: `mute()` adds 1, `unmute()` subtracts 1 (only when `muteCount > 0`), and `refresh` ignores changes when `muteCount > 0`. Nested mute/unmute calls balance correctly, and watching does not resume until unmute has been called as many times as mute. Extra unmute calls do not push it negative (a single mute always takes effect). Replaces the old S4/S5 (boolean `muted`). Observed through whether `repoChangeCallback` is scheduled when a matching Git-managed path changes.

| Case ID | Input / Precondition                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                             | Notes                                                                     |
| ------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| TC-053  | After calling `mute()` once, fire a matching `HEAD` change                              | Normal - single mute suppresses                                            | With `muteCount===1`, `refresh` returns early and `repoChangeCallback` is not scheduled                                                                     | Suppression by a single mute                                              |
| TC-054  | After calling `mute()` twice (nested), fire a matching change                           | Normal - nested mute still suppresses                                      | With `muteCount===2` (>0), `repoChangeCallback` is not scheduled                                                                                            | Nested mute adds up                                                       |
| TC-055  | After `mute()`×2 → `unmute()`×1, fire a matching change                                 | Boundary - partial unmute still muted                                      | With `muteCount===1` (still >0), `repoChangeCallback` is not scheduled                                                                                      | The core of reference counting (does not resume until the matching count) |
| TC-056  | After `mute()`×2 → `unmute()`×2 and after `resumeAt` has passed, fire a matching change | Boundary - fully balanced resumes                                          | With `muteCount===0` and the grace period passed, `repoChangeCallback` is called once after 750ms                                                           | Resumes with balanced unmute                                              |
| TC-057  | `unmute()` (extra) with `muteCount===0` → then `mute()`×1 → fire a change               | Boundary - underflow guard                                                 | The extra unmute does not push `muteCount` negative and it stays 0. The following `mute()`×1 reliably gives `muteCount===1`, and the callback is suppressed | Effect of the `if (muteCount > 0)` guard                                  |
| TC-058  | Call `unmute()` after `mute()`                                                          | Boundary - resumeAt set on unmute                                          | When `unmute()` runs, `resumeAt` is set to about `Date.now() + 1500` (±50ms)                                                                                | Grace period kept (inherits the perspective of the old S5)                |

## S12: stop()/mute() clear the pending debounce timer

> Origin: フェーズ2 修正 L9 (watcher-clear-pending-timer)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `public stop(): void` / `public mute(): void`
> Target Path: `src/repoFileWatcher.ts:57-70`

A fix that adds "if `refreshTimeout !== null`, call `clearTimeout` and set it to `null`" to `stop()` and `mute()`. Prevents a pending debounced `repoChangeCallback` from firing later after watching is stopped or muted.

| Case ID | Input / Precondition                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                | Notes                                  |
| ------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| TC-059  | Call `stop()` while `refreshTimeout` is pending from a matching change           | Normal - stop clears pending timer                                         | `clearTimeout(refreshTimeout)` is called and `refreshTimeout=null`. The callback does not fire even after the timer's due time | Pending timer cleared on stop          |
| TC-060  | Call `stop()` with `refreshTimeout===null` (nothing pending)                     | Boundary - stop no pending timer                                           | `clearTimeout` for `refreshTimeout` is not called (already null). Completes without error                                      | Boundary with nothing pending          |
| TC-061  | Call `mute()` while `refreshTimeout` is pending from a matching change           | Normal - mute clears pending timer                                         | `clearTimeout(refreshTimeout)` is called and `refreshTimeout=null`. In addition, `muteCount` is incremented by 1               | Pending timer cleared on mute          |
| TC-062  | Call `mute()` with `refreshTimeout===null` (nothing pending)                     | Boundary - mute no pending timer                                           | `clearTimeout` for `refreshTimeout` is not called, and only `muteCount` is incremented by 1                                    | Boundary with nothing pending          |
| TC-063  | After `mute()` clears the pending timer, advance time with `advanceTimersByTime` | Boundary - cleared timer never fires                                       | `repoChangeCallback` for the cleared pending change does not fire (0 times)                                                    | Guarantees a cleared timer never fires |

## S13: refresh(uri) watches the Git state of linked worktrees (`worktrees/` prefix)

> Origin: Feature 052 (detached-worktree-display) (light-spec-plan)
> Added: 2026-08-08
> Status: active
> Supersedes: S7
> Signature: `private refresh(uri: vscode.Uri)` / `watchedRepositoryStatePrefixes`
> Target Path: `src/repoFileWatcher.ts` (`watchedRepositoryStatePrefixes` and `isWatchedRepositoryStatePath()`; to be updated to a line range after implementation)
> Test File: `tests/src/repoFileWatcher.test.ts`

A change that adds `worktrees/` to `watchedRepositoryStatePrefixes`, so that create / change / delete of `worktrees/<name>` and any non-empty descendant under the common Git directory used as a watch root flow into the existing 750ms debounce. The existing check `pathValue.startsWith(prefix) && pathValue !== prefix` is kept, so the prefix itself does not fire. The old S7 assumed a regex with a `.git` prefix and fixed "all files that do not start with `.git` fire" and "`.git/logs/HEAD` does not fire", which hold neither under the current watch-root-relative check nor with this addition, so it is superseded. The contract for building watch roots, multiple roots and stop / restart stays active in S9; glob normalization belongs to S10, `muteCount` to S11 and clearing the pending timer to S12. Getting the watch roots themselves belongs to `src/dataSource-test/03-author-watch-paths-01.md`.

| Case ID | Input / Precondition                                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                         | Notes                                     |
| ------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| TC-064  | watchRoot=`/repo/.git`, notify a create of `worktrees/feature-x/HEAD`                                        | Normal - worktree head create                                              | `repoChangeCallback` is called once after 750ms                                                         | The case fixed by 8.1                     |
| TC-065  | Notify a change of the same path                                                                             | Normal - worktree head change                                              | `repoChangeCallback` is called once after 750ms                                                         | Detects HEAD moves                        |
| TC-066  | Notify a delete of the same path                                                                             | Normal - worktree head delete                                              | `repoChangeCallback` is called once after 750ms                                                         | Detects worktree removal                  |
| TC-067  | Notify a create of `worktrees/feature-x` (directly under the prefix, the shortest non-empty descendant)      | Boundary - minimum non-empty descendant                                    | `repoChangeCallback` is called once after 750ms                                                         | prefix + 1 segment                        |
| TC-068  | Notify a delete of `worktrees/feature-x`                                                                     | Boundary - minimum descendant delete                                       | `repoChangeCallback` is called once after 750ms                                                         | Removal of a whole worktree directory     |
| TC-069  | Notify a create of `worktrees/feature-x/gitdir`                                                              | Normal - gitdir create                                                     | `repoChangeCallback` is called once after 750ms                                                         | gitdir create of 8.1                      |
| TC-070  | Notify a delete of `worktrees/feature-x/gitdir`                                                              | Normal - gitdir delete                                                     | `repoChangeCallback` is called once after 750ms                                                         | gitdir delete of 8.1                      |
| TC-071  | Notify a change of `worktrees/feature-x/commondir`                                                           | Normal - commondir change                                                  | `repoChangeCallback` is called once after 750ms                                                         | Path listed in 4.6                        |
| TC-072  | Notify a change of `worktrees/feature-x/index`                                                               | Normal - worktree index change                                             | `repoChangeCallback` is called once after 750ms                                                         | Path listed in 4.6                        |
| TC-073  | Notify a change of `worktrees/feature-x/logs/HEAD` (several levels deep)                                     | Normal - nested descendant                                                 | `repoChangeCallback` is called once after 750ms                                                         | Any non-empty descendant                  |
| TC-074  | Notify a create of `worktrees/` (the prefix itself)                                                          | Boundary - prefix itself rejected                                          | `repoChangeCallback` is not called (0 times)                                                            | `pathValue !== prefix` kept               |
| TC-075  | Notify a create of `worktrees` (no trailing separator)                                                       | Boundary - prefix without separator rejected                               | `repoChangeCallback` is not called (0 times)                                                            | Does not match `startsWith("worktrees/")` |
| TC-076  | Notify a change of `objects/ab/cd1234`                                                                       | Validation - git object path rejected                                      | `repoChangeCallback` is not called (0 times)                                                            | Case kept by 8.2                          |
| TC-077  | Notify a change of `src/index.ts` in the working tree                                                        | Validation - working tree path rejected                                    | `repoChangeCallback` is not called (0 times)                                                            | Case kept by 8.2                          |
| TC-078  | watchRoots=[`/repo/.git`], notify a change of `/other/.git/worktrees/feature-x/HEAD`                         | Validation - outside watch roots rejected                                  | `repoChangeCallback` is not called (0 times)                                                            | Events outside the roots are rejected     |
| TC-079  | watchRoot=`/repo/.git`, notify a change of `HEAD`                                                            | Normal - existing allowlist retained (HEAD)                                | `repoChangeCallback` is called once after 750ms                                                         | Existing allowlist kept                   |
| TC-080  | watchRoot=`/repo/.git`, notify a change of `refs/heads/main`                                                 | Normal - existing allowlist retained (branch ref)                          | `repoChangeCallback` is called once after 750ms                                                         | Existing prefix kept                      |
| TC-081  | watchRoot=`/repo/.git`, notify a change of `refs/heads/` (empty suffix)                                      | Boundary - empty ref suffix rejected                                       | `repoChangeCallback` is not called (0 times)                                                            | Existing prefix boundary kept             |
| TC-082  | watchRoots=[linked git-dir, common-dir], notify `worktrees/feature-x/HEAD` on the common-dir side            | Normal - second watch root                                                 | `repoChangeCallback` is called once after 750ms                                                         | Multi-root contract kept                  |
| TC-083  | Changes to `worktrees/feature-x/HEAD` and `HEAD` arrive in a row within 750ms                                | Normal - debounce across paths                                             | `clearTimeout` is called once, and `repoChangeCallback` runs only once in total after 750ms             | Debounce contract kept                    |
| TC-084  | After a change of `worktrees/feature-x/HEAD`, advance time by only 749ms                                     | Boundary - before debounce elapses                                         | `repoChangeCallback` is not called (0 times)                                                            | Boundary below 750ms                      |
| TC-085  | Notify a change of `worktrees/feature-x/HEAD` while `mute()` is in effect                                    | Validation - muted                                                         | `repoChangeCallback` is not called (0 times)                                                            | Mute contract kept                        |
| TC-086  | Notify a change of `worktrees/feature-x/HEAD` right after `unmute()` (current time < `resumeAt`)             | Boundary - grace period                                                    | `repoChangeCallback` is not called (0 times)                                                            | 1500ms grace period kept                  |
| TC-087  | watchRoot=`C:/repo/.git`, notify a change of `worktrees\feature-x\HEAD` (backslash separators)               | Boundary - separator normalized                                            | After `normaliseWatchPath()` it matches the prefix, and `repoChangeCallback` is called once after 750ms | Separator normalization kept              |
| TC-088  | Notify a change of `worktrees/feature-x/HEAD` after `stop()`                                                 | Validation - after stop                                                    | `repoChangeCallback` is not called (0 times)                                                            | watchRoots becomes empty                  |
| TC-089  | watchRoot=`/repo/.git`, notify a change of the same-named working tree path `/repo/worktrees/feature-x/HEAD` | Validation - working tree namesake rejected                                | `repoChangeCallback` is not called (0 times)                                                            | The relative path starts with `..`        |

### Failure-source inventory (include-or-justify) - added by Feature 052 (S13)

| Failure source                                                                | Covering cases or reason for exclusion                                                                                                                                                  |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Changes under `worktrees/` are not detected (the current root cause)          | TC-064 to TC-073                                                                                                                                                                        |
| Missed for some event types (create / change / delete)                        | TC-064 (create), TC-065 (change), TC-066 (delete), TC-067 / TC-068 (create / delete), TC-069 / TC-070 (create / delete)                                                                 |
| Fires for the prefix itself or for a path that only shares the prefix start   | TC-074, TC-075                                                                                                                                                                          |
| Allowance widened to paths outside Git management or outside the watch target | TC-076, TC-077, TC-089                                                                                                                                                                  |
| Events outside the watch roots accepted                                       | TC-078, TC-088                                                                                                                                                                          |
| Existing allowlist or existing prefix boundary broken                         | TC-079, TC-080, TC-081                                                                                                                                                                  |
| Stops firing on one of multiple roots                                         | TC-082                                                                                                                                                                                  |
| Debounce broken, firing several times                                         | TC-083, TC-084                                                                                                                                                                          |
| Passes through mute / grace period suppression                                | TC-085, TC-086                                                                                                                                                                          |
| Prefix check fails because of a different separator                           | TC-087                                                                                                                                                                                  |
| Boundary values (empty / minimum / +/-1)                                      | TC-074 (the prefix itself = empty suffix), TC-081 (empty suffix of an existing prefix), TC-067 (shortest non-empty descendant), TC-084 (debounce -1ms)                                  |
| Boundary values (0 / maximum / NULL)                                          | excluded(there is no upper limit on watch path depth or debounce, and `uri` is a required argument that cannot be `null`. 0 callbacks is verified by TC-074 to TC-078 and others)       |
| Failure of an external dependency                                             | excluded(`vscode.workspace.createFileSystemWatcher` is a mock, and the implementation has no branch for a failure to create a watcher. Verifying the creation arguments belongs to S10) |
| Thrown exceptions                                                             | excluded(`refresh()` only returns early and has no throw path)                                                                                                                          |
| Wrong watch root contents                                                     | excluded(belongs to `src/dataSource-test/03-author-watch-paths-01.md`)                                                                                                                  |

**Failure-category coverage (diversity floor)**:

- Validation: TC-076, TC-077, TC-078, TC-085, TC-088, TC-089
- Exception: excluded(no throw path. Suppression is verified as an early return under Validation / Boundary)
- External: excluded(the implementation has no failure branch for an external dependency)
- Boundary: TC-067, TC-068, TC-074, TC-075, TC-081, TC-084, TC-086, TC-087
- Type: excluded(the argument is fixed to `vscode.Uri`, and typecheck rejects invalid types)

**Failure/normal ratio (smoke detector)**: 12 normal cases (TC-064 to TC-066, TC-069 to TC-073, TC-079, TC-080, TC-082, TC-083), 14 failure cases (TC-067, TC-068, TC-074 to TC-078, TC-081, TC-084 to TC-089). The ratio of 1.17 is not close (within a difference of 1), but there are many normal cases because 4.6 is a spec that lists the paths that must fire. The inventory was derived again to confirm that nothing is missing on the rejecting side (the prefix itself, prefix-start-only match, objects, working tree, outside the root, after stop, same-named path, empty suffix, debounce not elapsed, mute, grace period).
