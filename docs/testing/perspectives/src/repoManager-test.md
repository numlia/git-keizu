# Test Plan: repoManager

> Generated: 2026-03-22T00:00:00+09:00
> Source: `src/repoManager.ts`
> Language: TypeScript
> Test Framework: Vitest

## 1. ソース概要

| 項目            | 値                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ファイルパス    | `src/repoManager.ts`                                                                                                                                               |
| 主要な責務      | Gitリポジトリの検出・登録・削除・監視を管理するクラス(RepoManager)。ワークスペース内フォルダを再帰探索してGitリポジトリを発見し、FileSystemWatcherで変更を監視する |
| 関数/メソッド数 | 28 (public 10 + private 16 + module private 2)                                                                                                                     |
| 総分岐数        | 42                                                                                                                                                                 |
| エラーパス数    | 4                                                                                                                                                                  |
| 外部依存数      | 8                                                                                                                                                                  |

## 2. テスト観点表

### S1: registerRepoFromUri

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**シグネチャ**: `registerRepoFromUri(uri: vscode.Uri): Promise<void>`
**テスト対象パス**: `src/repoManager.ts:184-193`

| Case ID | Input / Precondition                          | Perspective (Equivalence / Boundary) | Expected Result                                           | Notes          |
| ------- | --------------------------------------------- | ------------------------------------ | --------------------------------------------------------- | -------------- |
| TC-001  | URI が既に登録済みリポジトリを指す            | Equivalence - normal (existing)      | addRepo が呼ばれない、既存状態維持                        | 重複登録防止   |
| TC-002  | URI が未登録の有効な Git リポジトリを指す     | Equivalence - normal (new repo)      | addRepo が呼ばれ、sendRepos でビューに通知される          | 新規登録フロー |
| TC-003  | URI が Git リポジトリでないディレクトリを指す | Equivalence - abnormal (non-git)     | isGitRepository が false を返し、登録処理がスキップされる | 事前検証       |

### S2: constructor (workspace folder change handler)

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `constructor(dataSource: DataSource, extensionState: ExtensionState, statusBarItem: StatusBarItem)`
**テスト対象パス**: `src/repoManager.ts:30-60`

| Case ID | Input / Precondition                                           | Perspective (Equivalence / Boundary) | Expected Result             | Notes         |
| ------- | -------------------------------------------------------------- | ------------------------------------ | --------------------------- | ------------- |
| TC-004  | added にフォルダ1件、searchDirectoryForRepos が true を返す    | Equivalence - normal                 | sendRepos が1回呼ばれる     | L40-48        |
| TC-005  | added にフォルダ1件、searchDirectoryForRepos が false を返す   | Equivalence - normal (branch)        | sendRepos が呼ばれない      | L48 false分岐 |
| TC-006  | removed にフォルダ1件、removeReposWithinFolder が true を返す  | Equivalence - normal                 | sendRepos が1回呼ばれる     | L50-58        |
| TC-007  | removed にフォルダ1件、removeReposWithinFolder が false を返す | Equivalence - normal (branch)        | sendRepos が呼ばれない      | L58 false分岐 |
| TC-008  | added.length = 0                                               | Boundary - zero                      | added処理がスキップされる   | L40           |
| TC-009  | removed.length = 0                                             | Boundary - zero                      | removed処理がスキップされる | L50           |
| TC-010  | added と removed の両方が非空                                  | Equivalence - normal                 | 両方の処理が順に実行される  | -             |

### S3: dispose

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `dispose(): void`
**テスト対象パス**: `src/repoManager.ts:62-72`

| Case ID | Input / Precondition           | Perspective (Equivalence / Boundary) | Expected Result                                  | Notes         |
| ------- | ------------------------------ | ------------------------------------ | ------------------------------------------------ | ------------- |
| TC-011  | folderChangeHandler が存在する | Equivalence - normal                 | handler.dispose() が呼ばれ、null に設定される    | L64           |
| TC-012  | folderChangeHandler が null    | Boundary - null                      | エラーなく完了                                   | L64 false分岐 |
| TC-013  | folderWatchers に複数エントリ  | Equivalence - normal                 | 全 watcher の dispose() が呼ばれ、全エントリ削除 | L68-71        |
| TC-014  | folderWatchers が空            | Boundary - empty                     | ループ未実行で正常完了                           | L68           |

