# Test Perspectives: web/fileMenu.ts

> Source: `web/fileMenu.ts`
> Generated: 2026-04-04T15:52:21Z
> Language: TypeScript
> Test Framework: Vitest

## S1: Resolving the request payload of the file row Open File action

> Origin: Feature 027 (commit-file-context-menu) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**Signature**: a helper that takes a file row element, `expandedCommit` and `repo` and sends an `openFile` request
**Target path**: `web/fileMenu.ts`

| Case ID | Input / Precondition                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                         | Notes                    |
| ------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| TC-001  | `.gitFile` has `data-newfilepath="src%2Ffile.ts"`, expandedCommit.hash present    | Normal - standard                                                          | `sendMessage` is called once with the payload `{ command: "openFile", repo, filePath: "src/file.ts", commitHash }`      | REQ-2.2-TC1              |
| TC-002  | `data-newfilepath` is a URI-encoded path containing spaces or Japanese characters | Boundary - special characters                                              | The `filePath` of `sendMessage` exactly equals the decoded string                                                       | REQ-2.2-TC2              |
| TC-003  | expandedCommit is null                                                            | Validation - missing commit context                                        | `sendMessage` is not called                                                                                             | no-op guard              |
| TC-004  | `.gitFile` has no `data-newfilepath`                                              | Validation - missing dataset                                               | `sendMessage` is not called                                                                                             | no-op guard              |
| TC-005  | A deleted file row of type=`D` has `data-newfilepath`                             | Boundary - deleted row delegation                                          | Even for a deleted row, `sendMessage` is called with the normal `openFile` payload, delegating the decision to the host | Precursor of REQ-2.2-TC3 |
| TC-006  | The target element is not under a `.gitFile`                                      | Validation - missing file row                                              | Even if resolving `closest(".gitFile")` fails, no exception is thrown and `sendMessage` is not called                   | nested target guard      |

## S2: Building menu items in buildFileContextMenuItems()

> Origin: Feature 027 (commit-file-context-menu) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: superseded
> Supersedes: -
> Superseded By: S5

**Signature**: `buildFileContextMenuItems(fileRow, expandedCommit, repo): ContextMenuElement[]`
**Target path**: `web/fileMenu.ts`

| Case ID | Input / Precondition                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                     | Notes                    |
| ------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| TC-007  | A valid `.gitFile` row, expandedCommit.hash present                           | Normal - standard                                                          | The returned items have 1 entry with the title `Open File`                                                                          | REQ-2.1-TC1, REQ-2.1-TC2 |
| TC-008  | A deleted file row of type=`D`                                                | Boundary - deleted row menu availability                                   | Even for a deleted row the items are not empty and 1 `Open File` entry is returned                                                  | REQ-2.1-TC4              |
| TC-009  | expandedCommit is null                                                        | Validation - missing commit context                                        | Returns an empty array and no menu is shown                                                                                         | guard                    |
| TC-010  | A precondition of the action helper is missing, such as no `data-newfilepath` | Validation - missing dataset                                               | Returns an empty array and creates no menu item that cannot run                                                                     | guard                    |
| TC-011  | Run items[0].onClick of TC-007                                                | Normal - shared action reuse                                               | The `sendMessage` payload on menu item selection has the same structure as an icon click, `{ command, repo, filePath, commitHash }` | REQ-2.2 / REQ-2.3        |

## S3: Recent actions identifier and save trigger

> Origin: Feature 034 (context-menu-recent-actions) Task 4
> Added: 2026-05-02
> Status: superseded
> Supersedes: -
> Superseded By: S5
> Signature: `buildFileContextMenuItems(fileRow, expandedCommit, repo): ContextMenuElement[]`
> Target Path: `web/fileMenu.ts`

| Case ID | Input / Precondition                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                             | Notes                                                                              |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| TC-012  | A valid `.gitFile` row, expandedCommit.hash present | Normal - recent id                                                         | The `Open File` item gets `recentActionId = "file.openFile"`                                | Given the display conditions, the Recent block itself is a separate responsibility |
| TC-013  | Click the item of TC-012                            | Normal - record before send                                                | `recordRecentAction(repo, "file.openFile")` is called before the `openFile` payload is sent | Reuses sendOpenFileAction                                                          |
| TC-014  | expandedCommit is null and no menu is built         | Validation - guard                                                         | Returns an empty array, and `recordRecentAction(...)` is not called either                  | Equivalent to cancel                                                               |

