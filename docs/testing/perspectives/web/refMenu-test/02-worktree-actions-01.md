# テスト観点表: web/refMenu.ts

> Source: `web/refMenu.ts`
> Generated: 2026-08-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: worktree-actions

## S8: buildRefContextMenuItems() worktree 関連メニュー項目

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: superseded
> Superseded By: S23
> Supersedes: -

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                | Notes            |
| ------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------- |
| TC-033  | ローカルブランチ、worktreeInfo = null                            | Normal - standard                                                          | メニューに "Create Worktree..." が含まれる                                                     | REQ-2.3-TC1      |
| TC-034  | ローカルブランチ、worktreeInfo = { path, isMainWorktree: false } | Normal - standard                                                          | メニューに "Open Terminal Here" / "Copy Worktree Path" / "Remove Worktree" の 3 項目が含まれる | REQ-2.3-TC2      |
| TC-035  | ローカルブランチ、worktreeInfo = { path, isMainWorktree: true }  | Normal - main wt                                                           | メニューに "Open Terminal Here" / "Copy Worktree Path" のみ（Remove Worktree なし）            | REQ-2.3-TC4      |
| TC-036  | リモートブランチ                                                 | Normal - exclusion                                                         | worktree 関連メニュー項目が一切含まれない                                                      | REQ-2.3-TC3      |
| TC-037  | Create Worktree... 選択                                          | Normal - standard                                                          | showFormDialog が Path + Open Terminal の 2 フィールドで呼ばれる                               | REQ-3.2, REQ-3.3 |
| TC-038  | Create Worktree ダイアログの Path デフォルト値                   | Normal - standard                                                          | `../<repoName>-<sanitize(branchName)>` 形式                                                    | REQ-3.3-TC3      |
| TC-039  | Open Terminal Here 選択                                          | Normal - standard                                                          | sendMessage openTerminal に path と name が含まれる                                            | REQ-9.1          |
| TC-040  | Copy Worktree Path 選択                                          | Normal - standard                                                          | sendMessage copyToClipboard に type: "worktreePath" と data: path が含まれる                   | REQ-9.2          |
| TC-041  | Remove Worktree 選択                                             | Normal - standard                                                          | showConfirmationDialog が呼ばれ、確認メッセージにブランチ名とパスが含まれる                    | REQ-4.1          |

## S11: Create Worktree ダイアログ Open Terminal 設定反映

> Origin: Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-15
> Status: active
> Supersedes: -

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                     | Notes       |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------- |
| TC-048  | viewState.dialogDefaults.createWorktree.openTerminal=true  | Normal - standard                                                          | showFormDialog の Open Terminal チェックボックスが checked で表示   | REQ-9.1-TC1 |
| TC-049  | viewState.dialogDefaults.createWorktree.openTerminal=false | Normal - standard                                                          | showFormDialog の Open Terminal チェックボックスが unchecked で表示 | REQ-9.1-TC2 |

## S12: Remove Worktree ブランチ同時削除ダイアログ

> Origin: Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-15
> Status: superseded
> Superseded By: S24
> Supersedes: -

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                   | Notes                |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| TC-050  | Remove Worktree 選択、非メインworktree                     | Normal - standard                                                          | showFormDialog がチェックボックス入力付きで呼ばれる               | REQ-4.1-TC1          |
| TC-051  | viewState.dialogDefaults.removeWorktree.deleteBranch=true  | Normal - standard                                                          | チェックボックスのデフォルトが checked                            | REQ-9.2-TC1          |
| TC-052  | viewState.dialogDefaults.removeWorktree.deleteBranch=false | Normal - standard                                                          | チェックボックスのデフォルトが unchecked                          | REQ-9.2-TC2          |
| TC-053  | チェックボックスの info プロパティ確認                     | Normal - standard                                                          | 安全な削除（git branch -d）の説明テキストが info に設定されている | REQ-4.1-TC2          |
| TC-054  | チェックON + Remove ボタン押下                             | Normal - standard                                                          | sendMessage に deleteBranch: true が含まれる                      | REQ-4.1              |
| TC-055  | チェックOFF + Remove ボタン押下                            | Normal - standard                                                          | sendMessage に deleteBranch: false が含まれる                     | REQ-4.1              |
| TC-056  | ダイアログのアクションボタン名                             | Normal - standard                                                          | ボタンテキストが "Remove" である                                  | REQ-4.1              |
| TC-057  | 確認メッセージの内容                                       | Normal - standard                                                          | メッセージにブランチ名と worktree パスが含まれる                  | REQ-4.1 既存動作維持 |

