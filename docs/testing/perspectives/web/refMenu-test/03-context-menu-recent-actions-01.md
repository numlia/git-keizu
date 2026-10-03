# テスト観点表: web/refMenu.ts

> Source: `web/refMenu.ts`
> Generated: 2026-08-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: context-menu-recent-actions

## S13: Context menu 整理対応 (032)

> Origin: Feature 032 (context-menu-reorg) Task 7
> Added: 2026-04-30
> Status: active
> Supersedes: -

**シグネチャ**: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemoteCombined: boolean, gitBranchHead: string | null, remotes?: string[], worktreeInfo?: { path: string; isMainWorktree: boolean } | null): ContextMenuElement[]`
**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                  | Notes                    |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| TC-058  | tag 分岐 (`sourceElem.classList.contains("tag") === true`)            | Normal - unchanged branch type                                             | 戻り値が `Delete Tag...`, `Push Tag...`, `null`, `Copy Tag Name to Clipboard` の 4 要素のままである                                                              | tag は現状維持           |
| TC-059  | remote 分岐 (`refName = "origin/feature"`)                            | Normal - submenu layout                                                    | 上段 2 件が `Checkout Branch...`, `Merge into current branch...`、index 3 が `More...` submenu、child は `Delete Remote Branch...` 1 件                          | remote 整理              |
| TC-060  | local HEAD 分岐、`worktreeInfo = null`                                | Normal - current branch layout                                             | `Pull`, `Push`, `null`, `More...`(Rename 1 件), `null`, `Copy Branch Name to Clipboard` の順で並ぶ                                                               | Rename は submenu へ移動 |
| TC-061  | local HEAD 分岐、`worktreeInfo = { path, isMainWorktree: true }`      | Normal - current branch with worktree                                      | `Pull`, `Push` の後に worktree 4 項目、次に `More...`(Rename 1 件)、末尾に Copy が入り、`Remove Worktree...` は含まれない                                        | main worktree 維持       |
| TC-062  | local non-HEAD 分岐、`worktreeInfo = null`                            | Normal - non-head no worktree                                              | `Checkout Branch`, `Merge into current branch...`, `Rebase current branch on Branch...`, `null`, `Create Worktree...`, `null`, `More...`, `null`, `Copy...` の順 | 非 HEAD の基本構成       |
| TC-063  | local non-HEAD 分岐、`worktreeInfo = { path, isMainWorktree: false }` | Normal - non-head with worktree                                            | worktree 4 項目の後に `More...` submenu があり、child titles が `Rename Branch...`, `Delete Branch...`, `Remove Worktree...` の順になる                          | 動的 submenu             |
| TC-064  | remote / local-HEAD / local-non-HEAD の各分岐                         | Validation - divider rules                                                 | いずれの配列でも連続 `null` が無く、先頭・末尾が `null` でない                                                                                                   | 区切り線ルール           |

## S14: Recent actions 識別子と保存トリガー

> Origin: Feature 034 (context-menu-recent-actions) Task 4
> Added: 2026-05-02
> Status: active
> Supersedes: -
> Signature: `buildRefContextMenuItems(...)` / `checkoutBranchAction(repo: string, sourceElem: HTMLElement, refName: string, isRemoteCombined?: boolean, recordAction?: boolean): void`
> Target Path: `web/refMenu.ts`

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                           | Notes                           |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| TC-065  | remote menu と HEAD + worktree menu を構築                     | Normal - target ids                                                        | `Checkout Branch...`, `Merge...`, `Pull`, `Push`, `Open in New Window`, `Reveal in File Manager`, `Open Terminal Here` に対応する `recentActionId` が付く | supported action 一覧           |
| TC-066  | tag menu (`Delete Tag...`, `Push Tag...`)                      | Validation - excluded branch type                                          | tag 固有 action には `recentActionId` が付与されない                                                                                                      | tag は対象外                    |
| TC-067  | `checkoutBranchAction(repo, elem, "feature/local")` を直接呼ぶ | Boundary - non-menu path                                                   | `sendMessage(RequestCheckoutBranch)` は送るが `recordRecentAction(...)` は呼ばれない                                                                      | double click など共有経路の保護 |
| TC-068  | HEAD menu の `Pull` で確認ダイアログを承認                     | Normal - record before send                                                | 確認 callback 内で `recordRecentAction(repo, "ref.pull")` が `sendMessage({ command: "pull" })` より先に呼ばれる                                          | safe action の保存順            |
| TC-069  | worktree menu の `Open Terminal Here` を選択                   | Normal - worktree action persistence                                       | `recordRecentAction(repo, "ref.openTerminal")` が `sendMessage(RequestOpenTerminal)` より先に呼ばれ、payload は path / name を保持する                    | worktree action も Recent 対象  |

## S15: Delete Branch / Delete Remote Branch の Recent actions 連携

> Origin: Feature 037 (delete-branch-recent-actions) Task 4
> Added: 2026-05-09
> Status: active
> Supersedes: -
> Signature: `showDeleteBranchDialog(repo, refName, remotes, worktreeInfo)` / `buildRefContextMenuItems(...)`
> Target Path: `web/refMenu.ts`

| Case ID | Input / Precondition                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                          | Notes                                       |
| ------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| TC-070  | local non-HEAD ブランチで menu を構築、submenu 内 `Delete Branch...` を取得           | Normal - target id                                                         | 該当 menu item の `recentActionId === "ref.deleteBranch"`                                                                                                | プロパティ付与                              |
| TC-071  | remote menu の submenu 内 `Delete Remote Branch...` を取得                            | Normal - target id                                                         | 該当 menu item の `recentActionId === "ref.deleteRemoteBranch"`                                                                                          | プロパティ付与                              |
| TC-072  | `showDeleteBranchDialog` remotes あり分岐の form を確定                               | Normal - record before send                                                | confirm callback 内で `recordRecentAction(repo, "ref.deleteBranch")` が `sendMessage({ command: "deleteBranch", ... })` より先に呼ばれる                 | remotes あり分岐の保存順                    |
| TC-073  | `showDeleteBranchDialog` remotes なし分岐の form を確定                               | Normal - record before send                                                | confirm callback 内で `recordRecentAction(repo, "ref.deleteBranch")` が `sendMessage({ command: "deleteBranch", deleteOnRemotes: [] })` より先に呼ばれる | remotes なし分岐の保存順                    |
| TC-074  | `deleteRemoteBranchItem.onClick` で confirm を承認                                    | Normal - record before send                                                | `recordRecentAction(repo, "ref.deleteRemoteBranch")` が `sendMessage({ command: "deleteRemoteBranch", ... })` より先に呼ばれる                           | remote 削除の保存順                         |
| TC-075  | `deleteBranchItem` を click したのちダイアログを cancel する（callback 未呼び出し）   | Boundary - cancel path                                                     | `recordRecentAction(...)` が呼ばれない / `sendMessage(...)` も呼ばれない                                                                                 | キャンセル時は記録しない                    |
| TC-076  | `deleteRemoteBranchItem` confirm dialog を cancel する（confirm callback 未呼び出し） | Boundary - cancel path                                                     | `recordRecentAction(...)` が呼ばれない / `sendMessage(...)` も呼ばれない                                                                                 | キャンセル時は記録しない                    |
| TC-077  | tag 分岐の `Delete Tag...` / `Push Tag...`                                            | Validation - excluded branch type                                          | tag 固有 action には `recentActionId` プロパティが付与されない                                                                                           | TC-066 と整合                               |
| TC-078  | `RecentActionId` 共用体に `"ref.deleteBranch"` / `"ref.deleteRemoteBranch"` を渡せる  | Type - union extension                                                     | TypeScript コンパイルが通る（型エラーなし）                                                                                                              | `pnpm run typecheck` 成功で担保（型レベル） |

## S25: Remove Worktree recent action ID and no effect before confirmation

> Origin: Feature 060-03 (light-spec-plan)
> Added: 2026-09-29
> Status: active
> Supersedes: -
> Signature: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemoteCombined: boolean, gitBranchHead: string | null, remotes?: string[], worktreeInfo?: { path: string; isMainWorktree: boolean } | null): ContextMenuElement[]`
> Target Path: `web/refMenu.ts:324-359` (`removeWorktreeItem`), `web/refMenu.ts:418-422` (More submenu) (line ranges after the Feature 060-03 implementation `3709547`)
> Test File: `tests/web/refMenu.test.ts`

