# Test Perspectives: src/extensionState.ts

> Source: `src/extensionState.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest 4.x

## S1: constructor

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `constructor(context: ExtensionContext)`
**Target path**: `src/extensionState.ts:20-26`

| Case ID | Input / Precondition                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                               | Notes                                                          |
| ------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| TC-001  | Valid ExtensionContext (with globalState, workspaceState, globalStoragePath) | Normal - standard                                                          | `globalState`, `workspaceState`, `globalStoragePath` are stored correctly. `globalStoragePath` is the value with backslashes converted to forward slashes by `getPathFromStr` | L21-24                                                         |
| TC-002  | Valid ExtensionContext                                                       | Normal - standard                                                          | `initAvatarStorage()` is called inside the constructor (fire-and-forget)                                                                                                      | L25. Not awaited, so it does not wait for the async completion |

## S2: initAvatarStorage (private)

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `private async initAvatarStorage(): Promise<void>`
**Target path**: `src/extensionState.ts:28-41`

| Case ID | Input / Precondition                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                               | Notes  |
| ------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ |
| TC-003  | The avatar directory already exists (fs.stat succeeds)                 | Normal - standard                                                          | `avatarStorageAvailable` becomes `true`. `fs.mkdir` is not called                                             | L31-32 |
| TC-004  | The avatar directory does not exist (fs.stat fails), fs.mkdir succeeds | Normal - standard                                                          | `avatarStorageAvailable` becomes `true`. `fs.mkdir` is called with the `{ recursive: true }` option           | L33-36 |
| TC-005  | fs.stat fails and fs.mkdir fails                                       | Validation - rejected precondition                                         | `avatarStorageAvailable` stays at its initial value `false`. The exception is swallowed and it fails silently | L37-39 |
| TC-006  | fs.stat throws an error                                                | External - fs.stat failure                                                 | Enters the outer catch block and tries to create the directory with fs.mkdir as a fallback                    | L33    |
| TC-007  | fs.mkdir throws an error                                               | External - fs.mkdir failure                                                | Enters the inner catch block, and `avatarStorageAvailable` stays `false`                                      | L37    |

## S3: getRepos

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public getRepos(): GitRepoSet`
**Target path**: `src/extensionState.ts:44-46`

| Case ID | Input / Precondition                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                      | Notes                                        |
| ------- | ---------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| TC-008  | A GitRepoSet is stored in workspaceState | Normal - standard                                                          | The stored GitRepoSet object is returned. `workspaceState.get` is called with the `"repoStates"` key | L45                                          |
| TC-009  | No value in workspaceState               | Boundary - empty                                                           | The default value `{}` is returned                                                                   | L45. The second argument `{}` is the default |

## S4: saveRepos

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public saveRepos(gitRepoSet: GitRepoSet): void`
**Target path**: `src/extensionState.ts:47-49`

| Case ID | Input / Precondition      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                          | Notes |
| ------- | ------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----- |
| TC-010  | A GitRepoSet with entries | Normal - standard                                                          | `workspaceState.update` is called once with `("repoStates", gitRepoSet)` | L48   |
| TC-011  | Empty object `{}`         | Boundary - empty                                                           | `workspaceState.update` is called once with `("repoStates", {})`         | L48   |

## S5: getLastActiveRepo

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public getLastActiveRepo(): string | null`
**Target path**: `src/extensionState.ts:52-54`

| Case ID | Input / Precondition                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                    | Notes                                          |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| TC-012  | A repository path is stored in workspaceState | Normal - standard                                                          | The stored string path is returned. `workspaceState.get` is called with the `"lastActiveRepo"` key | L53                                            |
| TC-013  | No value in workspaceState                    | Boundary - null                                                            | `null` is returned                                                                                 | L53. The second argument `null` is the default |

## S6: setLastActiveRepo

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public setLastActiveRepo(repo: string | null): void`
**Target path**: `src/extensionState.ts:55-57`

| Case ID | Input / Precondition                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                   | Notes                               |
| ------- | -------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------- |
| TC-014  | repo = a valid path string (for example "/path/to/repo") | Normal - standard                                                          | `workspaceState.update` is called once with `("lastActiveRepo", "/path/to/repo")` | L56                                 |
| TC-015  | repo = null                                              | Boundary - null                                                            | `workspaceState.update` is called once with `("lastActiveRepo", null)`            | L56                                 |
| TC-016  | repo = "" (empty string)                                 | Boundary - empty                                                           | `workspaceState.update` is called once with `("lastActiveRepo", "")`              | L56. Allowed by the type definition |

## S7: isAvatarStorageAvailable

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public isAvatarStorageAvailable(): boolean`
**Target path**: `src/extensionState.ts:60-62`