## S4: Display conditions and callback of the Highlight File History item in buildFileContextMenuItems()

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: `buildFileContextMenuItems(fileRow: HTMLElement | null, expandedCommit: FileMenuExpandedCommit | null, repo: string | null, fileHistory: FileHistoryMenuContext): ContextMenuElement[]`
> Target Path: `web/fileMenu.ts` (`buildFileContextMenuItems()`; update to line ranges after implementation)
> Test File: `tests/web/fileMenu.test.ts`

Perspectives for the contract that keeps `Open File` first and adds `Highlight File History` as the second item only when all of `expandedCommit.hash !== "*"`, `fileHistory.isStash === false`, `compareWithHash === null` and `data-type` being `A` / `M` / `D` / `R` hold (implementation plan §4 Task 4 implementation items 1 to 2). `onClick` calls `onHighlightFileHistory(anchorHash, decodeURIComponent(path))`; sending the request is owned by `web/fileHistory-test.md` S2 and is not in this table. The base fixture is a row of type `M`, `{ hash: "abc", compareWithHash: null }` and `{ isStash: false, onHighlightFileHistory: vi.fn() }`.

| Case ID | Input / Precondition                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                    | Notes                                     |
| ------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| TC-015  | Base fixture                                                                       | Normal - menu with 2 items                                                 | The return value has 2 items with `[0].title === "Open File"` and `[1].title === "Highlight File History"`                                                                         | Fixed order                               |
| TC-016  | Run `[1].onClick()` of the base fixture                                            | Normal - callback arguments                                                | `onHighlightFileHistory` is called once with `("abc", "src/file.ts")`, and the call count of `postMessage` is 0                                                                    | Decoded path                              |
| TC-017  | `[1]` of the base fixture                                                          | Normal - no recentActionId                                                 | `[1].recentActionId` is `undefined`, and the call count of `recordRecentAction` after `[1].onClick()` is 0                                                                         | Does not widen the `RecentActionId` union |
| TC-018  | Rows whose `data-type` is `A` / `D` / `R`                                          | Normal - allowed type set                                                  | For all 3 inputs the return value has 2 items with `[1].title === "Highlight File History"`                                                                                        | `FILE_HISTORY_MENU_CHANGE_TYPES`          |
| TC-019  | A row whose `data-type` is `T`                                                     | Validation - type not allowed                                              | The return value is 1 `Open File` item                                                                                                                                             | typechange                                |
| TC-020  | A row without the `data-type` attribute                                            | Boundary - missing dataset                                                 | The return value is 1 `Open File` item                                                                                                                                             | `undefined` is not allowed                |
| TC-021  | `expandedCommit.hash === "*"` (uncommitted)                                        | Validation - uncommitted changes                                           | The return value is 1 `Open File` item                                                                                                                                             | `UNCOMMITTED_CHANGES_HASH`                |
| TC-022  | `fileHistory.isStash === true`                                                     | Validation - stash commit                                                  | The return value is 1 `Open File` item                                                                                                                                             | Determined by the caller                  |
| TC-023  | `expandedCommit.compareWithHash === "def"`                                         | Validation - comparison view                                               | The return value is 1 `Open File` item                                                                                                                                             | No stable anchor                          |
| TC-024  | `expandedCommit === null`                                                          | Validation - no commit context                                             | The return value is `[]` (existing behavior kept)                                                                                                                                  | Same guard as S2 TC-009                   |
| TC-025  | A row without `data-newfilepath`                                                   | Validation - missing dataset                                               | The return value is `[]` (existing behavior kept)                                                                                                                                  | Same guard as S2 TC-010                   |
| TC-026  | `[0]` of the base fixture                                                          | Normal - existing item kept                                                | `[0].recentActionId === "file.openFile"`, and `[0].onClick()` calls `recordRecentAction(repo, "file.openFile")` and `postMessage` with the `openFile` payload once each, as before | Does not break the contracts of S1 to S3  |
| TC-027  | `data-newfilepath` is a URI-encoded path containing spaces and Japanese characters | Boundary - special characters                                              | The second argument of `[1].onClick()` exactly equals the decoded string                                                                                                           | `decodeURIComponent`                      |

### Failure-source inventory (include-or-justify) — added by Feature 055-07 (S4)

