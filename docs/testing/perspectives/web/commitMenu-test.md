# テスト観点表: web/commitMenu.ts

> Source: `web/commitMenu.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: Create Branch ダイアログ（checkout チェックボックス付き）

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/commitMenu.ts:59-75`

| Case ID | Input / Precondition                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                              | Notes                     |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------- |
| TC-001  | Create Branch メニュー項目選択                 | Normal - standard                                                          | showFormDialog が text-ref + checkbox の 2 要素で呼ばれる    | showRefInputDialog でない |
| TC-002  | ダイアログ表示時のチェックボックスデフォルト値 | Normal - standard                                                          | Check out チェックボックスのデフォルトが ON (true) である    | 設計仕様                  |
| TC-003  | 有効なブランチ名 + checkout=true で送信        | Normal - standard                                                          | RequestCreateBranch メッセージに checkout: true が含まれる   | -                         |
| TC-004  | 有効なブランチ名 + checkout=false で送信       | Normal - standard                                                          | RequestCreateBranch メッセージに checkout: false が含まれる  | -                         |
| TC-005  | ブランチ名が空で送信                           | Boundary - empty name                                                      | ダイアログのバリデーションにより送信が阻止される             | 既存バリデーション維持    |
| TC-006  | ブランチ名に不正文字を含む（refInvalid）       | Boundary - invalid ref                                                     | ダイアログのリアルタイム検証でエラーインジケータが表示される | 既存バリデーション維持    |

## S2: Merge ダイアログ拡張（3 checkbox フォーム）

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**テスト対象パス**: `web/commitMenu.ts:184-210`

| Case ID | Input / Precondition                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                | Notes                         |
| ------- | ---------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------- |
| TC-007  | Merge メニュー項目選択（コミット merge） | Normal - standard                                                          | showFormDialog が 3 checkbox で呼ばれる                                                        | showCheckboxDialog からの変更 |
| TC-008  | No FF checkbox デフォルト値              | Normal - standard                                                          | viewState.dialogDefaults.merge.noFastForward を反映                                            | -                             |
| TC-009  | Squash checkbox デフォルト値             | Normal - standard                                                          | viewState.dialogDefaults.merge.squashCommits を反映                                            | -                             |
| TC-010  | No Commit checkbox デフォルト値          | Normal - standard                                                          | viewState.dialogDefaults.merge.noCommit を反映                                                 | -                             |
| TC-011  | callback で 3 値取得、確定ボタン押下     | Normal - standard                                                          | RequestMergeCommit に createNewCommit, squash, noCommit が含まれる                             | sendMessage 検証              |
| TC-012  | Squash checkbox の構成                   | Normal - standard                                                          | Squash checkbox に info プロパティ（ツールチップテキスト）が設定されている                     | -                             |
| TC-013  | No Commit checkbox の構成                | Normal - standard                                                          | No Commit checkbox に info プロパティ（ツールチップテキスト）が設定されている                  | -                             |
| TC-014  | Squash ON に変更                         | Normal - mutual exclusion                                                  | No FF checkbox が disabled + unchecked になる                                                  | UI 排他制御                   |
| TC-015  | Squash ON → OFF に変更                   | Normal - mutual exclusion                                                  | No FF checkbox が enabled + デフォルト値（viewState.dialogDefaults.merge.noFastForward）に復元 | UI 排他制御復元               |

## S3: Cherry-pick ダイアログ拡張（2 checkbox フォーム）

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**テスト対象パス**: `web/commitMenu.ts:98-140`

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                        | Notes                             |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------- |
| TC-016  | Cherry Pick 通常コミット（parent 1 つ）                 | Normal - standard                                                          | showFormDialog が 2 checkbox で呼ばれる                                | showConfirmationDialog からの変更 |
| TC-017  | Cherry Pick マージコミット（parent 複数）               | Normal - standard                                                          | showFormDialog が select + 2 checkbox で呼ばれる                       | showSelectDialog からの変更       |
| TC-018  | Record Origin checkbox デフォルト値                     | Normal - standard                                                          | viewState.dialogDefaults.cherryPick.recordOrigin を反映                | -                                 |
| TC-019  | No Commit checkbox デフォルト値                         | Normal - standard                                                          | viewState.dialogDefaults.cherryPick.noCommit を反映                    | -                                 |
| TC-020  | callback で recordOrigin, noCommit 取得、確定ボタン押下 | Normal - standard                                                          | RequestCherrypickCommit に recordOrigin, noCommit が含まれる           | sendMessage 検証                  |
| TC-021  | Record Origin / No Commit checkbox の構成               | Normal - standard                                                          | 両 checkbox に info プロパティ（ツールチップテキスト）が設定されている | -                                 |