| Case ID | Input / Precondition                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result     | Notes                                           |
| ------- | -------------------------------------------- | -------------------------------------------------------------------------- | ------------------- | ----------------------------------------------- |
| TC-017  | initAvatarStorage has succeeded              | Normal - standard                                                          | `true` is returned  | L61. avatarStorageAvailable = true (L32 or L36) |
| TC-018  | Initial state / initAvatarStorage has failed | Normal - branch                                                            | `false` is returned | L61. Initial value false (L18)                  |

## S8: getAvatarStoragePath

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public getAvatarStoragePath(): string`
**Target path**: `src/extensionState.ts:63-65`

| Case ID | Input / Precondition                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                   | Notes                                                  |
| ------- | ------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| TC-019  | globalStoragePath = "/storage/path"   | Normal - standard                                                          | `"/storage/path/avatars"` is returned (the result of `path.join`) | L64                                                    |
| TC-020  | globalStoragePath = "" (empty string) | Boundary - empty                                                           | `"avatars"` is returned (`path.join("", "avatars")`)              | L64. When an empty string was passed to getPathFromStr |

## S9: getAvatarCache

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public getAvatarCache(): AvatarCache`
**Target path**: `src/extensionState.ts:66-68`

| Case ID | Input / Precondition                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                     | Notes                                        |
| ------- | --------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| TC-021  | An AvatarCache is stored in globalState | Normal - standard                                                          | The stored AvatarCache object is returned. `globalState.get` is called with the `"avatarCache"` key | L67                                          |
| TC-022  | No value in globalState                 | Boundary - empty                                                           | The default value `{}` is returned                                                                  | L67. The second argument `{}` is the default |

## S10: saveAvatar

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public saveAvatar(email: string, avatar: Avatar): void`
**Target path**: `src/extensionState.ts:69-73`

| Case ID | Input / Precondition                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                            | Notes                                           |
| ------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| TC-023  | New email, empty cache                                                 | Normal - standard                                                          | `globalState.update` is called with `("avatarCache", { [email]: avatar })`                                 | L70-72                                          |
| TC-024  | The cache already has an entry for the same email                      | Normal - branch                                                            | `globalState.update` is called with a cache in which that email's avatar is overwritten with the new value | L71. Overwrites the existing entry              |
| TC-025  | email = "" (empty string)                                              | Boundary - empty                                                           | `globalState.update` is called, and the avatar is stored under the key `""`                                | L71. An empty string is also a valid object key |
| TC-026  | email contains special characters (for example "user+tag@example.com") | Boundary - special chars                                                   | `globalState.update` is called, and the avatar is stored correctly under the key with special characters   | L71                                             |

## S11: removeAvatarFromCache

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public removeAvatarFromCache(email: string): void`
**Target path**: `src/extensionState.ts:74-78`

| Case ID | Input / Precondition                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                            | Notes  |
| ------- | ------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ |
| TC-027  | The cache has an entry for the email | Normal - standard                                                          | `globalState.update` is called with a cache from which the email is removed                                                | L75-77 |
| TC-028  | The email is not in the cache        | Validation - rejected precondition                                         | `globalState.update` is called, but the cache contents do not change. The delete operator does not throw for a missing key | L76    |
| TC-029  | Empty cache `{}`                     | Boundary - empty                                                           | `globalState.update` is called with `("avatarCache", {})`                                                                  | L75-77 |

