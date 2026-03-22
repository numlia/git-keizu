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

| Case ID | Input / Precondition                                                | Perspective (Equivalence / Boundary) | Expected Result                                                                                                                                                    | Notes  |
| ------- | ------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| TC-001  | 有効な `dataSource`, `extensionState` を渡して生成                  | Equivalence - normal                 | `avatarStorageFolder` に `extensionState.getAvatarStoragePath()` の戻り値、`avatars` に `extensionState.getAvatarCache()` の戻り値が格納され、`queue` が生成される | L35-46 |
| TC-002  | 生成直後、queue の `itemsAvailableCallback` を初回発火させる        | Equivalence - normal                 | `setInterval` が `10000ms` で1回設定され、`fetchAvatarsInterval()` が直ちに1回呼ばれる                                                                             | L39-46 |
| TC-003  | `interval` が既に非nullの状態で `itemsAvailableCallback` を再度発火 | Equivalence - normal (branch)        | 早期returnし、追加の `setInterval` も `fetchAvatarsInterval()` の即時呼び出しも行われない                                                                          | L40    |

## S2: fetchAvatarImage キャッシュ判定と再取得要求

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public fetchAvatarImage(email: string, repo: string, commits: string[])`
**テスト対象パス**: `src/avatarManager.ts:49-72`

| Case ID | Input / Precondition                                        | Perspective (Equivalence / Boundary) | Expected Result                                                                                                          | Notes          |
| ------- | ----------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------- |
| TC-004  | `avatars[email]` が未定義                                   | Equivalence - normal                 | `queue.add(email, repo, commits, true)` が1回呼ばれ、即時取得要求が登録される                                            | L68-70         |
| TC-005  | 新鮮なキャッシュ済みアバター (`image != null`, 14日以内)    | Equivalence - normal                 | `sendAvatarToWebView(email, onError)` が1回呼ばれ、`queue.add` は呼ばれない                                              | L50-67         |
| TC-006  | 14日超過の通常アバター (`identicon=false`, `image != null`) | Equivalence - normal (branch)        | `queue.add(email, repo, commits, false)` でバックグラウンド更新が登録され、既存画像は `sendAvatarToWebView` で送信される | L53-58, L60-66 |
| TC-007  | 4日超過の identicon (`identicon=true`, `image != null`)     | Equivalence - normal (branch)        | identicon の短い再取得期限が適用され、`queue.add(..., false)` と `sendAvatarToWebView` が呼ばれる                        | L55            |
| TC-008  | キャッシュエントリはあるが `image = null` かつ期限内        | Equivalence - abnormal               | `sendAvatarToWebView` は呼ばれず、再取得も登録されない。何も起きない状態になる                                           | L60            |
| TC-009  | `sendAvatarToWebView` が `onError` を呼ぶ                   | Equivalence - abnormal               | `removeAvatarFromCache(email)` が1回呼ばれ、続けて `queue.add(email, repo, commits, true)` が再試行用に登録される        | L62-66         |

## S3: registerView Webview登録

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public registerView(view: GitKeizuView)`
**テスト対象パス**: `src/avatarManager.ts:74-76`

| Case ID | Input / Precondition                           | Perspective (Equivalence / Boundary) | Expected Result                          | Notes |
| ------- | ---------------------------------------------- | ------------------------------------ | ---------------------------------------- | ----- |
| TC-010  | `view` に `sendMessage` を持つモックViewを渡す | Equivalence - normal                 | `this.view` が渡したView参照に更新される | L75   |

## S4: deregisterView Webview解除

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public deregisterView()`
**テスト対象パス**: `src/avatarManager.ts:78-80`

| Case ID | Input / Precondition  | Perspective (Equivalence / Boundary) | Expected Result              | Notes |
| ------- | --------------------- | ------------------------------------ | ---------------------------- | ----- |
| TC-011  | `registerView()` 済み | Equivalence - normal                 | `this.view` が `null` に戻る | L79   |

## S5: removeAvatarFromCache 個別キャッシュ削除

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public removeAvatarFromCache(email: string)`
**テスト対象パス**: `src/avatarManager.ts:82-85`

