# Test Perspectives: src/avatarManager.ts

> Source: `src/avatarManager.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest 4.x

## S1: constructor initialization and queue start hook

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `constructor(dataSource: DataSource, extensionState: ExtensionState)`
**Target path**: `src/avatarManager.ts:34-47`

| Case ID | Input / Precondition                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                        | Notes  |
| ------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| TC-001  | Construct with a valid `dataSource` and `extensionState`                               | Normal - standard                                                          | `avatarStorageFolder` holds the return value of `extensionState.getAvatarStoragePath()`, `avatars` holds the return value of `extensionState.getAvatarCache()`, and `queue` is created | L35-46 |
| TC-002  | Right after construction, fire the queue's `itemsAvailableCallback` for the first time | Normal - standard                                                          | `setInterval` is set once with `10000ms`, and `fetchAvatarsInterval()` is called once immediately                                                                                      | L39-46 |
| TC-003  | Fire `itemsAvailableCallback` again while `interval` is already non-null               | Normal - branch                                                            | Returns early; no additional `setInterval` and no immediate `fetchAvatarsInterval()` call                                                                                              | L40    |

## S2: fetchAvatarImage cache check and refetch request

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public fetchAvatarImage(email: string, repo: string, commits: string[])`
**Target path**: `src/avatarManager.ts:49-72`

| Case ID | Input / Precondition                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                             | Notes          |
| ------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| TC-004  | `avatars[email]` is undefined                                          | Normal - standard                                                          | `queue.add(email, repo, commits, true)` is called once, registering an immediate fetch request                                              | L68-70         |
| TC-005  | Fresh cached avatar (`image != null`, within 14 days)                  | Normal - standard                                                          | `sendAvatarToWebView(email, onError)` is called once, and `queue.add` is not called                                                         | L50-67         |
| TC-006  | Regular avatar older than 14 days (`identicon=false`, `image != null`) | Normal - branch                                                            | A background refresh is registered with `queue.add(email, repo, commits, false)`, and the existing image is sent with `sendAvatarToWebView` | L53-58, L60-66 |
| TC-007  | Identicon older than 4 days (`identicon=true`, `image != null`)        | Normal - branch                                                            | The shorter refetch period for identicons applies, and `queue.add(..., false)` and `sendAvatarToWebView` are called                         | L55            |
| TC-008  | A cache entry exists but `image = null` and it is within the period    | Validation - rejected precondition                                         | `sendAvatarToWebView` is not called and no refetch is registered; nothing happens                                                           | L60            |
| TC-009  | `sendAvatarToWebView` calls `onError`                                  | Validation - rejected precondition                                         | `removeAvatarFromCache(email)` is called once, then `queue.add(email, repo, commits, true)` is registered for a retry                       | L62-66         |

## S3: registerView webview registration

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public registerView(view: GitKeizuView)`
**Target path**: `src/avatarManager.ts:74-76`

| Case ID | Input / Precondition                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                     | Notes |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- | ----- |
| TC-010  | Pass a mock view with `sendMessage` as `view` | Normal - standard                                                          | `this.view` is updated to the passed view reference | L75   |

## S4: deregisterView webview deregistration

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public deregisterView()`
**Target path**: `src/avatarManager.ts:78-80`

| Case ID | Input / Precondition            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result               | Notes |
| ------- | ------------------------------- | -------------------------------------------------------------------------- | ----------------------------- | ----- |
| TC-011  | `registerView()` already called | Normal - standard                                                          | `this.view` returns to `null` | L79   |

## S5: removeAvatarFromCache single cache entry removal

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public removeAvatarFromCache(email: string)`
**Target path**: `src/avatarManager.ts:82-85`

| Case ID | Input / Precondition                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                               | Notes  |
| ------- | -------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ |
| TC-012  | `avatars[email]` has an existing entry | Normal - standard                                                          | The key is deleted from the local `avatars`, and `extensionState.removeAvatarFromCache(email)` is called once | L83-84 |

## S6: clearCache full cache reset

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public clearCache()`
**Target path**: `src/avatarManager.ts:87-90`

| Case ID | Input / Precondition          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                 | Notes  |
| ------- | ----------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------ |
| TC-013  | `avatars` has several entries | Normal - standard                                                          | `this.avatars` is replaced with a new empty object `{}`, and `extensionState.clearAvatarCache()` is called once | L88-89 |

