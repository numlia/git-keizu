# Test Perspectives: src/diffDocProvider.ts

> Source: `src/diffDocProvider.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: encodeDiffDocUri

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: superseded
> Supersedes: -
> Superseded By: S7

**Signature**: `export function encodeDiffDocUri(repo: string, filePath: string, commit: string): vscode.Uri`
**Target path**: `src/diffDocProvider.ts:58-62`

| Case ID | Input / Precondition                                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                               | Notes                                             |
| ------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| TC-001  | repo="/path/to/repo", filePath="src/file.ts", commit="abc123"                                          | Normal - standard                                                          | The returned URI has scheme "git-keizu", its path contains the result of getPathFromStr("src/file.ts"), and its query contains "commit=abc123" and "repo=%2Fpath%2Fto%2Frepo" | Basic URI construction                            |
| TC-002  | repo="/repo", filePath="dir/file.ts", commit="abc def" (contains a space)                              | Normal - standard                                                          | The commit value in the query is encoded as "abc%20def"                                                                                                                       | Checks encodeURIComponent behavior                |
| TC-003  | repo="", filePath="src/file.ts", commit="abc"                                                          | Validation - rejected precondition                                         | The URI query contains "repo=" (empty value)                                                                                                                                  | L60: no input validation                          |
| TC-004  | repo="/repo", filePath="", commit="abc"                                                                | Validation - rejected precondition                                         | The URI path is the return value of getPathFromStr("")                                                                                                                        | L60: an empty string is passed to getPathFromStr  |
| TC-005  | repo="/repo", filePath="src/file.ts", commit=""                                                        | Validation - rejected precondition                                         | The URI query contains "commit=" (empty value)                                                                                                                                | L60: no input validation                          |
| TC-006  | repo="/path?q=1&x=2", filePath="file.ts", commit="abc"                                                 | Boundary - special chars in repo                                           | In the repo value of the query, "?" is encoded as "%3F", "&" as "%26" and "=" as "%3D"                                                                                        | encodeURIComponent handles URI special characters |
| TC-007  | repo="/repo", filePath="dir/my file.ts" (contains a space), commit="abc"                               | Boundary - space in filePath                                               | The space is reflected in the path part of the URI (the normalized result of getPathFromStr)                                                                                  | Depends on getPathFromStr                         |
| TC-008  | repo="/repo", filePath="dir\\file.ts" (backslash), commit="abc"                                        | Boundary - backslash in filePath                                           | The path contains the separators normalized by getPathFromStr                                                                                                                 | Handling of Windows-style paths                   |
| TC-009  | repo="/repo", filePath="file.ts", commit="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2" (40-character hex) | Boundary - full SHA hash                                                   | The commit value in the query contains the 40-character hash as is                                                                                                            | Normal git commit hash length                     |

## S2: decodeDiffDocUri

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Signature**: `export function decodeDiffDocUri(uri: vscode.Uri): { filePath: string; commit: string; repo: string }`
**Target path**: `src/diffDocProvider.ts:64-67`
**Internal dependency**: `decodeUriQueryArgs` (L69-78)

| Case ID | Input / Precondition                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                       | Notes                                                                                       |
| ------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| TC-010  | uri.query="commit=abc123&repo=%2Fpath%2Fto%2Frepo", uri.path="/src/file.ts" | Normal - standard                                                          | { filePath: "/src/file.ts", commit: "abc123", repo: "/path/to/repo" } | Basic decoding                                                                              |
| TC-011  | uri.query="commit=abc%20def&repo=%2Frepo", uri.path="/file.ts"              | Normal - standard                                                          | { filePath: "/file.ts", commit: "abc def", repo: "/repo" }            | Checks percent-decoding                                                                     |
| TC-012  | uri.query="" (empty string), uri.path="/file.ts"                            | Validation - rejected precondition                                         | filePath="/file.ts", commit and repo are undefined                    | L70: split("&")→[""], split("=")→[""], so pair[1] is undefined. L75: an empty string is set |
| TC-013  | uri.query="commit=abc" (no repo), uri.path="/file.ts"                       | Validation - rejected precondition                                         | { filePath: "/file.ts", commit: "abc", repo: undefined }              | The repo key does not exist                                                                 |
| TC-014  | uri.query="repo=%2Frepo" (no commit), uri.path="/file.ts"                   | Validation - rejected precondition                                         | { filePath: "/file.ts", commit: undefined, repo: "/repo" }            | The commit key does not exist                                                               |
| TC-015  | uri.query="key" (no "="), uri.path="/file.ts"                               | Validation - rejected precondition                                         | The key property of the returned object is "" (empty string)          | L75: pair[1]===undefined → falls back to an empty string                                    |
| TC-016  | uri.query="commit=&repo=%2Frepo", uri.path="/file.ts"                       | Boundary - empty value                                                     | { filePath: "/file.ts", commit: "", repo: "/repo" }                   | L75: pair[1]==="", decodeURIComponent("")===""                                              |
| TC-017  | uri.query="key=first&key=second" (duplicate keys), uri.path="/file.ts"      | Boundary - duplicate keys                                                  | The key property is "second" (last one wins)                          | L75: the later key overwrites in the for loop                                               |
| TC-018  | uri.path="" (empty path), uri.query="commit=abc&repo=%2Frepo"               | Boundary - empty path                                                      | { filePath: "", commit: "abc", repo: "/repo" }                        | L66: uri.path is returned as is                                                             |
| TC-019  | uri.query="commit=%20%26%3D&repo=%2Frepo", uri.path="/file.ts"              | Boundary - encoded special chars                                           | { filePath: "/file.ts", commit: " &=", repo: "/repo" }                | decodeURIComponent converts %20→space, %26→& and %3D→=                                      |

## S3: DiffDocProvider.constructor

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Signature**: `constructor(dataSource: DataSource)`
**Target path**: `src/diffDocProvider.ts:13-18`

| Case ID | Input / Precondition                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                     | Notes                                                              |
| ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| TC-020  | dataSource = a valid DataSource mock                                                         | Normal - standard                                                          | An instance is created and docs is initialized as an empty Map      | Checks the subscription to vscode.workspace.onDidCloseTextDocument |
| TC-021  | After one entry is cached by provideTextDocumentContent, the document for that URI is closed | Normal - standard                                                          | The onDidCloseTextDocument callback removes that URI from the cache | L15-17: docs.delete(doc.uri.toString())                            |
| TC-022  | A document whose URI is not in the cache is closed                                           | Validation - rejected precondition                                         | No error occurs and the cache is unchanged                          | Map.delete() only returns false for a missing key                  |

## S4: DiffDocProvider.dispose

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Signature**: `public dispose(): void`
**Target path**: `src/diffDocProvider.ts:20-24`

| Case ID | Input / Precondition               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                | Notes                              |
| ------- | ---------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| TC-023  | The cache holds 2 documents        | Normal - standard                                                          | subscriptions.dispose() is called once, docs.clear() removes all entries, and onDidChangeEventEmitter.dispose() is called once | L21-23: releases 3 resources       |
| TC-024  | The cache is empty                 | Boundary - empty cache                                                     | subscriptions.dispose(), docs.clear() and eventEmitter.dispose() are all called normally and no error occurs                   | clear() on an empty Map is a no-op |
| TC-025  | The cache holds multiple documents | Boundary - multiple entries                                                | Map.size is 0 after docs.clear()                                                                                               | All entries are reliably removed   |

## S5: DiffDocProvider.provideTextDocumentContent

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Signature**: `public async provideTextDocumentContent(uri: vscode.Uri): Promise<string>`
**Target path**: `src/diffDocProvider.ts:30-43`

| Case ID | Input / Precondition                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                            | Notes                                                   |
| ------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| TC-026  | The URI is not in the cache, and getCommitFile returns "file content"  | Normal - standard                                                          | getCommitFile is called once with request.repo, request.commit and request.filePath, the return value is "file content", and the URI is added to the cache | L31-42: cache miss → fetch → cache → return             |
| TC-027  | The URI is in the cache with the value "cached content"                | Normal - standard                                                          | getCommitFile is not called and the return value is "cached content"                                                                                       | L32: early-return branch                                |
| TC-028  | The URI is not in the cache, and getCommitFile returns an empty string | Boundary - empty content                                                   | The return value is "" (empty string) and the URI is added to the cache                                                                                    | DiffDocument also keeps an empty string                 |
| TC-029  | The URI is not in the cache, and getCommitFile rejects with an Error   | External - DataSource failure                                              | The Promise rejects with the same Error as getcommitfile                                                                                                   | L35-39: no try-catch, so the rejection propagates as is |

## S6: DiffDocProvider.onDidChange

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Signature**: `get onDidChange(): vscode.Event<vscode.Uri>`
**Target path**: `src/diffDocProvider.ts:26-28`

| Case ID | Input / Precondition                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                | Notes                                |
| ------- | ------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------ |
| TC-030  | After a DiffDocProvider instance is created | Normal - standard                                                          | The onDidChange property returns onDidChangeEventEmitter.event | A plain getter accessor, no branches |

## S7: encodeDiffDocUri version argument and construction with Uri.from

> Origin: フェーズ2 修正 M9/M10 (diff-uri-symmetric-encode)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: S1
> Signature: `export function encodeDiffDocUri(repo: string, filePath: string, commit: string, version?: string): vscode.Uri`
> Target Path: `src/diffDocProvider.ts:58-71`

A fix that changes `encodeDiffDocUri` from `vscode.Uri.parse(<concatenated string>)` to construction with `vscode.Uri.from({ scheme, path, query })`, and adds an optional `version` query field. Each query field (`commit` / `repo` / `version`) is encoded separately with `encodeURIComponent` and joined with `&`. `version` is not added when it is `undefined`. Replaces the old S1 (the `Uri.parse` version with `commit` only).

| Case ID | Input / Precondition                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                             | Notes                                             |
| ------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| TC-031  | repo="/p/r", filePath="src/f.ts", commit="abc123", version omitted | Normal - no version field                                                  | The returned scheme is `"git-keizu"`, the path is `getPathFromStr("src/f.ts")`, and the query is `commit=abc123&repo=%2Fp%2Fr` (no version) | version is not included in the query when omitted |
| TC-032  | repo="/r", filePath="f.ts", commit="abc", version="1720000000000"  | Normal - version field appended                                            | The query contains `commit=abc&repo=%2Fr&version=1720000000000`                                                                             | version field added                               |
| TC-033  | repo="/r", filePath="f.ts", commit="abc def" (contains a space)    | Normal - component encoded                                                 | The commit value in the query is encoded as `abc%20def`                                                                                     | encodeURIComponent applied                        |
| TC-034  | repo="/p?q=1&x=2", filePath="f.ts", commit="abc"                   | Boundary - special chars in repo                                           | In the repo value of the query, `?` is encoded as `%3F`, `&` as `%26` and `=` as `%3D`                                                      | URI special characters made harmless              |
| TC-035  | repo="/r", filePath="f.ts", commit="abc", version="a&b=c"          | Boundary - special chars in version                                        | The version value in the query is encoded as `a%26b%3Dc`                                                                                    | version also uses encodeURIComponent              |
| TC-036  | repo="/r", filePath="dir\\file.ts" (backslash), commit="abc"       | Boundary - backslash path                                                  | The returned path is the value with separators normalized by `getPathFromStr`                                                               | Path given directly to Uri.from                   |
| TC-037  | repo="/r", filePath="f.ts", commit="" (empty commit)               | Boundary - empty commit                                                    | The query contains `commit=` (empty value) and no exception is thrown                                                                       | Empty commit boundary                             |

## S8: encode/decode round trip and the version cache key

> Origin: フェーズ2 修正 M9/M10 (diff-uri-roundtrip-cachekey)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `encodeDiffDocUri` ⇄ `decodeDiffDocUri` / `DiffDocProvider.provideTextDocumentContent`
> Target Path: `src/diffDocProvider.ts:30-78`

Verifies that `decodeDiffDocUri` restores the output of `encodeDiffDocUri` symmetrically (a single `encodeURIComponent`/`decodeURIComponent` round trip), and that including the `version` query makes the URI of an uncommitted diff unique as a cache key based on `uri.toString()` (the `docs` Map of `provideTextDocumentContent`), so that a different version means a separate cache entry and a refetch even for the same repo/path/commit.

| Case ID | Input / Precondition                                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                         | Notes                                               |
| ------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| TC-038  | `decodeDiffDocUri(encodeDiffDocUri("/p/r", "src/f.ts", "abc"))`                                                  | Normal - roundtrip without version                                         | The result equals `{ filePath: getPathFromStr("src/f.ts"), commit: "abc", repo: "/p/r" }`                                               | Symmetric restore (no version)                      |
| TC-039  | `decodeDiffDocUri(encodeDiffDocUri("/r", "f.ts", "abc", "1720000000000"))`                                       | Normal - roundtrip with version tolerated                                  | `commit==="abc"` and `repo==="/r"` are restored in the result (the typed return value exposes filePath/commit/repo and ignores version) | The extra field does not affect the restored result |
| TC-040  | Two URIs with the same repo/path/commit and `version="A"` / `version="B"` passed to `provideTextDocumentContent` | Boundary - version busts cache                                             | The two `uri.toString()` values differ and are separate cache keys. `getCommitFile` is called twice and 2 entries are added to `docs`   | Cache-bust by version (M9)                          |
| TC-041  | The same URI without version and with the same repo/path/commit passed to `provideTextDocumentContent` twice     | Boundary - stable key without version                                      | The second call hits the same cache key, and `getCommitFile` is called only once in total                                               | Key stability without version                       |
| TC-042  | encode→decode with commit=`" &="` (special characters)                                                           | Boundary - special char roundtrip                                          | The decoded commit is fully restored to `" &="` (a single decodeURIComponent)                                                           | No double decoding                                  |
