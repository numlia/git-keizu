# テスト観点表: src/config.ts

> Source: `src/config.ts`
> Generated: 2026-02-27T00:00:00+09:00

## S1: parseKeybinding() ショートカット設定値パース

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**シグネチャ**: `parseKeybinding(value: string, defaultValue: string): string | null`
**テスト対象パス**: `src/config.ts`

| Case ID | Input / Precondition                                        | Perspective (Equivalence / Boundary)    | Expected Result              | Notes                       |
| ------- | ----------------------------------------------------------- | --------------------------------------- | ---------------------------- | --------------------------- |
| TC-001  | value="CTRL/CMD + F", default="CTRL/CMD + F"                | Equivalence - normal                    | "f" を返す                   | 正規表現マッチ → 小文字変換 |
| TC-002  | value="CTRL/CMD + Z", default="CTRL/CMD + F"                | Equivalence - normal                    | "z" を返す                   | 末尾英字を抽出              |
| TC-003  | value="CTRL/CMD + A", default="CTRL/CMD + F"                | Equivalence - normal                    | "a" を返す                   | 先頭英字                    |
| TC-004  | value="UNASSIGNED", default="CTRL/CMD + F"                  | Equivalence - special value             | null を返す                  | ショートカット無効化        |
| TC-005  | value="Ctrl+F" (不正形式), default="CTRL/CMD + F"           | Equivalence - abnormal (invalid format) | "f" を返す（デフォルト適用） | スラッシュ・スペース不足    |
| TC-006  | value="" (空文字), default="CTRL/CMD + F"                   | Boundary - empty                        | "f" を返す（デフォルト適用） | 空入力                      |
| TC-007  | value="ctrl/cmd + f" (小文字), default="CTRL/CMD + F"       | Equivalence - abnormal (case mismatch)  | "f" を返す（デフォルト適用） | 正規表現は大文字のみ許可    |
| TC-008  | value="CTRL/CMD + 1" (数字), default="CTRL/CMD + F"         | Equivalence - abnormal (non-alpha)      | "f" を返す（デフォルト適用） | 英字以外は不正              |
| TC-009  | value="CTRL/CMD + F" (余分スペース), default="CTRL/CMD + F" | Boundary - extra whitespace             | "f" を返す（デフォルト適用） | 正規表現厳密一致            |
| TC-010  | value="CTRL/CMD + FF" (2文字), default="CTRL/CMD + F"       | Boundary - extra chars                  | "f" を返す（デフォルト適用） | 英字1文字のみ許可           |

## S2: sourceCodeProviderIntegrationLocation() SCMボタン位置設定

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**シグネチャ**: `sourceCodeProviderIntegrationLocation(): string`
**テスト対象パス**: `src/config.ts`

| Case ID | Input / Precondition     | Perspective (Equivalence / Boundary) | Expected Result       | Notes            |
| ------- | ------------------------ | ------------------------------------ | --------------------- | ---------------- |
| TC-011  | 設定未指定（デフォルト） | Equivalence - normal (default)       | "Inline" を返す       | デフォルト値     |
| TC-012  | 設定値="More Actions"    | Equivalence - normal                 | "More Actions" を返す | 有効な代替値     |
| TC-013  | 設定値="Inline"          | Equivalence - normal                 | "Inline" を返す       | 明示的デフォルト |

## S3: keyboardShortcut\*() キーボードショートカット設定

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**テスト対象パス**: `src/config.ts`

| Case ID | Input / Precondition                          | Perspective (Equivalence / Boundary) | Expected Result | Notes                     |
| ------- | --------------------------------------------- | ------------------------------------ | --------------- | ------------------------- |
| TC-014  | keyboardShortcutFind() デフォルト             | Equivalence - normal                 | "f" を返す      | デフォルト "CTRL/CMD + F" |
| TC-015  | keyboardShortcutRefresh() デフォルト          | Equivalence - normal                 | "r" を返す      | デフォルト "CTRL/CMD + R" |
| TC-016  | keyboardShortcutScrollToHead() デフォルト     | Equivalence - normal                 | "h" を返す      | デフォルト "CTRL/CMD + H" |
| TC-017  | keyboardShortcutScrollToStash() デフォルト    | Equivalence - normal                 | "s" を返す      | デフォルト "CTRL/CMD + S" |
| TC-018  | keyboardShortcutFind() に "CTRL/CMD + A" 設定 | Equivalence - normal (custom)        | "a" を返す      | カスタムキー              |
| TC-019  | keyboardShortcutFind() に "UNASSIGNED" 設定   | Equivalence - special value          | null を返す     | ショートカット無効        |

## S4: loadMoreCommitsAutomatically() 自動読み込み設定

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27

**シグネチャ**: `loadMoreCommitsAutomatically(): boolean`
**テスト対象パス**: `src/config.ts`

| Case ID | Input / Precondition     | Perspective (Equivalence / Boundary) | Expected Result | Notes          |
| ------- | ------------------------ | ------------------------------------ | --------------- | -------------- |
| TC-020  | 設定未指定（デフォルト） | Equivalence - normal (default)       | true を返す     | デフォルト有効 |
| TC-021  | 設定値=false             | Equivalence - normal                 | false を返す    | 明示的無効化   |
