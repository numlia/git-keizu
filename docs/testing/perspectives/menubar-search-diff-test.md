# テスト観点表: メニューバー検索・差分表示

> Generated: 2026-02-24T14:00:00Z
> Updated: 2026-02-25 (不具合修正 27d2b61, 52a5aa8 反映)
> Origin: AIDD pipeline (aidd-spec-tasks-test)
> Spec: `notes/features/002-add-menu/`

---

## 対象: Task 2.2 DataSource差分取得メソッド テスト

### getCommitComparison メソッド

| Case ID    | Input / Precondition                             | Perspective (Equivalence / Boundary) | Expected Result                                                                            | Notes                                              |
| ---------- | ------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| TC-DC-N-01 | fromHash: 有効なハッシュ, toHash: 有効なハッシュ | Equivalence - normal                 | GitFileChange[] を返す。各要素にoldFilePath, newFilePath, type, additions, deletionsを含む | nameStatus + numStat の並列実行                    |
| TC-DC-N-02 | 差分にリネームファイル(R)を含む                  | Equivalence - normal                 | oldFilePath と newFilePath が異なる GitFileChange を返す                                   | --find-renames による検出                          |
| TC-DC-N-03 | 差分にA/M/D/R全種を含む                          | Equivalence - normal                 | 各変更種別が正しく分類される                                                               | --diff-filter=AMDR                                 |
| TC-DC-N-04 | numStat の追加行数・削除行数                     | Equivalence - normal                 | additions, deletions に正しい数値が設定される                                              | numStat パースの検証                               |
| TC-DC-B-01 | toHash: 空文字（作業ツリー比較）                 | Boundary - empty toHash              | git diff引数にtoHashが含まれない。作業ツリーとの差分を返す。ls-filesも実行される           | REQ-2.9 作業ツリー比較。isToWorkingTree=true       |
| TC-DC-B-02 | fromHash: UNCOMMITTED_CHANGES_HASH ("\*")        | Boundary - special hash              | toHashがdiffベースとして使用される（作業ツリー比較）。git diff引数にtoHashのみ含まれる     | UNCOMMITTED特殊処理。旧: HEAD置換→新: toHashベース |
| TC-DC-B-03 | 変更ファイルが0件                                | Boundary - empty result              | 空配列 [] を返す（nullではない）                                                           | 同一コミット間 or 差分なし                         |
| TC-DC-A-01 | git diffコマンドがエラー終了                     | Equivalence - error                  | null を返す                                                                                | spawn例外時にcatchブロックでnull返却               |
| TC-DC-A-02 | numStatの出力行がnameStatusと不一致              | Boundary - malformed                 | 取得可能なデータのみで結果を構成する                                                       | パースの堅牢性                                     |

### getCommitComparison 未追跡ファイル統合（不具合修正 27d2b61 追加分）

| Case ID    | Input / Precondition                                   | Perspective (Equivalence / Boundary) | Expected Result                                                                        | Notes                                             |
| ---------- | ------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------- |
| TC-DC-N-05 | fromHash=UNCOMMITTED_CHANGES_HASH + 未追跡ファイルあり | Equivalence - normal                 | ls-filesが実行され、結果にtype:"A"、additions/deletions:nullの未追跡ファイルが含まれる | isToWorkingTree=true時のみls-files実行            |
| TC-DC-N-06 | toHash="" (作業ツリー比較) + 未追跡ファイルあり        | Equivalence - normal                 | ls-filesが実行され、結果に未追跡ファイルが含まれる                                     | toHash空文字でもisToWorkingTree=true              |
| TC-DC-B-04 | 2コミット間比較（fromHash, toHash共に有効ハッシュ）    | Boundary - no ls-files               | ls-filesは実行されない（spawn呼び出しは2回: nameStatus + numStatのみ）                 | isToWorkingTree=false                             |
| TC-DC-B-05 | 作業ツリー比較 + 未追跡ファイルがdiff出力と重複        | Boundary - dedup                     | 重複ファイルは1回のみ含まれる（fileLookupで既存エントリをスキップ）                    | `typeof fileLookup[filePath] === "number"` ガード |
| TC-DC-B-06 | 作業ツリー比較 + 未追跡ファイル0件（ls-files出力が空） | Boundary - empty untracked           | diff出力のみで結果が構成される（untrackedFiles配列が空）                               | -                                                 |
| TC-DC-B-07 | 作業ツリー比較 + ls-files出力に空行が混在              | Boundary - empty line                | 空行はスキップされ、有効なファイルパスのみ追加される                                   | `filePath === ""` ガード                          |

