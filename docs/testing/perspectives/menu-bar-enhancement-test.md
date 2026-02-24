# テスト観点表: メニューバー強化

> Generated: 2026-02-24T20:00:00Z
> Origin: AIDD pipeline (aidd-spec-tasks-test)
> Spec: `notes/features/001-menu-bar/`

---

## 対象: Task 1.2 Foundation テスト（定数・型定義・アイコン検証）

| Case ID   | Input / Precondition                                | Perspective (Equivalence / Boundary) | Expected Result                | Notes                                          |
| --------- | --------------------------------------------------- | ------------------------------------ | ------------------------------ | ---------------------------------------------- |
| TC-F-N-01 | UNCOMMITTED_CHANGES_HASH 定数を参照                 | Equivalence - normal                 | 値が `"*"` と一致する          | 既存のハードコード値との互換性保証             |
| TC-F-N-02 | VALID_UNCOMMITTED_RESET_MODES を参照                | Equivalence - normal                 | `"mixed"` を含む               | -                                              |
| TC-F-N-03 | VALID_UNCOMMITTED_RESET_MODES を参照                | Equivalence - normal                 | `"hard"` を含む                | -                                              |
| TC-F-B-01 | VALID_UNCOMMITTED_RESET_MODES のサイズ              | Boundary - exact count               | Set のサイズが 2 である        | "soft" は含まないことの間接検証                |
| TC-F-A-01 | VALID_UNCOMMITTED_RESET_MODES に `"soft"` で has()  | Equivalence - invalid                | `false` を返す                 | Uncommitted リセットでは soft は意味をなさない |
| TC-F-A-02 | VALID_UNCOMMITTED_RESET_MODES に `""` で has()      | Boundary - empty                     | `false` を返す                 | -                                              |
| TC-F-A-03 | VALID_UNCOMMITTED_RESET_MODES に `"MIXED"` で has() | Boundary - case sensitivity          | `false` を返す                 | 大文字は受け付けない                           |
| TC-F-N-04 | svgIcons.fetch を参照                               | Equivalence - normal                 | 空でない文字列で `<svg` を含む | -                                              |
| TC-F-N-05 | svgIcons.stash を参照                               | Equivalence - normal                 | 空でない文字列で `<svg` を含む | -                                              |

---

## 対象: Task 3.2 スタッシュデータ取得・統合テスト

### getStashes メソッド

| Case ID    | Input / Precondition                                  | Perspective (Equivalence / Boundary) | Expected Result                                                                                                   | Notes                                                    |
| ---------- | ----------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| TC-SD-N-01 | リポジトリに3件のスタッシュが存在                     | Equivalence - normal                 | 3件の GitStash オブジェクト配列を返す。各要素に hash, selector, baseHash, author, email, date, message が含まれる | git reflog のモック出力を使用                            |
| TC-SD-N-02 | リポジトリにスタッシュが存在しない（refs/stash なし） | Boundary - empty                     | 空配列 `[]` を返す（エラーではない）                                                                              | git コマンドが stderr を出力するが空配列にフォールバック |
| TC-SD-B-01 | リポジトリに1件のスタッシュのみ                       | Boundary - min (1 entry)             | 1件の GitStash オブジェクト配列を返す                                                                             | 最小有効件数                                             |
| TC-SD-A-01 | git reflog コマンドが異常終了                         | Equivalence - error                  | 空配列を返すかエラーをスローする（設計に依存）                                                                    | spawn のモックで exit code 非0 をシミュレート            |
| TC-SD-B-02 | reflog 出力にフィールド数不正の行が混在               | Boundary - malformed input           | 不正行はスキップされ、有効行のみパースされる                                                                      | STASH_FORMAT_FIELD_COUNT ガード条件                      |
| TC-SD-B-03 | reflog 出力に親ハッシュが空の行が混在                 | Boundary - empty parent              | 空親行はスキップされ、有効行のみパースされる                                                                      | line[1] === "" ガード条件                                |

### スタッシュ統合ロジック（getCommits 内）