Adds the branch-side removal to the Recent actions targets. Fixture: `REPO = "/test/repo"`, `WORKTREE_PATH = "/home/user/project-feature"`, `createMockElement(["head"])`, `refName = "feature/x"`, `gitBranchHead = "main"` (non-HEAD), `worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false }`. The removal item is found by searching the real builder output (inside `More...`), not written by hand. `showFormDialog`, `recordRecentAction` and `sendMessage` are mocks; "cancel" and "close" are represented by never invoking the captured action callback, and are kept as separate scenarios. Real-DOM Cancel and `hideDialog()` on the branch form are exercised through the composed menu in `web/contextMenu-test.md` S6 (Cancel in TC-031 / TC-033, `hideDialog()` in TC-031). The record and payload after confirmation are owned by `02-worktree-actions-01.md` S24. S13 (TC-061 / TC-063) and S14 TC-065 keep their expectations: TC-065 checks the remote and HEAD targets and is not an exhaustive ID list, and the HEAD and main-worktree menus still have no removal item.

| Case ID | Input / Precondition                                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                         | Notes                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| TC-125  | Build the menu and take `Remove Worktree&#8230;` from the `More...` submenu                             | Normal - target id                                                         | That item's `recentActionId` is `"ref.removeWorktree"` (`toBe`)                         | Main regression (RED before implementation). Same value as the detached item in `web/worktreeMenu-test.md` S2 TC-027 |
| TC-126  | Call the removal item's `onClick()` only                                                                | Boundary - dialog opened, not answered                                     | `showFormDialog` is called once. `recordRecentAction` 0 times and `sendMessage` 0 times | Opening the dialog does not record                                                                                   |
| TC-127  | Call `onClick()`, then cancel the form (the captured action callback is never invoked)                  | Validation - cancelled                                                     | `recordRecentAction` 0 times and `sendMessage` 0 times                                  | Unit representation of Cancel                                                                                        |
| TC-128  | Call `onClick()`, then close the form without an answer (the captured action callback is never invoked) | Validation - closed without confirming                                     | `recordRecentAction` 0 times and `sendMessage` 0 times                                  | Unit representation of closing, for example `hideDialog()`                                                           |

