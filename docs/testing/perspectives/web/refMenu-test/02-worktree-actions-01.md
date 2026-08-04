# テスト観点表: web/refMenu.ts

> Source: `web/refMenu.ts`
> Generated: 2026-08-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: worktree-actions

## S8: buildRefContextMenuItems() worktree 関連メニュー項目

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
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
> Status: active
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