## S7: fetchAvatarsInterval queue processing

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `private async fetchAvatarsInterval()`
**Target path**: `src/avatarManager.ts:92-113`

| Case ID | Input / Precondition                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                | Notes    |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------- |
| TC-014  | `queue.hasItems()` is false and `interval` is non-null     | Normal - branch                                                            | `clearInterval(interval)` is called once, and `interval` returns to `null`                     | L108-111 |
| TC-015  | `queue.hasItems()` is false and `interval = null`          | Validation - rejected precondition                                         | Ends without calling anything                                                                  | L108     |
| TC-016  | `queue.hasItems()` is true but `takeItem()` returns `null` | Validation - rejected precondition                                         | Returns early; `getRemoteSource` and the fetch methods are not called                          | L93-95   |
| TC-017  | The taken request has `remoteSource.type = "github"`       | Normal - standard                                                          | `fetchFromGithub(avatarRequest, owner, repo)` is called with the result of `getRemoteSource()` | L97-100  |
| TC-018  | `remoteSource.type = "gitlab"`                             | Normal - standard                                                          | `fetchFromGitLab(avatarRequest)` is called                                                     | L101-103 |
| TC-019  | `remoteSource.type = "gravatar"`                           | Normal - standard                                                          | `fetchFromGravatar(avatarRequest)` is called                                                   | L104-106 |

## S8: getRemoteSource remote type detection

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: superseded
> Superseded By: S25
> Supersedes: -

**Signature**: `private async getRemoteSource(avatarRequest: AvatarRequestItem)`
**Target path**: `src/avatarManager.ts:115-143`

| Case ID | Input / Precondition                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                       | Notes          |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------- |
| TC-020  | `remoteSourceCache[repo]` holds an object                            | Validation - rejected precondition                                         | The `typeof ... === "string"` check is false, so the cache misses and `dataSource.getRemoteUrl(repo)` is called again | L116           |
| TC-021  | `getRemoteUrl()` returns `https://github.com/owner/repo.git`         | Normal - standard                                                          | Returns `{ type: "github", owner: "owner", repo: "repo" }` and stores the same value in `remoteSourceCache[repo]`     | L123-131, L140 |
| TC-022  | `getRemoteUrl()` returns `https://gitlab.com/group/project.git`      | Normal - standard                                                          | Returns `{ type: "gitlab" }` and caches it                                                                            | L132-133, L140 |
| TC-023  | `getRemoteUrl()` returns a URL for another host                      | Validation - rejected precondition                                         | Returns `{ type: "gravatar" }` and caches it                                                                          | L134-135, L140 |
| TC-024  | `getRemoteUrl()` returns `null`                                      | Boundary - null                                                            | Returns `{ type: "gravatar" }`                                                                                        | L137-139       |
| TC-025  | The GitHub URL lacks the repo part, as in `https://github.com/owner` | Boundary - format                                                          | `remoteUrlComps[4]` becomes `undefined`, and the `.replace()` call rejects with a `TypeError`                         | L126-130       |

## S9: fetchFromGithub GitHub API fetch

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `private fetchFromGithub(avatarRequest: AvatarRequestItem, owner: string, repo: string)`
**Target path**: `src/avatarManager.ts:145-217`

