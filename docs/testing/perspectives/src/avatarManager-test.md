# テスト観点表: src/avatarManager.ts

> Source: `src/avatarManager.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest 4.x

## S1: constructor 初期化とキュー開始フック

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `constructor(dataSource: DataSource, extensionState: ExtensionState)`
**テスト対象パス**: `src/avatarManager.ts:34-47`

| Case ID | Input / Precondition                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                    | Notes  |
| ------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| TC-001  | 有効な `dataSource`, `extensionState` を渡して生成                  | Normal - standard                                                          | `avatarStorageFolder` に `extensionState.getAvatarStoragePath()` の戻り値、`avatars` に `extensionState.getAvatarCache()` の戻り値が格納され、`queue` が生成される | L35-46 |
| TC-002  | 生成直後、queue の `itemsAvailableCallback` を初回発火させる        | Normal - standard                                                          | `setInterval` が `10000ms` で1回設定され、`fetchAvatarsInterval()` が直ちに1回呼ばれる                                                                             | L39-46 |
| TC-003  | `interval` が既に非nullの状態で `itemsAvailableCallback` を再度発火 | Normal - branch                                                            | 早期returnし、追加の `setInterval` も `fetchAvatarsInterval()` の即時呼び出しも行われない                                                                          | L40    |

## S2: fetchAvatarImage キャッシュ判定と再取得要求

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public fetchAvatarImage(email: string, repo: string, commits: string[])`
**テスト対象パス**: `src/avatarManager.ts:49-72`

| Case ID | Input / Precondition                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                          | Notes          |
| ------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------- |
| TC-004  | `avatars[email]` が未定義                                   | Normal - standard                                                          | `queue.add(email, repo, commits, true)` が1回呼ばれ、即時取得要求が登録される                                            | L68-70         |
| TC-005  | 新鮮なキャッシュ済みアバター (`image != null`, 14日以内)    | Normal - standard                                                          | `sendAvatarToWebView(email, onError)` が1回呼ばれ、`queue.add` は呼ばれない                                              | L50-67         |
| TC-006  | 14日超過の通常アバター (`identicon=false`, `image != null`) | Normal - branch                                                            | `queue.add(email, repo, commits, false)` でバックグラウンド更新が登録され、既存画像は `sendAvatarToWebView` で送信される | L53-58, L60-66 |
| TC-007  | 4日超過の identicon (`identicon=true`, `image != null`)     | Normal - branch                                                            | identicon の短い再取得期限が適用され、`queue.add(..., false)` と `sendAvatarToWebView` が呼ばれる                        | L55            |
| TC-008  | キャッシュエントリはあるが `image = null` かつ期限内        | Validation - rejected precondition                                         | `sendAvatarToWebView` は呼ばれず、再取得も登録されない。何も起きない状態になる                                           | L60            |
| TC-009  | `sendAvatarToWebView` が `onError` を呼ぶ                   | Validation - rejected precondition                                         | `removeAvatarFromCache(email)` が1回呼ばれ、続けて `queue.add(email, repo, commits, true)` が再試行用に登録される        | L62-66         |

## S3: registerView Webview登録

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public registerView(view: GitKeizuView)`
**テスト対象パス**: `src/avatarManager.ts:74-76`

| Case ID | Input / Precondition                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                          | Notes |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------- | ----- |
| TC-010  | `view` に `sendMessage` を持つモックViewを渡す | Normal - standard                                                          | `this.view` が渡したView参照に更新される | L75   |

## S4: deregisterView Webview解除

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public deregisterView()`
**テスト対象パス**: `src/avatarManager.ts:78-80`

| Case ID | Input / Precondition  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result              | Notes |
| ------- | --------------------- | -------------------------------------------------------------------------- | ---------------------------- | ----- |
| TC-011  | `registerView()` 済み | Normal - standard                                                          | `this.view` が `null` に戻る | L79   |

## S5: removeAvatarFromCache 個別キャッシュ削除

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public removeAvatarFromCache(email: string)`
**テスト対象パス**: `src/avatarManager.ts:82-85`

| Case ID | Input / Precondition                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                        | Notes  |
| ------- | ----------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| TC-012  | `avatars[email]` に既存エントリあり | Normal - standard                                                          | ローカル `avatars` から該当キーが削除され、`extensionState.removeAvatarFromCache(email)` が1回呼ばれる | L83-84 |

## S6: clearCache 全キャッシュ初期化

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public clearCache()`
**テスト対象パス**: `src/avatarManager.ts:87-90`