## S16: Remove Worktree チェックボックス名の raw 引き渡し（単一エスケープ境界）

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `buildRefContextMenuItems()` 内 `removeWorktreeItem` の `showFormDialog` 呼び出し
> Target Path: `web/refMenu.ts:402-420`

Remove Worktree ダイアログの「Also delete branch」チェックボックスの `name` へ raw の `refName` を渡し、`showFormDialog` の checkbox 描画（`web/dialogs.ts` の `escapeHtml`）を唯一の HTML エスケープ境界とする修正。呼び出し側の事前 `escapeHtml` を外すことで、`feature/login` が `feature&#x2F;login` と二重エスケープ表示される [7] を解消する。dialog 側の共通エスケープ実装自体は `web/dialogs-test.md` owner（S6 TC-034）の責務。

| Case ID | Input / Precondition                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                          | Notes                |
| ------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| TC-079  | `refName = "feature/a&b"` の worktree 付きブランチで Remove Worktree の onClick を実行 | Normal - raw name の引き渡し                                               | `showFormDialog` の checkbox 要素の `name` 引数に `&amp;` / `&#x2F;` を含まない raw の `feature/a&b`（翻訳テンプレート適用後の文字列内）が渡る。モック検証: 呼び出し引数 | 事前エスケープの除去 |
| TC-080  | 同条件で dialog を実際に描画する                                                       | Boundary - 二重エスケープの解消                                            | checkbox label の `textContent` に `feature/a&b` がそのまま表示され、`&amp;` / `&#x2F;` の literal 文字列が現れない（エスケープは dialogs.ts 境界の1回のみ）             | [7] の観測条件       |

### 失敗源インベントリ（include-or-justify）— Feature 045 追加分（S16）

| 失敗源                                             | 対応ケースまたは除外理由                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| 呼び出し側の事前エスケープによる二重エスケープ表示 | TC-079、TC-080                                                                 |
| エスケープの欠落（raw 名が HTML として展開される） | excluded(描画境界のエスケープは `web/dialogs-test.md` S6 TC-034 で担保済み)    |
| ダイアログ本文（message）のエスケープ              | excluded(本文の `escapeHtml` は変更対象外で既存挙動を維持)                     |
| git 操作への refName 引き渡し                      | excluded(送信 payload は raw refName を使う既存挙動で、本変更は表示のみに影響) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(本変更は引数の受け渡し契約のみで、検証分岐を追加しない)
- Exception: excluded(throw 経路が存在しない)
- External: excluded(外部依存なし。dialog はモックまたは jsdom 描画で観測)
- Boundary: TC-080
- Type: excluded(`name` は `string` 型で TypeScript コンパイル時に保証される)

数値・空値境界（0 / minimum / maximum / +/-1 / empty / NULL）は、本セクションの対象がエスケープ回数の契約であり仕様上意味を持たないため対象外とする（意味のある境界は `&` / `/` を含む refName の TC-079/TC-080 で充足）。

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-079）、失敗系1件（TC-080）。件数が同数のためインベントリを再導出したが、本変更の失敗源は二重エスケープのみで、他の失敗源は上表の除外理由（owner 分離）により充足されていることを確認した。

## S22: 共通 builder 抽出後のブランチ付き worktree menu 契約の維持

> Origin: Feature 053 (detached-worktree-menu) (light-spec-plan)
> Added: 2026-09-13
> Status: active
> Supersedes: -
> Signature: `buildRefContextMenuItems(repo, refName, sourceElem, isRemoteCombined, gitBranchHead, remotes?, worktreeInfo?): ContextMenuElement[]`
> Target Path: `web/refMenu.ts:309-312`（worktreeItems）
> Test File: `tests/web/refMenu.test.ts`

S8のTC-034 / TC-039 / TC-040は`toContain`で項目の有無を見る。本sectionは順序とterminal名の供給元を固定する。`WORKTREE_PATH = "/home/user/project-feature"`、`REPO = "/test/repo"`。

