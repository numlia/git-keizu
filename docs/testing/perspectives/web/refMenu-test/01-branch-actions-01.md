# テスト観点表: web/refMenu.ts

> Source: `web/refMenu.ts`
> Generated: 2026-08-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: branch-actions

## S1: checkoutBranchAction() ブランチ名提案ロジック

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 2.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**シグネチャ**: `checkoutBranchAction(repo: string, sourceElem: HTMLElement, refName: string, isRemoteCombined?: boolean): void`
**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes                                |
| ------- | -------------------------------- | -------------------------------------------------------------------------- | --------------- | ------------------------------------ |
| TC-001  | refName = "origin/feature/ebook" | Normal - 2階層                                                             | "feature/ebook" | 最初のスラッシュ以降を取得           |
| TC-002  | refName = "origin/main"          | Normal - 1階層                                                             | "main"          | リモート名のみ除去                   |
| TC-003  | refName = "origin/a/b/c"         | Normal - 3階層                                                             | "a/b/c"         | 深いネスト対応                       |
| TC-004  | refName = "upstream/feature/x"   | Normal - 別リモート                                                        | "feature/x"     | originではないリモート名             |
| TC-005  | refName = "origin"               | Boundary - スラッシュなし                                                  | "" (空文字列)   | 仕様上通常は発生しないが防御的に処理 |
| TC-006  | refName = "o/x"                  | Boundary - min (最短パス)                                                  | "x"             | 1文字リモート名 + 1文字ブランチ名    |

## S2: buildRefContextMenuItems() Pull/Pushメニュー項目

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 3.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**シグネチャ**: `buildRefContextMenuItems(repo: string, refName: string, sourceElem: HTMLElement, isRemote: boolean, gitBranchHead: string | null): (ContextMenuElement | null)[]`
**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                     | Notes                        |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------- | ---------------------------- |
| TC-007  | gitBranchHead === refName (カレントブランチ)   | Normal - standard                                                          | メニューにPull/Push項目が含まれる   | メニュー先頭に配置           |
| TC-008  | Pull/Push項目のタイトル                        | Normal - standard                                                          | "Pull" と "Push"                    | 表示文言の確認               |
| TC-009  | gitBranchHead !== refName (非カレントブランチ) | Normal - exclusion                                                         | メニューにPull/Push項目が含まれない | カレントブランチのみ表示     |
| TC-010  | refType === "remote" (リモートブランチ)        | Normal - exclusion                                                         | メニューにPull/Push項目が含まれない | ローカルカレントブランチのみ |

## S3: parseRemoteRef() リモート名分離ユーティリティ

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**シグネチャ**: `parseRemoteRef(refName: string): { remoteName: string; branchName: string }`
**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                     | Notes                                   |
| ------- | ----------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------- |
| TC-011  | refName = "origin/feature/x"        | Normal - 2階層                                                             | { remoteName: "origin", branchName: "feature/x" }                   | 最初のスラッシュで分割                  |
| TC-012  | refName = "origin/main"             | Normal - 1階層                                                             | { remoteName: "origin", branchName: "main" }                        | リモート名のみ除去                      |
| TC-013  | refName = "upstream/a/b/c"          | Normal - 深いネスト                                                        | { remoteName: "upstream", branchName: "a/b/c" }                     | 2つ目以降のスラッシュはブランチ名に含む |
| TC-014  | refName = "o/x"                     | Boundary - min (最短パス)                                                  | { remoteName: "o", branchName: "x" }                                | 1文字リモート + 1文字ブランチ           |
| TC-015  | refName = "origin" (スラッシュなし) | Boundary - no separator                                                    | { remoteName: "origin", branchName: "" } または適切なフォールバック | 仕様上通常は発生しない                  |

## S4: buildRefContextMenuItems() リモートブランチメニュー項目

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                   | Notes                           |
| ------- | ----------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------- |
| TC-016  | sourceElem がリモートブランチ | Normal - standard                                                          | メニューに "Delete Remote Branch..." 項目が含まれる               | -                               |
| TC-017  | sourceElem がリモートブランチ | Normal - standard                                                          | メニューに "Merge into current branch..." 項目が含まれる          | 既存 mergeBranch コマンド再利用 |
| TC-018  | sourceElem がローカルブランチ | Normal - exclusion                                                         | メニューに "Delete Remote Branch..." が含まれない                 | ローカルには不要                |
| TC-019  | Delete Remote Branch 選択     | Normal - standard                                                          | 確認ダイアログが表示される                                        | showConfirmationDialog          |
| TC-020  | Merge (remote) 選択           | Normal - standard                                                          | チェックボックスダイアログ（fast-forward オプション）が表示される | showCheckboxDialog              |