### Failure source inventory (include-or-justify) - Feature 060-03 (S25)

| Failure source                                                                      | Covering case or reason for exclusion                                         |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Branch removal item missing the ID, or using an ID different from the detached item | TC-125                                                                        |
| Record or request when the menu item is chosen                                      | TC-126                                                                        |
| Record or request on cancel or close                                                | TC-127, TC-128                                                                |
| Removal item appearing for HEAD or main-worktree branches                           | excluded here (kept by S13 TC-061 and `02-worktree-actions-01.md` S23 TC-110) |

**Failure category coverage (diversity floor)**:

- Validation: TC-127, TC-128
- Exception: excluded (no throw path)
- External: excluded (dialogs and messaging are mocked)
- Boundary: TC-126
- Type: excluded (`RecentActionId` membership is checked by `pnpm run typecheck`)

### Feature 060-03 test mapping and execution evidence (S25)

Test file: `tests/web/refMenu.test.ts`, new describe `Remove Worktree recent action` with an `@see` to this shard. TC-127 and TC-128 capture the action callback of the mocked form and never invoke it; the real-DOM Cancel and `hideDialog()` are exercised in `web/contextMenu-test.md` S6 TC-031 / TC-033. S14 TC-065 (`assigns recentActionId to supported remote and HEAD actions only (TC-065)`) is unchanged. The describe column comes first because the perspectives index counts rows whose first cell is a Case ID.

| describe                        | Case ID | Test Method                                                                   | Result                                       |
| ------------------------------- | ------- | ----------------------------------------------------------------------------- | -------------------------------------------- |
| `Remove Worktree recent action` | TC-125  | assigns ref.removeWorktree to Remove Worktree in the More submenu (TC-125)    | pass (2026-09-29); RED before implementation |
| `Remove Worktree recent action` | TC-126  | records and sends nothing when Remove Worktree only opens the form (TC-126)   | pass (2026-09-29)                            |
| `Remove Worktree recent action` | TC-127  | records and sends nothing when the form is cancelled (TC-127)                 | pass (2026-09-29)                            |
| `Remove Worktree recent action` | TC-128  | records and sends nothing when the form is closed without confirming (TC-128) | pass (2026-09-29)                            |

- RED before implementation (2026-09-29): in the temporary copy of the base commit `2a3cc5f` described in `02-worktree-actions-01.md` (updated tests and `src/types.ts`, `web/refMenu.ts` at the base), `pnpm exec vitest run tests/web/refMenu.test.ts -t 'TC-(121|122|125)'` failed TC-125 with `AssertionError: expected undefined to be 'ref.removeWorktree'` (no ID on the branch removal item). No failure came from dependency resolution, DOM setup or types.
- GREEN after implementation (2026-09-29): the same command in the checkout gave `Tests 3 passed | 100 skipped (103)`.

## S26: Highlight path サブメニュー（ブランチ2モード）とタグ除外・任意 callback