| Case ID | Input / Precondition                                                                                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                                                                                         | Notes |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| TC-106  | `createMockElement(["head"])`、`refName = "feature/x"`、`gitBranchHead = "feature/x"`、`worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false }` | Normal - HEAD branch menu order                                            | `title`／`null`の並びが`Pull`、`Push`、`null`、`Open in New Window`、`Reveal in File Manager`、`Open Terminal Here`、`Copy Worktree Path`、`null`、`More...`、`null`、`Copy Branch Name to Clipboard`。index 3〜5の`recentActionId`が`ref.openWorktreeInNewWindow` / `ref.revealWorktreeInOS` / `ref.openTerminal`。index 5の`onClick()`で`sendMessage`が1回`{ command: "openTerminal", repo: REPO, path: WORKTREE_PATH, name: "Worktree: feature/x" }` | -     |
| TC-107  | 同条件で`gitBranchHead = "main"`                                                                                                                       | Normal - non-HEAD local branch menu order                                  | 並びが`Checkout Branch`、`Merge into current branch&#8230;`、`Rebase current branch on Branch&#8230;`、`null`、共通4項目、`null`、`More...`、`null`、`Copy Branch Name to Clipboard`。`More...`の`submenu`の`title`が`Rename Branch&#8230;`、`Delete Branch&#8230;`、`Remove Worktree&#8230;`の順。`Remove Worktree&#8230;`の`onClick()`で`showFormDialog`が1回、第2引数の入力配列の長さが1で`type: "checkbox"`                                         | -     |

### 失敗源インベントリ（include-or-justify）— Feature 053 追加分（S22）

| 失敗源                         | 対応ケースまたは除外理由 |
| ------------------------------ | ------------------------ |
| 共通化による順序変化           | TC-106、TC-107           |
| terminal名の末尾名化           | TC-106                   |
| detached用Removeへの置き換わり | TC-107                   |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(本sectionは既存契約の固定で、分岐を追加しない)
- Exception: excluded(同上)
- External: excluded(同上)
- Boundary: excluded(同上)
- Type: excluded(同上)

## S23: buildRefContextMenuItems() worktree menu items