| Case ID | Input / Precondition           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                            | Notes  |
| ------- | ------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| TC-013  | `avatars` に複数エントリが存在 | Normal - standard                                                          | `this.avatars` が新しい空オブジェクト `{}` に置き換わり、`extensionState.clearAvatarCache()` が1回呼ばれる | L88-89 |

## S7: fetchAvatarsInterval キュー消化

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private async fetchAvatarsInterval()`
**テスト対象パス**: `src/avatarManager.ts:92-113`

| Case ID | Input / Precondition                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                         | Notes    |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| TC-014  | `queue.hasItems()` が false かつ `interval` が非null          | Normal - branch                                                            | `clearInterval(interval)` が1回呼ばれ、`interval` が `null` に戻る                      | L108-111 |
| TC-015  | `queue.hasItems()` が false かつ `interval = null`            | Validation - rejected precondition                                         | 何も呼ばれず終了する                                                                    | L108     |
| TC-016  | `queue.hasItems()` が true だが `takeItem()` が `null` を返す | Validation - rejected precondition                                         | 早期returnし、`getRemoteSource` と各取得メソッドは呼ばれない                            | L93-95   |
| TC-017  | 取り出した要求の `remoteSource.type = "github"`               | Normal - standard                                                          | `getRemoteSource()` の結果から `fetchFromGithub(avatarRequest, owner, repo)` が呼ばれる | L97-100  |
| TC-018  | `remoteSource.type = "gitlab"`                                | Normal - standard                                                          | `fetchFromGitLab(avatarRequest)` が呼ばれる                                             | L101-103 |
| TC-019  | `remoteSource.type = "gravatar"`                              | Normal - standard                                                          | `fetchFromGravatar(avatarRequest)` が呼ばれる                                           | L104-106 |

## S8: getRemoteSource リモート種別判定

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: superseded
> Superseded By: S25
> Supersedes: -

**シグネチャ**: `private async getRemoteSource(avatarRequest: AvatarRequestItem)`
**テスト対象パス**: `src/avatarManager.ts:115-143`

| Case ID | Input / Precondition                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                       | Notes          |
| ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------- |
| TC-020  | `remoteSourceCache[repo]` にオブジェクトが存在する                | Validation - rejected precondition                                         | `typeof ... === "string"` 判定が false になるためキャッシュヒットせず、`dataSource.getRemoteUrl(repo)` が再度呼ばれる | L116           |
| TC-021  | `getRemoteUrl()` が `https://github.com/owner/repo.git` を返す    | Normal - standard                                                          | `{ type: "github", owner: "owner", repo: "repo" }` が返り、同値が `remoteSourceCache[repo]` に保存される              | L123-131, L140 |
| TC-022  | `getRemoteUrl()` が `https://gitlab.com/group/project.git` を返す | Normal - standard                                                          | `{ type: "gitlab" }` が返り、キャッシュされる                                                                         | L132-133, L140 |
| TC-023  | `getRemoteUrl()` が他ホストのURLを返す                            | Validation - rejected precondition                                         | `{ type: "gravatar" }` が返り、キャッシュされる                                                                       | L134-135, L140 |
| TC-024  | `getRemoteUrl()` が `null` を返す                                 | Boundary - null                                                            | `{ type: "gravatar" }` が返る                                                                                         | L137-139       |
| TC-025  | GitHub URL が `https://github.com/owner` のように repo要素を欠く  | Boundary - format                                                          | `remoteUrlComps[4]` が `undefined` になり、`.replace()` 呼び出しで `TypeError` として reject される                   | L126-130       |