> Origin: Feature 061-01 (light-spec-plan)
> Added: 2026-10-03
> Status: active
> Supersedes: -
> Signature: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemoteCombined: boolean, gitBranchHead: string | null, remotes?: string[], worktreeInfo?: { path: string; isMainWorktree: boolean } | null, onHighlight?: (mode: BranchPathMode) => void): ContextMenuElement[]`
> Target Path: `web/refMenu.ts`（`buildRefContextMenuItems`。実装後に行範囲へ更新）
> Test File: `tests/web/refMenu.test.ts`

対応プラン §3.6 のブランチ向けサブメニューの観点。末尾の任意 callback `onHighlight` が渡された head / remote 分岐だけに `Highlight path` の submenu（`All ancestors` → `First-parent ancestors`）を追加し、tag 分岐には追加しない。対象 hash の解決（行内・省略一覧・併記リモート）は `web/main-test/12-path-highlight-01.md` S68 の責務で本表には含めない。S13 / S14 / S15 / S25 は callback 省略時の契約として active のまま残す。fixture は `REPO = "/test/repo"`、`createMockElement([...])` で `head` / `remote` / `tag` の `sourceElem` を作る。

| Case ID | Input / Precondition                                                                                                                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Notes                                  |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| TC-129  | `head` の `sourceElem`、`onHighlight = vi.fn()`。local HEAD（`gitBranchHead === refName`、`worktreeInfo = null`）と local non-HEAD（`worktreeInfo = { path, isMainWorktree: false }`）の2通り | Normal - head の2候補                                                      | 2通りとも `title === "Highlight path"` の submenu がちょうど1件で、その `submenu` の `title` が順に `All ancestors` / `First-parent ancestors` の2件、`recentActionId` を持たない。submenu は末尾の `Copy Branch Name to Clipboard` より前にあり、S13 TC-060 / TC-063 の既存項目の相対順序が変わらず、`null` が連続せず先頭・末尾が `null` でない。各 `onClick` で `onHighlight` が `PathHighlightMode.AllAncestors` / `PathHighlightMode.FirstParent` を引数に1回ずつ呼ばれ、`sendMessage` と `recordRecentAction` の call count が0 | コミット用モードを含まない             |
| TC-130  | `remote` の `sourceElem`、`refName = "origin/feature"`、`onHighlight = vi.fn()`。`isRemoteCombined` が `false` と `true` の2通り                                                              | Normal - remote の2候補                                                    | 2通りとも `Highlight path` の submenu がちょうど1件で `All ancestors` / `First-parent ancestors` の2件、S13 TC-059 の既存項目の相対順序が変わらず、末尾の `Copy Branch Name to Clipboard` より前にある。各 `onClick` で `onHighlight` が対応するモードで1回ずつ呼ばれ、`sendMessage` の call count が0                                                                                                                                                                                                                                | 併記リモートの remote 部分でも同じ候補 |
| TC-131  | `tag` の `sourceElem`、`onHighlight = vi.fn()`                                                                                                                                                | Validation - タグ除外                                                      | 戻り値が S13 TC-058 と同じ `Delete Tag...`、`Push Tag...`、`null`、`Copy Tag Name to Clipboard` の4要素で、`Highlight path` の項目が0件、`onHighlight` の call count が0                                                                                                                                                                                                                                                                                                                                                              | タグには新操作を追加しない             |
| TC-132  | `onHighlight` を渡さず、remote / local HEAD / local non-HEAD（worktree あり）の3通りで構築                                                                                                    | Boundary - callback 省略時の既存順序と recent action の不変                | 3通りとも `title` 列と `null` の位置が S13 TC-059 / TC-060 / TC-063 の配列と `toEqual` で一致し、`Highlight path` の項目が0件。`recentActionId` を持つ項目の集合が S14 TC-065 / S25 TC-125 と同じ                                                                                                                                                                                                                                                                                                                                     | 既存利用者・既存単体テストの契約を維持 |

### 失敗源インベントリ（include-or-justify）— Feature 061-01 追加分（S26）

| 失敗源                                                | 対応ケースまたは除外理由                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| モード候補の過不足・順序違い・コミット用モードの混入  | TC-129、TC-130                                                             |
| callback の mode 取り違え・ホスト送信・recent 記録    | TC-129、TC-130                                                             |
| タグ・detached 向けに項目が増える                     | TC-131（detached worktree のメニューは `web/worktreeMenu-test.md` の責務） |
| callback 省略時に項目・`recentActionId` が変わる      | TC-132                                                                     |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL） | callback 省略: TC-132。その他: excluded(数値閾値がない)                    |
| 入力検証×違反パターン                                 | TC-131（分岐の除外）                                                       |
| 外部依存×失敗モード                                   | excluded(ダイアログ・送信は mock で、失敗経路を追加しない)                 |
| 例外・エラー経路                                      | excluded(throw 経路なし)                                                   |
| 型不正・フォーマット不正                              | excluded(`BranchPathMode` の制約は TypeScript の型検査で担保)              |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-131
- Exception: excluded(上表のとおり)
- External: excluded(上表のとおり)
- Boundary: TC-132
- Type: excluded(上表のとおり)
- Normal: TC-129、TC-130