### S4: View callback management (registerViewCallback, deregisterViewCallback, sendRepos)

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `registerViewCallback(viewCallback: (...) => void): void` / `deregisterViewCallback(): void` / `sendRepos(): void`
**テスト対象パス**: `src/repoManager.ts:74-80,158-163`

| Case ID | Input / Precondition                          | Perspective (Equivalence / Boundary) | Expected Result                                | Notes          |
| ------- | --------------------------------------------- | ------------------------------------ | ---------------------------------------------- | -------------- |
| TC-015  | registerViewCallback にコールバック関数を渡す | Equivalence - normal                 | this.viewCallback にコールバックが格納される   | -              |
| TC-016  | deregisterViewCallback 呼び出し               | Equivalence - normal                 | this.viewCallback が null に設定される         | -              |
| TC-017  | sendRepos: viewCallback 登録済み、repos に2件 | Equivalence - normal                 | viewCallback が (repos, 2) で呼ばれる          | L161           |
| TC-018  | sendRepos: viewCallback が null               | Boundary - null                      | 呼び出しなし、エラーなし                       | L161 false分岐 |
| TC-019  | sendRepos: repos が空                         | Boundary - zero                      | viewCallback が (空のGitRepoSet, 0) で呼ばれる | numRepos = 0   |

### S5: maxDepthOfRepoSearchChanged

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `maxDepthOfRepoSearchChanged(): void`
**テスト対象パス**: `src/repoManager.ts:82-92`

| Case ID | Input / Precondition                           | Perspective (Equivalence / Boundary) | Expected Result                                     | Notes            |
| ------- | ---------------------------------------------- | ------------------------------------ | --------------------------------------------------- | ---------------- |
| TC-020  | newDepth(=3) > this.maxDepthOfRepoSearch(=1)   | Equivalence - normal                 | depth が3に更新、searchWorkspaceForRepos が呼ばれる | L84 true         |
| TC-021  | newDepth(=1) < this.maxDepthOfRepoSearch(=3)   | Equivalence - normal (branch)        | depth が1に更新、searchWorkspaceForRepos 呼ばれない | L84 false        |
| TC-022  | newDepth(=2) === this.maxDepthOfRepoSearch(=2) | Boundary - equal                     | depth そのまま、searchWorkspaceForRepos 呼ばれない  | L84 false (等値) |

### S6: getRepos

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `getRepos(): GitRepoSet`
**テスト対象パス**: `src/repoManager.ts:120-128`

| Case ID | Input / Precondition | Perspective (Equivalence / Boundary) | Expected Result                                                       | Notes |
| ------- | -------------------- | ------------------------------------ | --------------------------------------------------------------------- | ----- |
| TC-023  | repos に2件登録済み  | Equivalence - normal                 | 2件を含む GitRepoSet が返る。各キーに対応する GitRepoState が含まれる | L123  |
| TC-024  | repos が空           | Boundary - empty                     | 空の GitRepoSet が返る                                                | -     |

### S7: addRepo / removeRepo

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `addRepo(repo: string): void` / `removeRepo(repo: string): void`
**テスト対象パス**: `src/repoManager.ts:130-137`

| Case ID | Input / Precondition                | Perspective (Equivalence / Boundary) | Expected Result                                                  | Notes          |
| ------- | ----------------------------------- | ------------------------------------ | ---------------------------------------------------------------- | -------------- |
| TC-025  | addRepo: 有効なパス "/path/to/repo" | Equivalence - normal                 | repos にキー追加、デフォルト state 設定、saveRepos が1回呼ばれる | L131-132       |
| TC-026  | addRepo: 空文字列 ""                | Boundary - empty                     | repos に空文字列キーが追加される (バリデーションなし)            | -              |
| TC-027  | removeRepo: 登録済みキー            | Equivalence - normal                 | repos からキー削除、saveRepos が1回呼ばれる                      | L135-136       |
| TC-028  | removeRepo: 未登録キー              | Boundary - non-existing              | delete はエラーにならず、saveRepos が呼ばれる                    | -              |
| TC-029  | addRepo: 既に同一キーが存在する場合 | Boundary - duplicate                 | 既存の state がデフォルト state で上書きされる                   | state リセット |