| Case ID    | Input / Precondition                                                  | Perspective (Equivalence / Boundary) | Expected Result                                                      | Notes                                |
| ---------- | --------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------- | ------------------------------------ |
| TC-SI-N-01 | スタッシュの hash がコミット配列内の hash と一致                      | Equivalence - normal                 | 該当コミットノードに stash 情報がアタッチされる                      | hash-to-index ルックアップマップ使用 |
| TC-SI-N-02 | スタッシュの baseHash がコミット配列内の hash と一致（hash は不一致） | Equivalence - normal                 | ベースコミットの直後にスタッシュ行が挿入される                       | 新規コミットノードとして挿入         |
| TC-SI-N-03 | スタッシュの hash も baseHash もコミット配列内に不在                  | Equivalence - out of range           | スタッシュはスキップされ、コミット配列は変更なし                     | 可視範囲外のスタッシュ               |
| TC-SI-N-04 | 同一 baseHash に2件のスタッシュ（日付: 新 > 旧）                      | Equivalence - multiple               | 新しいスタッシュが先（上）、古いスタッシュが後（下）の順で挿入される | 日付降順ソート                       |
| TC-SI-B-02 | スタッシュ 0 件                                                       | Boundary - zero                      | コミット配列がそのまま返される（変更なし）                           | getStashes が空配列を返すケース      |
| TC-SI-N-05 | 3件のスタッシュがそれぞれ異なる baseHash を持つ                       | Equivalence - normal                 | 各 baseHash の直後にそれぞれ挿入される                               | 逆順挿入でインデックス整合性を維持   |

---

## 対象: Task 3.4 スタッシュ描画テスト（行構成・グラフ頂点ロジック）

| Case ID    | Input / Precondition                       | Perspective (Equivalence / Boundary) | Expected Result                                              | Notes                         |
| ---------- | ------------------------------------------ | ------------------------------------ | ------------------------------------------------------------ | ----------------------------- |
| TC-SR-N-01 | commit.stash !== null のコミットノード     | Equivalence - normal                 | 行要素の CSS クラスに `"commit"` と `"stash"` が両方含まれる | -                             |
| TC-SR-N-02 | commit.stash.selector が `"stash@{0}"`     | Equivalence - normal                 | ラベルに `"@{0}"` が表示される（"stash" プレフィックス除去） | selector.substring(5)         |
| TC-SR-N-03 | commit.stash.selector が `"stash@{12}"`    | Boundary - multi-digit index         | ラベルに `"@{12}"` が表示される                              | 2桁インデックス               |
| TC-SR-N-04 | commit.stash !== null のコミットノード     | Equivalence - normal                 | data-hash 属性にスタッシュのコミットハッシュが設定される     | -                             |
| TC-SR-N-05 | commit.stash === null の通常コミットノード | Equivalence - normal (non-stash)     | 行要素の CSS クラスに `"stash"` が含まれない                 | 既存動作が維持される          |
| TC-SR-N-06 | スタッシュコミットの頂点描画               | Equivalence - normal                 | 二重円が描画される（外側: 塗りつぶし、内側: リング）         | graph.ts の描画パラメータ検証 |
| TC-SR-N-07 | 非スタッシュコミットの頂点描画             | Equivalence - normal (non-stash)     | 単一円が描画される（既存動作維持）                           | -                             |

---

## 対象: Task 4.2 バックエンドスタッシュコマンドテスト

### DataSource メソッド