## S5: buildRefContextMenuItems() Rebase メニュー項目

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                | Notes                      |
| ------- | --------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------- |
| TC-021  | sourceElem がローカルブランチ（非HEAD） | Normal - standard                                                          | メニューに "Rebase current branch on Branch..." 項目が含まれる | gitBranchHead !== refName  |
| TC-022  | sourceElem が HEAD ブランチ             | Normal - exclusion                                                         | メニューに "Rebase..." が含まれない                            | 自分自身へのリベースは不可 |
| TC-023  | sourceElem がリモートブランチ           | Normal - exclusion                                                         | メニューに "Rebase..." が含まれない                            | ローカルブランチのみ       |
| TC-024  | Rebase 選択                             | Normal - standard                                                          | 確認ダイアログが表示される                                     | showConfirmationDialog     |

## S6: Delete Branch ダイアログ拡張（リモート同時削除）

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `web/refMenu.ts`

| Case ID | Input / Precondition                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                         | Notes               |
| ------- | ----------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------- |
| TC-025  | remotes = ["origin"] (リモートあり) | Normal - standard                                                          | showFormDialog: "Force Delete" + "Delete this branch on the remote" の2チェックボックス | showFormDialog 切替 |
| TC-026  | remotes = [] (リモートなし)         | Normal - no remote                                                         | showCheckboxDialog: "Force Delete" のみ（既存動作維持）                                 | 後方互換            |
| TC-027  | リモート削除チェック ON             | Normal - standard                                                          | sendMessage に deleteOnRemotes: remotes が含まれる                                      | -                   |
| TC-028  | リモート削除チェック OFF            | Normal - standard                                                          | sendMessage に deleteOnRemotes: [] が含まれる                                           | デフォルト動作      |

## S7: Merge ダイアログ拡張（3 checkbox フォーム）

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**テスト対象パス**: `web/refMenu.ts:30-55`

| Case ID | Input / Precondition                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                      | Notes                         |
| ------- | ------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------- |
| TC-029  | buildMergeBranchMenuItem 選択        | Normal - standard                                                          | showFormDialog が 3 checkbox（No FF / Squash / No Commit）で呼ばれる | showCheckboxDialog からの変更 |
| TC-030  | 3 checkbox のデフォルト値            | Normal - standard                                                          | viewState.dialogDefaults.merge の各フィールド値を反映                | commitMenu と同一構成         |
| TC-031  | callback で 3 値取得、確定ボタン押下 | Normal - standard                                                          | RequestMergeBranch に createNewCommit, squash, noCommit が含まれる   | sendMessage 検証              |
| TC-032  | Squash / No Commit checkbox の構成   | Normal - standard                                                          | info プロパティ（ツールチップテキスト）が設定されている              | commitMenu と同一テキスト     |

## S17: Push の operationId 生成と remote 選択ダイアログ

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: -
> Signature: `buildRefContextMenuItems()` 内 Push item の `onClick` / `showPushRemoteDialog(repo: string, operationId: string, remotes: string[], defaultRemote: string): void`
> Target Path: `web/refMenu.ts`（Push menu item と `showPushRemoteDialog()`。実装後に行範囲へ更新）
> Test File: `tests/web/refMenu.test.ts`

Push 確認の確定時に `crypto.randomUUID()` で `operationId` を 1 回生成し、`selectedRemote: null` の初回 Request を送る変更と、host からの `selectRemote` phase を既存 `showSelectDialog()` で提示する `showPushRemoteDialog()` の観点。選択確定時だけ同じ `operationId` と選択値で 2 通目を送り、cancel 時は既存 dialog 契約どおり callback が発火しないため送信も記録も起きない。Response の phase 判定と委譲は `web/messageHandler-test.md` S12、host 側の再検証は `src/gitGraphView-test/01-message-routing-03.md` S28 の責務。

