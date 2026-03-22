# Test Plan: StatusBarItem

> Generated: 2026-03-22T11:05:00Z
> Source: `src/statusBarItem.ts`
> Language: TypeScript
> Test Framework: Vitest 4.x

## 1. ソース概要

| 項目 | 値 |
|------|-----|
| ファイルパス | `src/statusBarItem.ts` |
| 主要な責務 | VS Code のステータスバー項目を生成し、`git-keizu.showStatusBarItem` 設定と保持中の `numRepos` に応じて表示/非表示を切り替える |
| 関数/メソッド数 | 3 (`constructor`, `setNumRepos`, `refresh`) |
| 総分岐数 | 1 |
| エラーパス数 | 0 |
| 外部依存数 | 8 (VS Code API: 7, config access: 1) |

## 2. テスト観点表

### 2.1 constructor

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22

**シグネチャ**: `constructor(context: vscode.ExtensionContext)`
**テスト対象パス**: `src/statusBarItem.ts:9-15`

| Case ID | Input / Precondition | Perspective (Equivalence / Boundary) | Expected Result | Notes |
|---------|----------------------|--------------------------------------|-----------------|-------|
| TC-001 | `createStatusBarItem` がモック `StatusBarItem` を返し、`context.subscriptions.push` が利用可能 | Equivalence - normal | `vscode.window.createStatusBarItem` が `(vscode.StatusBarAlignment.Left, 1)` で 1 回呼ばれる。返却された項目の `text` が `"Git Keizu"`、`tooltip` が `"View Git Keizu"`、`command` が `"git-keizu.view"` に設定され、`context.subscriptions.push` が同じ項目で 1 回呼ばれる | L10-L14 |
| TC-002 | `vscode.window.createStatusBarItem` が `Error("create failed")` を送出する | External - vscode.window.createStatusBarItem failure | コンストラクタ呼び出しが同じ `Error("create failed")` を送出する。`context.subscriptions.push` は呼ばれない | L10 |
| TC-003 | `createStatusBarItem` は成功し、`context.subscriptions.push` が `Error("push failed")` を送出する | External - ExtensionContext.subscriptions failure | コンストラクタ呼び出しが同じ `Error("push failed")` を送出する。`text` / `tooltip` / `command` の設定は実行済みで、エラーは握りつぶされない | L11-L14 |

### 2.2 setNumRepos

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22

**シグネチャ**: `public setNumRepos(numRepos: number)`
**テスト対象パス**: `src/statusBarItem.ts:17-20`

| Case ID | Input / Precondition | Perspective (Equivalence / Boundary) | Expected Result | Notes |
|---------|----------------------|--------------------------------------|-----------------|-------|
| TC-004 | `numRepos = 3`、`refresh` を `vi.spyOn(instance, "refresh")` で監視 | Equivalence - normal | 内部状態 `numRepos` が `3` に更新され、`refresh()` が引数なしで 1 回呼ばれる | L18-L19 |
| TC-005 | `numRepos = 0`、`refresh` を監視 | Boundary - zero | 内部状態 `numRepos` が `0` に更新され、`refresh()` が 1 回呼ばれる | L18-L19。`> 0` 判定の閾値 |
| TC-006 | `numRepos = -1`、`refresh` を監視 | Boundary - min-1 | 内部状態 `numRepos` が `-1` に更新され、`refresh()` が 1 回呼ばれる。負値に対する追加バリデーションは行われない | L18-L19 |

### 2.3 refresh

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22

**シグネチャ**: `public refresh()`
**テスト対象パス**: `src/statusBarItem.ts:22-28`