### S8: setRepoState

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `setRepoState(repo: string, state: GitRepoState): void`
**テスト対象パス**: `src/repoManager.ts:176-182`

| Case ID | Input / Precondition                              | Perspective (Equivalence / Boundary) | Expected Result                                    | Notes                       |
| ------- | ------------------------------------------------- | ------------------------------------ | -------------------------------------------------- | --------------------------- |
| TC-030  | repo = "/valid/path", state = 有効な GitRepoState | Equivalence - normal                 | repos[repo] に state 設定、saveRepos が1回呼ばれる | L180-181                    |
| TC-031  | repo = "\_\_proto\_\_"                            | Equivalence - abnormal               | 早期 return、state 未設定、saveRepos 呼ばれない    | L177 プロトタイプ汚染ガード |
| TC-032  | repo = "constructor"                              | Equivalence - abnormal               | 早期 return、state 未設定、saveRepos 呼ばれない    | L177                        |
| TC-033  | repo = "prototype"                                | Equivalence - abnormal               | 早期 return、state 未設定、saveRepos 呼ばれない    | L177                        |
| TC-034  | repo = "" (空文字列)                              | Boundary - empty                     | state 設定される (ガードに該当しない)              | -                           |

### S9: checkReposExist

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `checkReposExist(): Promise<boolean>`
**テスト対象パス**: `src/repoManager.ts:164-175`

| Case ID | Input / Precondition                          | Perspective (Equivalence / Boundary) | Expected Result                                                 | Notes               |
| ------- | --------------------------------------------- | ------------------------------------ | --------------------------------------------------------------- | ------------------- |
| TC-035  | repos に3件、全て isGitRepository が true     | Equivalence - normal                 | 削除なし、sendRepos 呼ばれない、false を返す                    | L168 全て false分岐 |
| TC-036  | repos に3件、1件だけ isGitRepository が false | Equivalence - normal                 | 該当1件が removeRepo で削除、sendRepos が1回呼ばれ、true を返す | L168-173            |
| TC-037  | repos に3件、全て isGitRepository が false    | Equivalence - abnormal               | 全3件削除、sendRepos が1回呼ばれ、true を返す                   | 全リポジトリ不在    |
| TC-038  | repos が空                                    | Boundary - empty                     | 削除なし、sendRepos 呼ばれない、false を返す                    | ループ未実行        |

### S10: removeReposNotInWorkspace

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `removeReposNotInWorkspace(): void` (private)
**テスト対象パス**: `src/repoManager.ts:100-118`

| Case ID | Input / Precondition                                   | Perspective (Equivalence / Boundary) | Expected Result                                    | Notes            |
| ------- | ------------------------------------------------------ | ------------------------------------ | -------------------------------------------------- | ---------------- |
| TC-039  | workspaceFolders に2件、repos 全てワークスペース内     | Equivalence - normal                 | removeRepo 呼ばれない                              | L113-116 false   |
| TC-040  | workspaceFolders に1件、repos の一部がワークスペース外 | Equivalence - normal                 | ワークスペース外の repo が removeRepo で削除される | L117             |
| TC-041  | workspaceFolders が undefined                          | Boundary - undefined                 | rootsExact/rootsFolder が空、全 repos が削除対象   | L105 false分岐   |
| TC-042  | workspaceFolders が空配列                              | Boundary - empty                     | ルートなし、全 repos が外部扱いで削除される        | -                |
| TC-043  | repos の1つが workspaceFolder.uri.fsPath と完全一致    | Boundary - exact match               | rootsExact 一致で維持される                        | L113 exact match |

