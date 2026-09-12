# テスト観点表: web/fileHistory.ts

> Source: `web/fileHistory.ts`
> Generated: 2026-09-08T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Storage Mode: single-file

## S1: FileHistoryController constructor と file history bar の DOM

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `constructor(callbacks: FileHistoryCallbacks)`
> Target Path: `web/fileHistory.ts`（constructor と bar 生成。実装後に行範囲へ更新）
> Test File: `tests/web/fileHistory.test.ts`

対応プラン §3.8 末尾の bar DOM を constructor が生成し `#controls` の直後へ挿入する契約の観点。CSS の宣言は `media/main-test.md` S3、`web/main.ts` からの callback 配線は `web/main-test/10-file-history-01.md` S50 の責務で本表には含めない。

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                              | Notes                                       |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| TC-001  | `#controls` を持つ jsdom document で constructor を呼ぶ | Normal - bar の挿入位置                                                    | `#fileHistoryBar` が `#controls` の `nextElementSibling` として存在し、子要素の id が `fileHistoryPath` / `fileHistoryPosition` / `fileHistoryPrev` / `fileHistoryNext` / `fileHistoryExit` の 5 件、`classList` に `active` と `loading` が無い             | 初期状態は非表示                            |
| TC-002  | 同 constructor 後の button 要素                         | Normal - 文言と icon の解決                                                | `#fileHistoryPrev` / `#fileHistoryNext` の `title` が `"Previous match"` / `"Next match"`、`innerHTML` が `svgIcons.arrowUp` / `svgIcons.arrowDown` と一致し、`#fileHistoryExit` の `textContent` が `"Exit"`、3 要素とも `classList` に `roundedBtn` を持つ | `t()` 経由。`webviewMessages` stub の en 値 |

## S2: request() requestId 採番・payload・loading 表示

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `request(anchorHash: string, filePath: string): void`
> Target Path: `web/fileHistory.ts`（`request()`。実装後に行範囲へ更新）
> Test File: `tests/web/fileHistory.test.ts`

| Case ID | Input / Precondition                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                           | Notes                                             |
| ------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| TC-003  | 初期状態で `request("abc", "src/a.txt")`（`getCurrentRepo()` が `"/r"`）     | Normal - 初回 payload                                                      | `postMessage` が `{ command: "fileHistory", repo: "/r", requestId: 1, anchorHash: "abc", filePath: "src/a.txt" }` と `toEqual` する引数で 1 回呼ばれる                    | 初期値 1                                          |
| TC-004  | 同 request                                                                   | Normal - Find の解除                                                       | `closeFindWidget` が 1 回呼ばれる                                                                                                                                         | Find と排他                                       |
| TC-005  | 同 request 後の bar                                                          | Normal - loading 表示                                                      | `#fileHistoryBar.classList` が `active` と `loading` を含み、`#fileHistoryPath.textContent` が `"src/a.txt"`、bar の `textContent` に `"Loading file history ..."` を含む | prev / next は CSS で無効化                       |
| TC-006  | TC-003 の後に `request("abc", "src/b.txt")`                                  | Normal - 連番採番                                                          | 2 回目の `postMessage` の `requestId` が 2 で、`isPending()` が `true`                                                                                                    | `latestRequestId` は 2                            |
| TC-007  | active 中（受理済み）に別 file を `request()`                                | Normal - active 中の既存強調維持                                           | `postMessage` 後も `.commit.fileHistoryMatch` / `.fileHistoryCurrent` の行数が受理時と同じで `isActive()` が `true`、`isPending()` も `true`                              | pending と active の同時成立                      |
| TC-008  | 内部の `nextRequestId` を `Number.MAX_SAFE_INTEGER` にした状態で `request()` | Boundary - 採番上限                                                        | `postMessage` の call count が 0 で `isPending()` が `false`、bar に `active` が付かない                                                                                  | 到達再現は private field を test から直接設定する |

## S3: handleResponse() 破棄条件と error dialog

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `handleResponse(msg: GG.ResponseFileHistory): void`
> Target Path: `web/fileHistory.ts`（`handleResponse()` の破棄・error 分岐。実装後に行範囲へ更新）
> Test File: `tests/web/fileHistory.test.ts`

