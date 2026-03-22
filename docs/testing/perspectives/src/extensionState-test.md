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

| Case ID | Input / Precondition                                                           | Perspective (Equivalence / Boundary) | Expected Result                                                                                                                                                         | Notes                                      |
| ------- | ------------------------------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-001  | 有効なExtensionContext (globalState, workspaceState, globalStoragePath を持つ) | Equivalence - normal                 | `globalState`, `workspaceState`, `globalStoragePath` が正しく格納される。`globalStoragePath` は `getPathFromStr` でバックスラッシュがフォワードスラッシュに変換された値 | L21-24                                     |
| TC-002  | 有効なExtensionContext                                                         | Equivalence - normal                 | コンストラクタ内で `initAvatarStorage()` が呼び出される（fire-and-forget）                                                                                              | L25。awaitされないため非同期完了を待たない |

## S2: initAvatarStorage (private)

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private async initAvatarStorage(): Promise<void>`
**テスト対象パス**: `src/extensionState.ts:28-41`

| Case ID | Input / Precondition                                           | Perspective (Equivalence / Boundary) | Expected Result                                                                                         | Notes  |
| ------- | -------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------ |
| TC-003  | アバターディレクトリが既に存在する (fs.stat 成功)              | Equivalence - normal                 | `avatarStorageAvailable` が `true` になる。`fs.mkdir` は呼ばれない                                      | L31-32 |
| TC-004  | アバターディレクトリが存在しない (fs.stat 失敗)、fs.mkdir 成功 | Equivalence - normal                 | `avatarStorageAvailable` が `true` になる。`fs.mkdir` が `{ recursive: true }` オプション付きで呼ばれる | L33-36 |
| TC-005  | fs.stat 失敗 かつ fs.mkdir 失敗                                | Equivalence - abnormal               | `avatarStorageAvailable` は初期値 `false` のまま。例外は握りつぶされサイレント失敗                      | L37-39 |
| TC-006  | fs.stat がエラーをスロー                                       | External - fs.stat failure           | 外側catchブロックに入り、fs.mkdir によるフォールバック作成が試みられる                                  | L33    |
| TC-007  | fs.mkdir がエラーをスロー                                      | External - fs.mkdir failure          | 内側catchブロックに入り、`avatarStorageAvailable` は `false` のまま                                     | L37    |

## S3: getRepos

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public getRepos(): GitRepoSet`
**テスト対象パス**: `src/extensionState.ts:44-46`

| Case ID | Input / Precondition                          | Perspective (Equivalence / Boundary) | Expected Result                                                                                     | Notes                          |
| ------- | --------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-008  | workspaceState に GitRepoSet が保存されている | Equivalence - normal                 | 保存された GitRepoSet オブジェクトが返される。`workspaceState.get` が `"repoStates"` キーで呼ばれる | L45                            |
| TC-009  | workspaceState に値なし                       | Boundary - empty                     | デフォルト値 `{}` が返される                                                                        | L45。第2引数 `{}` がデフォルト |

## S4: saveRepos

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public saveRepos(gitRepoSet: GitRepoSet): void`
**テスト対象パス**: `src/extensionState.ts:47-49`

| Case ID | Input / Precondition      | Perspective (Equivalence / Boundary) | Expected Result                                                       | Notes |
| ------- | ------------------------- | ------------------------------------ | --------------------------------------------------------------------- | ----- |
| TC-010  | エントリを持つ GitRepoSet | Equivalence - normal                 | `workspaceState.update` が `("repoStates", gitRepoSet)` で1回呼ばれる | L48   |
| TC-011  | 空オブジェクト `{}`       | Boundary - zero/empty                | `workspaceState.update` が `("repoStates", {})` で1回呼ばれる         | L48   |

## S5: getLastActiveRepo

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public getLastActiveRepo(): string | null`
**テスト対象パス**: `src/extensionState.ts:52-54`

| Case ID | Input / Precondition                            | Perspective (Equivalence / Boundary) | Expected Result                                                                           | Notes                            |
| ------- | ----------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------- |
| TC-012  | workspaceState にリポジトリパスが保存されている | Equivalence - normal                 | 保存された文字列パスが返される。`workspaceState.get` が `"lastActiveRepo"` キーで呼ばれる | L53                              |
| TC-013  | workspaceState に値なし                         | Boundary - null                      | `null` が返される                                                                         | L53。第2引数 `null` がデフォルト |

## S6: setLastActiveRepo

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public setLastActiveRepo(repo: string | null): void`
**テスト対象パス**: `src/extensionState.ts:55-57`

| Case ID | Input / Precondition                          | Perspective (Equivalence / Boundary) | Expected Result                                                                | Notes                     |
| ------- | --------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------ | ------------------------- |
| TC-014  | repo = 有効なパス文字列 (例: "/path/to/repo") | Equivalence - normal                 | `workspaceState.update` が `("lastActiveRepo", "/path/to/repo")` で1回呼ばれる | L56                       |
| TC-015  | repo = null                                   | Boundary - null                      | `workspaceState.update` が `("lastActiveRepo", null)` で1回呼ばれる            | L56                       |
| TC-016  | repo = "" (空文字列)                          | Boundary - empty                     | `workspaceState.update` が `("lastActiveRepo", "")` で1回呼ばれる              | L56。型定義上は許容される |

## S7: isAvatarStorageAvailable

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public isAvatarStorageAvailable(): boolean`
**テスト対象パス**: `src/extensionState.ts:60-62`

