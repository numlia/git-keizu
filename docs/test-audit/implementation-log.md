# Test Implementation Log

> Generated: 2026-03-23T00:27:09+09:00
> Test Plans Processed: 15
> Total Tests Generated: 312
> Total Tests Passed: 312
> Total Tests Failed: 0
> Total Tests Skipped: 0

## Summary

| テストプラン            | ソースファイル         | テストファイル                    | 生成数 | 成功 | 失敗 | スキップ |
| ----------------------- | ---------------------- | --------------------------------- | ------ | ---- | ---- | -------- |
| stashMenu-test.md       | web/stashMenu.ts       | tests/web/stashMenu.test.ts       | 28     | 28   | 0    | 0        |
| repoFileWatcher-test.md | src/repoFileWatcher.ts | tests/src/repoFileWatcher.test.ts | 31     | 31   | 0    | 0        |
| extensionState-test.md  | src/extensionState.ts  | tests/src/extensionState.test.ts  | 34     | 34   | 0    | 0        |

| repoManager-test.md | src/repoManager.ts | tests/src/repoManager.lifecycle.test.ts | 19 | 19 | 0 | 0 |
| repoManager-test.md | src/repoManager.ts | tests/src/repoManager.state.test.ts | 31 | 31 | 0 | 0 |
| repoManager-test.md | src/repoManager.ts | tests/src/repoManager.discovery.test.ts | 16 | 16 | 0 | 0 |
| repoManager-test.md | src/repoManager.ts | tests/src/repoManager.fs.test.ts | 5 | 5 | 0 | 0 |
| repoManager-test.md | src/repoManager.ts | tests/src/repoManager.workspaceEvents.test.ts | 12 | 12 | 0 | 0 |
| repoManager-test.md | src/repoManager.ts | tests/src/repoManager.eventProcessing.test.ts | 21 | 21 | 0 | 0 |

| avatarManager-test.md | src/avatarManager.ts | tests/src/avatarManager.public.test.ts | 25 | 25 | 0 | 0 |
| avatarManager-test.md | src/avatarManager.ts | tests/src/avatarManager.remoteFetch.test.ts | 21 | 21 | 0 | 0 |
| avatarManager-test.md | src/avatarManager.ts | tests/src/avatarManager.io.test.ts | 18 | 18 | 0 | 0 |
| avatarManager-test.md | src/avatarManager.ts | tests/src/avatarManager.queue.test.ts | 18 | 18 | 0 | 0 |
| statusBarItem-test.md | src/statusBarItem.ts | tests/src/statusBarItem.test.ts | 13 | 13 | 0 | 0 |
| extension-test.md | src/extension.ts | tests/src/extension.test.ts | 20 | 20 | 0 | 0 |

## Details

### web/stashMenu.ts

**テストプラン**: `docs/testing/perspectives/web/stashMenu-test.md`
**ソースファイル**: `web/stashMenu.ts`
**テストファイル**: `tests/web/stashMenu.test.ts`

| Case ID | テスト名                                                                      | 結果 | リトライ数 | 備考                       |
| ------- | ----------------------------------------------------------------------------- | ---- | ---------- | -------------------------- |
| TC-001  | returns 7-element array with null separator at index 4                        | PASS | 0          | -                          |
| TC-002  | each menu item has the correct title                                          | PASS | 0          | -                          |
| TC-003  | onClick calls showCheckboxDialog with correct arguments                       | PASS | 0          | -                          |
| TC-004  | callback with reinstateIndex=true sends applyStash message                    | PASS | 0          | -                          |
| TC-005  | callback with reinstateIndex=false sends applyStash message                   | PASS | 0          | -                          |
| TC-006  | onClick calls showRefInputDialog with correct arguments                       | PASS | 0          | -                          |
| TC-007  | callback with branch name sends branchFromStash message                       | PASS | 0          | -                          |
| TC-008  | onClick calls showCheckboxDialog with correct arguments including remove text | PASS | 0          | -                          |
| TC-009  | callback with reinstateIndex=true sends popStash message                      | PASS | 0          | -                          |
| TC-010  | callback with reinstateIndex=false sends popStash message                     | PASS | 0          | -                          |
| TC-011  | onClick calls showConfirmationDialog with correct arguments                   | PASS | 0          | -                          |
| TC-012  | callback sends dropStash message                                              | PASS | 0          | -                          |
| TC-013  | Copy Stash Name sends copyToClipboard with selector as data                   | PASS | 0          | -                          |
| TC-014  | Copy Stash Hash sends copyToClipboard with hash as data                       | PASS | 0          | -                          |
| TC-015  | empty selector embeds empty escapeHtml result in dialog and sendMessage       | PASS | 0          | Boundary - empty           |
| TC-016  | empty repo is passed through to sendMessage                                   | PASS | 0          | Boundary - empty           |
| TC-017  | empty hash is passed through to Copy Hash sendMessage                         | PASS | 0          | Boundary - empty           |
| TC-018  | HTML special characters are escaped in dialog messages                        | PASS | 0          | Boundary - special chars   |
| TC-019  | script tag is escaped preventing XSS                                          | PASS | 0          | XSS prevention             |
| TC-020  | @ and {} in stash selector are not escaped by escapeHtml                      | PASS | 0          | Boundary - stash format    |
| TC-021  | unicode characters pass through escapeHtml unchanged                          | PASS | 0          | Type - unicode             |
| TC-022  | newline characters pass through escapeHtml unchanged                          | PASS | 0          | Boundary - whitespace      |
| TC-023  | pre-encoded ampersand gets double-encoded by escapeHtml                       | PASS | 0          | Boundary - double encoding |
| TC-024  | repo with spaces is passed through to sendMessage as-is                       | PASS | 0          | Boundary - spaces          |
| TC-025  | non-hex hash is passed through to sendMessage as-is                           | PASS | 0          | Type - invalid format      |
| TC-026  | null selector causes escapeHtml to throw TypeError at runtime                 | PASS | 0          | Boundary - null            |
| TC-027  | null hash is passed through to sendMessage data                               | PASS | 0          | Boundary - null            |
| TC-028  | very long string is passed through without truncation                         | PASS | 0          | Boundary - max length      |