## S9: fetchFromGithub GitHub API取得

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private fetchFromGithub(avatarRequest: AvatarRequestItem, owner: string, repo: string)`
**テスト対象パス**: `src/avatarManager.ts:145-217`

| Case ID | Input / Precondition                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                         | Notes          |
| ------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| TC-026  | `Date.now() < githubTimeout`                                                              | Validation - rejected precondition                                         | `queue.addItem(avatarRequest, githubTimeout, false)` が呼ばれ、続けて `fetchAvatarsInterval()` が再実行される。`https.get` は呼ばれない | L147-151       |
| TC-027  | `commits.length = 3`, `attempts = 1`                                                      | Normal - standard                                                          | `commitIndex = 1` が選ばれ、GitHub API のパスが `/commits/<commits[1]>` になる                                                          | L153-161       |
| TC-028  | `commits.length = 9`, `attempts = 1`                                                      | Normal - standard                                                          | 長い履歴用の計算式が使われ、`Math.round((4 - attempts) * 0.25 * (length - 1))` に基づくコミットでAPIを引く                              | L154-156       |
| TC-029  | レスポンスヘッダー `x-ratelimit-remaining = "0"`, `x-ratelimit-reset = "1700000000"`      | External - GitHub rate limit                                               | `githubTimeout` が `1700000000000` に更新される                                                                                         | L172-176       |
| TC-030  | `statusCode = 200`, `author.avatar_url` あり, `downloadAvatarImage()` が `"a.png"` を返す | Normal - standard                                                          | `downloadAvatarImage(email, avatarUrl + "&size=54")` が呼ばれ、`saveAvatar(email, "a.png", false)` が1回呼ばれる                        | L178-188       |
| TC-031  | `statusCode = 200` だが `author` または `avatar_url` がない                               | Validation - rejected precondition                                         | `fetchFromGravatar(avatarRequest)` にフォールバックする                                                                                 | L178-189, L208 |
| TC-032  | `statusCode = 403`                                                                        | External - GitHub 403                                                      | `queue.addItem(avatarRequest, githubTimeout, false)` が呼ばれ、Gravatar には進まない                                                    | L190-193       |
| TC-033  | `statusCode = 422`, まだ未試行コミットがあり `attempts < 4`                               | Validation - rejected precondition                                         | `queue.addItem(avatarRequest, 0, true)` が呼ばれ、`attempts` 増分付きで次コミットへ再試行される                                         | L194-201       |
| TC-034  | `statusCode = 422` だが再試行条件を満たさない                                             | Validation - rejected precondition                                         | GitHub再試行せず `fetchFromGravatar(avatarRequest)` にフォールバックする                                                                | L194-208       |
| TC-035  | `statusCode >= 500`                                                                       | External - GitHub 5xx                                                      | `githubTimeout` が `現在時刻 + 600000` に更新され、`queue.addItem(avatarRequest, githubTimeout, false)` が呼ばれる                      | L202-206       |
| TC-036  | `https.get(...).on("error")` が発火                                                       | External - GitHub network                                                  | `githubTimeout` が `現在時刻 + 300000` に更新され、`queue.addItem(avatarRequest, githubTimeout, false)` が呼ばれる                      | L212-216       |

## S10: fetchFromGitLab GitLab API取得

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private fetchFromGitLab(avatarRequest: AvatarRequestItem)`
**テスト対象パス**: `src/avatarManager.ts:219-276`

| Case ID | Input / Precondition                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                              | Notes          |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------- |
| TC-037  | `Date.now() < gitLabTimeout`                                  | Validation - rejected precondition                                         | `queue.addItem(avatarRequest, gitLabTimeout, false)` が呼ばれ、`fetchAvatarsInterval()` が再実行される                       | L221-225       |
| TC-038  | `ratelimit-remaining = "0"`, `ratelimit-reset = "1700000000"` | External - GitLab rate limit                                               | `gitLabTimeout` が `1700000000000` に更新される                                                                              | L242-246       |
| TC-039  | `statusCode = 200`, 先頭ユーザーに `avatar_url` あり          | Normal - standard                                                          | `downloadAvatarImage(email, users[0].avatar_url)` が呼ばれ、画像取得成功時に `saveAvatar(email, filename, false)` が呼ばれる | L248-255       |
| TC-040  | `statusCode = 200` だが配列空または `avatar_url` なし         | Validation - rejected precondition                                         | `fetchFromGravatar(avatarRequest)` にフォールバックする                                                                      | L248-256, L267 |
| TC-041  | `statusCode = 429`                                            | External - GitLab 429                                                      | `queue.addItem(avatarRequest, gitLabTimeout, false)` が呼ばれる                                                              | L257-260       |
| TC-042  | `statusCode >= 500`                                           | External - GitLab 5xx                                                      | `gitLabTimeout` が `現在時刻 + 600000` になり、`queue.addItem(avatarRequest, gitLabTimeout, false)` が呼ばれる               | L261-265       |
| TC-043  | `https.get(...).on("error")` が発火                           | External - GitLab network                                                  | `gitLabTimeout` が `現在時刻 + 300000` になり、`queue.addItem(avatarRequest, gitLabTimeout, false)` が呼ばれる               | L271-275       |