| Case ID    | Input / Precondition                            | Perspective (Equivalence / Boundary) | Expected Result                                           | Notes                   |
| ---------- | ----------------------------------------------- | ------------------------------------ | --------------------------------------------------------- | ----------------------- |
| TC-BS-N-01 | applyStash(repo, "stash@{0}", false)            | Equivalence - normal                 | git args: `["stash", "apply", "stash@{0}"]`               | reinstateIndex = false  |
| TC-BS-N-02 | applyStash(repo, "stash@{0}", true)             | Equivalence - with option            | git args: `["stash", "apply", "--index", "stash@{0}"]`    | reinstateIndex = true   |
| TC-BS-N-03 | popStash(repo, "stash@{1}", false)              | Equivalence - normal                 | git args: `["stash", "pop", "stash@{1}"]`                 | reinstateIndex = false  |
| TC-BS-N-04 | popStash(repo, "stash@{1}", true)               | Equivalence - with option            | git args: `["stash", "pop", "--index", "stash@{1}"]`      | reinstateIndex = true   |
| TC-BS-N-05 | dropStash(repo, "stash@{2}")                    | Equivalence - normal                 | git args: `["stash", "drop", "stash@{2}"]`                | -                       |
| TC-BS-N-06 | branchFromStash(repo, "my-branch", "stash@{0}") | Equivalence - normal                 | git args: `["stash", "branch", "my-branch", "stash@{0}"]` | -                       |
| TC-BS-A-01 | applyStash でコンフリクト発生                   | Equivalence - error                  | エラーメッセージ文字列を返す（null ではない）             | stderr からのメッセージ |
| TC-BS-A-02 | dropStash で不正セレクタ                        | Equivalence - error                  | エラーメッセージ文字列を返す                              | 通常発生しないがガード  |

### GitGraphView メッセージルーティング

| Case ID    | Input / Precondition                  | Perspective (Equivalence / Boundary) | Expected Result                                   | Notes                |
| ---------- | ------------------------------------- | ------------------------------------ | ------------------------------------------------- | -------------------- |
| TC-BS-N-07 | RequestApplyStash メッセージ受信      | Equivalence - normal                 | DataSource.applyStash が正しい引数で呼ばれる      | mute/unmute パターン |
| TC-BS-N-08 | RequestPopStash メッセージ受信        | Equivalence - normal                 | DataSource.popStash が正しい引数で呼ばれる        | mute/unmute パターン |
| TC-BS-N-09 | RequestDropStash メッセージ受信       | Equivalence - normal                 | DataSource.dropStash が正しい引数で呼ばれる       | mute/unmute パターン |
| TC-BS-N-10 | RequestBranchFromStash メッセージ受信 | Equivalence - normal                 | DataSource.branchFromStash が正しい引数で呼ばれる | mute/unmute パターン |

---

## 対象: Task 4.4 スタッシュコンテキストメニューテスト

| Case ID    | Input / Precondition                               | Perspective (Equivalence / Boundary) | Expected Result                                                                                              | Notes                            |
| ---------- | -------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| TC-SC-N-01 | stash !== null のコミット行を右クリック            | Equivalence - normal                 | スタッシュ専用コンテキストメニューが表示される（Apply, Branch, Pop, Drop, セパレータ, Copy Name, Copy Hash） | 通常コミットメニューではないこと |
| TC-SC-N-02 | メニューから "Apply Stash..." を選択               | Equivalence - normal                 | チェックボックスダイアログ（"Reinstate Index"、デフォルト false）が表示される                                | -                                |
| TC-SC-N-03 | Apply ダイアログで Reinstate Index ON で確認       | Equivalence - with option            | applyStash メッセージが reinstateIndex: true で送信される                                                    | -                                |
| TC-SC-N-04 | Apply ダイアログで Reinstate Index OFF で確認      | Equivalence - normal                 | applyStash メッセージが reinstateIndex: false で送信される                                                   | -                                |
| TC-SC-N-05 | メニューから "Pop Stash..." を選択して確認         | Equivalence - normal                 | popStash メッセージが送信される                                                                              | Apply と同一ダイアログパターン   |
| TC-SC-N-06 | メニューから "Drop Stash..." を選択                | Equivalence - normal                 | 確認ダイアログ（削除確認）が表示される                                                                       | -                                |
| TC-SC-N-07 | Drop 確認ダイアログで確認                          | Equivalence - normal                 | dropStash メッセージが送信される                                                                             | -                                |
| TC-SC-N-08 | メニューから "Create Branch from Stash..." を選択  | Equivalence - normal                 | 参照名入力ダイアログ（バリデーション付き）が表示される                                                       | refInvalid バリデーション        |
| TC-SC-N-09 | Branch ダイアログで有効なブランチ名を入力して確認  | Equivalence - normal                 | branchFromStash メッセージが送信される                                                                       | -                                |
| TC-SC-N-10 | メニューから "Copy Stash Name to Clipboard" を選択 | Equivalence - normal                 | copyToClipboard メッセージが type: "Stash Name", data: selector で送信される                                 | ダイアログなし                   |
| TC-SC-N-11 | メニューから "Copy Stash Hash to Clipboard" を選択 | Equivalence - normal                 | copyToClipboard メッセージが type: "Stash Hash", data: hash で送信される                                     | ダイアログなし                   |