| Case ID | Input / Precondition                | Perspective (Equivalence / Boundary) | Expected Result                                                                                        | Notes  |
| ------- | ----------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------ |
| TC-012  | `avatars[email]` に既存エントリあり | Equivalence - normal                 | ローカル `avatars` から該当キーが削除され、`extensionState.removeAvatarFromCache(email)` が1回呼ばれる | L83-84 |

## S6: clearCache 全キャッシュ初期化

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public clearCache()`
**テスト対象パス**: `src/avatarManager.ts:87-90`

| Case ID | Input / Precondition           | Perspective (Equivalence / Boundary) | Expected Result                                                                                            | Notes  |
| ------- | ------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------ |
| TC-013  | `avatars` に複数エントリが存在 | Equivalence - normal                 | `this.avatars` が新しい空オブジェクト `{}` に置き換わり、`extensionState.clearAvatarCache()` が1回呼ばれる | L88-89 |

## S7: fetchAvatarsInterval キュー消化

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private async fetchAvatarsInterval()`
**テスト対象パス**: `src/avatarManager.ts:92-113`

| Case ID | Input / Precondition                                          | Perspective (Equivalence / Boundary) | Expected Result                                                                         | Notes    |
| ------- | ------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------- | -------- |
| TC-014  | `queue.hasItems()` が false かつ `interval` が非null          | Equivalence - normal (branch)        | `clearInterval(interval)` が1回呼ばれ、`interval` が `null` に戻る                      | L108-111 |
| TC-015  | `queue.hasItems()` が false かつ `interval = null`            | Equivalence - abnormal               | 何も呼ばれず終了する                                                                    | L108     |
| TC-016  | `queue.hasItems()` が true だが `takeItem()` が `null` を返す | Equivalence - abnormal               | 早期returnし、`getRemoteSource` と各取得メソッドは呼ばれない                            | L93-95   |
| TC-017  | 取り出した要求の `remoteSource.type = "github"`               | Equivalence - normal                 | `getRemoteSource()` の結果から `fetchFromGithub(avatarRequest, owner, repo)` が呼ばれる | L97-100  |
| TC-018  | `remoteSource.type = "gitlab"`                                | Equivalence - normal                 | `fetchFromGitLab(avatarRequest)` が呼ばれる                                             | L101-103 |
| TC-019  | `remoteSource.type = "gravatar"`                              | Equivalence - normal                 | `fetchFromGravatar(avatarRequest)` が呼ばれる                                           | L104-106 |

## S8: getRemoteSource リモート種別判定

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private async getRemoteSource(avatarRequest: AvatarRequestItem)`
**テスト対象パス**: `src/avatarManager.ts:115-143`

| Case ID | Input / Precondition                                              | Perspective (Equivalence / Boundary) | Expected Result                                                                                                       | Notes          |
| ------- | ----------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------- |
| TC-020  | `remoteSourceCache[repo]` にオブジェクトが存在する                | Equivalence - abnormal               | `typeof ... === "string"` 判定が false になるためキャッシュヒットせず、`dataSource.getRemoteUrl(repo)` が再度呼ばれる | L116           |
| TC-021  | `getRemoteUrl()` が `https://github.com/owner/repo.git` を返す    | Equivalence - normal                 | `{ type: "github", owner: "owner", repo: "repo" }` が返り、同値が `remoteSourceCache[repo]` に保存される              | L123-131, L140 |
| TC-022  | `getRemoteUrl()` が `https://gitlab.com/group/project.git` を返す | Equivalence - normal                 | `{ type: "gitlab" }` が返り、キャッシュされる                                                                         | L132-133, L140 |
| TC-023  | `getRemoteUrl()` が他ホストのURLを返す                            | Equivalence - abnormal               | `{ type: "gravatar" }` が返り、キャッシュされる                                                                       | L134-135, L140 |
| TC-024  | `getRemoteUrl()` が `null` を返す                                 | Boundary - null                      | `{ type: "gravatar" }` が返る                                                                                         | L137-139       |
| TC-025  | GitHub URL が `https://github.com/owner` のように repo要素を欠く  | Boundary - format                    | `remoteUrlComps[4]` が `undefined` になり、`.replace()` 呼び出しで `TypeError` として reject される                   | L126-130       |