### getUncommittedDetails メソッド（不具合修正 27d2b61 追加分）

| Case ID    | Input / Precondition                        | Perspective (Equivalence / Boundary) | Expected Result                                                                                  | Notes                                             |
| ---------- | ------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| TC-UD-N-01 | staged/unstaged変更 + 未追跡ファイルあり    | Equivalence - normal                 | fileChangesにdiff結果 + 未追跡ファイル(type:"A", additions/deletions:null)が含まれる             | nameStatus + numStat + ls-filesの3並列実行        |
| TC-UD-N-02 | staged/unstaged変更のみ、未追跡ファイルなし | Equivalence - normal                 | fileChangesにdiff結果のみ含まれる（ls-files出力が空）                                            | -                                                 |
| TC-UD-B-01 | diff出力なし、未追跡ファイルのみ存在        | Boundary - diff empty                | fileChangesに未追跡ファイルのみ含まれる（type:"A", additions/deletions:null）                    | -                                                 |
| TC-UD-B-02 | 未追跡ファイルがdiff結果のnewFilePathと重複 | Boundary - dedup                     | 重複ファイルは1回のみ含まれる（fileLookupで既存エントリをスキップ）                              | `typeof fileLookup[filePath] === "number"` ガード |
| TC-UD-B-03 | ls-files出力に空行が混在                    | Boundary - empty line                | 空行はスキップされ、有効なファイルパスのみ追加される                                             | `filePath === ""` ガード                          |
| TC-UD-A-01 | git diff または ls-files が例外をスロー     | Equivalence - error                  | null を返す                                                                                      | catch ブロックでnull返却                          |
| TC-UD-N-03 | 正常なdiff出力（リネーム含む）              | Equivalence - normal                 | GitCommitDetails を返す。hash=UNCOMMITTED_CHANGES_HASH、fileChangesに正しいtype/pathが設定される | nameStatus パースの基本検証                       |

---

## 対象: Task 2.4 Extension メッセージルーティング テスト

### GitGraphView compareCommits メッセージハンドラー

| Case ID    | Input / Precondition                                           | Perspective (Equivalence / Boundary) | Expected Result                                                                     | Notes |
| ---------- | -------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- | ----- |
| TC-MR-N-01 | RequestCompareCommits メッセージ受信（有効なfromHash, toHash） | Equivalence - normal                 | DataSource.getCommitComparison() が repo, fromHash, toHash で呼ばれる               | -     |
| TC-MR-N-02 | getCommitComparison() が GitFileChange[] を返す                | Equivalence - normal                 | ResponseCompareCommits が fileChanges, fromHash, toHash を含んでwebviewに送信される | -     |
| TC-MR-A-01 | getCommitComparison() が null を返す                           | Equivalence - error                  | ResponseCompareCommits の fileChanges が null でwebviewに送信される                 | -     |

### viewDiff 比較モード拡張

| Case ID    | Input / Precondition                                 | Perspective (Equivalence / Boundary) | Expected Result                                                     | Notes                  |
| ---------- | ---------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------- | ---------------------- |
| TC-MR-N-03 | RequestViewDiff に compareWithHash あり              | Equivalence - normal                 | encodeDiffDocUri で fromHash と toHash を使った2つのURIが生成される | 2点間比較用Diff Editor |
| TC-MR-N-04 | RequestViewDiff に compareWithHash なし（undefined） | Equivalence - normal                 | 既存の動作（親コミットとの差分）が維持される                        | 後方互換               |

---

## 対象: Task 3.3 FindWidget テスト

### DOM生成・表示管理