> Origin: Feature 060-03 (light-spec-plan)
> Added: 2026-09-29
> Status: active
> Supersedes: S8
> Signature: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemoteCombined: boolean, gitBranchHead: string | null, remotes?: string[], worktreeInfo?: { path: string; isMainWorktree: boolean } | null): ContextMenuElement[]`
> Target Path: `web/refMenu.ts:254-297` (`worktreeItems`, `createWorktreeItem`), `web/refMenu.ts:324-357` (`removeWorktreeItem`), `web/refMenu.ts:396-438` (placement) (line ranges at base `2a3cc5f`; update after implementation)
> Test File: `tests/web/refMenu.test.ts`

Replaces S8 so that the Remove Worktree selection case matches the implemented and tested form dialog. TC-108 to TC-116 carry over S8's TC-033 to TC-041 in the same order (old ID in Notes). Only TC-116 is corrected: S8 TC-041 named `showConfirmationDialog`, while the item opens `showFormDialog`. Other expectations are unchanged. Fixture: `REPO = "/test/repo"`, `WORKTREE_PATH = "/home/user/project-feature"`, `createMockElement(["head"])` as `sourceElem`, `refName = "feature/x"` and `gitBranchHead = "main"` unless stated, `viewState.dialogDefaults.createWorktree.openTerminal = true` and `removeWorktree.deleteBranch = true`. Titles are read from the menu flattened through submenus. The removal ID and the record after confirmation are owned by S24 / S25; the order and More placement stay with S22 TC-107 and `03-context-menu-recent-actions-01.md` S13.

| Case ID | Input / Precondition                                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                  | Notes                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| TC-108  | Local branch, `worktreeInfo = null`                                                                          | Normal - standard                                                          | The menu contains `Create Worktree&#8230;`                                                                                                                                       | Successor of TC-033 (REQ-2.3-TC1)                                                                      |
| TC-109  | Local branch, `worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false }`                                | Normal - standard                                                          | The menu contains `Open Terminal Here`, `Copy Worktree Path` and `Remove Worktree&#8230;`                                                                                        | Successor of TC-034 (REQ-2.3-TC2)                                                                      |
| TC-110  | `refName = "main"`, `gitBranchHead = "main"`, `worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: true }` | Normal - main wt                                                           | The menu contains `Open Terminal Here` and `Copy Worktree Path` but not `Remove Worktree&#8230;`                                                                                 | Successor of TC-035 (REQ-2.3-TC4)                                                                      |
| TC-111  | Remote branch (`createMockElement(["remote"])`, `refName = "origin/feature"`, `worktreeInfo = null`)         | Normal - exclusion                                                         | The menu contains none of `Create Worktree&#8230;`, `Open Terminal Here`, `Copy Worktree Path`, `Remove Worktree&#8230;`                                                         | Successor of TC-036 (REQ-2.3-TC3)                                                                      |
| TC-112  | `worktreeInfo = null`, select `Create Worktree&#8230;`                                                       | Normal - standard                                                          | `showFormDialog` is called once with 2 inputs: a text input named `Path: ` and a checkbox named `Open Terminal` whose `value` is `true`                                          | Successor of TC-037 (REQ-3.2, REQ-3.3)                                                                 |
| TC-113  | Path default of the Create Worktree dialog                                                                   | Normal - standard                                                          | The text input's `default` is `../repo-feature-x` (`../<repoName>-<sanitize(branchName)>`); `getRepoName` is called with `REPO` and `sanitizeBranchNameForPath` with `feature/x` | Successor of TC-038 (REQ-3.3-TC3)                                                                      |
| TC-114  | Non-main worktree, select `Open Terminal Here`                                                               | Normal - standard                                                          | `sendMessage` is called once with `{ command: "openTerminal", repo: REPO, path: WORKTREE_PATH, name: "Worktree: feature/x" }`                                                    | Successor of TC-039 (REQ-9.1)                                                                          |
| TC-115  | Non-main worktree, select `Copy Worktree Path`                                                               | Normal - standard                                                          | `sendMessage` is called once with `{ command: "copyToClipboard", type: "worktreePath", data: WORKTREE_PATH }`                                                                    | Successor of TC-040 (REQ-9.2)                                                                          |
| TC-116  | Non-main worktree, select `Remove Worktree&#8230;`                                                           | Normal - standard                                                          | `showFormDialog` is called once and its message (first argument) contains `feature/x` and `WORKTREE_PATH`                                                                        | Successor of TC-041 (REQ-4.1). Corrected: the dialog is `showFormDialog`, not `showConfirmationDialog` |

## S24: Remove Worktree dialog with branch deletion, recorded in Recent actions on confirmation