## S11: fetchFromGravatar Gravatarフォールバック

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private async fetchFromGravatar(avatarRequest: AvatarRequestItem)`
**テスト対象パス**: `src/avatarManager.ts:278-293`

| Case ID | Input / Precondition                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                               | Notes    |
| ------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------- |
| TC-044  | 1回目の `downloadAvatarImage(...d=404)` が `"avatar.png"` を返す | Normal - standard                                                          | `saveAvatar(email, "avatar.png", false)` が呼ばれ、identicon 取得は行われない | L280-292 |
| TC-045  | 1回目が `null`, 2回目の `...d=identicon` が `"id.png"` を返す    | Normal - branch                                                            | `saveAvatar(email, "id.png", true)` が呼ばれる                                | L285-292 |
| TC-046  | 2回の `downloadAvatarImage` がともに `null`                      | Validation - rejected precondition                                         | `saveAvatar` は呼ばれない                                                     | L285-292 |

## S12: downloadAvatarImage 画像ダウンロードと保存

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private async downloadAvatarImage(email: string, imageUrl: string): Promise<string | null>`
**テスト対象パス**: `src/avatarManager.ts:295-355`

| Case ID | Input / Precondition                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                        | Notes    |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| TC-047  | `imageUrl = "not a url"`                                        | Boundary - format                                                          | `new URL()` で失敗し、Promise は `null` を返す。`https.get` は呼ばれない                                               | L298-302 |
| TC-048  | `imageUrl = "https://example.com/a.png"`                        | Validation - rejected precondition                                         | 許可ホストに含まれないため `null` を返し、ネットワークアクセスしない                                                   | L304-306 |
| TC-049  | `statusCode = 200` だが `content-type` 欠落または `text/html`   | External - invalid content type                                            | `resolve(null)` し、`fs.writeFile` は呼ばれない                                                                        | L324-329 |
| TC-050  | `statusCode = 200`, `content-type = "image/bmp"`                | External - unsupported image format                                        | `ALLOWED_IMAGE_FORMATS` にない形式として `resolve(null)` する                                                          | L330-333 |
| TC-051  | `statusCode = 200`, `content-type = "image/png; charset=utf-8"` | Normal - standard                                                          | `fs.writeFile(join(avatarStorageFolder, "<sha256>.png"), Buffer.concat(chunks))` が呼ばれ、`"<sha256>.png"` を解決する | L324-344 |
| TC-052  | `statusCode = 200`, `content-type = "image/svg+xml"`            | Boundary - format                                                          | `svg+xml` が許可形式として扱われ、`"<sha256>.svg+xml"` が保存名として解決される                                        | L330-335 |
| TC-053  | `fs.writeFile` が reject する                                   | External - file write failure                                              | `resolve(null)` する                                                                                                   | L336-343 |
| TC-054  | `statusCode = 404` など 200 以外                                | External - image HTTP failure                                              | `resolve(null)` する                                                                                                   | L345-347 |
| TC-055  | `https.get(...).on("error")` が発火                             | External - image network                                                   | `resolve(null)` する                                                                                                   | L351-353 |