| Case ID | Input / Precondition                                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                        | Notes                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| TC-081  | HEAD menu の `Push` を選択し、確認ダイアログを承認（`crypto.randomUUID()` が `"op-1"` を返すよう stub）                   | Normal - 初回 Request                                                      | `crypto.randomUUID()` が 1 回呼ばれ、`sendMessage` が `{ command: "push", repo, operationId: "op-1", selectedRemote: null }` で 1 回呼ばれる                                                           | 一意 ID の付与           |
| TC-082  | 同条件                                                                                                                    | Normal - 記録順序の維持                                                    | `recordRecentAction(repo, "ref.push")` が 1 回、`sendMessage` より先に呼ばれる                                                                                                                         | 既存契約の維持           |
| TC-083  | `Push` の確認ダイアログを cancel（callback 未呼び出し）                                                                   | Boundary - cancel path                                                     | `sendMessage` / `crypto.randomUUID` / `recordRecentAction` の call count がいずれも 0                                                                                                                  | 送信しない               |
| TC-084  | `showPushRemoteDialog(repo, "op-1", ["origin", "upstream"], "upstream")` を呼ぶ                                           | Normal - 選択ダイアログの構成                                              | `showSelectDialog` が options `[{ name: "origin", value: "origin" }, { name: "upstream", value: "upstream" }]`、defaultValue `"upstream"`、action label `t("push.selectRemoteAction")` で 1 回呼ばれる | host Response と完全一致 |
| TC-085  | 同 dialog の callback へ `"upstream"` が渡る                                                                              | Normal - 2 通目 Request                                                    | `sendMessage` が `{ command: "push", repo, operationId: "op-1", selectedRemote: "upstream" }` で 1 回呼ばれる                                                                                          | operationId の引き継ぎ   |
| TC-086  | 同 dialog を cancel（callback 未呼び出し）                                                                                | Boundary - cancel path                                                     | `sendMessage` の call count が 0（2 通目が送られない）                                                                                                                                                 | cancel で Push しない    |
| TC-087  | `showPushRemoteDialog(repo, "op-1", ["origin"], "origin")` を呼び、callback を発火させない                                | Boundary - 選択肢 1 件                                                     | default 表示だけでは `sendMessage` が呼ばれない（call count 0）                                                                                                                                        | 自動確定しない           |
| TC-088  | `showPushRemoteDialog(repo, "op-1", ...)` の後に `showPushRemoteDialog(repo, "op-2", ...)` を呼び、後者の callback を確定 | Normal - 相関 ID の引き継ぎ                                                | `sendMessage` の `operationId` が `"op-2"` である（`"op-1"` を再利用しない）                                                                                                                           | 連続操作                 |
| TC-089  | 選択ダイアログの callback を確定                                                                                          | Validation - 二重記録の防止                                                | `recordRecentAction` の call count が 0（記録は確認確定時の 1 回のみ）                                                                                                                                 | 記録は初回だけ           |

### 失敗源インベントリ（include-or-justify）— Feature 047 追加分（S17）

| 失敗源                                                       | 対応ケースまたは除外理由                                                                                                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cancel 時の送信（確認ダイアログ / 選択ダイアログ）           | TC-083、TC-086                                                                                                                                                        |
| default 表示を選択確定と誤認して先に送信する                 | TC-087                                                                                                                                                                |
| operationId の欠落・再生成・取り違え                         | TC-081、TC-085、TC-088                                                                                                                                                |
| Recent action の二重記録・記録順序の逆転                     | TC-082、TC-089                                                                                                                                                        |
| 選択肢 / default の取り違え（host Response との不一致）      | TC-084                                                                                                                                                                |
| 各分岐の negative 側（確定時のみ送信される）                 | TC-081、TC-085                                                                                                                                                        |
| 境界値（選択肢 1 件）                                        | TC-087                                                                                                                                                                |
| 境界値（選択肢 0 件）                                        | excluded(空一覧は host が `noRemotes` phase を返すため dialog が呼ばれない。表示は `web/messageHandler-test.md` S12 TC-041 の責務)                                    |
| 境界値（0 / minimum / maximum / +/-1 / NULL / empty 文字列） | excluded(引数は文字列と配列のみで数値境界を持たない。空 remote 名は host が Push へ渡さないことを `src/gitGraphView-test/01-message-routing-03.md` S28 TC-119 で担保) |
| 外部依存の失敗                                               | excluded(webview 内の関数呼び出しのみで外部依存を持たない。Git 実行結果の表示は `web/messageHandler-test.md` S12 の責務)                                              |
| 例外送出                                                     | excluded(menu callback に throw 経路がなく、dialog 基盤は `web/dialogs-test.md` owner の責務)                                                                         |
| 不正な型・フォーマット                                       | excluded(`RequestPush` の必須 field は `src/types-test.md` S3 TC-015〜TC-018 の型検査で担保)                                                                          |
| 未登録・unsafe な remote の選択                              | excluded(選択肢は host Response 由来で、membership と形式の再検証は S28 TC-116 / TC-119 の責務)                                                                       |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-089
- Exception: excluded(throw 経路が存在しない)
- External: excluded(外部依存なし)
- Boundary: TC-083、TC-086、TC-087
- Type: excluded(型契約は `src/types-test.md` S3 の責務)