| Case ID | Input / Precondition                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                            | Notes          |
| ------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| TC-026  | `Date.now() < githubTimeout`                                                               | Validation - rejected precondition                                         | `queue.addItem(avatarRequest, githubTimeout, false)` is called, then `fetchAvatarsInterval()` runs again. `https.get` is not called        | L147-151       |
| TC-027  | `commits.length = 3`, `attempts = 1`                                                       | Normal - standard                                                          | `commitIndex = 1` is chosen, and the GitHub API path becomes `/commits/<commits[1]>`                                                       | L153-161       |
| TC-028  | `commits.length = 9`, `attempts = 1`                                                       | Normal - standard                                                          | The formula for long histories is used, and the API is queried with the commit given by `Math.round((4 - attempts) * 0.25 * (length - 1))` | L154-156       |
| TC-029  | Response headers `x-ratelimit-remaining = "0"`, `x-ratelimit-reset = "1700000000"`         | External - GitHub rate limit                                               | `githubTimeout` is updated to `1700000000000`                                                                                              | L172-176       |
| TC-030  | `statusCode = 200`, `author.avatar_url` present, `downloadAvatarImage()` returns `"a.png"` | Normal - standard                                                          | `downloadAvatarImage(email, avatarUrl + "&size=54")` is called, and `saveAvatar(email, "a.png", false)` is called once                     | L178-188       |
| TC-031  | `statusCode = 200` but `author` or `avatar_url` is missing                                 | Validation - rejected precondition                                         | Falls back to `fetchFromGravatar(avatarRequest)`                                                                                           | L178-189, L208 |
| TC-032  | `statusCode = 403`                                                                         | External - GitHub 403                                                      | `queue.addItem(avatarRequest, githubTimeout, false)` is called and it does not proceed to Gravatar                                         | L190-193       |
| TC-033  | `statusCode = 422`, untried commits remain and `attempts < 4`                              | Validation - rejected precondition                                         | `queue.addItem(avatarRequest, 0, true)` is called, and it retries with the next commit with `attempts` incremented                         | L194-201       |
| TC-034  | `statusCode = 422` but the retry condition is not met                                      | Validation - rejected precondition                                         | Does not retry GitHub and falls back to `fetchFromGravatar(avatarRequest)`                                                                 | L194-208       |
| TC-035  | `statusCode >= 500`                                                                        | External - GitHub 5xx                                                      | `githubTimeout` is updated to `now + 600000`, and `queue.addItem(avatarRequest, githubTimeout, false)` is called                           | L202-206       |
| TC-036  | `https.get(...).on("error")` fires                                                         | External - GitHub network                                                  | `githubTimeout` is updated to `now + 300000`, and `queue.addItem(avatarRequest, githubTimeout, false)` is called                           | L212-216       |

## S10: fetchFromGitLab GitLab API fetch

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `private fetchFromGitLab(avatarRequest: AvatarRequestItem)`
**Target path**: `src/avatarManager.ts:219-276`

| Case ID | Input / Precondition                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                               | Notes          |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| TC-037  | `Date.now() < gitLabTimeout`                                         | Validation - rejected precondition                                         | `queue.addItem(avatarRequest, gitLabTimeout, false)` is called, and `fetchAvatarsInterval()` runs again                                       | L221-225       |
| TC-038  | `ratelimit-remaining = "0"`, `ratelimit-reset = "1700000000"`        | External - GitLab rate limit                                               | `gitLabTimeout` is updated to `1700000000000`                                                                                                 | L242-246       |
| TC-039  | `statusCode = 200`, the first user has `avatar_url`                  | Normal - standard                                                          | `downloadAvatarImage(email, users[0].avatar_url)` is called, and `saveAvatar(email, filename, false)` is called when the image fetch succeeds | L248-255       |
| TC-040  | `statusCode = 200` but the array is empty or `avatar_url` is missing | Validation - rejected precondition                                         | Falls back to `fetchFromGravatar(avatarRequest)`                                                                                              | L248-256, L267 |
| TC-041  | `statusCode = 429`                                                   | External - GitLab 429                                                      | `queue.addItem(avatarRequest, gitLabTimeout, false)` is called                                                                                | L257-260       |
| TC-042  | `statusCode >= 500`                                                  | External - GitLab 5xx                                                      | `gitLabTimeout` becomes `now + 600000`, and `queue.addItem(avatarRequest, gitLabTimeout, false)` is called                                    | L261-265       |
| TC-043  | `https.get(...).on("error")` fires                                   | External - GitLab network                                                  | `gitLabTimeout` becomes `now + 300000`, and `queue.addItem(avatarRequest, gitLabTimeout, false)` is called                                    | L271-275       |

## S11: fetchFromGravatar Gravatar fallback

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `private async fetchFromGravatar(avatarRequest: AvatarRequestItem)`
**Target path**: `src/avatarManager.ts:278-293`

| Case ID | Input / Precondition                                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                 | Notes    |
| ------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------- |
| TC-044  | The first `downloadAvatarImage(...d=404)` returns `"avatar.png"`         | Normal - standard                                                          | `saveAvatar(email, "avatar.png", false)` is called, and no identicon is fetched | L280-292 |
| TC-045  | The first returns `null`, the second `...d=identicon` returns `"id.png"` | Normal - branch                                                            | `saveAvatar(email, "id.png", true)` is called                                   | L285-292 |
| TC-046  | Both `downloadAvatarImage` calls return `null`                           | Validation - rejected precondition                                         | `saveAvatar` is not called                                                      | L285-292 |

## S12: downloadAvatarImage image download and save

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `private async downloadAvatarImage(email: string, imageUrl: string): Promise<string | null>`
**Target path**: `src/avatarManager.ts:295-355`