## S13: saveAvatar キャッシュ更新と通知

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private saveAvatar(email: string, image: string, identicon: boolean)`
**テスト対象パス**: `src/avatarManager.ts:357-369`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                           | Notes    |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- | -------- |
| TC-056  | 既存キャッシュなし                                           | Normal - standard                                                          | `avatars[email]` に `{ image, timestamp, identicon }` が新規作成され、`extensionState.saveAvatar(email, avatars[email])` と `sendAvatarToWebView(email, noop)` が呼ばれる | L364-368 |
| TC-057  | 既存エントリ `identicon=true`, 新しい画像 `identicon=false`  | Normal - standard                                                          | 既存画像が実画像で上書きされ、`identicon` が `false` に更新される。`timestamp` も更新される                                                                               | L358-363 |
| TC-058  | 既存エントリ `identicon=false`, 新しい画像 `identicon=true`  | Validation - rejected precondition                                         | `if (!identicon                                                                                                                                                           |          | existing.identicon)`が false のため`image`と`identicon` は維持され、`timestamp` のみ更新される | L359-363 |
| TC-059  | 既存エントリ `identicon=true`, 新しい画像も `identicon=true` | Normal - branch                                                            | identicon 画像が上書きされ、`timestamp` 更新後に永続化と送信が行われる                                                                                                    | L359-368 |

## S14: sendAvatarToWebView data URI送信

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private async sendAvatarToWebView(email: string, onError: () => void)`
**テスト対象パス**: `src/avatarManager.ts:371-388`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                           | Notes    |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| TC-060  | `view = null`                                        | Validation - rejected precondition                                         | 早期returnし、`fs.readFile` は呼ばれない                                                                  | L372     |
| TC-061  | `avatars[email]?.image` が `undefined` または `null` | Boundary - null                                                            | 早期returnし、`fs.readFile` は呼ばれない                                                                  | L373-374 |
| TC-062  | `view` あり、`fs.readFile` 成功、画像名 `abc.png`    | Normal - standard                                                          | `view.sendMessage({ command: "fetchAvatar", email, image: "data:image/png;base64,<...>" })` が1回呼ばれる | L375-383 |
| TC-063  | `fs.readFile` 待機中に `view` が `null` へ変わる     | Validation - rejected precondition                                         | 読み込みは完了しても内側の `if (this.view !== null)` が false となり `sendMessage` は呼ばれない           | L377     |
| TC-064  | `fs.readFile` が reject する                         | External - file read failure                                               | `onError()` が1回呼ばれる                                                                                 | L385-386 |

## S15: AvatarRequestQueue.constructor キュー初期化

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `constructor(itemsAvailableCallback: () => void)`
**テスト対象パス**: `src/avatarManager.ts:396-398`

| Case ID | Input / Precondition                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                              | Notes    |
| ------- | --------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ | -------- |
| TC-065  | `itemsAvailableCallback=vi.fn()` で生成 | Normal - standard                                                          | `queue` が空で初期化され、渡したコールバック参照が保持される | L396-397 |

## S16: AvatarRequestQueue.add 新規/既存要求の追加

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public add(email: string, repo: string, commits: string[], immediate: boolean)`
**テスト対象パス**: `src/avatarManager.ts:401-423`

| Case ID | Input / Precondition                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                         | Notes    |
| ------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------- |
| TC-066  | 同一 `email` + `repo` の既存項目があり、新しい `commits` に既存末尾コミット以降の履歴が含まれる    | Normal - standard                                                          | `commits.slice(l + 1)` 分だけ既存項目へ追記され、重複項目は追加されない | L404-410 |
| TC-067  | 同一 `email` + `repo` の既存項目はあるが、既存末尾コミットが新しい配列にない、または末尾と一致する | Validation - rejected precondition                                         | キュー内容は変化せず、新規 `insertItem` も呼ばれない                    | L404-410 |
| TC-068  | 新規項目、`immediate = true`                                                                       | Normal - standard                                                          | `checkAfter = 0`, `attempts = 0` の項目が `insertItem` へ渡される       | L412-421 |
| TC-069  | 新規項目、`immediate = false`, 既存キュー長 = 0                                                    | Boundary - empty                                                           | `queue.length === 0` 側により `checkAfter = 0` になる                   | L416-419 |
| TC-070  | 新規項目、`immediate = false`, 既存キュー末尾の `checkAfter = 5`                                   | Normal - branch                                                            | 新項目の `checkAfter = 6` で `insertItem` へ渡される                    | L416-419 |

## S17: AvatarRequestQueue.addItem 再投入

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public addItem(item: AvatarRequestItem, checkAfter: number, failedAttempt: boolean)`
**テスト対象パス**: `src/avatarManager.ts:426-430`