**失敗系/正常系比（煙感知器）**: 正常系5件（TC-081、TC-082、TC-084、TC-085、TC-088）、失敗系4件（TC-083、TC-086、TC-087、TC-089）。件数が近いためインベントリを再導出したが、本セクションの失敗源は cancel 経路・自動確定・二重記録・ID 取り違えに限られ、Git 実行と型の失敗源はいずれも他 owner（S28 / S12 / `src/types-test.md` S3）へ割り当て済みであることを確認した。

## S18: getPendingPushRepo() 二段階 Push の repository 引き継ぎ

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-04
> Status: superseded
> Supersedes: -
> Superseded By: S19
> Signature: `getPendingPushRepo(): string`
> Target Path: `web/refMenu.ts`（module 内 `pendingPushRepo` と `getPendingPushRepo()`）
> Test File: `tests/web/refMenu.test.ts`

`ResponsePush` は repository path を持たないため、初回 Request の repository を module 内 `pendingPushRepo` に保持し `getPendingPushRepo()` で取り出す設計（Task 5 の実装上の逸脱）。`web/messageHandler-test.md` S12 TC-040 はこの関数を mock で置換するので、「Push 確認確定 → repository 保持 → 取り出し」の配線自体はどの既存 case からも検証されていない。ここが壊れると 2 通目の Push Request が別 repository 宛に送られるため、mock ではなく実 module の配線を固定する。初回 Request の payload と operationId は S17、選択後 Request の委譲は `web/messageHandler-test.md` S12 の責務。

| Case ID | Input / Precondition                                                                                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                               | Notes                             |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| TC-090  | repo = `/test/other-repo`（他 case が使う `/test/repo` とは別の値）の HEAD menu で `Push` を選択し確認ダイアログを承認したあと、実 module の `getPendingPushRepo()` を呼ぶ | Normal - repository の引き継ぎ                                             | 戻り値が `/test/other-repo` であり、同じ確定で送られた初回 Request の `repo` field と一致する（他 case が残した module state では成立しない） | mock ではなく実 module の配線検証 |

### 失敗源インベントリ（include-or-justify）— Feature 047 追補分（S18）

| 失敗源                                        | 対応ケースまたは除外理由                                                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 二段階 Push 間で repository を取り違える      | TC-090                                                                                                                                       |
| cancel 時に repository が更新される           | excluded(保持は確認確定 callback 内の同一分岐で、cancel 経路で callback が発火しないことは S17 TC-083 が call count 0 で担保)                |
| 連続 Push で古い repository が残る            | excluded(確定ごとに無条件で上書きする単一分岐であり、TC-090 と同一経路。operationId 側の連続操作は S17 TC-088 が担保)                        |
| 境界値（未 Push 時の初期値が空文字）          | excluded(module state を共有する他 case の実行順に依存し観測を安定させられない。空 repository の Request は host 側の repo guard が拒否する) |
| 境界値（0 / minimum / maximum / +/-1 / NULL） | excluded(値は repository path 文字列のみで数値境界を持たない)                                                                                |
| 外部依存の失敗                                | excluded(webview 内の module state 参照のみで外部依存を持たない)                                                                             |
| 例外送出                                      | excluded(getter に throw 経路が存在しない)                                                                                                   |
| 不正な型・フォーマット                        | excluded(戻り値は `string` で型分岐を持たない)                                                                                               |
| 未登録・unsafe な remote への Push            | excluded(membership と形式の再検証は `src/gitGraphView-test/01-message-routing-03.md` S28 TC-116 / TC-119 の責務)                            |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(getter に検証分岐が存在しない。取り違えの検出は TC-090 の値一致検証に含まれる)
- Exception: excluded(throw 経路が存在しない)
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界がなく、初期値の観測は実行順依存のため除外)
- Type: excluded(型契約は `src/types-test.md` S3 の責務)

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-090）、失敗系0件。本セクションは既存 case が mock で置換していた配線 1 本だけを対象とする追補で、cancel・連続操作・membership 再検証といった失敗源はいずれも S17 / S28 へ割り当て済みであることを確認した。

