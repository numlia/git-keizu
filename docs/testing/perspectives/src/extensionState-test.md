# テスト観点表: src/extensionState.ts

> Source: `src/extensionState.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest 4.x

## S1: constructor

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `constructor(context: ExtensionContext)`
**テスト対象パス**: `src/extensionState.ts:20-26`

| Case ID | Input / Precondition                                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                         | Notes                                      |
| ------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-001  | 有効なExtensionContext (globalState, workspaceState, globalStoragePath を持つ) | Normal - standard                                                          | `globalState`, `workspaceState`, `globalStoragePath` が正しく格納される。`globalStoragePath` は `getPathFromStr` でバックスラッシュがフォワードスラッシュに変換された値 | L21-24                                     |
| TC-002  | 有効なExtensionContext                                                         | Normal - standard                                                          | コンストラクタ内で `initAvatarStorage()` が呼び出される（fire-and-forget）                                                                                              | L25。awaitされないため非同期完了を待たない |

## S2: initAvatarStorage (private)

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private async initAvatarStorage(): Promise<void>`
**テスト対象パス**: `src/extensionState.ts:28-41`

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                         | Notes  |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------ |
| TC-003  | アバターディレクトリが既に存在する (fs.stat 成功)              | Normal - standard                                                          | `avatarStorageAvailable` が `true` になる。`fs.mkdir` は呼ばれない                                      | L31-32 |
| TC-004  | アバターディレクトリが存在しない (fs.stat 失敗)、fs.mkdir 成功 | Normal - standard                                                          | `avatarStorageAvailable` が `true` になる。`fs.mkdir` が `{ recursive: true }` オプション付きで呼ばれる | L33-36 |
| TC-005  | fs.stat 失敗 かつ fs.mkdir 失敗                                | Validation - rejected precondition                                         | `avatarStorageAvailable` は初期値 `false` のまま。例外は握りつぶされサイレント失敗                      | L37-39 |
| TC-006  | fs.stat がエラーをスロー                                       | External - fs.stat failure                                                 | 外側catchブロックに入り、fs.mkdir によるフォールバック作成が試みられる                                  | L33    |
| TC-007  | fs.mkdir がエラーをスロー                                      | External - fs.mkdir failure                                                | 内側catchブロックに入り、`avatarStorageAvailable` は `false` のまま                                     | L37    |

## S3: getRepos

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public getRepos(): GitRepoSet`
**テスト対象パス**: `src/extensionState.ts:44-46`

| Case ID | Input / Precondition                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                     | Notes                          |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-008  | workspaceState に GitRepoSet が保存されている | Normal - standard                                                          | 保存された GitRepoSet オブジェクトが返される。`workspaceState.get` が `"repoStates"` キーで呼ばれる | L45                            |
| TC-009  | workspaceState に値なし                       | Boundary - empty                                                           | デフォルト値 `{}` が返される                                                                        | L45。第2引数 `{}` がデフォルト |

## S4: saveRepos

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public saveRepos(gitRepoSet: GitRepoSet): void`
**テスト対象パス**: `src/extensionState.ts:47-49`

| Case ID | Input / Precondition      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                       | Notes |
| ------- | ------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----- |
| TC-010  | エントリを持つ GitRepoSet | Normal - standard                                                          | `workspaceState.update` が `("repoStates", gitRepoSet)` で1回呼ばれる | L48   |
| TC-011  | 空オブジェクト `{}`       | Boundary - empty                                                           | `workspaceState.update` が `("repoStates", {})` で1回呼ばれる         | L48   |

## S5: getLastActiveRepo

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public getLastActiveRepo(): string | null`
**テスト対象パス**: `src/extensionState.ts:52-54`

| Case ID | Input / Precondition                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                           | Notes                            |
| ------- | ----------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------- |
| TC-012  | workspaceState にリポジトリパスが保存されている | Normal - standard                                                          | 保存された文字列パスが返される。`workspaceState.get` が `"lastActiveRepo"` キーで呼ばれる | L53                              |
| TC-013  | workspaceState に値なし                         | Boundary - null                                                            | `null` が返される                                                                         | L53。第2引数 `null` がデフォルト |

## S6: setLastActiveRepo

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public setLastActiveRepo(repo: string | null): void`
**テスト対象パス**: `src/extensionState.ts:55-57`

| Case ID | Input / Precondition                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                | Notes                     |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------- |
| TC-014  | repo = 有効なパス文字列 (例: "/path/to/repo") | Normal - standard                                                          | `workspaceState.update` が `("lastActiveRepo", "/path/to/repo")` で1回呼ばれる | L56                       |
| TC-015  | repo = null                                   | Boundary - null                                                            | `workspaceState.update` が `("lastActiveRepo", null)` で1回呼ばれる            | L56                       |
| TC-016  | repo = "" (空文字列)                          | Boundary - empty                                                           | `workspaceState.update` が `("lastActiveRepo", "")` で1回呼ばれる              | L56。型定義上は許容される |