| Case ID | Input / Precondition                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                          | Notes    |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| TC-047  | `imageUrl = "not a url"`                                        | Boundary - format                                                          | `new URL()` fails and the Promise returns `null`. `https.get` is not called                                              | L298-302 |
| TC-048  | `imageUrl = "https://example.com/a.png"`                        | Validation - rejected precondition                                         | Returns `null` because the host is not in the allowed hosts, without network access                                      | L304-306 |
| TC-049  | `statusCode = 200` but `content-type` is missing or `text/html` | External - invalid content type                                            | Calls `resolve(null)`, and `fs.writeFile` is not called                                                                  | L324-329 |
| TC-050  | `statusCode = 200`, `content-type = "image/bmp"`                | External - unsupported image format                                        | Calls `resolve(null)` as a format not in `ALLOWED_IMAGE_FORMATS`                                                         | L330-333 |
| TC-051  | `statusCode = 200`, `content-type = "image/png; charset=utf-8"` | Normal - standard                                                          | `fs.writeFile(join(avatarStorageFolder, "<sha256>.png"), Buffer.concat(chunks))` is called and resolves `"<sha256>.png"` | L324-344 |
| TC-052  | `statusCode = 200`, `content-type = "image/svg+xml"`            | Boundary - format                                                          | `svg+xml` is treated as an allowed format, and `"<sha256>.svg+xml"` is resolved as the saved name                        | L330-335 |
| TC-053  | `fs.writeFile` rejects                                          | External - file write failure                                              | Calls `resolve(null)`                                                                                                    | L336-343 |
| TC-054  | A status other than 200, such as `statusCode = 404`             | External - image HTTP failure                                              | Calls `resolve(null)`                                                                                                    | L345-347 |
| TC-055  | `https.get(...).on("error")` fires                              | External - image network                                                   | Calls `resolve(null)`                                                                                                    | L351-353 |

## S13: saveAvatar cache update and notification

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `private saveAvatar(email: string, image: string, identicon: boolean)`
**Target path**: `src/avatarManager.ts:357-369`

| Case ID | Input / Precondition                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                  | Notes    |
| ------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TC-056  | No existing cache entry                                          | Normal - standard                                                          | `{ image, timestamp, identicon }` is newly created in `avatars[email]`, and `extensionState.saveAvatar(email, avatars[email])` and `sendAvatarToWebView(email, noop)` are called | L364-368 |
| TC-057  | Existing entry `identicon=true`, new image `identicon=false`     | Normal - standard                                                          | The existing image is overwritten with the real image, and `identicon` is updated to `false`. `timestamp` is also updated                                                        | L358-363 |
| TC-058  | Existing entry `identicon=false`, new image `identicon=true`     | Validation - rejected precondition                                         | `if (!identicon \|\| existing.identicon)` is false, so `image` and `identicon` are kept and only `timestamp` is updated                                                          | L359-363 |
| TC-059  | Existing entry `identicon=true`, new image also `identicon=true` | Normal - branch                                                            | The identicon image is overwritten, and after the `timestamp` update it is persisted and sent                                                                                    | L359-368 |

## S14: sendAvatarToWebView data URI sending

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `private async sendAvatarToWebView(email: string, onError: () => void)`
**Target path**: `src/avatarManager.ts:371-388`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                            | Notes    |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------- |
| TC-060  | `view = null`                                                | Validation - rejected precondition                                         | Returns early, and `fs.readFile` is not called                                                             | L372     |
| TC-061  | `avatars[email]?.image` is `undefined` or `null`             | Boundary - null                                                            | Returns early, and `fs.readFile` is not called                                                             | L373-374 |
| TC-062  | `view` present, `fs.readFile` succeeds, image name `abc.png` | Normal - standard                                                          | `view.sendMessage({ command: "fetchAvatar", email, image: "data:image/png;base64,<...>" })` is called once | L375-383 |
| TC-063  | `view` changes to `null` while waiting for `fs.readFile`     | Validation - rejected precondition                                         | The read completes, but the inner `if (this.view !== null)` is false, so `sendMessage` is not called       | L377     |
| TC-064  | `fs.readFile` rejects                                        | External - file read failure                                               | `onError()` is called once                                                                                 | L385-386 |

## S15: AvatarRequestQueue.constructor queue initialization

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `constructor(itemsAvailableCallback: () => void)`
**Target path**: `src/avatarManager.ts:396-398`

