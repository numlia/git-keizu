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