## S7: isAvatarStorageAvailable

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public isAvatarStorageAvailable(): boolean`
**テスト対象パス**: `src/extensionState.ts:60-62`

| Case ID | Input / Precondition                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result    | Notes                                           |
| ------- | ------------------------------------- | -------------------------------------------------------------------------- | ------------------ | ----------------------------------------------- |
| TC-017  | initAvatarStorage が成功した状態      | Normal - standard                                                          | `true` が返される  | L61。avatarStorageAvailable = true (L32 or L36) |
| TC-018  | 初期状態 / initAvatarStorage 失敗状態 | Normal - branch                                                            | `false` が返される | L61。初期値 false (L18)                         |

## S8: getAvatarStoragePath

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public getAvatarStoragePath(): string`
**テスト対象パス**: `src/extensionState.ts:63-65`

| Case ID | Input / Precondition                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                           | Notes                                     |
| ------- | ----------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------- |
| TC-019  | globalStoragePath = "/storage/path" | Normal - standard                                                          | `"/storage/path/avatars"` が返される (`path.join` の結果) | L64                                       |
| TC-020  | globalStoragePath = "" (空文字列)   | Boundary - empty                                                           | `"avatars"` が返される (`path.join("", "avatars")`)       | L64。getPathFromStrに空文字が渡された場合 |

## S9: getAvatarCache

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public getAvatarCache(): AvatarCache`
**テスト対象パス**: `src/extensionState.ts:66-68`

| Case ID | Input / Precondition                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                    | Notes                          |
| ------- | ------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-021  | globalState に AvatarCache が保存されている | Normal - standard                                                          | 保存された AvatarCache オブジェクトが返される。`globalState.get` が `"avatarCache"` キーで呼ばれる | L67                            |
| TC-022  | globalState に値なし                        | Boundary - empty                                                           | デフォルト値 `{}` が返される                                                                       | L67。第2引数 `{}` がデフォルト |

## S10: saveAvatar

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public saveAvatar(email: string, avatar: Avatar): void`
**テスト対象パス**: `src/extensionState.ts:69-73`

| Case ID | Input / Precondition                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                              | Notes                                     |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------- |
| TC-023  | 新規email、キャッシュが空                           | Normal - standard                                                          | `globalState.update` が `("avatarCache", { [email]: avatar })` で呼ばれる                    | L70-72                                    |
| TC-024  | 既にキャッシュに同一emailのエントリあり             | Normal - branch                                                            | `globalState.update` が呼ばれ、該当emailのavatarが新しい値で上書きされたキャッシュが渡される | L71。既存エントリを上書き                 |
| TC-025  | email = "" (空文字列)                               | Boundary - empty                                                           | `globalState.update` が呼ばれ、キー `""` でavatarが保存される                                | L71。空文字列もオブジェクトキーとして有効 |
| TC-026  | email に特殊文字を含む (例: "user+tag@example.com") | Boundary - special chars                                                   | `globalState.update` が呼ばれ、特殊文字を含むキーでavatarが正しく保存される                  | L71                                       |

## S11: removeAvatarFromCache

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public removeAvatarFromCache(email: string): void`
**テスト対象パス**: `src/extensionState.ts:74-78`

| Case ID | Input / Precondition                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                               | Notes  |
| ------- | ----------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ |
| TC-027  | キャッシュに該当emailのエントリあり | Normal - standard                                                          | `globalState.update` が呼ばれ、該当emailが除去されたキャッシュが渡される                                      | L75-77 |
| TC-028  | キャッシュに該当emailが存在しない   | Validation - rejected precondition                                         | `globalState.update` が呼ばれるが、キャッシュ内容は変化なし。delete演算子は存在しないキーでもエラーにならない | L76    |
| TC-029  | キャッシュが空 `{}`                 | Boundary - empty                                                           | `globalState.update` が `("avatarCache", {})` で呼ばれる                                                      | L75-77 |

## S12: clearAvatarCache

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public async clearAvatarCache(): Promise<void>`
**テスト対象パス**: `src/extensionState.ts:79-88`