### テスト実行コマンド

```bash
npx --yes pnpm@10.29.3 exec vitest run tests/web/stashMenu.test.ts
```

### カバレッジ

N/A (単体ファイル実行のため省略)

### src/repoFileWatcher.ts

**テストプラン**: `docs/testing/perspectives/src/repoFileWatcher-test.md`
**ソースファイル**: `src/repoFileWatcher.ts`
**テストファイル**: `tests/src/repoFileWatcher.test.ts`

| Case ID | テスト名                                                         | 結果 | リトライ数 | 備考                     |
| ------- | ---------------------------------------------------------------- | ---- | ---------- | ------------------------ |
| TC-001  | should create instance with null watcher and default state       | PASS | 0          | -                        |
| TC-002  | should create watcher and register 3 event listeners             | PASS | 0          | -                        |
| TC-003  | should dispose existing watcher before creating new one          | PASS | 0          | -                        |
| TC-004  | should create watcher with '/\*\*' glob for empty string repo    | PASS | 0          | Boundary - empty         |
| TC-005  | should create watcher with double-slash glob for trailing-slash  | PASS | 0          | Boundary - format        |
| TC-006  | should dispose watcher and set to null                           | PASS | 0          | -                        |
| TC-007  | should do nothing when no watcher exists                         | PASS | 0          | Equivalence - abnormal   |
| TC-008  | should handle consecutive stop calls safely                      | PASS | 0          | Boundary - repeated call |
| TC-009  | should block refresh callback when muted                         | PASS | 0          | -                        |
| TC-010  | should set muted to false and resumeAt to now + 1500ms           | PASS | 0          | -                        |
| TC-011  | should set resumeAt precisely to Date.now() + 1500               | PASS | 0          | Boundary - timing        |
| TC-012  | should early return when muted                                   | PASS | 0          | Equivalence - abnormal   |
| TC-013  | should early return when within grace period                     | PASS | 0          | Equivalence - abnormal   |
| TC-014  | should pass through when time equals resumeAt exactly            | PASS | 0          | Boundary - exact         |
| TC-015  | should invoke callback when past grace period                    | PASS | 0          | -                        |
| TC-016  | should match .git/config (pattern 1)                             | PASS | 0          | -                        |
| TC-017  | should match .git/refs/heads/main (pattern 1)                    | PASS | 0          | -                        |
| TC-018  | should match src/index.ts (pattern 2)                            | PASS | 0          | -                        |
| TC-019  | should match .gitignore (pattern 3)                              | PASS | 0          | -                        |
| TC-020  | should not match .git/objects/ab/cd1234                          | PASS | 0          | Equivalence - abnormal   |
| TC-021  | should not match .git/hooks/pre-commit                           | PASS | 0          | Equivalence - abnormal   |
| TC-022  | should not match .git/logs/HEAD                                  | PASS | 0          | Equivalence - abnormal   |
| TC-023  | should not match .git/COMMIT_EDITMSG                             | PASS | 0          | Equivalence - abnormal   |
| TC-024  | should not match .git/ (directory only)                          | PASS | 0          | Boundary - edge          |
| TC-025  | should not match .git (no trailing slash)                        | PASS | 0          | Boundary - edge          |
| TC-026  | should match empty string after prefix removal (pattern 2)       | PASS | 0          | Boundary - empty         |
| TC-027  | should match .git/refs/heads/ with empty branch name (pattern 1) | PASS | 0          | Boundary - format        |
| TC-028  | should schedule callback with 750ms debounce                     | PASS | 0          | -                        |
| TC-029  | should debounce 3 rapid changes into single callback             | PASS | 0          | -                        |
| TC-030  | should not call clearTimeout when refreshTimeout is null         | PASS | 0          | -                        |
| TC-031  | should clearTimeout existing timer before setting new one        | PASS | 0          | -                        |

### テスト実行コマンド

```bash
npx --yes pnpm@10.29.3 exec vitest run tests/src/repoFileWatcher.test.ts
```

### カバレッジ

N/A (単体ファイル実行のため省略)

### src/extensionState.ts

**テストプラン**: `docs/testing/perspectives/src/extensionState-test.md`
**ソースファイル**: `src/extensionState.ts`
**テストファイル**: `tests/src/extensionState.test.ts`