| Case ID | Input / Precondition                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                         | Notes    |
| ------- | ----------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------- |
| TC-065  | Construct with `itemsAvailableCallback=vi.fn()` | Normal - standard                                                          | `queue` is initialized empty, and the passed callback reference is kept | L396-397 |

## S16: AvatarRequestQueue.add adding new or existing requests

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public add(email: string, repo: string, commits: string[], immediate: boolean)`
**Target path**: `src/avatarManager.ts:401-423`

| Case ID | Input / Precondition                                                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                              | Notes    |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| TC-066  | An item with the same `email` + `repo` exists, and the new `commits` include history after the existing last commit              | Normal - standard                                                          | Only `commits.slice(l + 1)` is appended to the existing item, and no duplicate item is added | L404-410 |
| TC-067  | An item with the same `email` + `repo` exists, but the existing last commit is not in the new array, or matches the last element | Validation - rejected precondition                                         | The queue content does not change, and no new `insertItem` call is made                      | L404-410 |
| TC-068  | New item, `immediate = true`                                                                                                     | Normal - standard                                                          | An item with `checkAfter = 0`, `attempts = 0` is passed to `insertItem`                      | L412-421 |
| TC-069  | New item, `immediate = false`, existing queue length = 0                                                                         | Boundary - empty                                                           | `checkAfter = 0` via the `queue.length === 0` side                                           | L416-419 |
| TC-070  | New item, `immediate = false`, the last queue item has `checkAfter = 5`                                                          | Normal - branch                                                            | The new item is passed to `insertItem` with `checkAfter = 6`                                 | L416-419 |

## S17: AvatarRequestQueue.addItem requeue

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public addItem(item: AvatarRequestItem, checkAfter: number, failedAttempt: boolean)`
**Target path**: `src/avatarManager.ts:426-430`

| Case ID | Input / Precondition    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                     | Notes    |
| ------- | ----------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------- |
| TC-071  | `failedAttempt = false` | Normal - standard                                                          | Only `item.checkAfter` is updated, and `insertItem(item)` is called without incrementing `attempts` | L427-429 |
| TC-072  | `failedAttempt = true`  | Validation - rejected precondition                                         | `insertItem(item)` is called with `attempts` incremented by 1                                       | L428-429 |

