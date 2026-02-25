# テスト観点表: web/findWidget.ts

## S1: FindWidget DOM生成・表示管理

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25

**テスト対象パス**: `web/findWidget.ts`

| Case ID | Input / Precondition          | Perspective (Equivalence / Boundary) | Expected Result                                                                         | Notes |
| ------- | ----------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------- | ----- |
| TC-001  | FindWidget コンストラクタ実行 | Equivalence - normal                 | DOM構造が生成される: 入力欄, Aaトグル, .\*トグル, カウンター, 前/次ボタン, 閉じるボタン | -     |
| TC-002  | show() 呼び出し               | Equivalence - normal                 | ウィジェットが表示状態になり、入力欄にフォーカスが移動する                              | -     |
| TC-003  | close() 呼び出し              | Equivalence - normal                 | ウィジェットが非表示になり、全ハイライトがクリアされる                                  | -     |
| TC-004  | show() 後に isVisible()       | Equivalence - normal                 | true を返す                                                                             | -     |
| TC-005  | close() 後に isVisible()      | Equivalence - normal                 | false を返す                                                                            | -     |

## S2: FindWidget 入力制御

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25

**テスト対象パス**: `web/findWidget.ts`

| Case ID | Input / Precondition            | Perspective (Equivalence / Boundary) | Expected Result              | Notes                |
| ------- | ------------------------------- | ------------------------------------ | ---------------------------- | -------------------- |
| TC-006  | setInputEnabled(false)          | Equivalence - normal                 | 入力欄がdisabled状態になる   | データロード前       |
| TC-007  | setInputEnabled(true)           | Equivalence - normal                 | 入力欄がenabled状態になる    | データロード完了後   |
| TC-008  | コミット0件の状態でテキスト入力 | Boundary - zero commits              | マッチなし、カウンター非表示 | disabled状態の可能性 |

## S3: FindWidget 検索マッチング

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25

**テスト対象パス**: `web/findWidget.ts`

| Case ID | Input / Precondition                                                   | Perspective (Equivalence / Boundary) | Expected Result                                        | Notes       |
| ------- | ---------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------ | ----------- |
| TC-009  | テキスト "fix" 入力、コミットメッセージに "fix bug" を含むコミットあり | Equivalence - normal                 | 該当コミット行がハイライトされ、カウンターが更新される | -           |
| TC-010  | テキスト入力、著者名にマッチするコミットあり                           | Equivalence - normal                 | 著者名欄がハイライトされる                             | -           |
| TC-011  | テキスト入力、コミットハッシュ（短縮形）にマッチ                       | Equivalence - normal                 | ハッシュ欄がハイライトされる                           | -           |
| TC-012  | テキスト入力、ブランチ名・タグ名にマッチ                               | Equivalence - normal                 | ブランチ/タグラベル欄がハイライトされる                | -           |
| TC-013  | テキスト入力で3件マッチ                                                | Equivalence - normal                 | カウンターが "1 of 3" と表示される                     | 初期位置は1 |
| TC-014  | テキスト入力でマッチ0件                                                | Boundary - no matches                | カウンターが "No Results" と表示、ハイライトなし       | -           |
| TC-015  | テキスト入力でマッチ1件                                                | Boundary - single match              | カウンターが "1 of 1" と表示される                     | -           |
| TC-016  | 検索テキストを空にクリア                                               | Boundary - empty text                | 全ハイライトが除去され、カウンターが非表示になる       | -           |

## S4: FindWidget 検索オプション

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25

**テスト対象パス**: `web/findWidget.ts`

| Case ID | Input / Precondition                     | Perspective (Equivalence / Boundary) | Expected Result                                 | Notes                                      |
| ------- | ---------------------------------------- | ------------------------------------ | ----------------------------------------------- | ------------------------------------------ | ---------------- |
| TC-017  | caseSensitive OFF, テキスト "Fix"        | Equivalence - normal                 | "fix", "Fix", "FIX" 全てにマッチ                | デフォルト動作                             |
| TC-018  | caseSensitive ON, テキスト "Fix"         | Equivalence - normal                 | "Fix" のみにマッチ、"fix" にはマッチしない      | RegExp iフラグなし                         |
| TC-019  | regex ON, テキスト "fix                  | feat"                                | Equivalence - normal                            | "fix" または "feat" を含むコミットにマッチ | 正規表現パターン |
| TC-020  | regex ON, テキスト "[invalid"            | Equivalence - error                  | エラー属性が設定され（赤枠）、マッチなし        | RegExp コンストラクタ例外                  |
| TC-021  | regex ON, テキスト "(?:)" (ゼロ長マッチ) | Boundary - zero-length               | エラー属性が設定され、マッチがクリアされる      | ReDoS防止                                  |
| TC-022  | regex ON, テキスト "(a+)+" (潜在的ReDoS) | Boundary - backtracking              | try-catchで安全に処理される（クラッシュしない） | ReDoS防止                                  |

## S5: FindWidget ナビゲーション

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25

**テスト対象パス**: `web/findWidget.ts`

| Case ID | Input / Precondition         | Perspective (Equivalence / Boundary) | Expected Result                                   | Notes      |
| ------- | ---------------------------- | ------------------------------------ | ------------------------------------------------- | ---------- |
| TC-023  | 3件マッチ、位置1、next()     | Equivalence - normal                 | 位置が2に移動し、カウンターが "2 of 3" になる     | -          |
| TC-024  | 3件マッチ、位置1、prev()     | Equivalence - normal                 | 位置が3に循環移動し、カウンターが "3 of 3" になる | 逆方向循環 |
| TC-025  | 3件マッチ、位置3、next()     | Boundary - wrap forward              | 位置が1に循環移動し、カウンターが "1 of 3" になる | 順方向循環 |
| TC-026  | マッチ0件で next()           | Boundary - no matches                | 何も起こらない（エラーにならない）                | -          |
| TC-027  | ナビゲーション後のスクロール | Equivalence - normal                 | scrollToCommit() が呼び出される                   | -          |

## S6: FindWidget 状態永続化

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25

**テスト対象パス**: `web/findWidget.ts`

| Case ID | Input / Precondition              | Perspective (Equivalence / Boundary) | Expected Result                                                                        | Notes |
| ------- | --------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------- | ----- |
| TC-028  | getState() 呼び出し               | Equivalence - normal                 | FindWidgetState オブジェクトを返す（text, currentHash, visible, caseSensitive, regex） | -     |
| TC-029  | restoreState(savedState) 呼び出し | Equivalence - normal                 | 保存した状態が正しく復元される（テキスト、トグル、表示状態）                           | -     |
| TC-030  | restoreState(null)                | Boundary - null state                | デフォルト状態が適用される（エラーにならない）                                         | -     |

## S7: FindWidget デバウンス

> Origin: Feature 002 (menubar-search-diff) Task 3.3
> Added: 2026-02-25

**テスト対象パス**: `web/findWidget.ts`

| Case ID | Input / Precondition          | Perspective (Equivalence / Boundary) | Expected Result                                                     | Notes              |
| ------- | ----------------------------- | ------------------------------------ | ------------------------------------------------------------------- | ------------------ |
| TC-031  | テキスト入力後200ms経過       | Equivalence - normal                 | 検索が実行される                                                    | SEARCH_DEBOUNCE_MS |
| TC-032  | テキスト入力後100msで別の入力 | Boundary - debounce reset            | 最初の検索はキャンセルされ、新しい入力から200ms後に検索が実行される | -                  |