| Case ID | Input / Precondition | Perspective (Equivalence / Boundary) | Expected Result | Notes |
|---------|----------------------|--------------------------------------|-----------------|-------|
| TC-007 | `getConfig().showStatusBarItem()` が `true` を返し、内部 `numRepos = 1` | Equivalence - normal (branch) | `statusBarItem.show()` が 1 回呼ばれ、`statusBarItem.hide()` は呼ばれない | L23-L24。最小の表示側境界値 |
| TC-008 | `getConfig().showStatusBarItem()` が `true` を返し、内部 `numRepos = 0` | Boundary - zero | `statusBarItem.hide()` が 1 回呼ばれ、`statusBarItem.show()` は呼ばれない | L23-L26。閾値ちょうど |
| TC-009 | `getConfig().showStatusBarItem()` が `false` を返し、内部 `numRepos = 5` | Equivalence - normal (config disabled) | `statusBarItem.hide()` が 1 回呼ばれ、`statusBarItem.show()` は呼ばれない。リポジトリ数が正でも設定値が優先される | L23-L26 |
| TC-010 | `getConfig().showStatusBarItem()` が `true` を返し、内部 `numRepos = -1` | Boundary - min-1 | `statusBarItem.hide()` が 1 回呼ばれ、`statusBarItem.show()` は呼ばれない。負値は `numRepos > 0` を満たさない | L23-L26 |
| TC-011 | `getConfig().showStatusBarItem()` が `Error("config failed")` を送出する | External - config read failure | `refresh()` が同じ `Error("config failed")` を送出する。`statusBarItem.show()` / `hide()` はどちらも呼ばれない | L23 |
| TC-012 | `getConfig().showStatusBarItem()` が `true`、内部 `numRepos = 2`、`statusBarItem.show()` が `Error("show failed")` を送出する | External - vscode.StatusBarItem.show failure | `refresh()` が同じ `Error("show failed")` を送出する。`statusBarItem.hide()` は呼ばれない | L24 |
| TC-013 | `getConfig().showStatusBarItem()` が `false`、内部 `numRepos = 2`、`statusBarItem.hide()` が `Error("hide failed")` を送出する | External - vscode.StatusBarItem.hide failure | `refresh()` が同じ `Error("hide failed")` を送出する。分岐は false 側へ進んだうえで例外が伝播する | L25-L26 |

## 3. テストケースサマリー

| カテゴリ (Perspective列で分類) | ケース数 |
|-------------------------------|---------|
| 正常系（Equivalence - normal） | 4 |
| 異常系（Equivalence - abnormal） | 0 |
| 境界値（Boundary - ...） | 4 |
| 型・形式（Type - ...） | 0 |
| 外部依存（External - ...） | 5 |
| **合計** | **13** |

### 失敗系/正常系比率チェック

| 項目 | 値 |
|------|-----|
| 正常系（Perspective: Equivalence - normal） | 4件 |
| 失敗系（Perspective: 上記以外すべて） | 9件 |
| 比率 | 9/4 = 2.25 |
| 判定 | OK: 失敗系 >= 正常系 |

## 4. 外部依存とモック方針

| 外部依存 | 種別 | モック方針 | 関連ケース |
|---------|------|----------|----------|
| `vscode.window.createStatusBarItem` | VS Code API | `vi.mock("vscode")` で `createStatusBarItem` を `vi.fn()` 化し、`text` / `tooltip` / `command` / `show` / `hide` を持つモック項目を返す | TC-001, TC-002, TC-003 |
| `context.subscriptions.push` | VS Code API | `ExtensionContext` の最小モックを用意し、`subscriptions.push` を `vi.fn()` または失敗用モックに差し替える | TC-001, TC-003 |
| `getConfig().showStatusBarItem()` | Internal config API | `vi.mock("./config")` で `getConfig` を差し替え、`showStatusBarItem` の戻り値・送出例外を制御する | TC-007, TC-008, TC-009, TC-010, TC-011, TC-012, TC-013 |
| `statusBarItem.show()` / `statusBarItem.hide()` | VS Code API | 返却されたモック項目の `show` / `hide` を `vi.fn()` または例外送出モックにし、呼び出し回数と伝播エラーを検証する | TC-007, TC-008, TC-009, TC-010, TC-012, TC-013 |

## 5. 既存テストとのギャップ

既存テスト分析はスキップ

## 6. 網羅性検証

| 検証項目 | 結果 |
|---------|------|
| 関数カバレッジ | 3/3 関数 (100%) |
| 分岐カバレッジ | 2/2 分岐 (100%) — `if` の true/false を TC-007〜TC-010 で網羅 |
| エラーパスカバレッジ | 0/0 パス (N/A) — 明示的な `throw` / `catch` なし |
| 境界値カバレッジ | 3/3 候補 (100%) — `numRepos` の `-1`, `0`, `1` |
| 失敗系/正常系比率 | 9/4 OK |

## 7. Next Step

テストコード生成:

```
/test-gen docs/testing/perspectives/src/statusBarItem-test.md
```