### S11: Path matching (removeReposWithinFolder, isDirectoryWithinRepos)

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `removeReposWithinFolder(path: string): boolean` / `isDirectoryWithinRepos(path: string): boolean` (private)
**テスト対象パス**: `src/repoManager.ts:139-155`

| Case ID | Input / Precondition                                                      | Perspective (Equivalence / Boundary) | Expected Result                                    | Notes                |
| ------- | ------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------- | -------------------- |
| TC-044  | removeReposWithinFolder: path と repo パスが完全一致                      | Equivalence - normal                 | removeRepo が呼ばれ、true を返す                   | L143 === 分岐        |
| TC-045  | removeReposWithinFolder: path が repo の親ディレクトリ (/a → /a/sub)      | Equivalence - normal                 | 子 repo が removeRepo で削除され、true を返す      | L143 startsWith 分岐 |
| TC-046  | removeReposWithinFolder: path にマッチする repo なし                      | Equivalence - abnormal               | 削除なし、false を返す                             | L143 全 false        |
| TC-047  | removeReposWithinFolder: repos が空                                       | Boundary - empty                     | ループ未実行、false を返す                         | -                    |
| TC-048  | removeReposWithinFolder: 複数の repo がマッチ                             | Boundary - multiple                  | 全マッチ repo が削除され、true を返す              | -                    |
| TC-049  | isDirectoryWithinRepos: path === repoPaths[i]                             | Equivalence - normal                 | true を返す                                        | L153 ===             |
| TC-050  | isDirectoryWithinRepos: path が repo のサブディレクトリ (/repo/sub)       | Equivalence - normal                 | true を返す                                        | L153 startsWith      |
| TC-051  | isDirectoryWithinRepos: path が無関係なパス                               | Equivalence - abnormal               | false を返す                                       | L155                 |
| TC-052  | isDirectoryWithinRepos: prefix部分一致だが/区切りでない (/repo2 vs /repo) | Boundary - prefix edge               | false を返す (startsWith("/repo/") にマッチしない) | エッジケース         |
| TC-053  | isDirectoryWithinRepos: repos が空                                        | Boundary - empty                     | ループ未実行、false を返す                         | -                    |

### S12: searchDirectoryForRepos

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `searchDirectoryForRepos(directory: string, maxDepth: number): Promise<boolean>` (private)
**テスト対象パス**: `src/repoManager.ts:212-245`

| Case ID | Input / Precondition                                             | Perspective (Equivalence / Boundary) | Expected Result                                     | Notes      |
| ------- | ---------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------- | ---------- |
| TC-054  | directory が既存 repo 内のパス                                   | Equivalence - abnormal (guard)       | isDirectoryWithinRepos true → 早期 return false     | L214       |
| TC-055  | directory が Git リポジトリのルート                              | Equivalence - normal                 | isGitRepository true → addRepo 呼ばれ、true を返す  | L220       |
| TC-056  | directory が非 Git、maxDepth=1、サブディレクトリに Git repo あり | Equivalence - normal                 | 再帰でサブディレクトリ探索後 true を返す            | L224-239   |
| TC-057  | maxDepth = 0                                                     | Boundary - zero                      | 再帰なし、false を返す                              | L224 false |
| TC-058  | maxDepth = 1、サブディレクトリに .git エントリ                   | Equivalence - normal (branch)        | .git はフィルタされ探索対象外                       | L233       |
| TC-059  | maxDepth = 1、サブディレクトリに repo なし                       | Equivalence - normal (branch)        | 全探索後 false を返す                               | -          |
| TC-060  | fs.readdir が失敗 (権限エラー等)                                 | External - fs readdir failure        | 内側 catch でエラー捕捉、空配列扱いで続行           | L226-230   |
| TC-061  | isGitRepository が例外を throw                                   | External - API failure               | 外側 catch でエラー捕捉、false を返す               | L218-245   |
| TC-062  | directory が存在しないパス                                       | External - fs failure                | 外側 catch でエラー捕捉、false を返す               | L218-245   |
| TC-063  | ディレクトリ内にファイルのみ (サブディレクトリなし)              | Boundary - no subdirectories         | isDirectory で全てフィルタ、再帰呼び出しなし、false | L233       |