| Case ID | Input / Precondition    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                       | Notes    |
| ------- | ----------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------- |
| TC-071  | `failedAttempt = false` | Normal - standard                                                          | `item.checkAfter` だけが更新され、`attempts` は増えずに `insertItem(item)` が呼ばれる | L427-429 |
| TC-072  | `failedAttempt = true`  | Validation - rejected precondition                                         | `attempts` が1増えた状態で `insertItem(item)` が呼ばれる                              | L428-429 |

## S18: AvatarRequestQueue.hasItems 有無判定

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public hasItems()`
**テスト対象パス**: `src/avatarManager.ts:433-435`

| Case ID | Input / Precondition | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes |
| ------- | -------------------- | -------------------------------------------------------------------------- | --------------- | ----- |
| TC-073  | キューが空           | Boundary - empty                                                           | `false` を返す  | L434  |
| TC-074  | キューに1件以上ある  | Normal - standard                                                          | `true` を返す   | L434  |

## S19: AvatarRequestQueue.takeItem 取り出し条件

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public takeItem()`
**テスト対象パス**: `src/avatarManager.ts:438-442`

| Case ID | Input / Precondition                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                             | Notes    |
| ------- | -------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------- | -------- |
| TC-075  | キューが空                             | Boundary - empty                                                           | `null` を返す                               | L439-441 |
| TC-076  | 先頭項目の `checkAfter < Date.now()`   | Normal - standard                                                          | 先頭要素が `shift()` され、その項目が返る   | L439-440 |
| TC-077  | 先頭項目の `checkAfter === Date.now()` | Boundary - exact                                                           | 比較が `<` のため取り出されず `null` を返す | L439     |
| TC-078  | 先頭項目の `checkAfter > Date.now()`   | Validation - rejected precondition                                         | まだ実行時刻前として `null` を返す          | L439-441 |