## S4: Create Worktree Here ダイアログ

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**テスト対象パス**: `web/commitMenu.ts`

| Case ID | Input / Precondition                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                             | Notes             |
| ------- | ------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------- |
| TC-022  | Create Worktree Here メニュー項目選択 | Normal - standard                                                          | showFormDialog が Branch Name (text-ref) + Path (text) + Open Terminal (checkbox) の 3 フィールドで呼ばれる | REQ-3.1, REQ-3.3  |
| TC-023  | Branch Name フィールドが空            | Boundary - empty name                                                      | text-ref バリデーションにより送信ボタンが無効化される                                                       | REQ-3.1-TC3       |
| TC-024  | Path デフォルト値                     | Normal - standard                                                          | `../<repoName>-` 形式（ブランチ名入力前）                                                                   | REQ-3.3           |
| TC-025  | Open Terminal デフォルト値            | Normal - standard                                                          | dialogDefaults.createWorktree.openTerminal を反映（S5 TC-029 で詳細検証）                                   | REQ-3.3-TC4, → S5 |
| TC-026  | 有効入力で送信                        | Normal - standard                                                          | RequestCreateWorktree に repo, path, branchName, commitHash, openTerminal が含まれる                        | REQ-3.1           |
| TC-027  | Branch Name 入力時の Path 動的更新    | Normal - dynamic                                                           | Branch Name 入力に連動して Path が `../<repoName>-<branchName>` に更新される                                | REQ-3.3           |
| TC-028  | Path 手動編集後に Branch Name を変更  | Boundary - manual edit                                                     | ユーザーが Path を手動編集した後は Branch Name 変更時に Path が自動更新されない                             | UX: 手動編集優先  |

## S5: Create Worktree Here openTerminal 設定参照（commit 起点）