| Failure source                                                | Case or reason for exclusion                                                                                                                                            |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Item shown for uncommitted / stash / comparison view          | TC-021 to TC-023                                                                                                                                                        |
| Item shown for a disallowed type or missing dataset           | TC-019, TC-020                                                                                                                                                          |
| Encoded path passed as is                                     | TC-016, TC-027                                                                                                                                                          |
| Breaking the order, payload or recent action of `Open File`   | TC-015, TC-026                                                                                                                                                          |
| A recentActionId attached to `Highlight File History`         | TC-017                                                                                                                                                                  |
| Regression of the existing guards (no context, missing path)  | TC-024, TC-025                                                                                                                                                          |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL) | 0 items: TC-024, TC-025. 1 item: TC-019 to TC-023. `null` context: TC-024. Missing dataset: TC-020, TC-025. maximum / +/-1: excluded(no numeric threshold)              |
| External dependency x failure mode                            | excluded(menu building uses only the DOM dataset and callbacks, with no external dependency)                                                                            |
| Exception / error paths                                       | excluded(guards are expressed as an empty array / 1 item and have no throw path)                                                                                        |
| Invalid type / format                                         | excluded(the types `FileMenuExpandedCommit` / `FileHistoryMenuContext` are ensured by TypeScript type checking, and unknown values of `data-type` are pinned by TC-019) |

**Failure-category coverage (diversity floor)**:

- Validation: TC-019, TC-021 to TC-025
- Exception: excluded(no throw path, as in the table above)
- External: excluded(as in the table above)
- Boundary: TC-020, TC-027
- Type: excluded(as in the table above)
- Normal: TC-015 to TC-018, TC-026

**Failure/normal ratio (smoke detector)**: 5 normal cases, 8 failure cases. The negative side of the 4 display conditions and the existing guards are listed as failure sources, and the ratio of 1.6 was confirmed to be derived from the inventory. No cases are added or removed to adjust the ratio.

## S5: Keeping the Open File item with the 4-argument signature of buildFileContextMenuItems()

> Origin: Feature 055-07 (light-spec-plan) Task 8
> Added: 2026-09-08
> Status: active
> Supersedes: S2, S3
> Signature: `buildFileContextMenuItems(fileRow: HTMLElement | null, expandedCommit: FileMenuExpandedCommit | null, repo: string | null, fileHistory: FileHistoryMenuContext): ContextMenuElement[]`
> Target Path: `web/fileMenu.ts` (`buildFileContextMenuItems()`)
> Test File: `tests/web/fileMenu.test.ts`

S2 / S3 assume the 3-argument signature and "the items are 1 `Open File`". Task 4 added the `fileHistory` argument, and normal rows now show `Highlight File History` as the second item (S4 TC-015), so their expected results no longer match the current contract. This section redefines the `Open File` contract of S2 / S3 under the 4-argument signature. The item count and the display conditions of the second item are owned by S4, the guards for `expandedCommit === null` / missing `data-newfilepath` by S4 TC-024 / TC-025, and attaching `recentActionId` by S4 TC-026; they are not in this table. The base fixture is a row of type `M`, `{ hash: "abc123def456", compareWithHash: null }` and `{ isStash: false, onHighlightFileHistory: vi.fn() }`.

| Case ID | Input / Precondition                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                          | Notes                           |
| ------- | ------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| TC-028  | Base fixture                                | Normal - Open File stays first                                             | `[0].title === "Open File"`, and exactly 1 item has the title `Open File`                                                                                | Formerly TC-007. Count is in S4 |
| TC-029  | A deleted file row of type=`D`              | Boundary - deleted row menu availability                                   | The items are not empty and `[0].title === "Open File"`                                                                                                  | Formerly TC-008                 |
| TC-030  | Run `[0].onClick()` of the base fixture     | Normal - shared action reuse                                               | `postMessage` is called once with a payload of the same structure as an icon click, `{ command: "openFile", repo, filePath: "src/file.ts", commitHash }` | Formerly TC-011                 |
| TC-031  | Run `[0].onClick()` of the base fixture     | Normal - record before send                                                | `recordRecentAction(repo, "file.openFile")` is called once, before `postMessage` according to `mock.invocationCallOrder`                                 | Formerly TC-013                 |
| TC-032  | expandedCommit is null and no menu is built | Validation - guard                                                         | Returns an empty array, and the call count of `recordRecentAction(...)` is 0                                                                             | Formerly TC-014                 |