| Case ID    | Input / Precondition          | Perspective (Equivalence / Boundary) | Expected Result                                                                         | Notes |
| ---------- | ----------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------- | ----- |
| TC-FW-N-01 | FindWidget コンストラクタ実行 | Equivalence - normal                 | DOM構造が生成される: 入力欄, Aaトグル, .\*トグル, カウンター, 前/次ボタン, 閉じるボタン | -     |
| TC-FW-N-02 | show() 呼び出し               | Equivalence - normal                 | ウィジェットが表示状態になり、入力欄にフォーカスが移動する                              | -     |
| TC-FW-N-03 | close() 呼び出し              | Equivalence - normal                 | ウィジェットが非表示になり、全ハイライトがクリアされる                                  | -     |
| TC-FW-N-04 | show() 後に isVisible()       | Equivalence - normal                 | true を返す                                                                             | -     |
| TC-FW-N-05 | close() 後に isVisible()      | Equivalence - normal                 | false を返す                                                                            | -     |

### 入力制御

| Case ID    | Input / Precondition            | Perspective (Equivalence / Boundary) | Expected Result              | Notes                |
| ---------- | ------------------------------- | ------------------------------------ | ---------------------------- | -------------------- |
| TC-FW-N-06 | setInputEnabled(false)          | Equivalence - normal                 | 入力欄がdisabled状態になる   | データロード前       |
| TC-FW-N-07 | setInputEnabled(true)           | Equivalence - normal                 | 入力欄がenabled状態になる    | データロード完了後   |
| TC-FW-B-01 | コミット0件の状態でテキスト入力 | Boundary - zero commits              | マッチなし、カウンター非表示 | disabled状態の可能性 |

### 検索マッチング

| Case ID    | Input / Precondition                                                   | Perspective (Equivalence / Boundary) | Expected Result                                        | Notes       |
| ---------- | ---------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------ | ----------- |
| TC-FW-N-08 | テキスト "fix" 入力、コミットメッセージに "fix bug" を含むコミットあり | Equivalence - normal                 | 該当コミット行がハイライトされ、カウンターが更新される | -           |
| TC-FW-N-09 | テキスト入力、著者名にマッチするコミットあり                           | Equivalence - normal                 | 著者名欄がハイライトされる                             | -           |
| TC-FW-N-10 | テキスト入力、コミットハッシュ（短縮形）にマッチ                       | Equivalence - normal                 | ハッシュ欄がハイライトされる                           | -           |
| TC-FW-N-11 | テキスト入力、ブランチ名・タグ名にマッチ                               | Equivalence - normal                 | ブランチ/タグラベル欄がハイライトされる                | -           |
| TC-FW-N-12 | テキスト入力で3件マッチ                                                | Equivalence - normal                 | カウンターが "1 of 3" と表示される                     | 初期位置は1 |
| TC-FW-B-02 | テキスト入力でマッチ0件                                                | Boundary - no matches                | カウンターが "No Results" と表示、ハイライトなし       | -           |
| TC-FW-B-03 | テキスト入力でマッチ1件                                                | Boundary - single match              | カウンターが "1 of 1" と表示される                     | -           |
| TC-FW-B-04 | 検索テキストを空にクリア                                               | Boundary - empty text                | 全ハイライトが除去され、カウンターが非表示になる       | -           |

### 検索オプション

| Case ID    | Input / Precondition                     | Perspective (Equivalence / Boundary) | Expected Result                                 | Notes                                      |
| ---------- | ---------------------------------------- | ------------------------------------ | ----------------------------------------------- | ------------------------------------------ | ---------------- |
| TC-FW-N-13 | caseSensitive OFF, テキスト "Fix"        | Equivalence - normal                 | "fix", "Fix", "FIX" 全てにマッチ                | デフォルト動作                             |
| TC-FW-N-14 | caseSensitive ON, テキスト "Fix"         | Equivalence - normal                 | "Fix" のみにマッチ、"fix" にはマッチしない      | RegExp iフラグなし                         |
| TC-FW-N-15 | regex ON, テキスト "fix                  | feat"                                | Equivalence - normal                            | "fix" または "feat" を含むコミットにマッチ | 正規表現パターン |
| TC-FW-A-01 | regex ON, テキスト "[invalid"            | Equivalence - error                  | エラー属性が設定され（赤枠）、マッチなし        | RegExp コンストラクタ例外                  |
| TC-FW-A-02 | regex ON, テキスト "(?:)" (ゼロ長マッチ) | Boundary - zero-length               | エラー属性が設定され、マッチがクリアされる      | ReDoS防止                                  |
| TC-FW-A-03 | regex ON, テキスト "(a+)+" (潜在的ReDoS) | Boundary - backtracking              | try-catchで安全に処理される（クラッシュしない） | ReDoS防止                                  |

