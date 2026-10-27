# Test Perspectives: src/repoManager.ts

> Source: `src/repoManager.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: registerRepoFromUri

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**Signature**: `registerRepoFromUri(uri: vscode.Uri): Promise<void>`
**Target path**: `src/repoManager.ts:184-193`

| Case ID | Input / Precondition                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                           | Notes                           |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------- |
| TC-001  | The URI points to an already registered repository         | Normal - existing                                                          | addRepo is not called; the existing state is kept         | Prevents duplicate registration |
| TC-002  | The URI points to an unregistered valid Git repository     | Normal - new repo                                                          | addRepo is called and the view is notified via sendRepos  | New registration flow           |
| TC-003  | The URI points to a directory that is not a Git repository | Validation - non-git                                                       | isGitRepository returns false and registration is skipped | Up-front validation             |

## S2: constructor (workspace folder change handler)

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `constructor(dataSource: DataSource, extensionState: ExtensionState, statusBarItem: StatusBarItem)`
**Target path**: `src/repoManager.ts:30-60`

| Case ID | Input / Precondition                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                  | Notes            |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------- | ---------------- |
| TC-004  | 1 folder in added, searchDirectoryForRepos returns true    | Normal - standard                                                          | sendRepos is called once         | L40-48           |
| TC-005  | 1 folder in added, searchDirectoryForRepos returns false   | Normal - branch                                                            | sendRepos is not called          | L48 false branch |
| TC-006  | 1 folder in removed, removeReposWithinFolder returns true  | Normal - standard                                                          | sendRepos is called once         | L50-58           |
| TC-007  | 1 folder in removed, removeReposWithinFolder returns false | Normal - branch                                                            | sendRepos is not called          | L58 false branch |
| TC-008  | added.length = 0                                           | Boundary - zero                                                            | Processing of added is skipped   | L40              |
| TC-009  | removed.length = 0                                         | Boundary - zero                                                            | Processing of removed is skipped | L50              |
| TC-010  | Both added and removed are non-empty                       | Normal - standard                                                          | Both are processed in order      | -                |

## S3: dispose

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `dispose(): void`
**Target path**: `src/repoManager.ts:62-72`

| Case ID | Input / Precondition               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                  | Notes            |
| ------- | ---------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------- |
| TC-011  | folderChangeHandler exists         | Normal - standard                                                          | handler.dispose() is called and it is set to null                | L64              |
| TC-012  | folderChangeHandler is null        | Boundary - null                                                            | Completes without error                                          | L64 false branch |
| TC-013  | Multiple entries in folderWatchers | Normal - standard                                                          | dispose() of every watcher is called and all entries are removed | L68-71           |
| TC-014  | folderWatchers is empty            | Boundary - empty                                                           | The loop does not run and it completes normally                  | L68              |

## S4: View callback management (registerViewCallback, deregisterViewCallback, sendRepos)

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `registerViewCallback(viewCallback: (...) => void): void` / `deregisterViewCallback(): void` / `sendRepos(): void`
**Target path**: `src/repoManager.ts:74-80,158-163`

| Case ID | Input / Precondition                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                      | Notes             |
| ------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------- |
| TC-015  | Pass a callback function to registerViewCallback       | Normal - standard                                                          | The callback is stored in this.viewCallback          | -                 |
| TC-016  | Call deregisterViewCallback                            | Normal - standard                                                          | this.viewCallback is set to null                     | -                 |
| TC-017  | sendRepos: viewCallback registered, 2 entries in repos | Normal - standard                                                          | viewCallback is called with (repos, 2)               | L161              |
| TC-018  | sendRepos: viewCallback is null                        | Boundary - null                                                            | No call, no error                                    | L161 false branch |
| TC-019  | sendRepos: repos is empty                              | Boundary - zero                                                            | viewCallback is called with (an empty GitRepoSet, 0) | numRepos = 0      |

## S5: maxDepthOfRepoSearchChanged

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `maxDepthOfRepoSearchChanged(): void`
**Target path**: `src/repoManager.ts:82-92`

| Case ID | Input / Precondition                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                 | Notes             |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------- |
| TC-020  | newDepth(=3) > this.maxDepthOfRepoSearch(=1)   | Normal - standard                                                          | depth is updated to 3 and searchWorkspaceForRepos is called     | L84 true          |
| TC-021  | newDepth(=1) < this.maxDepthOfRepoSearch(=3)   | Normal - branch                                                            | depth is updated to 1 and searchWorkspaceForRepos is not called | L84 false         |
| TC-022  | newDepth(=2) === this.maxDepthOfRepoSearch(=2) | Boundary - equal                                                           | depth unchanged and searchWorkspaceForRepos is not called       | L84 false (equal) |

## S6: getRepos

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `getRepos(): GitRepoSet`
**Target path**: `src/repoManager.ts:120-128`

| Case ID | Input / Precondition          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                         | Notes |
| ------- | ----------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----- |
| TC-023  | 2 entries registered in repos | Normal - standard                                                          | A GitRepoSet with 2 entries is returned, each key with its GitRepoState | L123  |
| TC-024  | repos is empty                | Boundary - empty                                                           | An empty GitRepoSet is returned                                         | -     |

## S7: addRepo / removeRepo

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `addRepo(repo: string): void` / `removeRepo(repo: string): void`
**Target path**: `src/repoManager.ts:130-137`

| Case ID | Input / Precondition                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                | Notes       |
| ------- | ------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------- |
| TC-025  | addRepo: valid path "/path/to/repo"  | Normal - standard                                                          | The key is added to repos with the default state, and saveRepos is called once | L131-132    |
| TC-026  | addRepo: empty string ""             | Boundary - empty                                                           | An empty-string key is added to repos (no validation)                          | -           |
| TC-027  | removeRepo: registered key           | Normal - standard                                                          | The key is removed from repos and saveRepos is called once                     | L135-136    |
| TC-028  | removeRepo: unregistered key         | Boundary - non-existing                                                    | delete does not error, and saveRepos is called                                 | -           |
| TC-029  | addRepo: the same key already exists | Boundary - duplicate                                                       | The existing state is overwritten with the default state                       | State reset |

## S8: setRepoState

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `setRepoState(repo: string, state: GitRepoState): void`
**Target path**: `src/repoManager.ts:176-182`

| Case ID | Input / Precondition                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                          | Notes                          |
| ------- | -------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------ |
| TC-030  | repo = "/valid/path", state = a valid GitRepoState | Normal - standard                                                          | state is set to repos[repo] and saveRepos is called once | L180-181                       |
| TC-031  | repo = "\_\_proto\_\_"                             | Validation - rejected precondition                                         | Early return, state not set, saveRepos not called        | L177 prototype pollution guard |
| TC-032  | repo = "constructor"                               | Validation - rejected precondition                                         | Early return, state not set, saveRepos not called        | L177                           |
| TC-033  | repo = "prototype"                                 | Validation - rejected precondition                                         | Early return, state not set, saveRepos not called        | L177                           |
| TC-034  | repo = "" (empty string)                           | Boundary - empty                                                           | state is set (not caught by the guard)                   | -                              |

## S9: checkReposExist

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `checkReposExist(): Promise<boolean>`
**Target path**: `src/repoManager.ts:164-175`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                               | Notes                     |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------- |
| TC-035  | 3 entries in repos, isGitRepository true for all     | Normal - standard                                                          | Nothing removed, sendRepos not called, returns false                          | L168 false branch for all |
| TC-036  | 3 entries in repos, isGitRepository false for only 1 | Normal - standard                                                          | That 1 entry is removed by removeRepo, sendRepos is called once, returns true | L168-173                  |
| TC-037  | 3 entries in repos, isGitRepository false for all    | Validation - rejected precondition                                         | All 3 removed, sendRepos is called once, returns true                         | No repository exists      |
| TC-038  | repos is empty                                       | Boundary - empty                                                           | Nothing removed, sendRepos not called, returns false                          | The loop does not run     |

## S10: removeReposNotInWorkspace

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `removeReposNotInWorkspace(): void` (private)
**Target path**: `src/repoManager.ts:100-118`

| Case ID | Input / Precondition                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                      | Notes             |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------- |
| TC-039  | 2 entries in workspaceFolders, all repos inside the workspace | Normal - standard                                                          | removeRepo is not called                                             | L113-116 false    |
| TC-040  | 1 entry in workspaceFolders, some repos outside the workspace | Normal - standard                                                          | Repos outside the workspace are removed by removeRepo                | L117              |
| TC-041  | workspaceFolders is undefined                                 | Boundary - undefined                                                       | rootsExact/rootsFolder are empty, and every repo is a removal target | L105 false branch |
| TC-042  | workspaceFolders is an empty array                            | Boundary - empty                                                           | No roots; every repo is treated as outside and removed               | -                 |
| TC-043  | One repo exactly equals workspaceFolder.uri.fsPath            | Boundary - exact match                                                     | Kept by the rootsExact match                                         | L113 exact match  |

## S11: Path matching (removeReposWithinFolder, isDirectoryWithinRepos)

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `removeReposWithinFolder(path: string): boolean` / `isDirectoryWithinRepos(path: string): boolean` (private)
**Target path**: `src/repoManager.ts:139-155`

| Case ID | Input / Precondition                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                             | Notes                  |
| ------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| TC-044  | removeReposWithinFolder: path exactly equals the repo path                       | Normal - standard                                                          | removeRepo is called and it returns true                    | L143 === branch        |
| TC-045  | removeReposWithinFolder: path is the parent directory of a repo (/a → /a/sub)    | Normal - standard                                                          | The child repo is removed by removeRepo and it returns true | L143 startsWith branch |
| TC-046  | removeReposWithinFolder: no repo matches path                                    | Validation - rejected precondition                                         | Nothing removed, returns false                              | L143 all false         |
| TC-047  | removeReposWithinFolder: repos is empty                                          | Boundary - empty                                                           | The loop does not run, returns false                        | -                      |
| TC-048  | removeReposWithinFolder: multiple repos match                                    | Boundary - multiple                                                        | Every matching repo is removed, returns true                | -                      |
| TC-049  | isDirectoryWithinRepos: path === repoPaths[i]                                    | Normal - standard                                                          | Returns true                                                | L153 ===               |
| TC-050  | isDirectoryWithinRepos: path is a subdirectory of a repo (/repo/sub)             | Normal - standard                                                          | Returns true                                                | L153 startsWith        |
| TC-051  | isDirectoryWithinRepos: path is unrelated                                        | Validation - rejected precondition                                         | Returns false                                               | L155                   |
| TC-052  | isDirectoryWithinRepos: prefix matches but not at a / boundary (/repo2 vs /repo) | Boundary - prefix edge                                                     | Returns false (does not match startsWith("/repo/"))         | Edge case              |
| TC-053  | isDirectoryWithinRepos: repos is empty                                           | Boundary - empty                                                           | The loop does not run, returns false                        | -                      |

## S12: searchDirectoryForRepos

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `searchDirectoryForRepos(directory: string, maxDepth: number): Promise<boolean>` (private)
**Target path**: `src/repoManager.ts:212-245`

| Case ID | Input / Precondition                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                      | Notes      |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------- |
| TC-054  | directory is a path inside an existing repo                     | Validation - guard                                                         | isDirectoryWithinRepos true → early return false                     | L214       |
| TC-055  | directory is the root of a Git repository                       | Normal - standard                                                          | isGitRepository true → addRepo is called and it returns true         | L220       |
| TC-056  | directory is not Git, maxDepth=1, a subdirectory has a Git repo | Normal - standard                                                          | Returns true after recursively searching subdirectories              | L224-239   |
| TC-057  | maxDepth = 0                                                    | Boundary - zero                                                            | No recursion, returns false                                          | L224 false |
| TC-058  | maxDepth = 1, a subdirectory has a .git entry                   | Normal - branch                                                            | .git is filtered out and not searched                                | L233       |
| TC-059  | maxDepth = 1, no repo in subdirectories                         | Normal - branch                                                            | Returns false after searching everything                             | -          |
| TC-060  | fs.readdir fails (permission error, etc.)                       | External - fs readdir failure                                              | The inner catch handles the error and it continues as an empty array | L226-230   |
| TC-061  | isGitRepository throws                                          | External - API failure                                                     | The outer catch handles the error and it returns false               | L218-245   |
| TC-062  | directory is a path that does not exist                         | External - fs failure                                                      | The outer catch handles the error and it returns false               | L218-245   |
| TC-063  | The directory contains only files (no subdirectories)           | Boundary - no subdirectories                                               | All filtered out by isDirectory, no recursive call, false            | L233       |

## S13: Watcher event handlers (onWatcherCreate, onWatcherChange, onWatcherDelete)

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `onWatcherCreate(uri): Promise<void>` / `onWatcherChange(uri): void` / `onWatcherDelete(uri): void` (private)
**Target path**: `src/repoManager.ts:268-293`

| Case ID | Input / Precondition                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                 | Notes      |
| ------- | -------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| TC-064  | onWatcherCreate: path contains /.git/                    | Validation - filter                                                        | Early return, not added to the queue                                                            | L270       |
| TC-065  | onWatcherCreate: path ends with /.git                    | Normal - standard                                                          | The last 5 characters are removed from path and processing continues                            | L271       |
| TC-066  | onWatcherCreate: path already exists in createEventPaths | Validation - dedup                                                         | Early return, not added twice                                                                   | L272       |
| TC-067  | onWatcherCreate: new path, no timeout set                | Normal - standard                                                          | path is added to the queue and a timeout is set                                                 | L273-276   |
| TC-068  | onWatcherCreate: new path, timeout already set           | Normal - branch                                                            | clearTimeout on the existing timeout → a new timeout is set                                     | L275       |
| TC-069  | onWatcherChange: path contains /.git/                    | Validation - filter                                                        | Early return                                                                                    | L280       |
| TC-070  | onWatcherChange: path ends with /.git                    | Normal - standard                                                          | The last 5 characters are removed from path and processing continues                            | L281       |
| TC-071  | onWatcherChange: path already exists in changeEventPaths | Validation - dedup                                                         | Early return                                                                                    | L282       |
| TC-072  | onWatcherChange: new path                                | Normal - standard                                                          | path is added to the queue and a timeout is set                                                 | L283-286   |
| TC-073  | onWatcherDelete: path contains /.git/                    | Validation - filter                                                        | Early return                                                                                    | L290       |
| TC-074  | onWatcherDelete: path ends with /.git, a repo matches    | Normal - standard                                                          | The last 5 characters are removed from path, removeReposWithinFolder true → sendRepos is called | L291-292   |
| TC-075  | onWatcherDelete: normal path, a repo matches             | Normal - standard                                                          | removeReposWithinFolder true → sendRepos is called                                              | L292       |
| TC-076  | onWatcherDelete: normal path, no repo matches            | Validation - rejected precondition                                         | removeReposWithinFolder false → sendRepos is not called                                         | L292 false |

## S14: Event processing (processCreateEvents, processChangeEvents)

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `processCreateEvents(): Promise<void>` / `processChangeEvents(): Promise<void>` (private)
**Target path**: `src/repoManager.ts:295-315`

| Case ID | Input / Precondition                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                           | Notes      |
| ------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------- | ---------- |
| TC-077  | processCreateEvents: createEventPaths is empty                     | Boundary - empty                                                           | The while loop does not run, sendRepos is not called      | L297       |
| TC-078  | processCreateEvents: 1 entry, path is a directory, a repo is found | Normal - standard                                                          | searchDirectoryForRepos true → sendRepos is called once   | L298-303   |
| TC-079  | processCreateEvents: 1 entry, path is not a directory              | Validation - rejected precondition                                         | isDirectory false → searchDirectoryForRepos is not called | L298 false |
| TC-080  | processCreateEvents: multiple entries, repos found for some        | Normal - standard                                                          | sendRepos is called once after all entries are processed  | -          |
| TC-081  | processChangeEvents: changeEventPaths is empty                     | Boundary - empty                                                           | The while loop does not run, sendRepos is not called      | L308       |
| TC-082  | processChangeEvents: 1 entry, path does not exist, a repo matches  | Normal - standard                                                          | removeReposWithinFolder true → sendRepos is called once   | L309-314   |
| TC-083  | processChangeEvents: 1 entry, path exists                          | Normal - branch                                                            | doesPathExist true → the removal is skipped               | L309 false |
| TC-084  | processChangeEvents: 1 entry, path missing, no repo matches        | Validation - rejected precondition                                         | removeReposWithinFolder false → sendRepos is not called   | L310-314   |

## S15: File system utilities (isDirectory, doesPathExist)

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `isDirectory(path: string): Promise<boolean>` / `doesPathExist(path: string): Promise<boolean>` (module private)
**Target path**: `src/repoManager.ts:318-334`

| Case ID | Input / Precondition                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                              | Notes    |
| ------- | ----------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------- | -------- |
| TC-085  | isDirectory: a directory path             | Normal - standard                                                          | stats.isDirectory() is true → returns true   | L320-321 |
| TC-086  | isDirectory: a file path                  | Boundary - type mismatch                                                   | stats.isDirectory() is false → returns false | L321     |
| TC-087  | isDirectory: a path that does not exist   | External - fs stat failure                                                 | Returns false from the catch                 | L322-324 |
| TC-088  | doesPathExist: a path that exists         | Normal - standard                                                          | stat succeeds → returns true                 | L329     |
| TC-089  | doesPathExist: a path that does not exist | External - fs stat failure                                                 | Returns false from the catch                 | L331-333 |

## S16: Watcher management (startWatchingFolders, startWatchingFolder, stopWatchingFolder)

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: superseded
> Superseded By: S20
> Supersedes: -

**Signature**: `startWatchingFolders(): void` / `startWatchingFolder(path): void` / `stopWatchingFolder(path): void` (private)
**Target path**: `src/repoManager.ts:248-266`

| Case ID | Input / Precondition                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                              | Notes           |
| ------- | -------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------- |
| TC-090  | startWatchingFolders: 2 entries in workspaceFolders      | Normal - standard                                                          | startWatchingFolder is called for each folder                                                | L251            |
| TC-091  | startWatchingFolders: workspaceFolders is undefined      | Boundary - undefined                                                       | startWatchingFolder is not called                                                            | L251 false      |
| TC-092  | startWatchingFolder: a valid path                        | Normal - standard                                                          | createFileSystemWatcher is called and 3 event handlers (create/change/delete) are registered | L258-262        |
| TC-093  | stopWatchingFolder: a path present in folderWatchers     | Normal - standard                                                          | watcher.dispose() is called and the entry is removed                                         | L265-266        |
| TC-094  | stopWatchingFolder: a path not present in folderWatchers | Boundary - non-existing key                                                | Possible runtime error from dispose() on an undefined property                               | L265 latent bug |

## S17: startupTasks

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `startupTasks(): Promise<void>` (private)
**Target path**: `src/repoManager.ts:92-97`

| Case ID | Input / Precondition                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                               | Notes                            |
| ------- | ----------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| TC-095  | checkReposExist returns false (no change) | Normal - standard                                                          | sendRepos is called once within startupTasks                                                                  | L94 true branch (!false = true)  |
| TC-096  | checkReposExist returns true (changed)    | Normal - branch                                                            | sendRepos is not called within startupTasks (already called inside checkReposExist)                           | L94 false branch (!true = false) |
| TC-097  | Normal initial state                      | Normal - standard                                                          | removeReposNotInWorkspace, checkReposExist, searchWorkspaceForRepos, startWatchingFolders are called in order | Verifies the orchestration order |
| TC-098  | Initial state with empty repos            | Boundary - empty                                                           | removeReposNotInWorkspace is a no-op, checkReposExist false → sendRepos is called with empty repos            | repos = {}                       |

## S18: searchWorkspaceForRepos

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `searchWorkspaceForRepos(): Promise<void>` (private)
**Target path**: `src/repoManager.ts:197-212`

| Case ID | Input / Precondition                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                       | Notes                  |
| ------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------- |
| TC-099  | workspaceFolders is undefined                                       | Boundary - undefined                                                       | searchDirectoryForRepos is not called, sendRepos is not called                        | L200 false branch      |
| TC-100  | 1 entry in workspaceFolders, searchDirectoryForRepos returns true   | Normal - standard                                                          | sendRepos is called once                                                              | L202-211               |
| TC-101  | 1 entry in workspaceFolders, searchDirectoryForRepos returns false  | Normal - branch                                                            | sendRepos is not called                                                               | L211 false branch      |
| TC-102  | 2 entries in workspaceFolders, searchDirectoryForRepos true for one | Normal - standard                                                          | searchDirectoryForRepos is called twice and sendRepos once                            | Mixed multiple folders |
| TC-103  | workspaceFolders is an empty array                                  | Boundary - empty                                                           | The loop does not run, sendRepos is not called                                        | L201                   |
| TC-104  | maxDepthOfRepoSearch is 0                                           | Boundary - zero                                                            | searchDirectoryForRepos is called with maxDepth=0, no recursion, false → no sendRepos | L205 maxDepth boundary |

## S19: dispose() clears the pending event processing timers

> Origin: フェーズ2 修正 L10 (repo-manager-dispose-clear-timers)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `public dispose(): void`
> Target Path: `src/repoManager.ts:62-80`

A fix that adds to `dispose()`: "if `processCreateEventsTimeout` / `processChangeEventsTimeout` is `!== null`, call `clearTimeout` and set it to `null`". It prevents the pending debounced `processCreateEvents` / `processChangeEvents` from firing after disposal. This is additional processing on top of the existing S3 (disposing the handler/watchers), and the S3 perspectives are unchanged.

| Case ID | Input / Precondition                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                               | Notes                                     |
| ------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| TC-105  | Call `dispose()` with `processCreateEventsTimeout` pending (`!== null`)                 | Normal - create timeout cleared                                            | `clearTimeout(processCreateEventsTimeout)` is called and it is set to `null`. The pending `processCreateEvents` does not fire | Clears the create event timer             |
| TC-106  | Call `dispose()` with `processCreateEventsTimeout === null`                             | Boundary - create timeout null                                             | `clearTimeout` for `processCreateEventsTimeout` is not called. Completes without error                                        | Nothing-pending boundary                  |
| TC-107  | Call `dispose()` with `processChangeEventsTimeout` pending (`!== null`)                 | Normal - change timeout cleared                                            | `clearTimeout(processChangeEventsTimeout)` is called and it is set to `null`. The pending `processChangeEvents` does not fire | Clears the change event timer             |
| TC-108  | Call `dispose()` with `processChangeEventsTimeout === null`                             | Boundary - change timeout null                                             | `clearTimeout` for `processChangeEventsTimeout` is not called. Completes without error                                        | Nothing-pending boundary                  |
| TC-109  | Call `dispose()` with both timers pending, then advance time with `advanceTimersByTime` | Boundary - both cleared no fire                                            | Both timeouts get `clearTimeout` and are set to `null`, and neither `processCreateEvents` nor `processChangeEvents` fires     | Pending events do not fire after disposal |

## S20: Idempotent startWatchingFolder / stopWatchingFolder

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: S16
> Signature: `private startWatchingFolder(path: string): void` / `private stopWatchingFolder(path: string): void`
> Target Path: `src/repoManager.ts:256-275`

A fix that makes starting a watcher idempotent ("do nothing if an entry for the same normalized path exists") and stopping idempotent ("dispose/delete only when the entry exists"). It replaces S16's "possible runtime error from `undefined.dispose()` when stopping an unregistered path" (TC-094) and "overwrite on duplicate start". It guarantees that even if a folder removed event fires while startupTasks is awaiting, processing continues from `removeReposWithinFolder` to `sendRepos()` (the fix for [6]). The enumeration of `startWatchingFolders` (equivalent to S16 TC-090/TC-091) does not change behavior.

| Case ID | Input / Precondition                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                      | Notes                                                             |
| ------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| TC-110  | Call `startWatchingFolder` twice with the same normalized path                                     | Boundary - idempotent duplicate start                                      | `createFileSystemWatcher` is called only once, and `dispose()` of the existing watcher is called 0 times (no overwrite, no leak)                     | Replaces the overwrite behavior of S16                            |
| TC-111  | Call `stopWatchingFolder` with a path not present in `folderWatchers`                              | Boundary - safe end when stopping an unregistered path                     | Ends normally without throwing a `TypeError`, and `dispose()` of no watcher is called                                                                | Replaces the latent-bug expectation of S16 TC-094                 |
| TC-112  | Call `stopWatchingFolder` with a registered path, then call it again with the same path            | Normal - stopping a registered path and removing the entry                 | The first call calls `dispose()` of the target watcher once and removes the entry. The second call ends normally with 0 additional `dispose()` calls | Contract of 1 dispose + delete                                    |
| TC-113  | Fire a workspace folder removed event while `startupTasks` is awaiting (`folderWatchers` is empty) | External - folder removal event during startup                             | No `TypeError` occurs, and after `removeReposWithinFolder` removes the repo, `sendRepos` is called once (the view is updated)                        | Regression of the startup race window (observed condition of [6]) |

### Failure-source inventory (include-or-justify) — added by Feature 045 (S20)

| Failure source                                                        | Case or reason for exclusion                                                                                               |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `undefined.dispose()` TypeError from stopping an unregistered path    | TC-111, TC-113                                                                                                             |
| Overwrite or leak of the existing watcher on a duplicate start        | TC-110                                                                                                                     |
| `sendRepos()` not reached because of a throw (view not updated)       | TC-113                                                                                                                     |
| Registered watcher not released                                       | TC-112                                                                                                                     |
| Regression where only optional chaining is used and the entry remains | TC-112 (verifies the entry is removed through the second call)                                                             |
| Enumeration branches for undefined / empty workspaceFolders           | excluded(the `startWatchingFolders` enumeration, equivalent to S16 TC-090/TC-091, does not change behavior in this change) |
| Branches of the watcher event handlers                                | excluded(already covered by the existing S13 to S14; outside this change)                                                  |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(no validation branch is added for the path argument; the existence check is verified as Boundary in TC-110/TC-111)
- Exception: excluded(the change removes the throw path through idempotency, so the absence of a throw is verified in TC-111/TC-113)
- External: TC-113
- Boundary: TC-110, TC-111
- Type: excluded(the argument is an internally passed `string` with no runtime type branch)

Numeric and empty boundaries (0 / minimum / maximum / +/-1 / empty / NULL) are out of scope because this section covers the contract of whether a Map entry exists and has no numeric boundary (the meaningful boundaries "unregistered" and "duplicate" are covered by TC-110/TC-111).

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-112), 3 failure cases (TC-110, TC-111, TC-113), ratio 3.0.