## S9: fetchFromGithub GitHub API取得

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private fetchFromGithub(avatarRequest: AvatarRequestItem, owner: string, repo: string)`
**テスト対象パス**: `src/avatarManager.ts:145-217`

| Case ID | Input / Precondition                                                                      | Perspective (Equivalence / Boundary) | Expected Result                                                                                                                         | Notes          |
| ------- | ----------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| TC-026  | `Date.now() < githubTimeout`                                                              | Equivalence - abnormal               | `queue.addItem(avatarRequest, githubTimeout, false)` が呼ばれ、続けて `fetchAvatarsInterval()` が再実行される。`https.get` は呼ばれない | L147-151       |
| TC-027  | `commits.length = 3`, `attempts = 1`                                                      | Equivalence - normal                 | `commitIndex = 1` が選ばれ、GitHub API のパスが `/commits/<commits[1]>` になる                                                          | L153-161       |
| TC-028  | `commits.length = 9`, `attempts = 1`                                                      | Equivalence - normal                 | 長い履歴用の計算式が使われ、`Math.round((4 - attempts) * 0.25 * (length - 1))` に基づくコミットでAPIを引く                              | L154-156       |
| TC-029  | レスポンスヘッダー `x-ratelimit-remaining = "0"`, `x-ratelimit-reset = "1700000000"`      | External - GitHub rate limit         | `githubTimeout` が `1700000000000` に更新される                                                                                         | L172-176       |
| TC-030  | `statusCode = 200`, `author.avatar_url` あり, `downloadAvatarImage()` が `"a.png"` を返す | Equivalence - normal                 | `downloadAvatarImage(email, avatarUrl + "&size=54")` が呼ばれ、`saveAvatar(email, "a.png", false)` が1回呼ばれる                        | L178-188       |
| TC-031  | `statusCode = 200` だが `author` または `avatar_url` がない                               | Equivalence - abnormal               | `fetchFromGravatar(avatarRequest)` にフォールバックする                                                                                 | L178-189, L208 |
| TC-032  | `statusCode = 403`                                                                        | External - GitHub 403                | `queue.addItem(avatarRequest, githubTimeout, false)` が呼ばれ、Gravatar には進まない                                                    | L190-193       |
| TC-033  | `statusCode = 422`, まだ未試行コミットがあり `attempts < 4`                               | Equivalence - abnormal               | `queue.addItem(avatarRequest, 0, true)` が呼ばれ、`attempts` 増分付きで次コミットへ再試行される                                         | L194-201       |
| TC-034  | `statusCode = 422` だが再試行条件を満たさない                                             | Equivalence - abnormal               | GitHub再試行せず `fetchFromGravatar(avatarRequest)` にフォールバックする                                                                | L194-208       |
| TC-035  | `statusCode >= 500`                                                                       | External - GitHub 5xx                | `githubTimeout` が `現在時刻 + 600000` に更新され、`queue.addItem(avatarRequest, githubTimeout, false)` が呼ばれる                      | L202-206       |
| TC-036  | `https.get(...).on("error")` が発火                                                       | External - GitHub network            | `githubTimeout` が `現在時刻 + 300000` に更新され、`queue.addItem(avatarRequest, githubTimeout, false)` が呼ばれる                      | L212-216       |

## S10: fetchFromGitLab GitLab API取得

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private fetchFromGitLab(avatarRequest: AvatarRequestItem)`
**テスト対象パス**: `src/avatarManager.ts:219-276`