### Failure-source inventory (include-or-justify) — added by Feature 055-07 Task 8 (S5)

| Failure source                                                          | Case or reason for exclusion                                                                                    |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `Open File` no longer first, or duplicated                              | TC-028, TC-029                                                                                                  |
| Drift of the payload structure / sent twice                             | TC-030                                                                                                          |
| Recent action not recorded / order reversed                             | TC-031                                                                                                          |
| Recent action recorded on a guard                                       | TC-032                                                                                                          |
| Display conditions of the second item, `[]` on guards, `recentActionId` | excluded(owned by S4 TC-015 to TC-026)                                                                          |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)           | 0 items: TC-032. `null` context: TC-032. maximum / +/-1: excluded(no numeric threshold)                         |
| External dependency x failure mode                                      | excluded(menu building uses only the DOM dataset and callbacks, with no external dependency)                    |
| Exception / error paths                                                 | excluded(guards are expressed as an empty array and have no throw path)                                         |
| Invalid type / format                                                   | excluded(the types `FileMenuExpandedCommit` / `FileHistoryMenuContext` are ensured by TypeScript type checking) |

**Failure-category coverage (diversity floor)**:

- Validation: TC-032
- Exception: excluded(no throw path, as in the table above)
- External: excluded(as in the table above)
- Boundary: TC-029
- Type: excluded(as in the table above)
- Normal: TC-028, TC-030, TC-031

**Failure/normal ratio (smoke detector)**: 3 normal cases, 2 failure cases. This is a replacement section mapping the S2 / S3 contract onto the 4-argument signature, and the table above lists that the failure sources are limited to 3 points: staying first, the payload and the recent action. No cases are added or removed to adjust the ratio.

## S6: Shared check and icon launch in canHighlightFileHistory() / sendHighlightFileHistoryAction()

> Origin: Feature 055-09 (light-spec-plan)
> Added: 2026-09-13
> Status: active
> Supersedes: -
> Signature: `canHighlightFileHistory(expandedCommit: FileMenuExpandedCommit, isStash: boolean, changeType: string | undefined): boolean` / `sendHighlightFileHistoryAction(fileRow: HTMLElement | null, expandedCommit: FileMenuExpandedCommit | null, repo: string | null, fileHistory: FileHistoryMenuContext): void`
> Target Path: `web/fileMenu.ts:68-102`
> Test File: `tests/web/fileMenu.test.ts`

Perspectives for the contract that places the 4 conditions of the context menu (not uncommitted / not a stash / not a comparison view / change type is `A` / `M` / `D` / `R`) in one exported function `canHighlightFileHistory()`, and that `sendHighlightFileHistoryAction()`, called from a click on the history icon, re-evaluates the same 4 conditions with the inputs at that moment after the same 4 guards as `sendOpenFileAction()`, then calls `onHighlightFileHistory(anchorHash, decodeURIComponent(path))` once (implementation plan §3.4, §4 Task 2). The menu's return value is owned by S4 / S5, the DOM listener wiring by `web/main-test/06-file-actions-01.md` S54, and sending the request by `web/fileHistory-test.md`; they are not in this table. The base fixture is `{ hash: "abc", compareWithHash: null }`, `isStash: false`, a row of type `M` with `newfilepath: "src%2Ffile.ts"`, and `makeFileHistoryContext()`.