> Origin: Feature 060-03 (light-spec-plan)
> Added: 2026-09-29
> Status: active
> Supersedes: S12
> Signature: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemoteCombined: boolean, gitBranchHead: string | null, remotes?: string[], worktreeInfo?: { path: string; isMainWorktree: boolean } | null): ContextMenuElement[]` (the `removeWorktreeItem` form and its confirm callback)
> Target Path: `web/refMenu.ts:324-357` (line range at base `2a3cc5f`; update after implementation)
> Test File: `tests/web/refMenu.test.ts`

Replaces S12 because confirming the form with Remove now records `ref.removeWorktree` once before the unchanged removal request. TC-117 to TC-124 carry over S12's TC-050 to TC-057 in the same order (old ID in Notes). Only TC-121 and TC-122 change expectations. Fixture: `REPO = "/test/repo"`, `WORKTREE_PATH = "/home/user/project-feature"`, `createMockElement(["head"])`, `refName = "feature/x"`, `gitBranchHead = "main"`, `worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false }`; the item is selected from the built menu and the dialog is the mocked `showFormDialog`. "Confirm" means invoking the captured action callback (fourth argument) with the checkbox values. `recordRecentAction` and `sendMessage` are mocks, so each is counted separately and their order is compared with `mock.invocationCallOrder`. Not recording on open, cancel or close is owned by S25; the raw checkbox name by S16.

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                                                                 | Notes                                                                                                                              |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| TC-117  | Select `Remove Worktree&#8230;`, non-main worktree             | Normal - standard                                                          | `showFormDialog` is called once with an input array of length 1 whose element has `type: "checkbox"`                                                                                                                                                                                                                                                                                                                            | Successor of TC-050 (REQ-4.1-TC1)                                                                                                  |
| TC-118  | `viewState.dialogDefaults.removeWorktree.deleteBranch = true`  | Normal - standard                                                          | The checkbox `value` is `true` (checked)                                                                                                                                                                                                                                                                                                                                                                                        | Successor of TC-051 (REQ-9.2-TC1)                                                                                                  |
| TC-119  | `viewState.dialogDefaults.removeWorktree.deleteBranch = false` | Normal - standard                                                          | The checkbox `value` is `false` (unchecked)                                                                                                                                                                                                                                                                                                                                                                                     | Successor of TC-052 (REQ-9.2-TC2)                                                                                                  |
| TC-120  | The checkbox `info` property                                   | Normal - standard                                                          | `info` is defined and explains safe deletion (`git branch -d`; contains `unmerged`)                                                                                                                                                                                                                                                                                                                                             | Successor of TC-053 (REQ-4.1-TC2)                                                                                                  |
| TC-121  | Confirm with `["checked"]` (Also delete branch ON, Remove)     | Normal - record once before send, branch deletion requested                | `recordRecentAction` is called exactly once, with `(REPO, "ref.removeWorktree")` (so `ref.deleteBranch` is not recorded). `sendMessage` is called once and its argument equals (`toStrictEqual`) `{ command: "removeWorktree", repo: REPO, worktreePath: WORKTREE_PATH, branchName: "feature/x", deleteBranch: true }`. `recordRecentAction.mock.invocationCallOrder[0]` is less than `sendMessage.mock.invocationCallOrder[0]` | Successor of TC-054 (REQ-4.1). Changed: record once before the request, whole payload. Main regression (RED before implementation) |
| TC-122  | Confirm with `["unchecked"]` (Also delete branch OFF, Remove)  | Normal - record once before send, worktree only                            | Same as TC-121 except the payload's `deleteBranch` is `false`: `recordRecentAction` exactly once with `(REPO, "ref.removeWorktree")`, `sendMessage` once with `toStrictEqual({ command: "removeWorktree", repo: REPO, worktreePath: WORKTREE_PATH, branchName: "feature/x", deleteBranch: false })`, record before send                                                                                                         | Successor of TC-055 (REQ-4.1). Changed: record once before the request, whole payload. Main regression (RED before implementation) |
| TC-123  | The dialog's action button name                                | Normal - standard                                                          | The third argument of `showFormDialog` is `"Remove"`                                                                                                                                                                                                                                                                                                                                                                            | Successor of TC-056 (REQ-4.1)                                                                                                      |
| TC-124  | The confirmation message                                       | Normal - standard                                                          | The message contains the branch name `feature/x` and `WORKTREE_PATH`                                                                                                                                                                                                                                                                                                                                                            | Successor of TC-057 (REQ-4.1, existing behavior kept)                                                                              |

### Failure source inventory (include-or-justify) - Feature 060-03 (S23 / S24)

| Failure source                                                          | Covering case or reason for exclusion                                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| No record, duplicate record, or record after the request on Remove      | TC-121, TC-122                                                                                                      |
| `ref.deleteBranch` recorded in addition when Also delete branch is ON   | TC-121                                                                                                              |
| Request payload changed (path, branch name, `deleteBranch`, extra keys) | TC-121, TC-122                                                                                                      |
| Dialog kind, inputs, defaults, button or message regressed              | TC-116 to TC-120, TC-123, TC-124                                                                                    |
| Removal offered for the main worktree or a remote branch                | TC-110, TC-111                                                                                                      |
| Record or request before confirmation                                   | excluded here (owned by `03-context-menu-recent-actions-01.md` S25 TC-126 to TC-128)                                |
| Git removal or branch deletion failure after a confirmed record         | excluded (the menu does not observe Git results; covered on screen by `web/contextMenu-test.md` S7 TC-051 / TC-052) |

**Failure category coverage (diversity floor)**:

- Validation: excluded (no rejection branch in these sections; unconfirmed paths are S25)
- Exception: excluded (no throw path)
- External: excluded (dialogs and messaging are mocked; Git outcomes are host-owned)
- Boundary: TC-119 (default OFF)
- Type: excluded (`RecentActionId` membership is checked by `pnpm run typecheck`)