## S18: AvatarRequestQueue.hasItems presence check

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public hasItems()`
**Target path**: `src/avatarManager.ts:433-435`

| Case ID | Input / Precondition            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes |
| ------- | ------------------------------- | -------------------------------------------------------------------------- | --------------- | ----- |
| TC-073  | The queue is empty              | Boundary - empty                                                           | Returns `false` | L434  |
| TC-074  | The queue has one or more items | Normal - standard                                                          | Returns `true`  | L434  |

## S19: AvatarRequestQueue.takeItem take conditions

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `public takeItem()`
**Target path**: `src/avatarManager.ts:438-442`

| Case ID | Input / Precondition                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                          | Notes    |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | -------- |
| TC-075  | The queue is empty                             | Boundary - empty                                                           | Returns `null`                                           | L439-441 |
| TC-076  | The first item has `checkAfter < Date.now()`   | Normal - standard                                                          | The first element is removed with `shift()` and returned | L439-440 |
| TC-077  | The first item has `checkAfter === Date.now()` | Boundary - exact                                                           | Not taken because the comparison is `<`; returns `null`  | L439     |
| TC-078  | The first item has `checkAfter > Date.now()`   | Validation - rejected precondition                                         | Returns `null` because the run time has not come yet     | L439-441 |

## S20: AvatarRequestQueue.insertItem insertion in checkAfter order

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**Signature**: `private insertItem(item: AvatarRequestItem)`
**Target path**: `src/avatarManager.ts:445-457`

| Case ID | Input / Precondition                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                   | Notes    |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------- |
| TC-079  | Insert one item into an empty queue                           | Normal - standard                                                          | It goes to the front, as with `splice(0, 0, item)`, and `itemsAvailableCallback()` is called once | L455-456 |
| TC-080  | Insert items with mixed `checkAfter` values in turn           | Normal - standard                                                          | Binary insertion keeps `queue` sorted by `checkAfter` ascending                                   | L446-455 |
| TC-081  | Insert an item with the same `checkAfter` as an existing item | Boundary - equal                                                           | The `<=` comparison inserts it after the existing item with the same value                        | L452     |
| TC-082  | Queue length > 0 before insertion                             | Validation - rejected precondition                                         | `itemsAvailableCallback()` is not called                                                          | L456     |

## S21: getRemoteSource cache hit corrected behavior

> Origin: light-spec-plan notes/features/042/spec.md
> Added: 2026-05-28
> Status: active
> Supersedes: TC-020

**Signature**: `private async getRemoteSource(avatarRequest: AvatarRequestItem)`
**Target Path**: `src/avatarManager.ts:115-143`

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                       | Notes |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----- |
| TC-083  | `remoteSourceCache[repo]` holds a `RemoteSource` object | Normal - cache hit                                                         | `getRemoteSource()` returns the same cached object, and `dataSource.getRemoteUrl(repo)` is not called | -     |

## S22: provider JSON parse failure fallback

> Origin: light-spec-plan notes/features/042/spec.md
> Added: 2026-05-28
> Status: active
> Supersedes: -

**Signature**: `private fetchFromGithub(...), private fetchFromGitLab(...)`
**Target Path**: `src/avatarManager.ts:145-276`

| Case ID | Input / Precondition                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                             | Notes |
| ------- | ----------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----- |
| TC-084  | GitHub HTTP 200 + invalid JSON body | External - malformed provider response                                     | `fetchFromGravatar(avatarRequest)` is called once, and the GitHub `downloadAvatarImage()` and `saveAvatar()` are not called | -     |
| TC-085  | GitLab HTTP 200 + invalid JSON body | External - malformed provider response                                     | `fetchFromGravatar(avatarRequest)` is called once, and the GitLab `downloadAvatarImage()` and `saveAvatar()` are not called | -     |

## S23: Destroying https requests on the timeout event

> Origin: フェーズ2 修正 M7 (avatar-request-timeout-destroy)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `private fetchFromGithub(...)` / `private fetchFromGitLab(...)` / `private fetchFromGravatar(...)`
> Target Path: `src/avatarManager.ts:232, 303, 382`

This fix adds `req.on("timeout", () => req.destroy(new Error("timeout")))` to the three `https.get` calls (which specify `timeout: 15000`). When the socket does not respond within 15 seconds, the `timeout` event fires and the request is destroyed with a timeout Error. The destroy propagates to the existing `error` handler, and each provider's network-error fallback path runs (timeout update + requeue, or `resolve(null)` on the Gravatar side).

| Case ID | Input / Precondition                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                        | Notes                                   |
| ------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| TC-086  | The `timeout` event fires on the https request of fetchFromGithub                 | External - GitHub request timeout                                          | `req.destroy` is called once with an `Error("timeout")` argument, and through the `error` handler `githubTimeout=now+300000` is set and `queue.addItem(avatarRequest, githubTimeout, false)` is called | timeout -> destroy -> error propagation |
| TC-087  | The `timeout` event fires on the https request of fetchFromGitLab                 | External - GitLab request timeout                                          | `req.destroy` is called once with `Error("timeout")`, and through `error` `gitLabTimeout=now+300000` is set and `queue.addItem(avatarRequest, gitLabTimeout, false)` is called                         | GitLab-side timeout                     |
| TC-088  | The `timeout` event fires on the https request of fetchFromGravatar               | External - Gravatar request timeout                                        | `req.destroy` is called once with `Error("timeout")`, the Promise resolves with `null` through `error`, and `saveAvatar` is not called                                                                 | Gravatar-side timeout                   |
| TC-089  | fetchFromGithub receives a normal 200 response without the `timeout` event firing | Normal - no timeout                                                        | `req.destroy` is not called, and normal response handling (`downloadAvatarImage` -> `saveAvatar`) runs                                                                                                 | No destroy without a timeout            |

## S24: Requeue branch for rate-limit responses without a reset header

> Origin: フェーズ2 修正 M8 (rate-limit-headerless-requeue)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `private fetchFromGithub(...)` (403 branch) / `private fetchFromGitLab(...)` (429 branch)
> Target Path: `src/avatarManager.ts:199-207, 278-286`

This fix adds a branch for GitHub 403 / GitLab 429 rate-limit responses: when the `githubTimeout`/`gitLabTimeout` computed from the reset header is `0` (no valid reset time), the request is requeued for the default of 5 minutes later with `queue.addItem(avatarRequest, t + RATE_LIMIT_RETRY_INTERVAL_MS, true)` (`failedAttempt=true`, which consumes an attempt). When the timeout is non-zero, it calls `queue.addItem(avatarRequest, timeout, false)` as before. This refines the existing 403/429 behavior of S9 TC-032 / S10 TC-041 by the timeout value.

| Case ID | Input / Precondition                                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                      | Notes                                                 |
| ------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| TC-090  | GitHub `statusCode=403`, `githubTimeout===0` (reset header missing)      | External - GitHub 403 headerless requeue                                   | `queue.addItem(avatarRequest, t + 300000, true)` is called (`failedAttempt=true`). The branch with the `false` argument is not taken | Default 5-minute retry when the reset time is unknown |
| TC-091  | GitHub `statusCode=403`, `githubTimeout!==0` (set from the reset header) | External - GitHub 403 with reset                                           | `queue.addItem(avatarRequest, githubTimeout, false)` is called                                                                       | Existing branch (refines S9 TC-032)                   |
| TC-092  | GitLab `statusCode=429`, `gitLabTimeout===0` (reset header missing)      | External - GitLab 429 headerless requeue                                   | `queue.addItem(avatarRequest, t + 300000, true)` is called (`failedAttempt=true`)                                                    | Default 5-minute retry when the reset time is unknown |
| TC-093  | GitLab `statusCode=429`, `gitLabTimeout!==0` (set from the reset header) | External - GitLab 429 with reset                                           | `queue.addItem(avatarRequest, gitLabTimeout, false)` is called                                                                       | Existing branch (refines S10 TC-041)                  |
| TC-094  | Reference to the `RATE_LIMIT_RETRY_INTERVAL_MS` constant                 | Boundary - constant value                                                  | The constant value is `300000` (5 minutes) and is used as the delay of the headerless requeue                                        | Verifies removal of the magic number                  |
| TC-095  | GitHub 403 headerless, fetch start time `t` known                        | Boundary - retry offset from now                                           | The requeue checkAfter is `t + 300000`, computed from the current time rather than from `this.githubTimeout` (=0)                    | Verifies the base time of the offset                  |

## S25: getRemoteSource GitHub URL segment validation and Gravatar fallback

> Origin: フェーズ3 修正 L11 (github-remote-url-length-guard)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: S8
> Signature: `private async getRemoteSource(avatarRequest: AvatarRequestItem)`
> Target Path: `src/avatarManager.ts:128-143`

This fix adds a guard that validates remote URLs starting with `https://github.com/` whose owner/repo segments (`remoteUrlComps[3]`/`[4]`) are missing after splitting on `/`. The old implementation called `remoteUrlComps[4].replace(...)` unconditionally and threw a `TypeError` when `[4]` was `undefined`. The new implementation builds a GitHub source only when `remoteUrlComps.length >= 5 && remoteUrlComps[3] && remoteUrlComps[4]` holds; otherwise it does not throw and falls back to `{ type: "gravatar" }`. This replaces the TypeError-reject premise of S8 (TC-025).