## S20: AvatarRequestQueue.insertItem checkAfter順挿入

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private insertItem(item: AvatarRequestItem)`
**テスト対象パス**: `src/avatarManager.ts:445-457`

| Case ID | Input / Precondition                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                 | Notes    |
| ------- | ---------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------- |
| TC-079  | 空キューへ1件挿入                        | Normal - standard                                                          | `splice(0, 0, item)` 相当で先頭に入り、`itemsAvailableCallback()` が1回呼ばれる | L455-456 |
| TC-080  | `checkAfter` がばらばらの項目を順に挿入  | Normal - standard                                                          | バイナリ挿入により `queue` が `checkAfter` 昇順で保持される                     | L446-455 |
| TC-081  | 既存項目と同じ `checkAfter` の項目を挿入 | Boundary - equal                                                           | `<=` 比較により既存同値項目の後ろへ挿入される                                   | L452     |
| TC-082  | 挿入前キュー長 > 0                       | Validation - rejected precondition                                         | `itemsAvailableCallback()` は呼ばれない                                         | L456     |

## S21: getRemoteSource cache hit corrected behavior

> Origin: light-spec-plan notes/features/042/spec.md
> Added: 2026-05-28
> Status: active
> Supersedes: TC-020

**Signature**: `private async getRemoteSource(avatarRequest: AvatarRequestItem)`
**Target Path**: `src/avatarManager.ts:115-143`

| Case ID | Input / Precondition                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                               | Notes |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----- |
| TC-083  | `remoteSourceCache[repo]` に `RemoteSource` object がある | Normal - cache hit                                                         | `getRemoteSource()` は同じ cached object を返し、`dataSource.getRemoteUrl(repo)` は呼ばれない | -     |

## S22: provider JSON parse failure fallback

> Origin: light-spec-plan notes/features/042/spec.md
> Added: 2026-05-28
> Status: active
> Supersedes: -

**Signature**: `private fetchFromGithub(...), private fetchFromGitLab(...)`
**Target Path**: `src/avatarManager.ts:145-276`

| Case ID | Input / Precondition             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                  | Notes |
| ------- | -------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----- |
| TC-084  | GitHub HTTP 200 + 不正 JSON body | External - malformed provider response                                     | `fetchFromGravatar(avatarRequest)` が1回呼ばれ、GitHub 用 `downloadAvatarImage()` と `saveAvatar()` は呼ばれない | -     |
| TC-085  | GitLab HTTP 200 + 不正 JSON body | External - malformed provider response                                     | `fetchFromGravatar(avatarRequest)` が1回呼ばれ、GitLab 用 `downloadAvatarImage()` と `saveAvatar()` は呼ばれない | -     |

## S23: https リクエストの timeout イベントによる destroy

> Origin: フェーズ2 修正 M7 (avatar-request-timeout-destroy)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `private fetchFromGithub(...)` / `private fetchFromGitLab(...)` / `private fetchFromGravatar(...)`
> Target Path: `src/avatarManager.ts:232, 303, 382`

3か所の `https.get`（`timeout: 15000` 指定）に `req.on("timeout", () => req.destroy(new Error("timeout")))` を追加する修正。ソケットが 15 秒で応答しない場合に `timeout` イベントが発火し、リクエストを timeout Error で破棄する。破棄は既存の `error` ハンドラへ伝播し、各プロバイダのネットワークエラー・フォールバック経路（timeout 更新 + 再キュー、または Gravatar 側の `resolve(null)`）が実行される。

| Case ID | Input / Precondition                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                              | Notes                      |
| ------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| TC-086  | fetchFromGithub の https リクエストで `timeout` イベントが発火         | External - GitHub request timeout                                          | `req.destroy` が `Error("timeout")` 引数で1回呼ばれ、`error` ハンドラ経由で `githubTimeout=現在時刻+300000`、`queue.addItem(avatarRequest, githubTimeout, false)` が呼ばれる | timeout→destroy→error 伝播 |
| TC-087  | fetchFromGitLab の https リクエストで `timeout` イベントが発火         | External - GitLab request timeout                                          | `req.destroy` が `Error("timeout")` で1回呼ばれ、`error` 経由で `gitLabTimeout=現在時刻+300000`、`queue.addItem(avatarRequest, gitLabTimeout, false)` が呼ばれる             | GitLab 側 timeout          |
| TC-088  | fetchFromGravatar の https リクエストで `timeout` イベントが発火       | External - Gravatar request timeout                                        | `req.destroy` が `Error("timeout")` で1回呼ばれ、`error` 経由で Promise が `null` で resolve され、`saveAvatar` は呼ばれない                                                 | Gravatar 側 timeout        |
| TC-089  | fetchFromGithub で `timeout` イベントが発火せず正常 200 レスポンス受信 | Normal - no timeout                                                        | `req.destroy` が呼ばれず、通常のレスポンス処理（`downloadAvatarImage`→`saveAvatar`）が実行される                                                                             | 非タイムアウト時の非破棄   |

## S24: レート制限応答の reset ヘッダ欠落時の再キュー分岐

> Origin: フェーズ2 修正 M8 (rate-limit-headerless-requeue)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `private fetchFromGithub(...)`（403 分岐）/ `private fetchFromGitLab(...)`（429 分岐）
> Target Path: `src/avatarManager.ts:199-207, 278-286`

GitHub 403 / GitLab 429 のレート制限応答で、reset ヘッダから算出される `githubTimeout`/`gitLabTimeout` が `0`（有効なリセット時刻が得られない）の場合に、`queue.addItem(avatarRequest, t + RATE_LIMIT_RETRY_INTERVAL_MS, true)`（`failedAttempt=true` で試行回数を消費）でデフォルト 5 分後へ再キューする分岐を追加する修正。timeout が非0のときは従来どおり `queue.addItem(avatarRequest, timeout, false)`。既存 S9 TC-032 / S10 TC-041 の 403/429 挙動を timeout 値で精緻化する。

| Case ID | Input / Precondition                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                   | Notes                               |
| ------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| TC-090  | GitHub `statusCode=403`、`githubTimeout===0`（reset ヘッダ欠落）       | External - GitHub 403 headerless requeue                                   | `queue.addItem(avatarRequest, t + 300000, true)` が呼ばれる（`failedAttempt=true`）。`false` 引数の分岐は通らない | reset 不明時のデフォルト 5 分再試行 |
| TC-091  | GitHub `statusCode=403`、`githubTimeout!==0`（reset ヘッダで設定済み） | External - GitHub 403 with reset                                           | `queue.addItem(avatarRequest, githubTimeout, false)` が呼ばれる                                                   | 従来分岐（S9 TC-032 の精緻化）      |
| TC-092  | GitLab `statusCode=429`、`gitLabTimeout===0`（reset ヘッダ欠落）       | External - GitLab 429 headerless requeue                                   | `queue.addItem(avatarRequest, t + 300000, true)` が呼ばれる（`failedAttempt=true`）                               | reset 不明時のデフォルト 5 分再試行 |
| TC-093  | GitLab `statusCode=429`、`gitLabTimeout!==0`（reset ヘッダで設定済み） | External - GitLab 429 with reset                                           | `queue.addItem(avatarRequest, gitLabTimeout, false)` が呼ばれる                                                   | 従来分岐（S10 TC-041 の精緻化）     |
| TC-094  | `RATE_LIMIT_RETRY_INTERVAL_MS` 定数の参照                              | Boundary - constant value                                                  | 定数値が `300000`（5 分）であり、headerless 再キューの遅延に使用される                                            | マジックナンバー排除の検証          |
| TC-095  | GitHub 403 headerless、fetch 開始時刻 `t` 既知                         | Boundary - retry offset from now                                           | 再キューの checkAfter が `t + 300000` であり、`this.githubTimeout`（=0）ではなく現在時刻起点で算出される          | オフセット基準時刻の検証            |

## S25: getRemoteSource GitHub URL セグメント検証と Gravatar フォールバック

> Origin: フェーズ3 修正 L11 (github-remote-url-length-guard)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: S8
> Signature: `private async getRemoteSource(avatarRequest: AvatarRequestItem)`
> Target Path: `src/avatarManager.ts:128-143`

`https://github.com/` で始まる remoteUrl を `/` 分割した際に、owner/repo セグメント（`remoteUrlComps[3]`/`[4]`）が欠ける URL を検証するガードを追加する修正。旧実装は `remoteUrlComps[4].replace(...)` を無条件で呼び、`[4]` が `undefined` のとき `TypeError` を throw していた。新実装は `remoteUrlComps.length >= 5 && remoteUrlComps[3] && remoteUrlComps[4]` を満たす場合のみ GitHub ソースを構築し、満たさない場合は throw せず `{ type: "gravatar" }` へフォールバックする。S8 の TypeError reject 前提（TC-025）を置き換える。