### S13: Watcher event handlers (onWatcherCreate, onWatcherChange, onWatcherDelete)

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `onWatcherCreate(uri): Promise<void>` / `onWatcherChange(uri): void` / `onWatcherDelete(uri): void` (private)
**テスト対象パス**: `src/repoManager.ts:268-293`

| Case ID | Input / Precondition                                     | Perspective (Equivalence / Boundary) | Expected Result                                                       | Notes      |
| ------- | -------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------- | ---------- |
| TC-064  | onWatcherCreate: path に /.git/ を含む                   | Equivalence - abnormal (filter)      | 早期 return、キューに追加されない                                     | L270       |
| TC-065  | onWatcherCreate: path が /.git で終わる                  | Equivalence - normal                 | path から末尾5文字除去して処理継続                                    | L271       |
| TC-066  | onWatcherCreate: path が既に createEventPaths に存在     | Equivalence - abnormal (dedup)       | 早期 return、重複追加されない                                         | L272       |
| TC-067  | onWatcherCreate: 新規 path、タイムアウト未設定           | Equivalence - normal                 | path がキューに追加、タイムアウト設定                                 | L273-276   |
| TC-068  | onWatcherCreate: 新規 path、タイムアウト設定済み         | Equivalence - normal (branch)        | 既存タイムアウト clearTimeout → 新タイムアウト設定                    | L275       |
| TC-069  | onWatcherChange: path に /.git/ を含む                   | Equivalence - abnormal (filter)      | 早期 return                                                           | L280       |
| TC-070  | onWatcherChange: path が /.git で終わる                  | Equivalence - normal                 | path 末尾5文字除去して処理継続                                        | L281       |
| TC-071  | onWatcherChange: path が既に changeEventPaths に存在     | Equivalence - abnormal (dedup)       | 早期 return                                                           | L282       |
| TC-072  | onWatcherChange: 新規 path                               | Equivalence - normal                 | path がキューに追加、タイムアウト設定                                 | L283-286   |
| TC-073  | onWatcherDelete: path に /.git/ を含む                   | Equivalence - abnormal (filter)      | 早期 return                                                           | L290       |
| TC-074  | onWatcherDelete: path が /.git で終わる、repo マッチあり | Equivalence - normal                 | path 末尾5文字除去、removeReposWithinFolder true → sendRepos 呼ばれる | L291-292   |
| TC-075  | onWatcherDelete: 通常 path、repo マッチあり              | Equivalence - normal                 | removeReposWithinFolder true → sendRepos 呼ばれる                     | L292       |
| TC-076  | onWatcherDelete: 通常 path、repo マッチなし              | Equivalence - abnormal               | removeReposWithinFolder false → sendRepos 呼ばれない                  | L292 false |

### S14: Event processing (processCreateEvents, processChangeEvents)

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `processCreateEvents(): Promise<void>` / `processChangeEvents(): Promise<void>` (private)
**テスト対象パス**: `src/repoManager.ts:295-315`