| Case ID | Input / Precondition                                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                             | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-096  | `getRemoteUrl()` returns `https://github.com/owner/repo.git`                                                  | Normal - valid github url                                                  | Returns `{ type: "github", owner: "owner", repo: "repo" }` and stores it in `remoteSourceCache[repo]`       | Valid owner/repo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| TC-097  | `getRemoteUrl()` returns `https://gitlab.com/group/project.git`                                               | Normal - gitlab url                                                        | Returns `{ type: "gitlab" }` and caches it                                                                  | GitLab branch                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| TC-098  | `getRemoteUrl()` returns another host (for example `https://bitbucket.org/x/y`)                               | Validation - other host to gravatar                                        | Returns `{ type: "gravatar" }` and caches it                                                                | Unsupported host                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| TC-099  | `getRemoteUrl()` returns `null`                                                                               | Boundary - null remote url                                                 | Returns `{ type: "gravatar" }`                                                                              | No remote                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| TC-100  | `getRemoteUrl()` returns `https://github.com/owner` (repo segment missing, split length 4)                    | Boundary - missing repo segment fallback                                   | Does not throw and returns `{ type: "gravatar" }` (the old implementation threw a `TypeError`)              | Core regression for L11. `length >= 5` guard                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| TC-101  | `getRemoteUrl()` returns `https://github.com/` (both owner and repo missing, last segment is an empty string) | Boundary - missing owner segment fallback                                  | `remoteUrlComps[3]`/`[4]` are empty strings (falsy), so it falls back to `{ type: "gravatar" }`             | Rejects empty segments                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| TC-102  | `remoteSourceCache[repo]` holds a non-string value (object)                                                   | Validation - cache miss on non-string                                      | `typeof ... === "string"` is false, so the cache misses and `dataSource.getRemoteUrl(repo)` is called again | Cache check (old TC-020 line). Not covered: the current cache check is `cachedRemoteSource !== undefined`, not `typeof === "string"` (fixed in Feature 042 / active S21 TC-083), so an object in the cache hits and `getRemoteUrl` is not called. This Expected Result describes the superseded old TC-020 behavior and contradicts the implementation and the active S21 TC-083, so it cannot be implemented. The implemented S21 TC-083 covers the cache behavior (hit) for non-string objects. |