| Case ID | Input / Precondition                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                           | Notes                                |
| ------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| TC-096  | `getRemoteUrl()` が `https://github.com/owner/repo.git` を返す                         | Normal - valid github url                                                  | `{ type: "github", owner: "owner", repo: "repo" }` が返り、`remoteSourceCache[repo]` に保存される         | 正常な owner/repo                    |
| TC-097  | `getRemoteUrl()` が `https://gitlab.com/group/project.git` を返す                      | Normal - gitlab url                                                        | `{ type: "gitlab" }` が返り、キャッシュされる                                                             | GitLab 分岐                          |
| TC-098  | `getRemoteUrl()` が他ホスト（例 `https://bitbucket.org/x/y`）を返す                    | Validation - other host to gravatar                                        | `{ type: "gravatar" }` が返り、キャッシュされる                                                           | 非対応ホスト                         |
| TC-099  | `getRemoteUrl()` が `null` を返す                                                      | Boundary - null remote url                                                 | `{ type: "gravatar" }` が返る                                                                             | リモート無し                         |
| TC-100  | `getRemoteUrl()` が `https://github.com/owner`（repo セグメント欠落、split 長 4）      | Boundary - missing repo segment fallback                                   | throw されず `{ type: "gravatar" }` が返る（旧実装は `TypeError`）                                        | L11 の中核回帰。`length >= 5` ガード |
| TC-101  | `getRemoteUrl()` が `https://github.com/`（owner/repo とも欠落、末尾セグメント空文字） | Boundary - missing owner segment fallback                                  | `remoteUrlComps[3]`/`[4]` が空文字（falsy）のため `{ type: "gravatar" }` へフォールバックする             | 空セグメントの拒否                   |
| TC-102  | `remoteSourceCache[repo]` に文字列でない値（object）が入っている                       | Validation - cache miss on non-string                                      | `typeof ... === "string"` が false でキャッシュヒットせず、`dataSource.getRemoteUrl(repo)` が再度呼ばれる | キャッシュ判定（旧 TC-020 系）       |