### ナビゲーション

| Case ID    | Input / Precondition         | Perspective (Equivalence / Boundary) | Expected Result                                   | Notes      |
| ---------- | ---------------------------- | ------------------------------------ | ------------------------------------------------- | ---------- |
| TC-FW-N-16 | 3件マッチ、位置1、next()     | Equivalence - normal                 | 位置が2に移動し、カウンターが "2 of 3" になる     | -          |
| TC-FW-N-17 | 3件マッチ、位置1、prev()     | Equivalence - normal                 | 位置が3に循環移動し、カウンターが "3 of 3" になる | 逆方向循環 |
| TC-FW-B-05 | 3件マッチ、位置3、next()     | Boundary - wrap forward              | 位置が1に循環移動し、カウンターが "1 of 3" になる | 順方向循環 |
| TC-FW-B-06 | マッチ0件で next()           | Boundary - no matches                | 何も起こらない（エラーにならない）                | -          |
| TC-FW-N-18 | ナビゲーション後のスクロール | Equivalence - normal                 | scrollToCommit() が呼び出される                   | -          |

### 状態永続化

| Case ID    | Input / Precondition              | Perspective (Equivalence / Boundary) | Expected Result                                                                        | Notes |
| ---------- | --------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------- | ----- |
| TC-FW-N-19 | getState() 呼び出し               | Equivalence - normal                 | FindWidgetState オブジェクトを返す（text, currentHash, visible, caseSensitive, regex） | -     |
| TC-FW-N-20 | restoreState(savedState) 呼び出し | Equivalence - normal                 | 保存した状態が正しく復元される（テキスト、トグル、表示状態）                           | -     |
| TC-FW-B-07 | restoreState(null)                | Boundary - null state                | デフォルト状態が適用される（エラーにならない）                                         | -     |

### デバウンス

| Case ID    | Input / Precondition          | Perspective (Equivalence / Boundary) | Expected Result                                                     | Notes              |
| ---------- | ----------------------------- | ------------------------------------ | ------------------------------------------------------------------- | ------------------ |
| TC-FW-N-21 | テキスト入力後200ms経過       | Equivalence - normal                 | 検索が実行される                                                    | SEARCH_DEBOUNCE_MS |
| TC-FW-B-08 | テキスト入力後100msで別の入力 | Boundary - debounce reset            | 最初の検索はキャンセルされ、新しい入力から200ms後に検索が実行される | -                  |

---

## 対象: Task 4.3 Frontend統合テスト

### 比較モード状態遷移

| Case ID    | Input / Precondition                               | Perspective (Equivalence / Boundary) | Expected Result                                                                                                        | Notes                                                |
| ---------- | -------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| TC-FI-N-01 | 通常クリック（修飾キーなし）                       | Equivalence - normal                 | コミット詳細表示（既存動作維持）                                                                                       | -                                                    |
| TC-FI-N-02 | expandedCommit あり + 別コミットをCtrl+クリック    | Equivalence - normal                 | 比較モードに遷移。getCommitOrderにより古いコミット(テーブル下位)がfromHash、新しいコミットがtoHashでcompareCommits送信 | 不具合修正52a5aa8: 順序保証追加                      |
| TC-FI-N-03 | 比較モード + 同じ比較対象をCtrl+クリック           | Equivalence - normal                 | 比較モード解除、compareWithHash が null に戻る                                                                         | -                                                    |
| TC-FI-N-04 | 比較モード + 別のコミットをCtrl+クリック           | Equivalence - normal                 | 比較対象が変更される。getCommitOrderにより古いコミットがfromHashでcompareCommits送信                                   | 不具合修正52a5aa8: 順序保証追加                      |
| TC-FI-N-05 | 比較モード + 通常クリック（修飾キーなし）          | Equivalence - normal                 | 比較解除 + 新しいコミットの詳細表示                                                                                    | -                                                    |
| TC-FI-B-01 | expandedCommit なし + Ctrl+クリック                | Boundary - no expanded               | 通常の詳細表示（比較モードにならない）                                                                                 | REQ-2.7制約                                          |
| TC-FI-B-02 | 未コミット変更行展開中 + コミット行をCtrl+クリック | Boundary - uncommitted expanded      | compareCommitsメッセージがfromHash=UNCOMMITTED_CHANGES_HASH, toHash=コミットハッシュで送信される                       | getCommitOrderがUNCOMMITTED_CHANGES_HASHをfromに固定 |