---

## 対象: Task 5.2 バックエンド Uncommitted コマンドテスト

### DataSource メソッド

| Case ID    | Input / Precondition                      | Perspective (Equivalence / Boundary)  | Expected Result                                                                  | Notes                                      |
| ---------- | ----------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-BU-N-01 | pushStash(repo, "WIP message", true)      | Equivalence - normal (full options)   | git args: `["stash", "push", "--message", "WIP message", "--include-untracked"]` | メッセージ + untracked                     |
| TC-BU-N-02 | pushStash(repo, "WIP message", false)     | Equivalence - normal (message only)   | git args: `["stash", "push", "--message", "WIP message"]`                        | メッセージのみ                             |
| TC-BU-N-03 | pushStash(repo, "", true)                 | Equivalence - normal (untracked only) | git args: `["stash", "push", "--include-untracked"]`                             | --message フラグなし                       |
| TC-BU-B-01 | pushStash(repo, "", false)                | Boundary - minimal args               | git args: `["stash", "push"]`                                                    | オプションなし                             |
| TC-BU-N-04 | resetUncommitted(repo, "mixed")           | Equivalence - normal                  | git args: `["reset", "--mixed", "HEAD"]`                                         | -                                          |
| TC-BU-N-05 | resetUncommitted(repo, "hard")            | Equivalence - normal                  | git args: `["reset", "--hard", "HEAD"]`                                          | -                                          |
| TC-BU-A-01 | resetUncommitted(repo, "soft")            | Equivalence - invalid mode            | エラーまたは拒否される                                                           | VALID_UNCOMMITTED_RESET_MODES に含まれない |
| TC-BU-A-02 | resetUncommitted(repo, "invalid")         | Equivalence - invalid mode            | エラーまたは拒否される                                                           | 不正な文字列                               |
| TC-BU-A-03 | resetUncommitted(repo, "")                | Boundary - empty                      | エラーまたは拒否される                                                           | 空文字列                                   |
| TC-BU-N-06 | cleanUntrackedFiles(repo, false)          | Equivalence - normal                  | git args: `["clean", "-f"]`                                                      | ディレクトリ除外                           |
| TC-BU-N-07 | cleanUntrackedFiles(repo, true)           | Equivalence - with option             | git args: `["clean", "-f", "-d"]`                                                | ディレクトリ含む                           |
| TC-BU-A-04 | pushStash で git コマンドが失敗           | Equivalence - error                   | エラーメッセージ文字列を返す（null ではない）                                    | stderr からのメッセージ                    |
| TC-BU-A-05 | cleanUntrackedFiles で git コマンドが失敗 | Equivalence - error                   | エラーメッセージ文字列を返す（null ではない）                                    | stderr からのメッセージ                    |

### GitGraphView メッセージルーティング

| Case ID    | Input / Precondition                      | Perspective (Equivalence / Boundary) | Expected Result                                       | Notes                |
| ---------- | ----------------------------------------- | ------------------------------------ | ----------------------------------------------------- | -------------------- |
| TC-BU-N-08 | RequestPushStash メッセージ受信           | Equivalence - normal                 | DataSource.pushStash が正しい引数で呼ばれる           | mute/unmute パターン |
| TC-BU-N-09 | RequestResetUncommitted メッセージ受信    | Equivalence - normal                 | DataSource.resetUncommitted が正しい引数で呼ばれる    | mute/unmute パターン |
| TC-BU-N-10 | RequestCleanUntrackedFiles メッセージ受信 | Equivalence - normal                 | DataSource.cleanUntrackedFiles が正しい引数で呼ばれる | mute/unmute パターン |

---

## 対象: Task 5.4 Uncommitted Changes コンテキストメニューテスト