| Case ID | Input / Precondition                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                  | Notes                      |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| TC-009  | pending なし（`request()` 未呼出）で成功 response を受信              | Validation - pending なし                                                  | `showErrorDialog` / `hideCommitDetails` / `scrollToCommit` の call count が 0 で、`.commit` 行に 3 class が付かず `isActive()` が `false`                                                                                        | -                          |
| TC-010  | `request()` 2 回後に `requestId: 1` の成功 response                   | Validation - stale requestId                                               | 何も呼ばれず `isActive()` が `false`、`isPending()` が `true` のまま                                                                                                                                                             | 最新以外は破棄             |
| TC-011  | `msg.repo` が `getCurrentRepo()` と異なる成功 response                | Validation - 別 repository                                                 | 何も呼ばれず `isActive()` が `false`                                                                                                                                                                                             | A→B→A 往復の旧 response    |
| TC-012  | pending 中に `entries: null` の response                              | External - Git / 検証失敗                                                  | `showErrorDialog("Unable to load file history", null, null)` が 1 回、`isPending()` が `false`、`isActive()` が `false`、bar の `classList` に `active` が無い                                                                   | 第 2 引数は `null`         |
| TC-013  | pending 中に `entries: []` の response                                | Boundary - 履歴なし                                                        | `showErrorDialog("Unable to load file history", "No history was found for this file.", null)` が 1 回、bar が非表示                                                                                                              | `null` と `[]` を区別      |
| TC-014  | pending 中に anchor hash を含まない entries の response               | Validation - anchor 不在の entries                                         | TC-013 と同じ引数で `showErrorDialog` が 1 回、mode は開始されない                                                                                                                                                               | -                          |
| TC-015  | pending 中に成功 response、ただし `getCommitId(anchorHash)` が `null` | Validation - 受理直前の anchor 未 load                                     | `showErrorDialog` / `hideCommitDetails` / `scrollToCommit` が 0 回、`isPending()` が `false`、bar の `classList` に `active` が無く、行 class は変わらない                                                                       | filter 変更で anchor 消失  |
| TC-016  | active 中に別 file を `request()` し、`entries: null` の response     | External - 別 file の失敗                                                  | `showErrorDialog` が 1 回呼ばれ、`.fileHistoryMatch` / `.fileHistoryCurrent` の行が受理時と同一、`isActive()` が `true`、bar が `active` かつ `loading` なし、その後の `exit(true)` で旧 snapshot の `setScrollTop` 値が使われる | 旧 mode と snapshot を保持 |

## S4: handleResponse() 受理時の snapshot・class・scroll・bar

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `handleResponse(msg: GG.ResponseFileHistory): void`（受理分岐）/ private `recomputeVisible()` / `applyClasses()`
> Target Path: `web/fileHistory.ts`（受理分岐と class 適用。実装後に行範囲へ更新）
> Test File: `tests/web/fileHistory.test.ts`

entries 3 件のうち `getCommits()` に 2 件（anchor を含む）が載っている状態を基本 fixture とし、`getExpandedCommit()` は `commitDetails !== null && fileTree !== null` の詳細 load 済み。

| Case ID | Input / Precondition                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                   | Notes                        |
| ------- | -------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| TC-017  | 基本 fixture で成功 response を受理                      | Normal - 行 class の 3 状態                                                | `hideCommitDetails` が 1 回呼ばれ、`.commit[data-hash]` 行のうち `fileHistoryMatch` が 2 行、`fileHistoryCurrent` が anchor 行 1 行、その他全行が `fileHistoryDim` で、1 行に match と dim が同時に付かない                                                                       | anchor は match かつ current |
| TC-018  | 同受理                                                   | Normal - graph への highlight 伝達                                         | `setGraphHighlight` が 1 回呼ばれ、引数の `matchHashes` が `Set` で `size` 2 かつ両 hash を `has`、`currentHash` が anchor hash である                                                                                                                                            | -                            |
| TC-019  | 同受理                                                   | Normal - anchor への中央 scroll                                            | `scrollToCommit(anchor, true)` が 1 回呼ばれる                                                                                                                                                                                                                                    | `alwaysCenterCommit=true`    |
| TC-020  | 同受理後の bar                                           | Normal - active 表示                                                       | `#fileHistoryBar.classList` が `active` を含み `loading` を含まず、`#fileHistoryPosition.textContent` が `"1 of 2"`、`#fileHistoryPath.textContent` が requested path                                                                                                             | 分母は visible 件数          |
| TC-021  | entries が anchor 1 件だけで load 済み                   | Boundary - visible 1 件                                                    | `#fileHistoryPosition.textContent` が `"1 of 1"`、match 行が 1 行                                                                                                                                                                                                                 | -                            |
| TC-022  | active 中に別 file を `request()` し成功 response を受理 | Normal - state の置き換え                                                  | `hideCommitDetails` の累計が 2 回、`fileHistoryCurrent` が新 anchor 行に移り、`#fileHistoryPath` が新 path、`#fileHistoryPosition` が新 visible 件数で再計算され、その後の `exit(true)` で `setScrollTop` の引数が 2 回目受理時の `getScrollTop()` 値（旧 snapshot を継承しない） | snapshot は最新受理時点      |