| Case ID | Input / Precondition                                          | Perspective (Equivalence / Boundary) | Expected Result                                                                                                              | Notes          |
| ------- | ------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | -------------- |
| TC-037  | `Date.now() < gitLabTimeout`                                  | Equivalence - abnormal               | `queue.addItem(avatarRequest, gitLabTimeout, false)` が呼ばれ、`fetchAvatarsInterval()` が再実行される                       | L221-225       |
| TC-038  | `ratelimit-remaining = "0"`, `ratelimit-reset = "1700000000"` | External - GitLab rate limit         | `gitLabTimeout` が `1700000000000` に更新される                                                                              | L242-246       |
| TC-039  | `statusCode = 200`, 先頭ユーザーに `avatar_url` あり          | Equivalence - normal                 | `downloadAvatarImage(email, users[0].avatar_url)` が呼ばれ、画像取得成功時に `saveAvatar(email, filename, false)` が呼ばれる | L248-255       |
| TC-040  | `statusCode = 200` だが配列空または `avatar_url` なし         | Equivalence - abnormal               | `fetchFromGravatar(avatarRequest)` にフォールバックする                                                                      | L248-256, L267 |
| TC-041  | `statusCode = 429`                                            | External - GitLab 429                | `queue.addItem(avatarRequest, gitLabTimeout, false)` が呼ばれる                                                              | L257-260       |
| TC-042  | `statusCode >= 500`                                           | External - GitLab 5xx                | `gitLabTimeout` が `現在時刻 + 600000` になり、`queue.addItem(avatarRequest, gitLabTimeout, false)` が呼ばれる               | L261-265       |
| TC-043  | `https.get(...).on("error")` が発火                           | External - GitLab network            | `gitLabTimeout` が `現在時刻 + 300000` になり、`queue.addItem(avatarRequest, gitLabTimeout, false)` が呼ばれる               | L271-275       |

## S11: fetchFromGravatar Gravatarフォールバック

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private async fetchFromGravatar(avatarRequest: AvatarRequestItem)`
**テスト対象パス**: `src/avatarManager.ts:278-293`

| Case ID | Input / Precondition                                             | Perspective (Equivalence / Boundary) | Expected Result                                                               | Notes    |
| ------- | ---------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------- | -------- |
| TC-044  | 1回目の `downloadAvatarImage(...d=404)` が `"avatar.png"` を返す | Equivalence - normal                 | `saveAvatar(email, "avatar.png", false)` が呼ばれ、identicon 取得は行われない | L280-292 |
| TC-045  | 1回目が `null`, 2回目の `...d=identicon` が `"id.png"` を返す    | Equivalence - normal (branch)        | `saveAvatar(email, "id.png", true)` が呼ばれる                                | L285-292 |
| TC-046  | 2回の `downloadAvatarImage` がともに `null`                      | Equivalence - abnormal               | `saveAvatar` は呼ばれない                                                     | L285-292 |

## S12: downloadAvatarImage 画像ダウンロードと保存

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private async downloadAvatarImage(email: string, imageUrl: string): Promise<string | null>`
**テスト対象パス**: `src/avatarManager.ts:295-355`

| Case ID | Input / Precondition                                            | Perspective (Equivalence / Boundary) | Expected Result                                                                                                        | Notes    |
| ------- | --------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| TC-047  | `imageUrl = "not a url"`                                        | Boundary - format                    | `new URL()` で失敗し、Promise は `null` を返す。`https.get` は呼ばれない                                               | L298-302 |
| TC-048  | `imageUrl = "https://example.com/a.png"`                        | Equivalence - abnormal               | 許可ホストに含まれないため `null` を返し、ネットワークアクセスしない                                                   | L304-306 |
| TC-049  | `statusCode = 200` だが `content-type` 欠落または `text/html`   | External - invalid content type      | `resolve(null)` し、`fs.writeFile` は呼ばれない                                                                        | L324-329 |
| TC-050  | `statusCode = 200`, `content-type = "image/bmp"`                | External - unsupported image format  | `ALLOWED_IMAGE_FORMATS` にない形式として `resolve(null)` する                                                          | L330-333 |
| TC-051  | `statusCode = 200`, `content-type = "image/png; charset=utf-8"` | Equivalence - normal                 | `fs.writeFile(join(avatarStorageFolder, "<sha256>.png"), Buffer.concat(chunks))` が呼ばれ、`"<sha256>.png"` を解決する | L324-344 |
| TC-052  | `statusCode = 200`, `content-type = "image/svg+xml"`            | Boundary - format                    | `svg+xml` が許可形式として扱われ、`"<sha256>.svg+xml"` が保存名として解決される                                        | L330-335 |
| TC-053  | `fs.writeFile` が reject する                                   | External - file write failure        | `resolve(null)` する                                                                                                   | L336-343 |
| TC-054  | `statusCode = 404` など 200 以外                                | External - image HTTP failure        | `resolve(null)` する                                                                                                   | L345-347 |
| TC-055  | `https.get(...).on("error")` が発火                             | External - image network             | `resolve(null)` する                                                                                                   | L351-353 |