| Case ID | テスト名                                                                | 結果 | リトライ数 | 備考                        |
| ------- | ----------------------------------------------------------------------- | ---- | ---------- | --------------------------- |
| TC-001  | stores globalState, workspaceState, and normalized globalStoragePath    | PASS | 0          | -                           |
| TC-002  | calls initAvatarStorage on construction (fire-and-forget)               | PASS | 0          | -                           |
| TC-003  | sets avatarStorageAvailable to true when directory exists               | PASS | 0          | -                           |
| TC-004  | creates directory and sets available when stat fails but mkdir succeeds | PASS | 0          | -                           |
| TC-005  | keeps avatarStorageAvailable false when both stat and mkdir fail        | PASS | 0          | Equivalence - abnormal      |
| TC-006  | attempts mkdir as fallback when fs.stat throws                          | PASS | 0          | External - fs.stat failure  |
| TC-007  | keeps available false when fs.mkdir throws in inner catch               | PASS | 0          | External - fs.mkdir failure |
| TC-008  | returns stored GitRepoSet from workspaceState                           | PASS | 0          | -                           |
| TC-009  | returns default empty object when no repos stored                       | PASS | 0          | Boundary - empty            |
| TC-010  | updates workspaceState with provided GitRepoSet                         | PASS | 0          | -                           |
| TC-011  | updates workspaceState with empty object                                | PASS | 0          | Boundary - zero/empty       |
| TC-012  | returns stored repo path from workspaceState                            | PASS | 0          | -                           |
| TC-013  | returns null when no repo stored                                        | PASS | 0          | Boundary - null             |
| TC-014  | updates workspaceState with valid repo path                             | PASS | 0          | -                           |
| TC-015  | updates workspaceState with null                                        | PASS | 0          | Boundary - null             |
| TC-016  | updates workspaceState with empty string                                | PASS | 0          | Boundary - empty            |
| TC-017  | returns true after successful initAvatarStorage                         | PASS | 0          | -                           |
| TC-018  | returns false in initial state or after failed initAvatarStorage        | PASS | 0          | -                           |
| TC-019  | returns globalStoragePath joined with 'avatars'                         | PASS | 0          | -                           |
| TC-020  | returns 'avatars' when globalStoragePath is empty string                | PASS | 0          | Boundary - empty            |
| TC-021  | returns stored AvatarCache from globalState                             | PASS | 0          | -                           |
| TC-022  | returns default empty object when no cache stored                       | PASS | 0          | Boundary - empty            |
| TC-023  | adds new avatar to empty cache                                          | PASS | 0          | -                           |
| TC-024  | overwrites existing avatar for same email                               | PASS | 0          | -                           |
| TC-025  | saves avatar with empty string email                                    | PASS | 0          | Boundary - empty            |
| TC-026  | saves avatar with special characters in email                           | PASS | 0          | Boundary - special chars    |
| TC-027  | removes existing email from cache                                       | PASS | 0          | -                           |
| TC-028  | handles removing non-existent email from cache                          | PASS | 0          | Equivalence - abnormal      |
| TC-029  | handles removing from empty cache                                       | PASS | 0          | Boundary - empty            |
| TC-030  | clears cache and deletes avatar files                                   | PASS | 0          | -                           |
| TC-031  | clears cache before attempting file deletion                            | PASS | 0          | -                           |
| TC-032  | handles empty avatar directory                                          | PASS | 0          | Boundary - zero/empty       |
| TC-033  | handles readdir failure gracefully                                      | PASS | 0          | External - fs.readdir       |
| TC-034  | continues unlinking other files when some unlink calls fail             | PASS | 0          | External - fs.unlink        |

### テスト実行コマンド

```bash
npx --yes pnpm@10.29.3 exec vitest run tests/src/extensionState.test.ts
```

### カバレッジ

N/A (単体ファイル実行のため省略)

### src/repoManager.ts (lifecycle)

**テストプラン**: `docs/testing/perspectives/src/repoManager-test.md`
**ソースファイル**: `src/repoManager.ts`
**テストファイル**: `tests/src/repoManager.lifecycle.test.ts`

| Case ID | テスト名                                                                                | 結果 | リトライ数 | 備考 |
| ------- | --------------------------------------------------------------------------------------- | ---- | ---------- | ---- |
| TC-001  | skips registration when the URI points to an already registered repository              | PASS | 0          | -    |
| TC-002  | registers a new repository and notifies the view when the URI is a git repository       | PASS | 0          | -    |
| TC-003  | skips registration when the URI is not a git repository                                 | PASS | 0          | -    |
| TC-011  | disposes the workspace folder handler and clears the field when it exists               | PASS | 0          | -    |
| TC-012  | completes without error when the workspace folder handler is already null               | PASS | 0          | -    |
| TC-013  | disposes all folder watchers and removes all watcher entries                            | PASS | 0          | -    |
| TC-014  | completes without error when there are no folder watchers                               | PASS | 0          | -    |
| TC-015  | stores the provided callback during registerViewCallback                                | PASS | 0          | -    |
| TC-016  | clears the stored callback during deregisterViewCallback                                | PASS | 0          | -    |
| TC-017  | sendRepos invokes the callback with sorted repos and the repo count                     | PASS | 0          | -    |
| TC-018  | sendRepos updates the status bar and does nothing else when no callback is registered   | PASS | 0          | -    |
| TC-019  | sendRepos passes an empty repo set and zero count to the callback                       | PASS | 0          | -    |
| TC-020  | updates the stored depth and searches the workspace when the configured depth increases | PASS | 0          | -    |
| TC-021  | updates the stored depth without searching when the configured depth decreases          | PASS | 0          | -    |
| TC-022  | keeps the same depth and skips searching when the configured depth is unchanged         | PASS | 0          | -    |
| TC-095  | sendRepos is called when checkReposExist reports no changes                             | PASS | 0          | -    |
| TC-096  | sendRepos is not called by startupTasks when checkReposExist already reported changes   | PASS | 0          | -    |
| TC-097  | runs the startup orchestration steps in the expected order                              | PASS | 0          | -    |
| TC-098  | sends an empty repo set when startup runs with no repos in the initial state            | PASS | 0          | -    |

### テスト実行コマンド

```bash
npx --yes pnpm@10.29.3 exec vitest run tests/src/repoManager.lifecycle.test.ts tests/src/repoManager.state.test.ts tests/src/repoManager.discovery.test.ts tests/src/repoManager.fs.test.ts tests/src/repoManager.workspaceEvents.test.ts tests/src/repoManager.eventProcessing.test.ts
```

### カバレッジ

N/A (targeted multi-file execution; coverage not collected)

### src/repoManager.ts (state)

**テストプラン**: `docs/testing/perspectives/src/repoManager-test.md`
**ソースファイル**: `src/repoManager.ts`
**テストファイル**: `tests/src/repoManager.state.test.ts`