## S19: showPushRemoteDialog() の repository 引数を 2 通目 Request へ引き継ぐ

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-04
> Status: active
> Supersedes: S18
> Signature: `showPushRemoteDialog(repo: string, operationId: string, remotes: string[], defaultRemote: string): void`
> Target Path: `web/refMenu.ts`（`showPushRemoteDialog()` の select dialog callback）
> Test File: `tests/web/refMenu.test.ts`

`ResponsePush` へ `repo` が必須追加され、module 内 `pendingPushRepo` と `getPendingPushRepo()` が撤去されたことに伴う置き換え観点。S18 は撤去された `getPendingPushRepo()` の配線を対象としていたため supersede する。repository は host Response から `web/messageHandler.ts` を経て引数として渡るだけになるので、module state が介在しないこと——すなわち異なる repository の dialog を続けて開いても各 callback が自分の引数を送ること——を実 module で固定する。単一 dialog の callback payload は S17 TC-085、委譲元が `msg.repo` を渡すことは `web/messageHandler-test.md` S14 TC-050 の責務。

| Case ID | Input / Precondition                                                                                                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                       | Notes                       |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| TC-091  | `showPushRemoteDialog("/test/repo", "op-1", ["origin"], "origin")` の直後に `showPushRemoteDialog("/test/other-repo", "op-2", ["origin"], "origin")` を呼び、両方の callback を確定させる | Normal - repository の引き継ぎ                                             | 2 通の `sendMessage` の `repo` がそれぞれ `"/test/repo"` と `"/test/other-repo"` であり、後から開いた dialog が先の repository を上書きしない（`operationId` も対応する値を保持する） | module state 撤去の直接検証 |

### 失敗源インベントリ（include-or-justify）— Feature 047 P3 修正分（S19）

| 失敗源                                        | 対応ケースまたは除外理由                                                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 連続する dialog 間で repository を取り違える  | TC-091                                                                                                                             |
| 委譲元が別 repository を渡す                  | excluded(`web/messageHandler-test.md` S14 TC-050 が `msg.repo` の受け渡しを担保)                                                   |
| 単一 dialog の callback payload の誤り        | excluded(S17 TC-085 が `repo` / `operationId` / `selectedRemote` を担保)                                                           |
| cancel 時の送信                               | excluded(S17 TC-086、TC-087 が call count 0 を担保)                                                                                |
| 境界値（0 / minimum / maximum / +/-1 / NULL） | excluded(引数は文字列と配列のみで数値境界を持たない)                                                                               |
| 境界値（空 repository 文字列）                | excluded(`repo` は host Response 由来の必須 field で、空値は `src/types-test.md` S4 TC-041 の型必須化と host の repo guard が防ぐ) |
| 外部依存の失敗・例外送出                      | excluded(webview 内の関数呼び出しのみで外部依存も throw 経路も持たない)                                                            |
| 不正な型・フォーマット                        | excluded(型契約は `src/types-test.md` S4 の責務)                                                                                   |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(dialog 側に検証分岐がなく、取り違えの検出は TC-091 の値一致検証に含まれる)
- Exception: excluded(throw 経路が存在しない)
- External: excluded(外部依存なし)
- Boundary: excluded(数値境界がなく、cancel と選択肢1件は S17 TC-086 / TC-087 が担保)
- Type: excluded(型契約は `src/types-test.md` S4 の責務)

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-091）、失敗系0件。本セクションは撤去された module state の置き換え配線 1 本だけを対象とする追補で、cancel・自動確定・型の失敗源はいずれも S17 と `src/types-test.md` S4 へ割り当て済みであることを確認した。