## S5: onCommitsRendered() visible 再計算・anchor 不在・pending の検証

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `onCommitsRendered(): void`
> Target Path: `web/fileHistory.ts`（`onCommitsRendered()` / `recomputeVisible()`。実装後に行範囲へ更新）
> Test File: `tests/web/fileHistory.test.ts`

| Case ID | Input / Precondition                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                              | Notes                 |
| ------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| TC-023  | active 中に `getCommits()` の戻り値へ entries の 3 件目を追加し `onCommitsRendered()`                      | Normal - Load More で visible 増加                                         | `#fileHistoryPosition.textContent` の分母が 3 になり、追加行に `fileHistoryMatch` が付き、`setGraphHighlight` の最新引数の `matchHashes.size` が 3           | intersection の再計算 |
| TC-024  | active 中に anchor を含まない一覧へ変えて `onCommitsRendered()`                                            | Validation - active 中の anchor 不在                                       | `isActive()` が `false`、3 class が全行から消え、bar の `classList` に `active` が無く、`setScrollTop` / `restoreExpandedCommit` の call count が 0          | `exit(false)`         |
| TC-025  | `next()` で current を非 anchor に移した後、anchor は含むが current を含まない一覧で `onCommitsRendered()` | Validation - current の消失                                                | `isActive()` が `false` で class と bar が消え、`setScrollTop` / `restoreExpandedCommit` は 0 回                                                             | 確定仕様 4.8.4        |
| TC-026  | active 中に `getCurrentRepo()` の戻り値を別 repo にして `onCommitsRendered()`                              | Validation - active 中の repo 不一致                                       | `isActive()` が `false` で class と bar が消え、restore は呼ばれない                                                                                         | -                     |
| TC-027  | pending 中に `getCommitId(pending.anchorHash)` が `null` を返す状態で `onCommitsRendered()`                | Validation - pending 中の anchor 不在                                      | `isPending()` が `false`、bar の `classList` に `active` が無く、その後届いた同 requestId の成功 response で `hideCommitDetails` / `showErrorDialog` が 0 回 | 取得中の filter 変更  |
| TC-028  | pending 中に `getCurrentRepo()` が `pending.repo` と異なる状態で `onCommitsRendered()`                     | Validation - pending 中の repo 不一致                                      | `isPending()` が `false` で loading bar が除去され、その後の response は無視される                                                                           | -                     |
| TC-029  | pending 中に anchor が load 済みで repo も一致する状態で `onCommitsRendered()`                             | Normal - pending の継続                                                    | `isPending()` が `true` のまま bar が `active loading` を保ち、その後の成功 response が受理され `isActive()` が `true` になる                                | 同 repo の refresh 中 |
| TC-030  | inactive かつ pending なしで `onCommitsRendered()`                                                         | Boundary - inactive                                                        | callback がいずれも呼ばれず、`.commit` 行に 3 class が付かない                                                                                               | no-op                 |

## S6: prev() / next() の wrap と handleCommitRowClick() の current 同期

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: private `prev(): void` / `next(): void`（bar button 経由）/ `handleCommitRowClick(hash: string): void`
> Target Path: `web/fileHistory.ts`（移動と click 同期。実装後に行範囲へ更新）
> Test File: `tests/web/fileHistory.test.ts`

visible が `[h0(anchor), h1]`（`getCommits()` の順）で current が h0 の active 状態を基本 fixture とする。prev / next は `#fileHistoryPrev` / `#fileHistoryNext` の click で起動する。