| Case ID | Input / Precondition                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                            | Notes                                      |
| ------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-033  | `canHighlightFileHistory({ hash: "abc", compareWithHash: null }, false, "M")`           | Normal - base                                                              | `true`                                                                                                                     | -                                          |
| TC-034  | changeType is `A` / `D` / `R`                                                           | Normal - allowed type set                                                  | `true` for all 3 inputs                                                                                                    | `FILE_HISTORY_MENU_CHANGE_TYPES`           |
| TC-035  | changeType is `T`                                                                       | Validation - type not allowed                                              | `false`                                                                                                                    | typechange                                 |
| TC-036  | changeType is `undefined`                                                               | Boundary - missing dataset                                                 | `false`                                                                                                                    | -                                          |
| TC-037  | hash is `*`                                                                             | Validation - uncommitted                                                   | `false`                                                                                                                    | `UNCOMMITTED_CHANGES_HASH`                 |
| TC-038  | isStash is `true`                                                                       | Validation - stash                                                         | `false`                                                                                                                    | -                                          |
| TC-039  | compareWithHash is `"def"`                                                              | Validation - comparison view                                               | `false`                                                                                                                    | -                                          |
| TC-040  | `sendHighlightFileHistoryAction(<base row>, <base commit>, TEST_REPO, context)`         | Normal - launch                                                            | `onHighlightFileHistory` is called once with `("abc", "src/file.ts")`, `postMessage` 0 times, `recordRecentAction` 0 times | Same arguments as the menu item            |
| TC-041  | `data-newfilepath` is `encodeURIComponent("src/テスト ファイル.ts")`                    | Boundary - special characters                                              | The second argument is `"src/テスト ファイル.ts"`                                                                          | `decodeURIComponent`                       |
| TC-042  | fileRow is `null` (the result of `resolveFileRow(span)`)                                | Validation - row resolution failed                                         | Callback 0 times, no exception                                                                                             | Same guard as S1 TC-006                    |
| TC-043  | expandedCommit is `null`                                                                | Validation - no commit context                                             | 0 times                                                                                                                    | -                                          |
| TC-044  | repo is `null`                                                                          | Validation - no repo                                                       | 0 times                                                                                                                    | A path that DOM integration cannot produce |
| TC-045  | A row without `data-newfilepath`                                                        | Validation - missing dataset                                               | 0 times                                                                                                                    | -                                          |
| TC-046  | 5 inputs: hash `*` / isStash `true` / compareWithHash `"def"` / type `T` / missing type | Validation - negative side of the 4 conditions                             | 0 times each                                                                                                               | Re-evaluation at click time                |
| TC-047  | Rows of type `A` / `D` / `R`                                                            | Normal - positive side of the 4 conditions                                 | Once each, with first argument `"abc"`                                                                                     | -                                          |

### Failure-source inventory (include-or-justify) — added by Feature 055-09 (S6)

| Failure source                                                                                                                                              | Case or reason for exclusion                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Returning `true` or calling the callback on the negative side of the 4 conditions (uncommitted / stash / comparison view / disallowed type or missing type) | TC-035 to TC-039, TC-046                                                                                                                                                 |
| Guard regression (calling the callback with `null` `fileRow` / `expandedCommit` / `repo` or missing `data-newfilepath`)                                     | TC-042 to TC-045                                                                                                                                                         |
| Encoded path passed through                                                                                                                                 | TC-041                                                                                                                                                                   |
| Recording a recent action (calling `recordRecentAction`) / sending `postMessage` directly                                                                   | TC-040                                                                                                                                                                   |
| Missing an allowed type                                                                                                                                     | TC-034, TC-047                                                                                                                                                           |
| The menu's return value, DOM listener wiring, sending the request                                                                                           | excluded(owned by S4 / S5, `web/main-test/06-file-actions-01.md` S54 and `web/fileHistory-test.md`)                                                                      |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)                                                                                               | 0 times: TC-042 to TC-046. `null` arguments: TC-042 to TC-044. Missing dataset: TC-036, TC-045. maximum / +/-1: excluded(no numeric threshold)                           |
| External dependency x failure mode                                                                                                                          | excluded(the check and launch use only the DOM dataset and callbacks, with no external dependency)                                                                       |
| Exception / error paths                                                                                                                                     | excluded(guards are expressed as early returns and have no throw path; TC-042 confirms no exception)                                                                     |
| Invalid type / format                                                                                                                                       | excluded(the types `FileMenuExpandedCommit` / `FileHistoryMenuContext` are ensured by TypeScript type checking, and unknown values of `changeType` are pinned by TC-035) |

**Failure-category coverage (diversity floor)**:

- Validation: TC-035, TC-037 to TC-039, TC-042 to TC-046
- Exception: excluded(no throw path, as in the table above)
- External: excluded(as in the table above)
- Boundary: TC-036, TC-041
- Type: excluded(as in the table above)
- Normal: TC-033, TC-034, TC-040, TC-047

**Failure/normal ratio (smoke detector)**: 4 normal cases, 11 failure cases. The negative side of the 4 conditions is listed for both the check function and the launch helper, and the 4 guards for the launch helper; the ratio of 2.75 was confirmed to be derived from the inventory. No cases are added or removed to adjust the ratio.