| Case ID | テスト名                                                                               | 結果 | リトライ数 | 備考 |
| ------- | -------------------------------------------------------------------------------------- | ---- | ---------- | ---- |
| TC-023  | returns a sorted GitRepoSet with all stored repo states                                | PASS | 0          | -    |
| TC-024  | returns an empty GitRepoSet when no repos are stored                                   | PASS | 0          | -    |
| TC-025  | addRepo stores a new repo with the default state and persists it                       | PASS | 0          | -    |
| TC-026  | addRepo accepts the empty string as a repo key without validation                      | PASS | 0          | -    |
| TC-027  | removeRepo deletes a registered repo and persists the updated state                    | PASS | 0          | -    |
| TC-028  | removeRepo persists even when the target key is not registered                         | PASS | 0          | -    |
| TC-029  | addRepo overwrites an existing repo state with the default state                       | PASS | 0          | -    |
| TC-030  | stores the provided GitRepoState for a valid repo key and persists it                  | PASS | 0          | -    |
| TC-031  | returns early for "**proto**" and does not persist any changes                         | PASS | 0          | -    |
| TC-032  | returns early for "constructor" and does not persist any changes                       | PASS | 0          | -    |
| TC-033  | returns early for "prototype" and does not persist any changes                         | PASS | 0          | -    |
| TC-034  | accepts the empty string as a repo key because it is not guarded                       | PASS | 0          | -    |
| TC-035  | returns false and leaves the state unchanged when all repos still exist                | PASS | 0          | -    |
| TC-036  | removes only the missing repo, sends one notification, and returns true                | PASS | 0          | -    |
| TC-037  | removes all repos, sends one notification, and returns true when every repo is missing | PASS | 0          | -    |
| TC-038  | returns false and performs no lookups when the repo set is empty                       | PASS | 0          | -    |
| TC-039  | leaves repos untouched when every repo is inside one of the workspace folders          | PASS | 0          | -    |
| TC-040  | removes only repos that fall outside the configured workspace folders                  | PASS | 0          | -    |
| TC-041  | treats undefined workspace folders as no roots and removes every repo                  | PASS | 0          | -    |
| TC-042  | treats an empty workspace folder array as no roots and removes every repo              | PASS | 0          | -    |
| TC-043  | preserves a repo whose path exactly matches a workspace folder path                    | PASS | 0          | -    |
| TC-044  | removeReposWithinFolder removes a repo whose path exactly matches the target folder    | PASS | 0          | -    |
| TC-045  | removeReposWithinFolder removes child repos under the target parent folder             | PASS | 0          | -    |
| TC-046  | removeReposWithinFolder returns false when no repo paths match the target folder       | PASS | 0          | -    |
| TC-047  | removeReposWithinFolder returns false when there are no repos to inspect               | PASS | 0          | -    |
| TC-048  | removeReposWithinFolder removes every repo that matches the target folder              | PASS | 0          | -    |
| TC-049  | isDirectoryWithinRepos returns true when the path exactly matches a repo path          | PASS | 0          | -    |
| TC-050  | isDirectoryWithinRepos returns true for a subdirectory of a known repo                 | PASS | 0          | -    |
| TC-051  | isDirectoryWithinRepos returns false for an unrelated path                             | PASS | 0          | -    |
| TC-052  | isDirectoryWithinRepos returns false for a prefix-only match without a path separator  | PASS | 0          | -    |
| TC-053  | isDirectoryWithinRepos returns false when there are no repos                           | PASS | 0          | -    |

### テスト実行コマンド

```bash
npx --yes pnpm@10.29.3 exec vitest run tests/src/repoManager.lifecycle.test.ts tests/src/repoManager.state.test.ts tests/src/repoManager.discovery.test.ts tests/src/repoManager.fs.test.ts tests/src/repoManager.workspaceEvents.test.ts tests/src/repoManager.eventProcessing.test.ts
```

### カバレッジ

N/A (targeted multi-file execution; coverage not collected)

### src/repoManager.ts (discovery)

**テストプラン**: `docs/testing/perspectives/src/repoManager-test.md`
**ソースファイル**: `src/repoManager.ts`
**テストファイル**: `tests/src/repoManager.discovery.test.ts`

| Case ID | テスト名                                                                                             | 結果 | リトライ数 | 備考 |
| ------- | ---------------------------------------------------------------------------------------------------- | ---- | ---------- | ---- |
| TC-054  | returns false immediately when the directory is already inside a known repo                          | PASS | 0          | -    |
| TC-055  | adds the directory and returns true when the directory itself is a git repository                    | PASS | 0          | -    |
| TC-056  | recurses into subdirectories and returns true when a child git repository is discovered              | PASS | 0          | -    |
| TC-057  | returns false without recursing when maxDepth is zero                                                | PASS | 0          | -    |
| TC-058  | skips the .git entry when enumerating child directories                                              | PASS | 0          | -    |
| TC-059  | returns false after exploring all child directories when no repo is found                            | PASS | 0          | -    |
| TC-060  | returns false when fs.readdir fails while enumerating subdirectories                                 | PASS | 0          | -    |
| TC-061  | returns false when isGitRepository throws an API error                                               | PASS | 0          | -    |
| TC-062  | returns false when the target directory path does not exist                                          | PASS | 0          | -    |
| TC-063  | returns false when the directory contains only files and no subdirectories                           | PASS | 0          | -    |
| TC-099  | does nothing when workspaceFolders is undefined                                                      | PASS | 0          | -    |
| TC-100  | sends repos when a workspace root search reports changes                                             | PASS | 0          | -    |
| TC-101  | skips sendRepos when the workspace root search reports no changes                                    | PASS | 0          | -    |
| TC-102  | searches every workspace folder and sends repos once when at least one search reports changes        | PASS | 0          | -    |
| TC-103  | does nothing when workspaceFolders is an empty array                                                 | PASS | 0          | -    |
| TC-104  | passes maxDepth 0 through to searchDirectoryForRepos without sending repos when no changes are found | PASS | 0          | -    |