| Case ID | Input / Precondition                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                       | Notes                          |
| ------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-031  | 基本 fixture で `#fileHistoryNext` を click                 | Normal - 古い方向へ移動                                                    | `fileHistoryCurrent` が h1 行に移り、`scrollToCommit("h1", true)` が 1 回、`#fileHistoryPosition.textContent` が `"2 of 2"`、`setGraphHighlight` の最新引数の `currentHash` が `"h1"` | index + 1                      |
| TC-032  | TC-031 の後にもう一度 `#fileHistoryNext` を click           | Boundary - 末尾からの wrap                                                 | current が h0 に戻り `scrollToCommit("h0", true)` が呼ばれ、position が `"1 of 2"`                                                                                                    | 反対端へ                       |
| TC-033  | 基本 fixture（current h0）で `#fileHistoryPrev` を click    | Boundary - 先頭からの wrap                                                 | current が h1 になり `scrollToCommit("h1", true)` が 1 回                                                                                                                             | index - 1 の wrap              |
| TC-034  | current h1 で `#fileHistoryPrev` を click                   | Normal - 新しい方向へ移動                                                  | current が h0 になり `scrollToCommit("h0", true)` が 1 回                                                                                                                             | -                              |
| TC-035  | visible 1 件（anchor のみ）で `#fileHistoryNext` を click   | Boundary - visible 1 件                                                    | current が anchor のままで `scrollToCommit(anchor, true)` が 1 回呼ばれ、position が `"1 of 1"`                                                                                       | wrap 先が自身                  |
| TC-036  | TC-031 の移動                                               | Normal - 詳細を開かない                                                    | `hideCommitDetails` / `restoreExpandedCommit` の call count が受理時から増えず、`postMessage` に `command: "commitDetails"` が 0 件                                                   | 移動は current 同期のみ        |
| TC-037  | active 中に `handleCommitRowClick("h1")`（visible hash）    | Normal - match 行 click の current 同期                                    | `fileHistoryCurrent` が h1 行へ移り position が `"2 of 2"`、`scrollToCommit` の call count が受理時から増えない                                                                       | scroll しない                  |
| TC-038  | active 中に visible に無い hash で `handleCommitRowClick()` | Validation - 非 match 行                                                   | current が h0 のままで class・position・`setGraphHighlight` の call count が変わらない                                                                                                | 既存 click は main.ts 側で続行 |
| TC-039  | inactive で `handleCommitRowClick("h0")`                    | Boundary - inactive                                                        | callback がいずれも呼ばれず、行 class が付かない                                                                                                                                      | no-op                          |
| TC-040  | pending のみ（inactive）で `#fileHistoryNext` を click      | Boundary - loading 中の移動                                                | `scrollToCommit` の call count が 0 で current が存在しない（`getCurrentHash()` が `null`）                                                                                           | CSS 無効化に依存しない         |

## S7: onRepositoryChanged() の pending 破棄と解除

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `onRepositoryChanged(): void`
> Target Path: `web/fileHistory.ts`（`onRepositoryChanged()`。実装後に行範囲へ更新）
> Test File: `tests/web/fileHistory.test.ts`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                           | Notes                |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| TC-041  | pending 中に `onRepositoryChanged()`                 | Normal - pending の破棄                                                    | `isPending()` が `false`、bar の `classList` に `active` が無く、次の `request()` の `postMessage` の `requestId` が続き番号（2）で、その後届いた `requestId: 1` の response は無視される | 採番はリセットしない |
| TC-042  | active 中に `onRepositoryChanged()`                  | Normal - active の解除                                                     | `isActive()` が `false`、3 class が全行から消え、`setGraphHighlight(null)` が呼ばれ、`setScrollTop` / `restoreExpandedCommit` の call count が 0                                          | `exit(false)`        |
| TC-043  | inactive かつ pending なしで `onRepositoryChanged()` | Boundary - inactive                                                        | callback がいずれも呼ばれない                                                                                                                                                             | no-op                |

## S8: exit(restore) の除去と snapshot 復元順序

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `exit(restore: boolean): void`
> Target Path: `web/fileHistory.ts`（`exit()`。実装後に行範囲へ更新）
> Test File: `tests/web/fileHistory.test.ts`