## S12: clearAvatarCache

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public async clearAvatarCache(): Promise<void>`
**Target path**: `src/extensionState.ts:79-88`

| Case ID | Input / Precondition                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                     | Notes                                                                   |
| ------- | -------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| TC-030  | Files exist in the avatar directory                | Normal - standard                                                          | `globalState.update("avatarCache", {})` is called, then `fs.readdir`, then `fs.unlink` for each file                | L80, L83-84                                                             |
| TC-031  | Order of operations when running clearAvatarCache  | Normal - standard                                                          | `globalState.update` (L80) runs before `fs.readdir` (L83). The cache is always cleared even if deleting files fails | L80 is outside the try                                                  |
| TC-032  | No files in the avatar directory (empty directory) | Boundary - empty                                                           | `globalState.update("avatarCache", {})` is called, `fs.readdir` returns `[]`, and `fs.unlink` is not called         | L83-84. Promise.all([]) resolves immediately                            |
| TC-033  | fs.readdir errors (directory missing and the like) | External - fs.readdir failure                                              | The cache has been cleared by `globalState.update({})`. Deleting files is skipped and fails silently                | L85-87. Inconsistency between the cache and the file system is accepted |
| TC-034  | fs.unlink fails for some files                     | External - fs.unlink failure                                               | `fs.unlink` still runs for the other files (`Promise.all` + an individual `.catch`). The cache has been cleared     | L84. Each failure is swallowed by `.catch(() => {})`                    |

## S13: saveRepos recentActions normalization

> Origin: Feature 034 (context-menu-recent-actions) Task 2
> Added: 2026-05-02
> Status: active
> Supersedes: -
> Signature: `public saveRepos(gitRepoSet: GitRepoSet): void`
> Target Path: `src/extensionState.ts`

| Case ID | Input / Precondition                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                | Notes                       |
| ------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| TC-035  | `recentActions = ["commit.createBranch", "commit.createWorktree", "commit.createBranch", "ref.push"]` | Normal - dedupe order                                                      | The `recentActions` passed to `workspaceState.update("repoStates", ...)` is collapsed to `["commit.createBranch", "commit.createWorktree", "ref.push"]`        | The first occurrence wins   |
| TC-036  | `recentActions` has 6 or more unique values                                                           | Boundary - max length                                                      | It is truncated to the first 5 before being persisted                                                                                                          | `MAX_RECENT_ACTIONS = 5`    |
| TC-037  | repo A has `recentActions` undefined, repo B has an empty array, and there is other state             | Validation - empty and undefined                                           | Other fields such as `commitOrdering` / `fileViewType` / `columnWidths` do not change, and repo states with undefined or empty arrays can be saved as they are | No effect on existing state |

## S14: waitForAvatarStorage() waiting for the initialization Promise

> Origin: フェーズ3 修正 L8 (avatar-storage-init-await)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: -
> Signature: `constructor(context: ExtensionContext)` / `public waitForAvatarStorage(): Promise<void>`
> Target Path: `src/extensionState.ts:20-26, 61-63`

A fix that keeps the Promise returned by `initAvatarStorage()`, which the constructor used to fire and forget, in `this.avatarStorageInit`, and exposes that Promise through `waitForAvatarStorage()`. When the caller (`gitGraphView.getHtmlForWebview`) uses `await` on it, it can evaluate `isAvatarStorageAvailable()` after avatar storage initialization has finished. `initAvatarStorage()` swallows exceptions internally, so the returned Promise always resolves and never rejects.

| Case ID | Input / Precondition                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                         | Notes                                           |
| ------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| TC-038  | Call `waitForAvatarStorage()` after creating an instance                                      | Normal - returns retained promise                                          | The same Promise instance that the constructor assigned to `avatarStorageInit` is returned                                              | Keeps the return value of `initAvatarStorage()` |
| TC-039  | `await waitForAvatarStorage()` where `initAvatarStorage` completes with `fs.mkdir` succeeding | Normal - resolves after init completes                                     | After the await resolves, `isAvatarStorageAvailable()` returns `true`                                                                   | State is settled by waiting for completion      |
| TC-040  | Call `waitForAvatarStorage()` several times                                                   | Boundary - idempotent single init                                          | The same Promise instance is returned every time, and `initAvatarStorage` (fs.stat/mkdir) runs only once at creation and is not rerun   | Initialization happens only once                |
| TC-041  | `await waitForAvatarStorage()` where `fs.stat` fails and `fs.mkdir` fails                     | External - init failure still resolves                                     | The returned Promise resolves (`undefined`) without rejecting, and the await does not throw. `isAvatarStorageAvailable()` stays `false` | Checks that exceptions are swallowed            |
| TC-042  | Call and await `waitForAvatarStorage()` after `initAvatarStorage` has completed               | Boundary - already settled promise                                         | The already settled Promise resolves immediately, and no extra side effects (fs calls) occur                                            | Awaiting again after settling                   |