## S13: saveAvatar キャッシュ更新と通知

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private saveAvatar(email: string, image: string, identicon: boolean)`
**テスト対象パス**: `src/avatarManager.ts:357-369`

| Case ID | Input / Precondition                                         | Perspective (Equivalence / Boundary) | Expected Result                                                                                                                                                           | Notes    |
| ------- | ------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- | -------- |
| TC-056  | 既存キャッシュなし                                           | Equivalence - normal                 | `avatars[email]` に `{ image, timestamp, identicon }` が新規作成され、`extensionState.saveAvatar(email, avatars[email])` と `sendAvatarToWebView(email, noop)` が呼ばれる | L364-368 |
| TC-057  | 既存エントリ `identicon=true`, 新しい画像 `identicon=false`  | Equivalence - normal                 | 既存画像が実画像で上書きされ、`identicon` が `false` に更新される。`timestamp` も更新される                                                                               | L358-363 |
| TC-058  | 既存エントリ `identicon=false`, 新しい画像 `identicon=true`  | Equivalence - abnormal               | `if (!identicon                                                                                                                                                           |          | existing.identicon)`が false のため`image`と`identicon` は維持され、`timestamp` のみ更新される | L359-363 |
| TC-059  | 既存エントリ `identicon=true`, 新しい画像も `identicon=true` | Equivalence - normal (branch)        | identicon 画像が上書きされ、`timestamp` 更新後に永続化と送信が行われる                                                                                                    | L359-368 |

## S14: sendAvatarToWebView data URI送信

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private async sendAvatarToWebView(email: string, onError: () => void)`
**テスト対象パス**: `src/avatarManager.ts:371-388`

| Case ID | Input / Precondition                                 | Perspective (Equivalence / Boundary) | Expected Result                                                                                           | Notes    |
| ------- | ---------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------- |
| TC-060  | `view = null`                                        | Equivalence - abnormal               | 早期returnし、`fs.readFile` は呼ばれない                                                                  | L372     |
| TC-061  | `avatars[email]?.image` が `undefined` または `null` | Boundary - null                      | 早期returnし、`fs.readFile` は呼ばれない                                                                  | L373-374 |
| TC-062  | `view` あり、`fs.readFile` 成功、画像名 `abc.png`    | Equivalence - normal                 | `view.sendMessage({ command: "fetchAvatar", email, image: "data:image/png;base64,<...>" })` が1回呼ばれる | L375-383 |
| TC-063  | `fs.readFile` 待機中に `view` が `null` へ変わる     | Equivalence - abnormal               | 読み込みは完了しても内側の `if (this.view !== null)` が false となり `sendMessage` は呼ばれない           | L377     |
| TC-064  | `fs.readFile` が reject する                         | External - file read failure         | `onError()` が1回呼ばれる                                                                                 | L385-386 |

## S15: AvatarRequestQueue.constructor キュー初期化

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `constructor(itemsAvailableCallback: () => void)`
**テスト対象パス**: `src/avatarManager.ts:396-398`

| Case ID | Input / Precondition                    | Perspective (Equivalence / Boundary) | Expected Result                                              | Notes    |
| ------- | --------------------------------------- | ------------------------------------ | ------------------------------------------------------------ | -------- |
| TC-065  | `itemsAvailableCallback=vi.fn()` で生成 | Equivalence - normal                 | `queue` が空で初期化され、渡したコールバック参照が保持される | L396-397 |