| Case ID | Input / Precondition                  | Perspective (Equivalence / Boundary) | Expected Result    | Notes                                           |
| ------- | ------------------------------------- | ------------------------------------ | ------------------ | ----------------------------------------------- |
| TC-017  | initAvatarStorage が成功した状態      | Equivalence - normal                 | `true` が返される  | L61。avatarStorageAvailable = true (L32 or L36) |
| TC-018  | 初期状態 / initAvatarStorage 失敗状態 | Equivalence - normal (branch)        | `false` が返される | L61。初期値 false (L18)                         |

## S8: getAvatarStoragePath

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public getAvatarStoragePath(): string`
**テスト対象パス**: `src/extensionState.ts:63-65`

| Case ID | Input / Precondition                | Perspective (Equivalence / Boundary) | Expected Result                                           | Notes                                     |
| ------- | ----------------------------------- | ------------------------------------ | --------------------------------------------------------- | ----------------------------------------- |
| TC-019  | globalStoragePath = "/storage/path" | Equivalence - normal                 | `"/storage/path/avatars"` が返される (`path.join` の結果) | L64                                       |
| TC-020  | globalStoragePath = "" (空文字列)   | Boundary - empty                     | `"avatars"` が返される (`path.join("", "avatars")`)       | L64。getPathFromStrに空文字が渡された場合 |

## S9: getAvatarCache

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public getAvatarCache(): AvatarCache`
**テスト対象パス**: `src/extensionState.ts:66-68`

| Case ID | Input / Precondition                        | Perspective (Equivalence / Boundary) | Expected Result                                                                                    | Notes                          |
| ------- | ------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-021  | globalState に AvatarCache が保存されている | Equivalence - normal                 | 保存された AvatarCache オブジェクトが返される。`globalState.get` が `"avatarCache"` キーで呼ばれる | L67                            |
| TC-022  | globalState に値なし                        | Boundary - empty                     | デフォルト値 `{}` が返される                                                                       | L67。第2引数 `{}` がデフォルト |

## S10: saveAvatar

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public saveAvatar(email: string, avatar: Avatar): void`
**テスト対象パス**: `src/extensionState.ts:69-73`

| Case ID | Input / Precondition                                | Perspective (Equivalence / Boundary) | Expected Result                                                                              | Notes                                     |
| ------- | --------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------- |
| TC-023  | 新規email、キャッシュが空                           | Equivalence - normal                 | `globalState.update` が `("avatarCache", { [email]: avatar })` で呼ばれる                    | L70-72                                    |
| TC-024  | 既にキャッシュに同一emailのエントリあり             | Equivalence - normal (branch)        | `globalState.update` が呼ばれ、該当emailのavatarが新しい値で上書きされたキャッシュが渡される | L71。既存エントリを上書き                 |
| TC-025  | email = "" (空文字列)                               | Boundary - empty                     | `globalState.update` が呼ばれ、キー `""` でavatarが保存される                                | L71。空文字列もオブジェクトキーとして有効 |
| TC-026  | email に特殊文字を含む (例: "user+tag@example.com") | Boundary - special chars             | `globalState.update` が呼ばれ、特殊文字を含むキーでavatarが正しく保存される                  | L71                                       |

## S11: removeAvatarFromCache

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public removeAvatarFromCache(email: string): void`
**テスト対象パス**: `src/extensionState.ts:74-78`

| Case ID | Input / Precondition                | Perspective (Equivalence / Boundary) | Expected Result                                                                                               | Notes  |
| ------- | ----------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------ |
| TC-027  | キャッシュに該当emailのエントリあり | Equivalence - normal                 | `globalState.update` が呼ばれ、該当emailが除去されたキャッシュが渡される                                      | L75-77 |
| TC-028  | キャッシュに該当emailが存在しない   | Equivalence - abnormal               | `globalState.update` が呼ばれるが、キャッシュ内容は変化なし。delete演算子は存在しないキーでもエラーにならない | L76    |
| TC-029  | キャッシュが空 `{}`                 | Boundary - empty                     | `globalState.update` が `("avatarCache", {})` で呼ばれる                                                      | L75-77 |

## S12: clearAvatarCache

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public async clearAvatarCache(): Promise<void>`
**テスト対象パス**: `src/extensionState.ts:79-88`

| Case ID | Input / Precondition                                | Perspective (Equivalence / Boundary) | Expected Result                                                                                                     | Notes                                    |
| ------- | --------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| TC-030  | アバターディレクトリにファイルが存在する            | Equivalence - normal                 | `globalState.update("avatarCache", {})` が呼ばれ、`fs.readdir` → 各ファイルに対して `fs.unlink` が呼ばれる          | L80, L83-84                              |
| TC-031  | clearAvatarCache実行時の処理順序                    | Equivalence - normal                 | `globalState.update` (L80) が `fs.readdir` (L83) より先に実行される。ファイル削除失敗でもキャッシュは常にクリア済み | L80がtry外                               |
| TC-032  | アバターディレクトリにファイルなし (空ディレクトリ) | Boundary - zero/empty                | `globalState.update("avatarCache", {})` が呼ばれ、`fs.readdir` は `[]` を返し、`fs.unlink` は呼ばれない             | L83-84。Promise.all([]) は即座に解決     |
| TC-033  | fs.readdir がエラー (ディレクトリ不存在等)          | External - fs.readdir failure        | キャッシュは `globalState.update({})` でクリア済み。ファイル削除はスキップされサイレント失敗                        | L85-87。キャッシュとFSの不整合は許容     |
| TC-034  | fs.unlink が一部ファイルで失敗                      | External - fs.unlink failure         | 他のファイルの `fs.unlink` は引き続き実行される (`Promise.all` + 個別 `.catch`)。キャッシュはクリア済み             | L84。`.catch(() => {})` で個別握りつぶし |
