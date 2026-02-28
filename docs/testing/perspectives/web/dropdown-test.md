# テスト観点表: web/dropdown.ts

> Source: `web/dropdown.ts`
> Generated: 2026-02-27T00:00:00+09:00

## S1: isOpen() 展開状態判定

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**シグネチャ**: `isOpen(): boolean`
**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition                 | Perspective (Equivalence / Boundary) | Expected Result | Notes        |
| ------- | ------------------------------------ | ------------------------------------ | --------------- | ------------ |
| TC-001  | ドロップダウン初期状態（閉じている） | Equivalence - normal (closed)        | false を返す    | 初期状態     |
| TC-002  | ドロップダウン展開後                 | Equivalence - normal (open)          | true を返す     | open() 後    |
| TC-003  | 展開後に close() 呼び出し            | Equivalence - normal (re-closed)     | false を返す    | 状態遷移検証 |

## S2: close() パブリック化

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**シグネチャ**: `close(): void`
**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition           | Perspective (Equivalence / Boundary) | Expected Result                                 | Notes  |
| ------- | ------------------------------ | ------------------------------------ | ----------------------------------------------- | ------ |
| TC-004  | ドロップダウン展開中に close() | Equivalence - normal                 | ドロップダウンが非表示になり、isOpen() が false | -      |
| TC-005  | 既に閉じている状態で close()   | Boundary - already closed            | エラーなし、isOpen() は引き続き false           | 冪等性 |

## S3: escapeHtml XSS修正

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition                                                 | Perspective (Equivalence / Boundary) | Expected Result                                | Notes               |
| ------- | -------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------- | ------------------- |
| TC-006  | オプション名に HTML特殊文字を含む（例: `<script>alert(1)</script>`） | Equivalence - abnormal (XSS attempt) | 選択値表示にエスケープ済みテキストが設定される | escapeHtml 適用検証 |
| TC-007  | オプション名が通常テキスト（例: `main`）                             | Equivalence - normal                 | テキストがそのまま表示される                   | 通常動作の維持      |
| TC-008  | オプション名に `&`, `<`, `>`, `"`, `'` を含む                        | Boundary - all HTML entities         | すべての特殊文字が適切にエスケープされる       | 各エンティティ検証  |

## S4: title 属性設定

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition               | Perspective (Equivalence / Boundary) | Expected Result                                    | Notes                      |
| ------- | ---------------------------------- | ------------------------------------ | -------------------------------------------------- | -------------------------- |
| TC-009  | render() 実行後の選択値表示要素    | Equivalence - normal                 | title 属性にオプション名（生テキスト）が設定される | ブラウザがエスケープ       |
| TC-010  | ドロップダウンオプション要素の描画 | Equivalence - normal                 | 各オプション div に title 属性が設定される         | ツールチップ用             |
| TC-011  | 長いオプション名（100文字以上）    | Boundary - long text                 | title 属性にフルテキストが設定される               | 省略表示時のフルネーム表示 |

## S5: マジックナンバー定数化

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**テスト対象パス**: `web/dropdown.ts`

| Case ID | Input / Precondition     | Perspective (Equivalence / Boundary) | Expected Result | Notes                  |
| ------- | ------------------------ | ------------------------------------ | --------------- | ---------------------- |
| TC-012  | MIN_DROPDOWN_WIDTH 定数  | Equivalence - normal                 | 値が 130        | 最小幅                 |
| TC-013  | SCROLLBAR_THRESHOLD 定数 | Equivalence - normal                 | 値が 272        | スクロールバー表示閾値 |
| TC-014  | SCROLLBAR_WIDTH 定数     | Equivalence - normal                 | 値が 12         | スクロールバー幅       |
| TC-015  | MAX_DROPDOWN_HEIGHT 定数 | Equivalence - normal                 | 値が 297        | 最大高さ               |