> Origin: Feature 023 (worktree-dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-25
> Status: active
> Supersedes: -

**シグネチャ**: `commitMenu item onClick → showFormDialog (Create Worktree Here)`
**テスト対象パス**: `web/commitMenu.ts:85-89`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                          | Notes                           |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------- |
| TC-029  | viewState.dialogDefaults.createWorktree.openTerminal = true  | Normal - standard                                                          | showFormDialog の第2引数の index 2 チェックボックス要素の value が true  | TC-025 を設定参照パターンに拡張 |
| TC-030  | viewState.dialogDefaults.createWorktree.openTerminal = false | Normal - standard                                                          | showFormDialog の第2引数の index 2 チェックボックス要素の value が false | 新規: false パターン追加        |

> **境界値候補の省略理由**: `viewState.dialogDefaults.createWorktree.openTerminal` は extension host が `config.ts` 経由で常に boolean 値を設定するため、null / undefined / empty は仕様上発生しない。boolean の完全なドメイン（true / false）は Normal ケースで網羅済み。

## S6: Create Worktree Here パス正規化

> Origin: Feature 024 (worktree-path-normalize) (aidd-spec-tasks-test)
> Added: 2026-03-27
> Status: active
> Supersedes: -

**テスト対象パス**: `web/commitMenu.ts:106-113`

| Case ID | Input / Precondition                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                  | Notes                                |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------ |
| TC-031  | Branch Name 入力 "feature/x"、Path 未編集                            | Normal - standard                                                          | Path が `../<repoName>-feature-x` に更新される                                                   | REQ-9.3: 正規化適用                  |
| TC-032  | Branch Name 入力 "a/b/c"、Path 未編集                                | Normal - standard                                                          | Path が `../<repoName>-a-b-c` に更新される                                                       | REQ-9.3: 複数スラッシュの正規化      |
| TC-033  | Branch Name 変更 "a/b" → "c/d"、Path 未編集                          | Normal - dynamic                                                           | expectedPath が sanitize("a/b") = "a-b" で計算され一致、Path が `../<repoName>-c-d` に更新される | REQ-9.3: lastBranchName は生の値保持 |
| TC-034  | Branch Name "feature/x" 入力後、Path 手動編集、再度 Branch Name 変更 | Boundary - manual edit                                                     | 手動編集後の Path が保持される（自動更新されない）                                               | REQ-9.3: 正規化下での手動編集検出    |

> **境界値候補の省略理由**: パス入力フィールドの値は文字列結合で構成され、正規化チェーン中に null / undefined は発生しない。手動編集検出（TC-034）が正規化下での主要な境界ケースである。

## S7: Context menu 整理対応 (032)

> Origin: Feature 032 (context-menu-reorg) Task 7
> Added: 2026-04-30
> Status: active
> Supersedes: -

**シグネチャ**: `buildCommitContextMenuItems(repo: string, hash: string, parentHashes: string[], commits: GitCommitNode[], commitLookup: { [hash: string]: number }, sourceElem: HTMLElement): ContextMenuElement[]`
**テスト対象パス**: `web/commitMenu.ts`

| Case ID | Input / Precondition                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                 | Notes                    |
| ------- | ------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| TC-035  | parentHashes が 1 件の通常コミット   | Normal - ordered layout                                                    | 戻り値が 8 要素で、index 0-3 が `Create Branch...`, `Create Worktree Here...`, `Cherry Pick...`, `Merge into current branch...` | 上段の高頻度項目         |
| TC-036  | 同上                                 | Validation - submenu contents                                              | index 5 が `title === "More..."` の submenu で、child titles が `Add Tag...`, `Checkout...`, `Revert...`, `Reset...` の順       | 低頻度・破壊的操作の集約 |
| TC-037  | parentHashes が 2 件のマージコミット | Normal - moved action path                                                 | `More...` 配下の `Revert...` と上段の `Cherry Pick...` の `onClick` が、既存どおり merge commit 向けダイアログ経路を呼ぶ        | 既存挙動保持             |
| TC-038  | 通常コミット                         | Boundary - divider placement                                               | `null` が連続せず、先頭と末尾が `null` でなく、末尾が `Copy Commit Hash to Clipboard` である                                    | 区切り線ルール           |

## S8: Recent actions 識別子と保存トリガー

> Origin: Feature 034 (context-menu-recent-actions) Task 4
> Added: 2026-05-02
> Status: active
> Supersedes: -
> Signature: `buildCommitContextMenuItems(repo: string, hash: string, parentHashes: string[], commits: GitCommitNode[], commitLookup: { [hash: string]: number }, sourceElem: HTMLElement): ContextMenuElement[]`
> Target Path: `web/commitMenu.ts`

| Case ID | Input / Precondition                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                    | Notes                        |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| TC-039  | 通常コミット menu を構築                          | Normal - recent ids on top-level                                           | `Create Branch...`, `Create Worktree Here...`, `Cherry Pick...`, `Merge into current branch...` の各 item に対応する `recentActionId` が付与される | commit 上段 4 項目           |
| TC-040  | 通常コミット menu の `More...` submenu を確認     | Validation - target-only tagging                                           | `Add Tag...` のみ `recentActionId = "commit.addTag"` を持ち、`Checkout...` / `Revert...` / `Reset...` は recent 対象外のまま                       | destructive / detached 除外  |
| TC-041  | `Create Branch...` ダイアログ submit              | Normal - record before send                                                | submit callback 実行時に `recordRecentAction(repo, "commit.createBranch")` が `sendMessage(RequestCreateBranch)` より先に 1 回呼ばれる             | 呼出順保証                   |
| TC-042  | `Add Tag...` menu item を押してダイアログ表示のみ | Boundary - dialog cancel                                                   | `showFormDialog` は開くが、submit callback 未実行の時点では `recordRecentAction(...)` は呼ばれない                                                 | キャンセルで履歴を増やさない |

## S9: Create Branch ダイアログ翻訳キー (Feature 040)

> Origin: Feature 040 (settings-and-copy-polish) (light-spec-plan)
> Added: 2026-05-17
> Status: active
> Supersedes: -
> Signature: `buildCommitContextMenuItems(...)`
> Target Path: `web/commitMenu.ts`

commit 起点の Create Branch ダイアログプロンプトが、stash 起点とは別の翻訳キーを使用していることを検証する。

| Case ID | Input / Precondition                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                            | Notes                                 |
| ------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------- |
| TC-043  | webviewMessages に commit-origin 翻訳を注入した状態で Create Branch onClick → showFormDialog 確認 | Normal - localized prompt                                                  | プロンプト文字列が「コミット」「作成するブランチ名を入力してください」を含む日本語訳になる | commit 起点キーが利用されることの保証 |

## S10: Merge parent option plain text 生成 (Feature 041)

> Origin: Feature 041 (refresh-contention-and-dialog-escape) (light-spec-plan)
> Added: 2026-05-22
> Status: active
> Supersedes: -
> Signature: `buildMergeParentOptions(parentHashes: string[], commits: GitCommitNode[], commitLookup: { [hash: string]: number }): { name: string; value: string }[]`
> Target Path: `web/commitMenu.ts`

cherry-pick / revert の merge parent 選択 dialog に渡す option を共通 helper で生成し、親コミットメッセージは plain text として `DialogSelectInput.options[].name` に渡される。helper は HTML を含めない。エスケープは `web/dialogs.ts` の描画境界で行うため、helper 側で escape はしない (二重エンコード防止)。

| Case ID | Input / Precondition                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                               | Notes                     |
| ------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| TC-044  | parentHashes 2 件、両親が commitLookup に存在し message を持つ                       | Normal - dual parent labels                                                | option name が `<abbrevHash>: <message>` 形式、value が `"1"` / `"2"`                                                                                         | cherry-pick / revert 共通 |
| TC-045  | parentHashes 1 件が commitLookup 未登録                                              | Boundary - missing commitLookup entry                                      | 該当 option name が `<abbrevHash>` のみ（message 部分なし、`: ` 接尾辞なし）                                                                                  | lookup 欠落時の plain 化  |
| TC-046  | parent message に `<img onerror=alert(1)>`、`</option><script>` などの危険文字を含む | Boundary - hostile parent message                                          | cherry-pick の `showFormDialog`、revert の `showSelectDialog` 双方の options 配列に message が plain text のまま渡され、HTML エスケープ済み文字列にはならない | helper は escape しない   |
| TC-047  | cherry-pick と revert で同じ parentHashes / commits / commitLookup を渡す            | Normal - helper reuse                                                      | 両経路の option 配列が deep-equal で一致する                                                                                                                  | 共通 helper 経由を確認    |

## S11: Cherry Pick / Revert の root commit 分岐（parentHashes.length <= 1）

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `buildCommitContextMenuItems()` 内 Cherry Pick / Revert の onClick 分岐
> Target Path: `web/commitMenu.ts:190, 247`

Cherry Pick / Revert の通常コミット判定を `parentHashes.length === 1` から `parentHashes.length <= 1` へ変更する修正。親のないルートコミット（`length === 0`）が merge 分岐へ入り、`buildMergeParentOptions([])` による選択肢ゼロの `<select>` が描画される [9] を解消する。2親以上の merge parent option 生成は変更しない。

| Case ID | Input / Precondition                                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                | Notes                           |
| ------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| TC-048  | `parentHashes = []`（root commit）で Cherry Pick の onClick を実行し、確定送信 | Boundary - root commit の通常フォーム（cherry pick）                       | `showFormDialog` が checkbox 2件のみ（`select` 要素なし）で呼ばれ、送信される `RequestCherrypickCommit` の `parentIndex` が `0` になる         | 空 select が描画されない        |
| TC-049  | `parentHashes = []`（root commit）で Revert の onClick を実行し、確定送信      | Boundary - root commit の確認ダイアログ（revert）                          | `showConfirmationDialog` が呼ばれ（`select` を含む form dialog は呼ばれない）、送信される `RequestRevertCommit` の `parentIndex` が `0` になる | `parseInt("") = NaN` 送信の解消 |
| TC-050  | `parentHashes` 2件のマージコミットで Cherry Pick の onClick を実行             | Normal - merge 分岐の維持                                                  | `buildMergeParentOptions` 由来の options 2件を持つ `select` + checkbox 2件で `showFormDialog` が呼ばれ、選択値が `parentIndex` に反映される    | 2親以上の既存経路の退行なし     |

### 失敗源インベントリ（include-or-justify）— Feature 045 追加分（S11）

| 失敗源                                           | 対応ケースまたは除外理由                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| root commit で空の親選択 `<select>` が描画される | TC-048（cherry pick）、TC-049（revert）                                                  |
| `parseInt("", 10) = NaN` の `parentIndex` 送信   | TC-048、TC-049（`parentIndex` が `0` であることを検証）                                  |
| merge commit の parentIndex 選択の喪失（NO-GO）  | TC-050                                                                                   |
| 拡張ホスト側の `Invalid parent index.` 検証      | excluded(host 側の `Number.isInteger` 検証は既存挙動で `src/dataSource.ts` owner の責務) |
| 1親の通常コミット分岐                            | excluded(既存 S3 TC-016 / S10 で担保済み。`length === 1` の挙動は本変更で不変)           |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(本変更は分岐条件の境界のみで、入力検証分岐を追加しない)
- Exception: excluded(throw 経路が存在しない)
- External: excluded(外部依存なし。sendMessage はモックで観測)
- Boundary: TC-048、TC-049
- Type: excluded(`parentHashes` は `string[]` 型で TypeScript コンパイル時に保証される)

数値境界のうち本変更に意味があるのは `parentHashes.length` の `0`（TC-048/TC-049）・`1`（既存 S3/S10 で担保）・`2`（TC-050）であり、maximum / +/-1 のその他の値は同一分岐のため対象外とする。

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-050)、失敗系2件（TC-048、TC-049）、比2.0。