### テスト実行コマンド

```bash
npx --yes pnpm@10.29.3 exec vitest run tests/src/repoManager.lifecycle.test.ts tests/src/repoManager.state.test.ts tests/src/repoManager.discovery.test.ts tests/src/repoManager.fs.test.ts tests/src/repoManager.workspaceEvents.test.ts tests/src/repoManager.eventProcessing.test.ts
```

### カバレッジ

N/A (targeted multi-file execution; coverage not collected)

### src/repoManager.ts (fs utilities)

**テストプラン**: `docs/testing/perspectives/src/repoManager-test.md`
**ソースファイル**: `src/repoManager.ts`
**テストファイル**: `tests/src/repoManager.fs.test.ts`

| Case ID | テスト名                                             | 結果 | リトライ数 | 備考 |
| ------- | ---------------------------------------------------- | ---- | ---------- | ---- |
| TC-085  | returns true when fs.stat reports a directory path   | PASS | 0          | -    |
| TC-086  | returns false when fs.stat reports a file path       | PASS | 0          | -    |
| TC-087  | returns false when fs.stat throws for a missing path | PASS | 0          | -    |
| TC-088  | returns true when fs.stat succeeds for the path      | PASS | 0          | -    |
| TC-089  | returns false when fs.stat throws for a missing path | PASS | 0          | -    |

### テスト実行コマンド

```bash
npx --yes pnpm@10.29.3 exec vitest run tests/src/repoManager.lifecycle.test.ts tests/src/repoManager.state.test.ts tests/src/repoManager.discovery.test.ts tests/src/repoManager.fs.test.ts tests/src/repoManager.workspaceEvents.test.ts tests/src/repoManager.eventProcessing.test.ts
```

### カバレッジ

N/A (targeted multi-file execution; coverage not collected)

### src/repoManager.ts (workspace events)

**テストプラン**: `docs/testing/perspectives/src/repoManager-test.md`
**ソースファイル**: `src/repoManager.ts`
**テストファイル**: `tests/src/repoManager.workspaceEvents.test.ts`

| Case ID | テスト名                                                                                      | 結果 | リトライ数 | 備考 |
| ------- | --------------------------------------------------------------------------------------------- | ---- | ---------- | ---- |
| TC-004  | sends repos when an added folder search reports repo changes                                  | PASS | 0          | -    |
| TC-005  | skips sendRepos when an added folder search reports no repo changes                           | PASS | 0          | -    |
| TC-006  | sends repos when a removed folder causes repo removals                                        | PASS | 0          | -    |
| TC-007  | skips sendRepos when a removed folder produces no repo removals                               | PASS | 0          | -    |
| TC-008  | skips the added-folder branch when no folders were added                                      | PASS | 0          | -    |
| TC-009  | skips the removed-folder branch when no folders were removed                                  | PASS | 0          | -    |
| TC-010  | processes added folders before removed folders when both arrays are non-empty                 | PASS | 0          | -    |
| TC-090  | startWatchingFolders starts one watcher for each workspace folder                             | PASS | 0          | -    |
| TC-091  | startWatchingFolders does nothing when workspaceFolders is undefined                          | PASS | 0          | -    |
| TC-092  | startWatchingFolder creates a file system watcher and registers create/change/delete handlers | PASS | 0          | -    |
| TC-093  | stopWatchingFolder disposes and removes an existing watcher entry                             | PASS | 0          | -    |
| TC-094  | stopWatchingFolder throws a TypeError when the watcher entry does not exist                   | PASS | 0          | -    |

### テスト実行コマンド

```bash
npx --yes pnpm@10.29.3 exec vitest run tests/src/repoManager.lifecycle.test.ts tests/src/repoManager.state.test.ts tests/src/repoManager.discovery.test.ts tests/src/repoManager.fs.test.ts tests/src/repoManager.workspaceEvents.test.ts tests/src/repoManager.eventProcessing.test.ts
```

### カバレッジ

N/A (targeted multi-file execution; coverage not collected)

### src/repoManager.ts (event processing)

**テストプラン**: `docs/testing/perspectives/src/repoManager-test.md`
**ソースファイル**: `src/repoManager.ts`
**テストファイル**: `tests/src/repoManager.eventProcessing.test.ts`

| Case ID | テスト名                                                                                                | 結果 | リトライ数 | 備考 |
| ------- | ------------------------------------------------------------------------------------------------------- | ---- | ---------- | ---- |
| TC-064  | onWatcherCreate ignores paths that contain "/.git/"                                                     | PASS | 0          | -    |
| TC-065  | onWatcherCreate trims a trailing "/.git" suffix before queueing the path                                | PASS | 0          | -    |
| TC-066  | onWatcherCreate ignores duplicate paths that are already queued                                         | PASS | 0          | -    |
| TC-067  | onWatcherCreate queues a new path and schedules processing when no timer exists                         | PASS | 0          | -    |
| TC-068  | onWatcherCreate clears the existing timer before scheduling a new one                                   | PASS | 0          | -    |
| TC-069  | onWatcherChange ignores paths that contain "/.git/"                                                     | PASS | 0          | -    |
| TC-070  | onWatcherChange trims a trailing "/.git" suffix before queueing the path                                | PASS | 0          | -    |
| TC-071  | onWatcherChange ignores duplicate paths that are already queued                                         | PASS | 0          | -    |
| TC-072  | onWatcherChange queues a new path and schedules processing                                              | PASS | 0          | -    |
| TC-073  | onWatcherDelete ignores paths that contain "/.git/"                                                     | PASS | 0          | -    |
| TC-074  | onWatcherDelete trims a trailing "/.git" suffix and sends repos when removals occur                     | PASS | 0          | -    |
| TC-075  | onWatcherDelete sends repos when a normal path removal reports changes                                  | PASS | 0          | -    |
| TC-076  | onWatcherDelete skips sendRepos when no repos are removed                                               | PASS | 0          | -    |
| TC-077  | processCreateEvents does nothing when the create queue is empty                                         | PASS | 0          | -    |
| TC-078  | processCreateEvents searches a queued directory and sends repos when changes are found                  | PASS | 0          | -    |
| TC-079  | processCreateEvents skips non-directory paths                                                           | PASS | 0          | -    |
| TC-080  | processCreateEvents drains multiple paths and sends repos once when at least one search reports changes | PASS | 0          | -    |
| TC-081  | processChangeEvents does nothing when the change queue is empty                                         | PASS | 0          | -    |
| TC-082  | processChangeEvents removes repos and sends repos when a queued path no longer exists                   | PASS | 0          | -    |
| TC-083  | processChangeEvents skips removal when the queued path still exists                                     | PASS | 0          | -    |
| TC-084  | processChangeEvents skips sendRepos when a missing path causes no repo removals                         | PASS | 0          | -    |