受理時に `getExpandedCommit()` が詳細 load 済み（`hash: "e1"`、`compareWithHash: null`、`commitDetails`、`fileTree`）で `getScrollTop()` が 120 を返した active 状態を基本 fixture とする。

| Case ID | Input / Precondition                                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                      | Notes                       |
| ------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| TC-044  | 基本 fixture で anchor と `e1` が load 済み、repo 一致のまま `exit(true)`                                            | Normal - 復元順序                                                          | `restoreExpandedCommit` が `{ hash: "e1", compareWithHash: null, commitDetails, fileTree }` と `toEqual` する引数で 1 回、続いて `setScrollTop(120)` が 1 回呼ばれ、`mock.invocationCallOrder` で restore が先である | DOM 参照を持たない snapshot |
| TC-045  | 同 `exit(true)`                                                                                                      | Normal - 強調の除去                                                        | 3 class が全 `.commit` 行から消え、`.gitFile.fileHistoryCurrent` と `.fileHistoryNote` が 0 件、`setGraphHighlight(null)` が 1 回、bar の `classList` に `active` が無く、`isActive()` が `false`                    | -                           |
| TC-046  | 受理時の `getExpandedCommit()` が `null`、または `commitDetails === null`（詳細 load 中）で受理した後に `exit(true)` | Boundary - 詳細なし snapshot                                               | `restoreExpandedCommit` が 0 回、`setScrollTop(保存値)` が 1 回                                                                                                                                                      | 取得中に詳細を閉じた        |
| TC-047  | snapshot の `e1` が unload（`getCommitId("e1")` が `null`）で `exit(true)`                                           | Validation - snapshot commit の unload                                     | `restoreExpandedCommit` と `setScrollTop` の call count が 0 で、class と bar は除去される                                                                                                                           | scroll を変更しない         |
| TC-048  | `getCurrentRepo()` が `state.repo` と異なる状態で `exit(true)`                                                       | Validation - repo 不一致                                                   | `restoreExpandedCommit` と `setScrollTop` が 0 回                                                                                                                                                                    | -                           |
| TC-049  | 基本 fixture で `exit(false)`                                                                                        | Normal - 復元なしの解除                                                    | `restoreExpandedCommit` と `setScrollTop` が 0 回、class と bar が除去され `isActive()` が `false`                                                                                                                   | anchor 不在・repo 切替用    |
| TC-050  | pending のみ（inactive）で `exit(true)`                                                                              | Boundary - pending のみ                                                    | `isPending()` が `false`、bar が非表示、`restoreExpandedCommit` / `setScrollTop` が 0 回、その後の response は無視される                                                                                             | -                           |
| TC-051  | 基本 fixture で `#fileHistoryExit` を click                                                                          | Normal - Exit button の配線                                                | TC-044 と同じ順序で `restoreExpandedCommit` → `setScrollTop` が呼ばれる（`exit(true)`）                                                                                                                              | button → `exit(true)`       |

## S9: isActive() / isPending() / getCurrentHash() / getHistoricalPathFor()

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `isActive(): boolean` / `isPending(): boolean` / `getCurrentHash(): string | null` / `getHistoricalPathFor(hash: string): string | null`
> Target Path: `web/fileHistory.ts`（getter 群。実装後に行範囲へ更新）
> Test File: `tests/web/fileHistory.test.ts`

| Case ID | Input / Precondition                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                        | Notes           |
| ------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------- |
| TC-052  | `request()` 直後                                                             | Normal - pending 状態                                                      | `isPending()` が `true`、`isActive()` が `false`、`getCurrentHash()` が `null`         | -               |
| TC-053  | 成功 response 受理後                                                         | Normal - active 状態                                                       | `isActive()` が `true`、`isPending()` が `false`、`getCurrentHash()` が anchor hash    | -               |
| TC-054  | active 中に `request()`                                                      | Normal - active かつ pending                                               | `isActive()` と `isPending()` がともに `true`、`getCurrentHash()` が旧 anchor のまま   | -               |
| TC-055  | active 中に entries に含まれる `R` entry の hash で `getHistoricalPathFor()` | Normal - historical path の解決                                            | 戻り値が当該 entry の `historicalPath`（`newFilePath` と同値、`oldFilePath` ではない） | rename 先を返す |
| TC-056  | active 中に entries に無い hash で `getHistoricalPathFor()`                  | Validation - 未知 hash                                                     | 戻り値が `null`                                                                        | -               |
| TC-057  | inactive で `getHistoricalPathFor(anchor)`                                   | Boundary - inactive                                                        | 戻り値が `null`、`getCurrentHash()` も `null`                                          | -               |