| Case ID | Input / Precondition                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                     | Notes                                    |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| TC-030  | アバターディレクトリにファイルが存在する            | Normal - standard                                                          | `globalState.update("avatarCache", {})` が呼ばれ、`fs.readdir` → 各ファイルに対して `fs.unlink` が呼ばれる          | L80, L83-84                              |
| TC-031  | clearAvatarCache実行時の処理順序                    | Normal - standard                                                          | `globalState.update` (L80) が `fs.readdir` (L83) より先に実行される。ファイル削除失敗でもキャッシュは常にクリア済み | L80がtry外                               |
| TC-032  | アバターディレクトリにファイルなし (空ディレクトリ) | Boundary - empty                                                           | `globalState.update("avatarCache", {})` が呼ばれ、`fs.readdir` は `[]` を返し、`fs.unlink` は呼ばれない             | L83-84。Promise.all([]) は即座に解決     |
| TC-033  | fs.readdir がエラー (ディレクトリ不存在等)          | External - fs.readdir failure                                              | キャッシュは `globalState.update({})` でクリア済み。ファイル削除はスキップされサイレント失敗                        | L85-87。キャッシュとFSの不整合は許容     |
| TC-034  | fs.unlink が一部ファイルで失敗                      | External - fs.unlink failure                                               | 他のファイルの `fs.unlink` は引き続き実行される (`Promise.all` + 個別 `.catch`)。キャッシュはクリア済み             | L84。`.catch(() => {})` で個別握りつぶし |

## S13: saveRepos recentActions 正規化

> Origin: Feature 034 (context-menu-recent-actions) Task 2
> Added: 2026-05-02
> Status: active
> Supersedes: -
> Signature: `public saveRepos(gitRepoSet: GitRepoSet): void`
> Target Path: `src/extensionState.ts`

| Case ID | Input / Precondition                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                | Notes                    |
| ------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| TC-035  | `recentActions = ["commit.createBranch", "commit.createWorktree", "commit.createBranch", "ref.push"]` | Normal - dedupe order                                                      | `workspaceState.update("repoStates", ...)` に渡る `recentActions` が `["commit.createBranch", "commit.createWorktree", "ref.push"]` へ畳まれる | 先頭優先                 |
| TC-036  | `recentActions` が 6 件以上のユニーク値を持つ                                                         | Boundary - max length                                                      | 永続化前に先頭 5 件へ切り詰められる                                                                                                            | `MAX_RECENT_ACTIONS = 5` |
| TC-037  | repo A は `recentActions` 未定義、repo B は空配列、他の state あり                                    | Validation - empty and undefined                                           | `commitOrdering` / `fileViewType` / `columnWidths` など他フィールドは変わらず、未定義・空配列の repo state もそのまま保存できる                | 既存 state への影響なし  |

## S14: waitForAvatarStorage() 初期化 Promise の完了待ち

> Origin: フェーズ3 修正 L8 (avatar-storage-init-await)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: -
> Signature: `constructor(context: ExtensionContext)` / `public waitForAvatarStorage(): Promise<void>`
> Target Path: `src/extensionState.ts:20-26, 61-63`

コンストラクタで fire-and-forget していた `initAvatarStorage()` の戻り Promise を `this.avatarStorageInit` に保持し、`waitForAvatarStorage()` で同 Promise を公開する修正。呼び出し側（`gitGraphView.getHtmlForWebview`）が `await` することでアバターストレージ初期化の完了後に `isAvatarStorageAvailable()` を評価できるようにする。`initAvatarStorage()` は内部で例外を握りつぶすため、返る Promise は常に resolve し reject しない。

| Case ID | Input / Precondition                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                             | Notes                              |
| ------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| TC-038  | インスタンス生成後に `waitForAvatarStorage()` を呼ぶ                                  | Normal - returns retained promise                                          | コンストラクタで `avatarStorageInit` に代入された Promise と同一の Promise インスタンスが返る                               | `initAvatarStorage()` の戻り値保持 |
| TC-039  | `fs.mkdir` 成功で `initAvatarStorage` が完了する状態で `await waitForAvatarStorage()` | Normal - resolves after init completes                                     | await 解決後に `isAvatarStorageAvailable()` が `true` を返す                                                                | 完了待ちによる状態確定             |
| TC-040  | `waitForAvatarStorage()` を複数回呼ぶ                                                 | Boundary - idempotent single init                                          | 毎回同一 Promise インスタンスが返り、`initAvatarStorage`（fs.stat/mkdir）は生成時の1回のみで再実行されない                  | 初期化の単一性                     |
| TC-041  | `fs.stat` 失敗かつ `fs.mkdir` 失敗の状態で `await waitForAvatarStorage()`             | External - init failure still resolves                                     | 返る Promise は reject せず resolve（`undefined`）し、await が throw しない。`isAvatarStorageAvailable()` は `false` のまま | 例外握りつぶしの検証               |
| TC-042  | `initAvatarStorage` 完了後に `waitForAvatarStorage()` を呼び await                    | Boundary - already settled promise                                         | 既に settle 済みの Promise が即座に resolve し、追加の副作用（fs 呼び出し）は発生しない                                     | settle 後の再 await                |