### テスト実行コマンド

```bash
npx --yes pnpm@10.29.3 exec vitest run tests/src/repoManager.lifecycle.test.ts tests/src/repoManager.state.test.ts tests/src/repoManager.discovery.test.ts tests/src/repoManager.fs.test.ts tests/src/repoManager.workspaceEvents.test.ts tests/src/repoManager.eventProcessing.test.ts
```

### カバレッジ

N/A (targeted multi-file execution; coverage not collected)

### src/avatarManager.ts (public/cache/view)

**テストプラン**: `docs/testing/perspectives/src/avatarManager-test.md`
**ソースファイル**: `src/avatarManager.ts`
**テストファイル**: `tests/src/avatarManager.public.test.ts`

| Case ID | テスト名                                                                           | 結果 | リトライ数 | 備考 |
| ------- | ---------------------------------------------------------------------------------- | ---- | ---------- | ---- |
| TC-001  | stores storage path, avatar cache, and queue during construction                   | PASS | 0          | -    |
| TC-002  | itemsAvailableCallback starts the interval and triggers an immediate fetch         | PASS | 0          | -    |
| TC-003  | itemsAvailableCallback exits early when an interval is already running             | PASS | 0          | -    |
| TC-004  | enqueues an immediate request when the avatar is not cached                        | PASS | 0          | -    |
| TC-005  | sends a fresh cached avatar to the webview without queueing refresh                | PASS | 0          | -    |
| TC-006  | refreshes a stale cached avatar after 14 days while sending the current image      | PASS | 0          | -    |
| TC-007  | refreshes a stale identicon after four days while sending the cached identicon     | PASS | 0          | -    |
| TC-008  | does nothing when a cache entry exists with a null image and it is not stale       | PASS | 0          | -    |
| TC-009  | removes the cached avatar and re-queues an immediate fetch when webview send fails | PASS | 0          | -    |
| TC-010  | registerView stores the supplied view reference                                    | PASS | 0          | -    |
| TC-011  | deregisterView clears the stored view reference                                    | PASS | 0          | -    |
| TC-012  | removeAvatarFromCache deletes the local cache entry and updates ExtensionState     | PASS | 0          | -    |
| TC-013  | clearCache replaces the avatar map with an empty object and delegates cleanup      | PASS | 0          | -    |
| TC-014  | stops the interval when the queue is empty and a timer is active                   | PASS | 0          | -    |
| TC-015  | exits quietly when the queue is empty and no interval is running                   | PASS | 0          | -    |
| TC-016  | returns early when the queue reports items but no request is ready yet             | PASS | 0          | -    |
| TC-017  | dispatches GitHub requests to fetchFromGithub                                      | PASS | 0          | -    |
| TC-018  | dispatches GitLab requests to fetchFromGitLab                                      | PASS | 0          | -    |
| TC-019  | dispatches unknown remotes to fetchFromGravatar                                    | PASS | 0          | -    |
| TC-020  | ignores cached remote source objects because the cache hit check is incorrect      | PASS | 0          | -    |
| TC-021  | parses GitHub remotes into owner/repo metadata and caches the result               | PASS | 0          | -    |
| TC-022  | parses GitLab remotes into a gitlab source and caches the result                   | PASS | 0          | -    |
| TC-023  | falls back to gravatar for non-GitHub and non-GitLab remotes                       | PASS | 0          | -    |
| TC-024  | falls back to gravatar when no remote URL is available                             | PASS | 0          | -    |
| TC-025  | rejects with TypeError when a GitHub URL is missing the repo segment               | PASS | 0          | -    |

### テスト実行コマンド

```bash
npx --yes pnpm@10.29.3 exec vitest run tests/src/avatarManager.public.test.ts
```

### カバレッジ

N/A (targeted single-file execution; coverage not collected)

### src/extension.ts

**テストプラン**: `docs/testing/perspectives/src/extension-test.md`
**ソースファイル**: `src/extension.ts`
**テストファイル**: `tests/src/extension.test.ts`