| Case ID | Input / Precondition                                         | Perspective (Equivalence / Boundary) | Expected Result                                        | Notes      |
| ------- | ------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------ | ---------- |
| TC-077  | processCreateEvents: createEventPaths が空                   | Boundary - empty                     | while ループ未実行、sendRepos 呼ばれない               | L297       |
| TC-078  | processCreateEvents: 1件、path がディレクトリ、repo 発見     | Equivalence - normal                 | searchDirectoryForRepos true → sendRepos が1回呼ばれる | L298-303   |
| TC-079  | processCreateEvents: 1件、path がディレクトリでない          | Equivalence - abnormal               | isDirectory false → searchDirectoryForRepos 呼ばれない | L298 false |
| TC-080  | processCreateEvents: 複数件、一部で repo 発見                | Equivalence - normal                 | 全件処理後 sendRepos が1回呼ばれる                     | -          |
| TC-081  | processChangeEvents: changeEventPaths が空                   | Boundary - empty                     | while ループ未実行、sendRepos 呼ばれない               | L308       |
| TC-082  | processChangeEvents: 1件、path が存在しない、repo マッチあり | Equivalence - normal                 | removeReposWithinFolder true → sendRepos が1回呼ばれる | L309-314   |
| TC-083  | processChangeEvents: 1件、path が存在する                    | Equivalence - normal (branch)        | doesPathExist true → 削除処理スキップ                  | L309 false |
| TC-084  | processChangeEvents: 1件、path 不在、repo マッチなし         | Equivalence - abnormal               | removeReposWithinFolder false → sendRepos 呼ばれない   | L310-314   |

### S15: File system utilities (isDirectory, doesPathExist)

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `isDirectory(path: string): Promise<boolean>` / `doesPathExist(path: string): Promise<boolean>` (module private)
**テスト対象パス**: `src/repoManager.ts:318-334`

| Case ID | Input / Precondition          | Perspective (Equivalence / Boundary) | Expected Result                             | Notes    |
| ------- | ----------------------------- | ------------------------------------ | ------------------------------------------- | -------- |
| TC-085  | isDirectory: ディレクトリパス | Equivalence - normal                 | stats.isDirectory() が true → true を返す   | L320-321 |
| TC-086  | isDirectory: ファイルパス     | Boundary - type mismatch             | stats.isDirectory() が false → false を返す | L321     |
| TC-087  | isDirectory: 存在しないパス   | External - fs stat failure           | catch で false を返す                       | L322-324 |
| TC-088  | doesPathExist: 存在するパス   | Equivalence - normal                 | stat 成功 → true を返す                     | L329     |
| TC-089  | doesPathExist: 存在しないパス | External - fs stat failure           | catch で false を返す                       | L331-333 |

### S16: Watcher management (startWatchingFolders, startWatchingFolder, stopWatchingFolder)

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `startWatchingFolders(): void` / `startWatchingFolder(path): void` / `stopWatchingFolder(path): void` (private)
**テスト対象パス**: `src/repoManager.ts:248-266`

| Case ID | Input / Precondition                                | Perspective (Equivalence / Boundary) | Expected Result                                                               | Notes           |
| ------- | --------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------- | --------------- |
| TC-090  | startWatchingFolders: workspaceFolders に2件        | Equivalence - normal                 | 各フォルダに対して startWatchingFolder が呼ばれる                             | L251            |
| TC-091  | startWatchingFolders: workspaceFolders が undefined | Boundary - undefined                 | startWatchingFolder 呼ばれない                                                | L251 false      |
| TC-092  | startWatchingFolder: 有効なパス                     | Equivalence - normal                 | createFileSystemWatcher 呼ばれ、3イベントハンドラ (create/change/delete) 登録 | L258-262        |
| TC-093  | stopWatchingFolder: folderWatchers に存在するパス   | Equivalence - normal                 | watcher.dispose() が呼ばれ、エントリ削除される                                | L265-266        |
| TC-094  | stopWatchingFolder: folderWatchers に存在しないパス | Boundary - non-existing key          | 未定義プロパティの dispose() でランタイムエラーの可能性                       | L265 潜在的バグ |

### S17: startupTasks

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `startupTasks(): Promise<void>` (private)
**テスト対象パス**: `src/repoManager.ts:92-97`