| Case ID    | Input / Precondition                                            | Perspective (Equivalence / Boundary) | Expected Result                                                                           | Notes                |
| ---------- | --------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- | -------------------- |
| TC-UC-N-01 | Uncommitted Changes 行を右クリック                              | Equivalence - normal                 | Uncommitted 専用コンテキストメニューが表示される（Stash, Reset, Clean）                   | -                    |
| TC-UC-N-02 | メニューから "Stash uncommitted changes..." を選択              | Equivalence - normal                 | フォームダイアログ（メッセージ入力 + Include Untracked チェックボックス）が表示される     | -                    |
| TC-UC-N-03 | Stash ダイアログでメッセージ入力 + Include Untracked ON で確認  | Equivalence - normal                 | pushStash メッセージが message と includeUntracked: true で送信される                     | -                    |
| TC-UC-N-04 | Stash ダイアログでメッセージ空欄 + Include Untracked OFF で確認 | Boundary - empty message             | pushStash メッセージが message: "" と includeUntracked: false で送信される                | --message フラグなし |
| TC-UC-N-05 | メニューから "Reset uncommitted changes..." を選択              | Equivalence - normal                 | 選択ダイアログ（Mixed / Hard の2択）が表示される                                          | -                    |
| TC-UC-N-06 | Reset ダイアログで Mixed を選択して確認                         | Equivalence - normal                 | resetUncommitted メッセージが mode: "mixed" で送信される                                  | -                    |
| TC-UC-N-07 | Reset ダイアログで Hard を選択して確認                          | Equivalence - normal                 | resetUncommitted メッセージが mode: "hard" で送信される                                   | -                    |
| TC-UC-N-08 | メニューから "Clean untracked files..." を選択                  | Equivalence - normal                 | チェックボックスダイアログ（"Clean untracked directories"、デフォルト false）が表示される | -                    |
| TC-UC-N-09 | Clean ダイアログで directories ON で確認                        | Equivalence - with option            | cleanUntrackedFiles メッセージが directories: true で送信される                           | -                    |
| TC-UC-N-10 | Clean ダイアログで directories OFF で確認                       | Equivalence - normal                 | cleanUntrackedFiles メッセージが directories: false で送信される                          | -                    |

---

## 対象: Task 6.2 フェッチ機能テスト

### DataSource メソッド

| Case ID    | Input / Precondition           | Perspective (Equivalence / Boundary) | Expected Result                | Notes                   |
| ---------- | ------------------------------ | ------------------------------------ | ------------------------------ | ----------------------- |
| TC-FT-N-01 | fetch(repo) を実行             | Equivalence - normal                 | git args: `["fetch", "--all"]` | 引数固定                |
| TC-FT-A-01 | fetch でネットワークエラー発生 | Equivalence - error                  | エラーメッセージ文字列を返す   | stderr からのメッセージ |
| TC-FT-N-02 | fetch 成功（status === null）  | Equivalence - normal                 | null を返す                    | GitCommandStatus 型     |

### GitGraphView メッセージルーティング

| Case ID    | Input / Precondition        | Perspective (Equivalence / Boundary) | Expected Result                         | Notes                |
| ---------- | --------------------------- | ------------------------------------ | --------------------------------------- | -------------------- |
| TC-FT-N-03 | RequestFetch メッセージ受信 | Equivalence - normal                 | DataSource.fetch が正しい引数で呼ばれる | mute/unmute パターン |

### Webview フェッチボタン

| Case ID    | Input / Precondition                        | Perspective (Equivalence / Boundary) | Expected Result                                          | Notes                        |
| ---------- | ------------------------------------------- | ------------------------------------ | -------------------------------------------------------- | ---------------------------- |
| TC-FT-N-04 | フェッチボタンをクリック                    | Equivalence - normal                 | fetch メッセージが currentRepo を含んで送信される        | postMessage 呼び出し検証     |
| TC-FT-N-05 | fetch レスポンス status === null            | Equivalence - normal                 | グラフが自動リフレッシュされる（refresh(true) 呼び出し） | -                            |
| TC-FT-A-02 | fetch レスポンス status === "error message" | Equivalence - error                  | エラーダイアログが表示される                             | showErrorDialog 呼び出し検証 |