| Case ID | テスト名                                                                     | 結果 | リトライ数 | 備考                                                   |
| ------- | ---------------------------------------------------------------------------- | ---- | ---------- | ------------------------------------------------------ |
| TC-001  | initializes dependencies, registers disposables, and logs activation success | PASS | 0          | -                                                      |
| TC-002  | rethrows output channel creation failures before dependency setup starts     | PASS | 0          | External - vscode.window.createOutputChannel failure   |
| TC-003  | rethrows RepoManager constructor failures before disposables are registered  | PASS | 1          | External - RepoManager constructor failure             |
| TC-004  | rethrows subscription push failures after all disposables are prepared       | PASS | 1          | External - ExtensionContext.subscriptions.push failure |
| TC-005  | rethrows activation log failures after successful registration               | PASS | 1          | External - OutputChannel.appendLine failure            |
| TC-006  | forwards a Uri argument as rootUri to GitKeizuView.createOrShow              | PASS | 0          | -                                                      |
| TC-007  | forwards an object rootUri property when it contains a Uri instance          | PASS | 0          | -                                                      |
| TC-008  | falls back to undefined when rootUri exists but is not a Uri instance        | PASS | 0          | Boundary - invalid rootUri shape                       |
| TC-009  | falls back to undefined for nullish and primitive command arguments          | PASS | 0          | Boundary - nullish or primitive arg                    |
| TC-010  | rethrows createOrShow failures from the view command handler                 | PASS | 0          | External - GitKeizuView.createOrShow failure           |
| TC-011  | delegates to AvatarManager.clearCache exactly once                           | PASS | 0          | -                                                      |
| TC-012  | rethrows AvatarManager.clearCache failures from the command handler          | PASS | 0          | External - AvatarManager.clearCache failure            |
| TC-013  | refreshes the status bar item when showStatusBarItem changes                 | PASS | 0          | -                                                      |
| TC-014  | regenerates git command formats when dateType changes                        | PASS | 0          | -                                                      |
| TC-015  | notifies RepoManager when maxDepthOfRepoSearch changes                       | PASS | 0          | -                                                      |
| TC-016  | registers the git path when git.path changes                                 | PASS | 0          | -                                                      |
| TC-017  | performs no action when no watched setting changes                           | PASS | 0          | Equivalence - normal (no-op)                           |
| TC-018  | gives priority to showStatusBarItem when multiple watched settings match     | PASS | 0          | Boundary - overlapping configuration matches           |
| TC-019  | rethrows routed configuration handler failures                               | PASS | 0          | External - configuration handler failure               |
| TC-020  | returns undefined and performs no additional work before or after activation | PASS | 0          | -                                                      |

### テスト実行コマンド

```bash
npx --yes pnpm@10.29.3 exec vitest run tests/src/extension.test.ts
```

### カバレッジ

N/A (targeted single-file execution; coverage not collected)

### src/statusBarItem.ts

**テストプラン**: `docs/testing/perspectives/src/statusBarItem-test.md`
**ソースファイル**: `src/statusBarItem.ts`
**テストファイル**: `tests/src/statusBarItem.test.ts`

| Case ID | テスト名                                                             | 結果 | リトライ数 | 備考 |
| ------- | -------------------------------------------------------------------- | ---- | ---------- | ---- |
| TC-001  | creates and registers the status bar item with the expected metadata | PASS | 0          | -    |
| TC-002  | rethrows createStatusBarItem failures without registering the item   | PASS | 0          | -    |
| TC-003  | rethrows subscription push failures after configuring the item       | PASS | 0          | -    |
| TC-004  | stores a positive repo count and refreshes once                      | PASS | 0          | -    |
| TC-005  | stores zero repos and refreshes once                                 | PASS | 0          | -    |
| TC-006  | stores a negative repo count and refreshes once                      | PASS | 0          | -    |
| TC-007  | shows the item when config is enabled and repos are present          | PASS | 0          | -    |
| TC-008  | hides the item when repo count is zero                               | PASS | 0          | -    |
| TC-009  | hides the item when config disables it even with repos present       | PASS | 0          | -    |
| TC-010  | hides the item when repo count is negative                           | PASS | 0          | -    |
| TC-011  | rethrows config read failures before showing or hiding               | PASS | 0          | -    |
| TC-012  | rethrows show failures in the visible branch                         | PASS | 0          | -    |
| TC-013  | rethrows hide failures in the hidden branch                          | PASS | 0          | -    |

### テスト実行コマンド

```bash
npx --yes pnpm@10.29.3 exec vitest run tests/src/statusBarItem.test.ts
```

### カバレッジ

N/A (targeted single-file execution; coverage not collected)

### src/avatarManager.ts (remote fetch)

**テストプラン**: `docs/testing/perspectives/src/avatarManager-test.md`
**ソースファイル**: `src/avatarManager.ts`
**テストファイル**: `tests/src/avatarManager.remoteFetch.test.ts`

| Case ID | テスト名                                                                        | 結果 | リトライ数 | 備考 |
| ------- | ------------------------------------------------------------------------------- | ---- | ---------- | ---- |
| TC-026  | defers GitHub requests until githubTimeout expires                              | PASS | 0          | -    |
| TC-027  | uses the short-history commit index formula for fewer than five commits         | PASS | 0          | -    |
| TC-028  | uses the long-history commit index formula for five or more commits             | PASS | 0          | -    |
| TC-029  | stores the GitHub rate limit reset time when the remaining header reaches zero  | PASS | 0          | -    |
| TC-030  | downloads and saves a GitHub avatar when the commit author includes avatar_url  | PASS | 0          | -    |
| TC-031  | falls back to Gravatar when the GitHub commit response has no usable avatar URL | PASS | 0          | -    |
| TC-032  | requeues the request on GitHub 403 without falling back to Gravatar             | PASS | 0          | -    |
| TC-033  | retries the next commit on GitHub 422 while attempts remain                     | PASS | 0          | -    |
| TC-034  | falls back to Gravatar on GitHub 422 when no retry condition remains            | PASS | 0          | -    |
| TC-035  | applies a ten-minute backoff and requeues on GitHub 5xx responses               | PASS | 0          | -    |
| TC-036  | applies a five-minute backoff and requeues on GitHub network errors             | PASS | 0          | -    |
| TC-037  | defers GitLab requests until gitLabTimeout expires                              | PASS | 0          | -    |
| TC-038  | stores the GitLab rate limit reset time when the remaining header reaches zero  | PASS | 0          | -    |
| TC-039  | downloads and saves a GitLab avatar when the first user includes avatar_url     | PASS | 0          | -    |
| TC-040  | falls back to Gravatar when the GitLab response has no usable avatar URL        | PASS | 0          | -    |
| TC-041  | requeues the request on GitLab 429 without falling back to Gravatar             | PASS | 0          | -    |
| TC-042  | applies a ten-minute backoff and requeues on GitLab 5xx responses               | PASS | 0          | -    |
| TC-043  | applies a five-minute backoff and requeues on GitLab network errors             | PASS | 0          | -    |
| TC-044  | saves the first Gravatar image result without requesting an identicon           | PASS | 0          | -    |
| TC-045  | retries with identicon when the 404-style Gravatar download returns null        | PASS | 0          | -    |
| TC-046  | does not save anything when both Gravatar downloads return null                 | PASS | 0          | -    |