| Case ID | Input / Precondition                       | Perspective (Equivalence / Boundary) | Expected Result                                                                                          | Notes                          |
| ------- | ------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-095  | checkReposExist が false を返す (変更なし) | Equivalence - normal                 | sendRepos が startupTasks 内で1回呼ばれる                                                                | L94 true分岐 (!false = true)   |
| TC-096  | checkReposExist が true を返す (変更あり)  | Equivalence - normal (branch)        | sendRepos は startupTasks 内では呼ばれない (checkReposExist 内で呼び出し済み)                            | L94 false分岐 (!true = false)  |
| TC-097  | 正常な初期状態                             | Equivalence - normal                 | removeReposNotInWorkspace, checkReposExist, searchWorkspaceForRepos, startWatchingFolders が順に呼ばれる | オーケストレーション順序の検証 |
| TC-098  | repos が空の初期状態                       | Boundary - empty                     | removeReposNotInWorkspace は no-op、checkReposExist false → sendRepos が空 repos で呼ばれる              | repos = {}                     |

### S18: searchWorkspaceForRepos

> Origin: test-plan (既存コード網羅)
> Added: 2026-03-22

**シグネチャ**: `searchWorkspaceForRepos(): Promise<void>` (private)
**テスト対象パス**: `src/repoManager.ts:197-212`

| Case ID | Input / Precondition                                            | Perspective (Equivalence / Boundary) | Expected Result                                                                   | Notes               |
| ------- | --------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------- | ------------------- |
| TC-099  | workspaceFolders が undefined                                   | Boundary - undefined                 | searchDirectoryForRepos 呼ばれない、sendRepos 呼ばれない                          | L200 false分岐      |
| TC-100  | workspaceFolders に1件、searchDirectoryForRepos が true を返す  | Equivalence - normal                 | sendRepos が1回呼ばれる                                                           | L202-211            |
| TC-101  | workspaceFolders に1件、searchDirectoryForRepos が false を返す | Equivalence - normal (branch)        | sendRepos 呼ばれない                                                              | L211 false分岐      |
| TC-102  | workspaceFolders に2件、一方で searchDirectoryForRepos が true  | Equivalence - normal                 | 2回 searchDirectoryForRepos 呼ばれ、sendRepos が1回呼ばれる                       | 複数フォルダ混合    |
| TC-103  | workspaceFolders が空配列                                       | Boundary - empty                     | ループ未実行、sendRepos 呼ばれない                                                | L201                |
| TC-104  | maxDepthOfRepoSearch が 0                                       | Boundary - zero                      | searchDirectoryForRepos が maxDepth=0 で呼ばれ、再帰なしで false → sendRepos なし | L205 maxDepth境界値 |

## 3. テストケースサマリー

| カテゴリ (Perspective列で分類)  | ケース数 |
| ------------------------------- | -------- |
| 正常系 (Equivalence - normal)   | 52       |
| 異常系 (Equivalence - abnormal) | 16       |
| 境界値 (Boundary - ...)         | 31       |
| 型・形式 (Type - ...)           | 0        |
| 外部依存 (External - ...)       | 5        |
| **合計**                        | **104**  |

### 失敗系/正常系比率チェック

| 項目                                       | 値                   |
| ------------------------------------------ | -------------------- |
| 正常系 (Perspective: Equivalence - normal) | 52件                 |
| 失敗系 (Perspective: 上記以外すべて)       | 52件                 |
| 比率                                       | 52/52 = 1.00         |
| 判定                                       | OK: 失敗系 >= 正常系 |

## 4. 外部依存とモック方針

| 外部依存                                     | 種別 | モック方針                                                               | 関連ケース                                         |
| -------------------------------------------- | ---- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| dataSource.isGitRepository()                 | API  | DataSource をモック、vi.fn() で戻り値制御                                | TC-002, TC-003, TC-035-037, TC-055, TC-056, TC-061 |
| extensionState.getRepos() / saveRepos()      | API  | ExtensionState をモック、getRepos は初期値返却、saveRepos は呼び出し検証 | TC-025-029, TC-030, TC-044, TC-045                 |
| vscode.workspace.workspaceFolders            | API  | vi.mocked で配列/undefined を設定                                        | TC-039-043, TC-090, TC-091, TC-099-104             |
| vscode.workspace.onDidChangeWorkspaceFolders | API  | vi.fn() でイベントハンドラ捕捉、手動発火                                 | TC-004-010                                         |
| vscode.workspace.createFileSystemWatcher     | API  | モック FileSystemWatcher を返却、イベントハンドラ捕捉                    | TC-092                                             |
| fs.readdir (node:fs/promises)                | File | vi.mock('node:fs/promises') でモック                                     | TC-056, TC-058, TC-060, TC-063                     |
| fs.stat (node:fs/promises)                   | File | vi.mock('node:fs/promises') でモック                                     | TC-085-089                                         |
| getConfig().maxDepthOfRepoSearch()           | API  | getConfig をモック、戻り値制御                                           | TC-020-022                                         |