## S16: AvatarRequestQueue.add 新規/既存要求の追加

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public add(email: string, repo: string, commits: string[], immediate: boolean)`
**テスト対象パス**: `src/avatarManager.ts:401-423`

| Case ID | Input / Precondition                                                                               | Perspective (Equivalence / Boundary) | Expected Result                                                         | Notes    |
| ------- | -------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------- | -------- |
| TC-066  | 同一 `email` + `repo` の既存項目があり、新しい `commits` に既存末尾コミット以降の履歴が含まれる    | Equivalence - normal                 | `commits.slice(l + 1)` 分だけ既存項目へ追記され、重複項目は追加されない | L404-410 |
| TC-067  | 同一 `email` + `repo` の既存項目はあるが、既存末尾コミットが新しい配列にない、または末尾と一致する | Equivalence - abnormal               | キュー内容は変化せず、新規 `insertItem` も呼ばれない                    | L404-410 |
| TC-068  | 新規項目、`immediate = true`                                                                       | Equivalence - normal                 | `checkAfter = 0`, `attempts = 0` の項目が `insertItem` へ渡される       | L412-421 |
| TC-069  | 新規項目、`immediate = false`, 既存キュー長 = 0                                                    | Boundary - empty                     | `queue.length === 0` 側により `checkAfter = 0` になる                   | L416-419 |
| TC-070  | 新規項目、`immediate = false`, 既存キュー末尾の `checkAfter = 5`                                   | Equivalence - normal (branch)        | 新項目の `checkAfter = 6` で `insertItem` へ渡される                    | L416-419 |

## S17: AvatarRequestQueue.addItem 再投入

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public addItem(item: AvatarRequestItem, checkAfter: number, failedAttempt: boolean)`
**テスト対象パス**: `src/avatarManager.ts:426-430`

| Case ID | Input / Precondition    | Perspective (Equivalence / Boundary) | Expected Result                                                                       | Notes    |
| ------- | ----------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- | -------- |
| TC-071  | `failedAttempt = false` | Equivalence - normal                 | `item.checkAfter` だけが更新され、`attempts` は増えずに `insertItem(item)` が呼ばれる | L427-429 |
| TC-072  | `failedAttempt = true`  | Equivalence - abnormal               | `attempts` が1増えた状態で `insertItem(item)` が呼ばれる                              | L428-429 |

## S18: AvatarRequestQueue.hasItems 有無判定

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public hasItems()`
**テスト対象パス**: `src/avatarManager.ts:433-435`

| Case ID | Input / Precondition | Perspective (Equivalence / Boundary) | Expected Result | Notes |
| ------- | -------------------- | ------------------------------------ | --------------- | ----- |
| TC-073  | キューが空           | Boundary - empty                     | `false` を返す  | L434  |
| TC-074  | キューに1件以上ある  | Equivalence - normal                 | `true` を返す   | L434  |

## S19: AvatarRequestQueue.takeItem 取り出し条件

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public takeItem()`
**テスト対象パス**: `src/avatarManager.ts:438-442`

| Case ID | Input / Precondition                   | Perspective (Equivalence / Boundary) | Expected Result                             | Notes    |
| ------- | -------------------------------------- | ------------------------------------ | ------------------------------------------- | -------- |
| TC-075  | キューが空                             | Boundary - empty                     | `null` を返す                               | L439-441 |
| TC-076  | 先頭項目の `checkAfter < Date.now()`   | Equivalence - normal                 | 先頭要素が `shift()` され、その項目が返る   | L439-440 |
| TC-077  | 先頭項目の `checkAfter === Date.now()` | Boundary - exact                     | 比較が `<` のため取り出されず `null` を返す | L439     |
| TC-078  | 先頭項目の `checkAfter > Date.now()`   | Equivalence - abnormal               | まだ実行時刻前として `null` を返す          | L439-441 |

## S20: AvatarRequestQueue.insertItem checkAfter順挿入

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private insertItem(item: AvatarRequestItem)`
**テスト対象パス**: `src/avatarManager.ts:445-457`

| Case ID | Input / Precondition                     | Perspective (Equivalence / Boundary) | Expected Result                                                                 | Notes    |
| ------- | ---------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------- | -------- |
| TC-079  | 空キューへ1件挿入                        | Equivalence - normal                 | `splice(0, 0, item)` 相当で先頭に入り、`itemsAvailableCallback()` が1回呼ばれる | L455-456 |
| TC-080  | `checkAfter` がばらばらの項目を順に挿入  | Equivalence - normal                 | バイナリ挿入により `queue` が `checkAfter` 昇順で保持される                     | L446-455 |
| TC-081  | 既存項目と同じ `checkAfter` の項目を挿入 | Boundary - equal                     | `<=` 比較により既存同値項目の後ろへ挿入される                                   | L452     |
| TC-082  | 挿入前キュー長 > 0                       | Equivalence - abnormal               | `itemsAvailableCallback()` は呼ばれない                                         | L456     |