### テスト実行コマンド

```bash
npx --yes pnpm@10.29.3 exec vitest run tests/src/avatarManager.remoteFetch.test.ts
```

### カバレッジ

N/A (targeted single-file execution; coverage not collected)

### src/avatarManager.ts (io)

**テストプラン**: `docs/testing/perspectives/src/avatarManager-test.md`
**ソースファイル**: `src/avatarManager.ts`
**テストファイル**: `tests/src/avatarManager.io.test.ts`

| Case ID | テスト名                                                                    | 結果 | リトライ数 | 備考 |
| ------- | --------------------------------------------------------------------------- | ---- | ---------- | ---- |
| TC-047  | returns null for invalid image URLs without starting an HTTP request        | PASS | 0          | -    |
| TC-048  | returns null for image URLs on hosts outside the allow list                 | PASS | 0          | -    |
| TC-049  | returns null when the HTTP response is not an image content type            | PASS | 0          | -    |
| TC-050  | returns null when the HTTP response uses an unsupported image format        | PASS | 0          | -    |
| TC-051  | stores PNG image responses using the sha256-based filename                  | PASS | 0          | -    |
| TC-052  | accepts svg+xml content types and stores them with the svg+xml extension    | PASS | 0          | -    |
| TC-053  | returns null when writing the downloaded avatar to disk fails               | PASS | 0          | -    |
| TC-054  | returns null for non-200 image HTTP responses                               | PASS | 0          | -    |
| TC-055  | returns null when the HTTPS request emits an error                          | PASS | 0          | -    |
| TC-056  | creates a new cache entry, persists it, and sends it to the webview         | PASS | 0          | -    |
| TC-057  | replaces an identicon with a real avatar and updates the timestamp          | PASS | 0          | -    |
| TC-058  | preserves a real avatar when a later identicon result arrives               | PASS | 0          | -    |
| TC-059  | overwrites one identicon with another identicon and refreshes the timestamp | PASS | 0          | -    |
| TC-060  | returns early when no webview is registered                                 | PASS | 0          | -    |
| TC-061  | returns early when the avatar cache has no image for the email              | PASS | 0          | -    |
| TC-062  | reads the avatar file and sends a data URI to the registered webview        | PASS | 0          | -    |
| TC-063  | skips sendMessage when the view becomes null while waiting for fs.readFile  | PASS | 0          | -    |
| TC-064  | calls onError when reading the avatar file fails                            | PASS | 0          | -    |

### テスト実行コマンド

```bash
npx --yes pnpm@10.29.3 exec vitest run tests/src/avatarManager.io.test.ts
```

### カバレッジ

N/A (targeted single-file execution; coverage not collected)

### src/avatarManager.ts (queue)

**テストプラン**: `docs/testing/perspectives/src/avatarManager-test.md`
**ソースファイル**: `src/avatarManager.ts`
**テストファイル**: `tests/src/avatarManager.queue.test.ts`

| Case ID | テスト名                                                                            | 結果 | リトライ数 | 備考 |
| ------- | ----------------------------------------------------------------------------------- | ---- | ---------- | ---- |
| TC-065  | initializes with an empty queue and retains the callback reference                  | PASS | 0          | -    |
| TC-066  | appends only the new commits when the same email/repo entry already exists          | PASS | 0          | -    |
| TC-067  | leaves the queue unchanged when the existing tail commit is missing or already last | PASS | 0          | -    |
| TC-068  | inserts new immediate items with checkAfter 0 and attempts 0                        | PASS | 0          | -    |
| TC-069  | inserts non-immediate items at checkAfter 0 when the queue is empty                 | PASS | 0          | -    |
| TC-070  | increments checkAfter from the current queue tail for later non-immediate items     | PASS | 0          | -    |
| TC-071  | updates checkAfter without incrementing attempts when failedAttempt is false        | PASS | 0          | -    |
| TC-072  | increments attempts before re-inserting when failedAttempt is true                  | PASS | 0          | -    |
| TC-073  | returns false when the queue is empty                                               | PASS | 0          | -    |
| TC-074  | returns true when the queue has at least one item                                   | PASS | 0          | -    |
| TC-075  | returns null when the queue is empty                                                | PASS | 0          | -    |
| TC-076  | shifts and returns the head item when checkAfter is earlier than now                | PASS | 0          | -    |
| TC-077  | returns null when checkAfter is exactly equal to the current time                   | PASS | 0          | -    |
| TC-078  | returns null when the head item is scheduled for the future                         | PASS | 0          | -    |
| TC-079  | inserts into an empty queue and calls itemsAvailableCallback once                   | PASS | 0          | -    |
| TC-080  | keeps queue items sorted by ascending checkAfter after multiple insertions          | PASS | 0          | -    |
| TC-081  | places equal checkAfter items after existing items with the same value              | PASS | 0          | -    |
| TC-082  | does not call itemsAvailableCallback when inserting into a non-empty queue          | PASS | 0          | -    |

### テスト実行コマンド

```bash
npx --yes pnpm@10.29.3 exec vitest run tests/src/avatarManager.queue.test.ts
```

### カバレッジ

N/A (targeted single-file execution; coverage not collected)