## 5. 既存テストとのギャップ

### 5.1 カバレッジサマリー

| 指標           | 値         |
| -------------- | ---------- |
| 観点表ケース数 | 104        |
| Covered        | 0 (0%)     |
| Partial        | 0 (0%)     |
| Missing        | 104 (100%) |

### 5.2 Missing ケース一覧

既存テストファイル (`tests/src/repoManager.test.ts`) が存在しないため、全104ケースが Missing。

| 優先度 | セクション                  | ケース数 | 理由                                               |
| ------ | --------------------------- | -------- | -------------------------------------------------- |
| HIGH   | S8 setRepoState             | 5        | プロトタイプ汚染ガードのセキュリティテスト         |
| HIGH   | S12 searchDirectoryForRepos | 10       | 再帰ロジック + エラーハンドリング、最も複雑な関数  |
| HIGH   | S9 checkReposExist          | 4        | リポジトリ存在確認の中核ロジック                   |
| HIGH   | S11 Path matching           | 10       | パスマッチングのエッジケース (prefix/subdirectory) |
| MEDIUM | S1 registerRepoFromUri      | 3        | 登録フローの分岐                                   |
| MEDIUM | S2 constructor              | 7        | ワークスペース変更ハンドリング                     |
| MEDIUM | S13 Watcher events          | 13       | イベントフィルタ・重複排除ロジック                 |
| MEDIUM | S14 Event processing        | 8        | イベントキュー処理                                 |
| MEDIUM | S17 startupTasks            | 4        | 初期化オーケストレーション分岐                     |
| MEDIUM | S18 searchWorkspaceForRepos | 6        | ワークスペース探索分岐                             |
| LOW    | S3 dispose                  | 4        | リソース解放                                       |
| LOW    | S4 View callback            | 5        | 単純な代入・呼び出し                               |
| LOW    | S6 getRepos                 | 2        | 単純な変換                                         |
| LOW    | S7 addRepo/removeRepo       | 5        | 基本的なCRUD                                       |
| LOW    | S15 fs utilities            | 5        | 薄いラッパー                                       |
| LOW    | S16 Watcher management      | 5        | VS Code API ラッパー                               |

### 5.3 test-strategy.md 準拠チェック

| チェック項目             | 結果                     |
| ------------------------ | ------------------------ |
| Given/When/Then コメント | N/A (テストファイルなし) |
| 失敗系テスト比率         | N/A                      |
| 例外型+メッセージ検証    | N/A                      |
| Case ID トレーサビリティ | N/A                      |

## 6. 網羅性検証

| 検証項目             | 結果                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 関数カバレッジ       | 28/28 関数 (100%) — 全 public/private/module private メソッドにケースあり (startupTasks, searchWorkspaceForRepos 追加)    |
| 分岐カバレッジ       | 42/42 分岐 (100%) — 全条件分岐の true/false にケースあり (startupTasks L94 + searchWorkspaceForRepos L200,L202,L211 追加) |
| エラーパスカバレッジ | 4/4 パス (100%) — searchDirectoryForRepos内 catch x2, isDirectory catch x1, doesPathExist catch x1                        |
| 境界値カバレッジ     | 22/22 候補 (100%) — 全境界値候補に対応するケースあり                                                                      |
| 失敗系/正常系比率    | 52/52 OK                                                                                                                  |

## 7. Next Step

テストコード生成:

```
/test-gen docs/testing/perspectives/src/repoManager-test.md
```