### 未コミット変更行Ctrl+クリック比較（不具合修正 52a5aa8 追加分）

| Case ID    | Input / Precondition                                       | Perspective (Equivalence / Boundary) | Expected Result                                                                                                  | Notes                                                |
| ---------- | ---------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| TC-FI-N-12 | コミット展開中 + 未コミット変更行をCtrl+クリック           | Equivalence - normal                 | 比較モードに遷移。compareCommitsメッセージがfromHash=UNCOMMITTED_CHANGES_HASH, toHash=展開中コミットで送信される | getCommitOrderがUNCOMMITTED_CHANGES_HASHをfromに固定 |
| TC-FI-N-13 | 未コミット変更行と比較中 + 同じ未コミット行をCtrl+クリック | Equivalence - toggle off             | 比較モード解除。compareWithHash=null、compareWithSrcElem=null。元のコミット詳細が再表示される                    | -                                                    |
| TC-FI-N-14 | 未コミット変更行の通常クリック（展開済みコミットなし）     | Equivalence - normal (non-modifier)  | 通常のcommitDetails要求が送信される（比較モードにならない）                                                      | 既存動作維持                                         |

### 比較レスポンス処理

| Case ID    | Input / Precondition                                                               | Perspective (Equivalence / Boundary) | Expected Result                                                               | Notes                                                                |
| ---------- | ---------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| TC-FI-N-06 | ResponseCompareCommits 受信（fileChanges あり）                                    | Equivalence - normal                 | 比較ヘッダー表示、ファイル一覧表示                                            | -                                                                    |
| TC-FI-A-01 | ResponseCompareCommits 受信（fileChanges: null）                                   | Equivalence - error                  | showErrorDialog が呼ばれる                                                    | -                                                                    |
| TC-FI-N-07 | 比較モードでファイルクリック                                                       | Equivalence - normal                 | viewDiff メッセージに compareWithHash が含まれる                              | -                                                                    |
| TC-FI-N-15 | ResponseCompareCommitsのfromHash/toHashがexpandedCommit.hash/compareWithHashと逆順 | Equivalence - reorder tolerance      | 正しく表示される（セット比較で順序不問。hashes Setに両方含まれていれば有効）  | 不具合修正52a5aa8: getCommitOrderによる順序変更対応                  |
| TC-FI-N-16 | 未コミット変更行展開中にloadCommits受信（テーブル再描画）                          | Equivalence - re-render              | srcElemが`.commit, .unsavedChanges`セレクタで再取得され、展開状態が維持される | 不具合修正27d2b61: セレクタ拡張 `.commit`→`.commit, .unsavedChanges` |

### FindWidget統合

| Case ID    | Input / Precondition                              | Perspective (Equivalence / Boundary) | Expected Result                                               | Notes    |
| ---------- | ------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------- | -------- |
| TC-FI-N-08 | Ctrl/Cmd+F キー押下                               | Equivalence - normal                 | FindWidget.show() が呼ばれる                                  | -        |
| TC-FI-N-09 | 検索ボタンクリック                                | Equivalence - normal                 | FindWidget.show() が呼ばれる                                  | -        |
| TC-FI-N-10 | saveState() 呼び出し                              | Equivalence - normal                 | findWidgetState が WebViewState に含まれる                    | -        |
| TC-FI-N-11 | restoreState (findWidgetState あり)               | Equivalence - normal                 | FindWidget.restoreState() が呼ばれる                          | -        |
| TC-FI-B-03 | restoreState (findWidgetState なし、旧バージョン) | Boundary - backward compat           | FindWidget がデフォルト状態で初期化される（エラーにならない） | 後方互換 |

---