## S26: Idempotent dispose() and blocking new work after dispose

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `public dispose(): void` (new. Adds a disposed flag and clears the interval and sets it to null)
> Target Path: `src/avatarManager.ts` (update to a line range after dispose is implemented)

This fix adds a disposed state and an idempotent `dispose()` to `AvatarManager`. dispose calls `clearInterval` on the interval and sets it to null, and afterwards no new work starts from the queue's `itemsAvailableCallback`, from retry/requeue after fetch failures, or from webview notifications (the fix for [13]). Registration in `context.subscriptions` is the responsibility of `src/extension-test.md` S9 (TC-036 to TC-037). Forcibly destroying in-flight HTTP requests is out of scope.

| Case ID | Input / Precondition                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                    | Notes                                                         |
| ------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| TC-103  | Call `dispose()` while the queue has pending items and the interval is running      | Normal - stopping the interval                                             | `clearInterval` is called once and the interval is set to null. After that, advancing `advanceTimersByTime(10000)` does not start avatar fetching (the fetch path) | Observed with fake timers (the observation condition of [13]) |
| TC-104  | Call `dispose()` twice in a row                                                     | Boundary - idempotency                                                     | The second call does not throw, and there are 0 additional `clearInterval` calls                                                                                   | Idempotent dispose contract                                   |
| TC-105  | Fire the queue's `itemsAvailableCallback` after dispose                             | Validation - rejecting interval re-creation after dispose                  | `setInterval` is not called (0 calls), and `fetchAvatarsInterval()` is not run immediately                                                                         | The start path of S1 TC-002 is disabled after dispose         |
| TC-106  | The error / rate-limit path of an in-flight fetch completes after dispose           | External - blocking retry/requeue after dispose                            | 0 requeues through `queue.add`, and 0 interval re-creations (`setInterval` calls)                                                                                  | Prevents timer re-creation from the error callback            |
| TC-107  | The time for a webview notification of an avatar fetch result arrives after dispose | Validation - blocking notifications after dispose                          | `view.sendMessage` (avatar response notification) is not called                                                                                                    | No new work starts                                            |

### Failure-source inventory (include-or-justify) — added by Feature 045 (S26)

| Failure source                                             | Covering case or exclusion reason                                                                               |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| The interval does not stop after dispose                   | TC-103                                                                                                          |
| Exception or double release from multiple dispose calls    | TC-104                                                                                                          |
| Interval re-creation by the queue callback after dispose   | TC-105                                                                                                          |
| Requeue / timer re-creation by a fetch error after dispose | TC-106                                                                                                          |
| Webview notification after dispose                         | TC-107                                                                                                          |
| In-flight HTTP request not aborted immediately             | excluded(out of the implementation plan's scope. Stopping the timer and later side effects satisfies this spec) |
| Missing registration in the extension                      | excluded(covered by `src/extension-test.md` S9 TC-036 to TC-037)                                                |
| Interval stop when the queue runs out in normal operation  | excluded(already covered by S1 to S2 and other active sections. This change does not alter the behavior)        |

**Failure-category coverage (diversity floor)**:

- Validation: TC-105, TC-107
- Exception: excluded(dispose has no throw branch. Not throwing on repeated calls is verified by TC-104)
- External: TC-106
- Boundary: TC-104
- Type: excluded(dispose takes no arguments and has no runtime type branch)

Numeric and empty-value boundaries (0 / minimum / maximum / +/-1 / empty / NULL) are out of scope because this section covers the contract of the disposed state transition and has no numeric boundaries (the meaningful boundary, repeated dispose, is covered by TC-104).

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-103), 4 failure cases (TC-104 to TC-107), ratio 4.0.