### 失敗源インベントリ（include-or-justify）— Feature 055-07 追加分（S1〜S9）

| 失敗源                                                                      | 対応ケースまたは除外理由                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| stale requestId / 別 repository / pending なしの response 受理              | TC-009〜TC-011、TC-027、TC-028、TC-041、TC-050                                                                                                                                                                                                                              |
| Git 失敗（`entries: null`）・履歴なし（`[]`）・anchor 不在 entries の誤開始 | TC-012〜TC-014                                                                                                                                                                                                                                                              |
| anchor 未 load（pending 中 / 受理直前 / active 中）での開始・継続           | TC-015、TC-024、TC-027                                                                                                                                                                                                                                                      |
| current の消失・repo 不一致での継続                                         | TC-025、TC-026                                                                                                                                                                                                                                                              |
| 別 file 切替の失敗で旧 mode を壊す                                          | TC-016                                                                                                                                                                                                                                                                      |
| DOM 再生成後の class 未再適用・visible 未再計算                             | TC-023                                                                                                                                                                                                                                                                      |
| unload された snapshot commit への復元                                      | TC-047                                                                                                                                                                                                                                                                      |
| 復元順序の逆転・DOM 参照を持つ snapshot                                     | TC-044、TC-046                                                                                                                                                                                                                                                              |
| 詳細を開かない移動で `commitDetails` request が送られる                     | TC-036                                                                                                                                                                                                                                                                      |
| 端での wrap 漏れ・viewport 内で scroll しない                               | TC-032、TC-033、TC-035（中央 scroll は TC-019、TC-031）                                                                                                                                                                                                                     |
| 非 match 行 click で current が動く                                         | TC-038                                                                                                                                                                                                                                                                      |
| 採番の重複・上限到達                                                        | TC-006、TC-008、TC-041                                                                                                                                                                                                                                                      |
| Find widget を閉じずに開始する                                              | TC-004                                                                                                                                                                                                                                                                      |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）                       | requestId 初期値 1: TC-003。上限: TC-008。visible 1 件: TC-021、TC-035。`entries: []` と `null`: TC-012、TC-013。inactive no-op: TC-030、TC-039、TC-040、TC-043、TC-057。visible 0 件: excluded(anchor が load 済みなら visible は 1 件以上で、anchor 不在は TC-024 が充足) |
| 外部依存×失敗モード                                                         | TC-012、TC-016（response の `entries: null` として観測。`postMessage` 自体の失敗は VS Code API で throw しないため excluded）                                                                                                                                               |
| 例外・エラー経路                                                            | excluded(controller は throw せず error dialog と no-op で扱う。dialog 引数は TC-012〜TC-014 で固定)                                                                                                                                                                        |
| 型不正・フォーマット不正                                                    | excluded(`ResponseFileHistory` の型は `src/types-test.md` S9 の責務。runtime の malformed 素通しは `web/messageHandler-test/05-file-history-01.md` S18 が固定)                                                                                                              |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-009〜TC-011、TC-014、TC-015、TC-024〜TC-028、TC-038、TC-047、TC-048、TC-056
- Exception: excluded(throw 経路なし。上表のとおり)
- External: TC-012、TC-016
- Boundary: TC-008、TC-013、TC-021、TC-030、TC-032、TC-033、TC-035、TC-039、TC-040、TC-043、TC-046、TC-050、TC-057
- Type: excluded(上表のとおり他 owner の責務)
- Normal: TC-001〜TC-007、TC-017〜TC-020、TC-022、TC-023、TC-029、TC-031、TC-034、TC-036、TC-037、TC-041、TC-042、TC-044、TC-045、TC-049、TC-051〜TC-055

**失敗系/正常系比（煙感知器）**: 正常系28件、失敗系29件。件数が近似同数のためインベントリを再導出したが、状態機械の正常遷移（request / 受理 / 移動 / 解除 / getter）が多い構造で、失敗源は上表のとおり stale・不在・unload・別 repo・別 file 失敗に列挙済みであることを確認した。比率合わせのためのケース追加・削除は行わない。
