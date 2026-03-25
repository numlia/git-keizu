# テスト観点表: web/dropdown.ts

> Source: `web/dropdown.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: isOpen() 展開状態判定

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**シグネチャ**: `isOpen(): boolean`
**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes        |
| ------- | ------------------------------------ | -------------------------------------------------------------------------- | --------------- | ------------ |
| TC-001  | ドロップダウン初期状態（閉じている） | Normal - closed                                                            | false を返す    | 初期状態     |
| TC-002  | ドロップダウン展開後                 | Normal - open                                                              | true を返す     | open() 後    |
| TC-003  | 展開後に close() 呼び出し            | Normal - re-closed                                                         | false を返す    | 状態遷移検証 |

## S2: close() パブリック化

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**シグネチャ**: `close(): void`
**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                 | Notes  |
| ------- | ------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------- | ------ |
| TC-004  | ドロップダウン展開中に close() | Normal - standard                                                          | ドロップダウンが非表示になり、isOpen() が false | -      |
| TC-005  | 既に閉じている状態で close()   | Boundary - already closed                                                  | エラーなし、isOpen() は引き続き false           | 冪等性 |

## S3: escapeHtml XSS修正

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                | Notes               |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- | ------------------- |
| TC-006  | オプション名に HTML特殊文字を含む（例: `<script>alert(1)</script>`） | Validation - XSS attempt                                                   | 選択値表示にエスケープ済みテキストが設定される | escapeHtml 適用検証 |
| TC-007  | オプション名が通常テキスト（例: `main`）                             | Normal - standard                                                          | テキストがそのまま表示される                   | 通常動作の維持      |
| TC-008  | オプション名に `&`, `<`, `>`, `"`, `'` を含む                        | Boundary - all HTML entities                                               | すべての特殊文字が適切にエスケープされる       | 各エンティティ検証  |

## S4: title 属性設定

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                    | Notes                      |
| ------- | ---------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------- |
| TC-009  | render() 実行後の選択値表示要素    | Normal - standard                                                          | title 属性にオプション名（生テキスト）が設定される | ブラウザがエスケープ       |
| TC-010  | ドロップダウンオプション要素の描画 | Normal - standard                                                          | 各オプション div に title 属性が設定される         | ツールチップ用             |
| TC-011  | 長いオプション名（100文字以上）    | Boundary - long text                                                       | title 属性にフルテキストが設定される               | 省略表示時のフルネーム表示 |

## S5: マジックナンバー定数化

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes                  |
| ------- | ------------------------ | -------------------------------------------------------------------------- | --------------- | ---------------------- |
| TC-012  | MIN_DROPDOWN_WIDTH 定数  | Normal - standard                                                          | 値が 130        | 最小幅                 |
| TC-013  | SCROLLBAR_THRESHOLD 定数 | Normal - standard                                                          | 値が 272        | スクロールバー表示閾値 |
| TC-014  | SCROLLBAR_WIDTH 定数     | Normal - standard                                                          | 値が 12         | スクロールバー幅       |
| TC-015  | MAX_DROPDOWN_HEIGHT 定数 | Normal - standard                                                          | 値が 297        | 最大高さ               |

## S6: マルチセレクトモード初期化

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                | Notes                 |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- | --------------------- |
| TC-016  | multipleAllowed=true でコンストラクタ呼び出し  | Normal - standard                                                          | マルチセレクトモードが有効になる               | -                     |
| TC-017  | multipleAllowed=false でコンストラクタ呼び出し | Normal - standard                                                          | 単一選択モード（既存動作）が維持される         | 後方互換              |
| TC-018  | multipleAllowed=true で render() 実行          | Normal - standard                                                          | 各オプションにチェックボックス要素が描画される | input type="checkbox" |
| TC-019  | multipleAllowed=false で render() 実行         | Normal - no checkbox                                                       | チェックボックス要素が描画されない             | 既存動作維持          |

## S7: マルチセレクト "Show All" 排他制御

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                       | Notes        |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- | ------------ |
| TC-020  | "Show All"（インデックス 0）をクリック               | Normal - standard                                                          | 全ての個別チェックボックスが解除される                | -            |
| TC-021  | 個別オプションをクリック                             | Normal - standard                                                          | "Show All" が解除され、クリックしたオプションがトグル | -            |
| TC-022  | 全ての個別選択を 1 つずつ解除                        | Boundary - all deselected                                                  | 自動的に "Show All" が選択状態に復帰する              | 自動復帰     |
| TC-023  | "Show All" 選択中に個別オプションを 1 つクリック     | Normal - standard                                                          | "Show All" が解除され、個別オプションがチェックされる | 排他切替     |
| TC-024  | 複数の個別オプションが選択中に "Show All" をクリック | Normal - standard                                                          | 全個別選択が解除され、"Show All" のみ選択             | 一括リセット |

## S8: マルチセレクト閉じ・コールバック動作

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                              | Notes              |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------- | ------------------ |
| TC-025  | ドロップダウン open → 選択変更あり → close          | Normal - standard                                                          | コールバックが発火し、選択値の配列が渡される | -                  |
| TC-026  | ドロップダウン open → 選択変更なし → close          | Boundary - no change                                                       | コールバックが発火しない                     | 不要なリロード防止 |
| TC-027  | "Show All" 選択状態で close                         | Normal - standard                                                          | コールバックに空配列が渡される               | 空配列 = Show All  |
| TC-028  | 1 項目のみ選択状態で close                          | Normal - single                                                            | コールバックに 1 要素の配列が渡される        | -                  |
| TC-029  | 3 項目選択状態で close                              | Normal - multiple                                                          | コールバックに 3 要素の配列が渡される        | -                  |
| TC-030  | open 時の選択状態を記録 → トグル → 元に戻す → close | Boundary - revert to original                                              | コールバックが発火しない（変更なしと判定）   | 差分検知           |

## S9: マルチセレクト表示ラベル

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                | Notes      |
| ------- | --------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- | ---------- |
| TC-031  | "Show All" が選択中         | Normal - standard                                                          | 表示ラベルが "Show All" の名前になる           | -          |
| TC-032  | 個別オプション 1 件が選択中 | Normal - single                                                            | 表示ラベルがそのオプション名になる             | -          |
| TC-033  | 個別オプション 2 件が選択中 | Normal - multi                                                             | 表示ラベルが件数表示になる（例: "2 selected"） | -          |
| TC-034  | 個別オプション 5 件が選択中 | Boundary - many selections                                                 | 表示ラベルが件数表示になる（例: "5 selected"） | 多数選択時 |

## S10: マルチセレクトイベントハンドリング

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                             | Notes                |
| ------- | ------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------- | -------------------- |
| TC-035  | マルチセレクト: オプションクリック         | Normal - standard                                                          | ドロップダウンが閉じない（stopPropagation） | 単一選択との差異     |
| TC-036  | 単一選択: オプションクリック               | Normal - standard                                                          | ドロップダウンが閉じる（既存動作維持）      | 後方互換             |
| TC-037  | マルチセレクト: フィルタ入力で文字列を入力 | Normal - standard                                                          | オプションがフィルタテキストで絞り込まれる  | 既存フィルタ機能維持 |
| TC-038  | マルチセレクト: フィルタ入力でマッチなし   | Boundary - no match                                                        | オプションが全て非表示になる                | 既存フィルタ動作維持 |
