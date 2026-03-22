# Test Plan: diffDocProvider

> Generated: 2026-03-21T00:00:00+09:00
> Source: `src/diffDocProvider.ts`
> Language: TypeScript
> Test Framework: Vitest

## 1. ソース概要

| 項目            | 値                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| ファイルパス    | `src/diffDocProvider.ts`                                                                                |
| 主要な責務      | Git diff表示用TextDocumentContentProviderの実装。URIエンコード/デコードとキャッシュ付きドキュメント取得 |
| 関数/メソッド数 | 6（exportedクラス1 + exported関数2 + 内部関数1 + 内部クラス1をprovideTextDocumentContent経由でテスト）  |
| 総分岐数        | 3                                                                                                       |
| エラーパス数    | 0（明示的なエラーハンドリングなし。getCommitFileのrejectionが未捕捉で伝播）                             |
| 外部依存数      | 3（vscode.workspace.onDidCloseTextDocument, DataSource.getCommitFile, vscode.Uri.parse）                |

## 2. テスト観点表

### 2.1 encodeDiffDocUri

**シグネチャ**: `export function encodeDiffDocUri(repo: string, filePath: string, commit: string): vscode.Uri`
**テスト対象パス**: `src/diffDocProvider.ts:58-62`

| Case ID | Input / Precondition                                                                            | Perspective (Equivalence / Boundary) | Expected Result                                                                                                                           | Notes                                   |
| ------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| TC-001  | repo="/path/to/repo", filePath="src/file.ts", commit="abc123"                                   | Equivalence - normal                 | 返り値URIのschemeが"git-keizu"、pathにgetPathFromStr("src/file.ts")の結果を含み、queryに"commit=abc123"と"repo=%2Fpath%2Fto%2Frepo"を含む | 基本的なURI構築の検証                   |
| TC-002  | repo="/repo", filePath="dir/file.ts", commit="abc def" (スペース含む)                           | Equivalence - normal                 | queryのcommit値が"abc%20def"にエンコードされること                                                                                        | encodeURIComponentの動作確認            |
| TC-003  | repo="", filePath="src/file.ts", commit="abc"                                                   | Equivalence - abnormal               | URIのqueryに"repo="（空値）が含まれること                                                                                                 | L60: 入力バリデーションなし             |
| TC-004  | repo="/repo", filePath="", commit="abc"                                                         | Equivalence - abnormal               | URIのpathがgetPathFromStr("")の戻り値であること                                                                                           | L60: getPathFromStrに空文字列が渡される |
| TC-005  | repo="/repo", filePath="src/file.ts", commit=""                                                 | Equivalence - abnormal               | URIのqueryに"commit="（空値）が含まれること                                                                                               | L60: 入力バリデーションなし             |
| TC-006  | repo="/path?q=1&x=2", filePath="file.ts", commit="abc"                                          | Boundary - special chars in repo     | queryのrepo値で"?"が"%3F"、"&"が"%26"、"="が"%3D"にエンコードされること                                                                   | encodeURIComponentがURI特殊文字を処理   |
| TC-007  | repo="/repo", filePath="dir/my file.ts" (スペース含む), commit="abc"                            | Boundary - space in filePath         | URIのpath部分にスペースが反映されること（getPathFromStrの正規化結果）                                                                     | getPathFromStrの処理に依存              |
| TC-008  | repo="/repo", filePath="dir\\file.ts" (バックスラッシュ), commit="abc"                          | Boundary - backslash in filePath     | getPathFromStrによりパス区切りが正規化されたpathを含むこと                                                                                | Windows形式パスの扱い                   |
| TC-009  | repo="/repo", filePath="file.ts", commit="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2" (40文字hex) | Boundary - full SHA hash             | queryのcommit値が40文字のハッシュ値をそのまま含むこと                                                                                     | 通常のgit commitハッシュ長              |

### 2.2 decodeDiffDocUri

**シグネチャ**: `export function decodeDiffDocUri(uri: vscode.Uri): { filePath: string; commit: string; repo: string }`
**テスト対象パス**: `src/diffDocProvider.ts:64-67`
**内部依存**: `decodeUriQueryArgs` (L69-78)

| Case ID | Input / Precondition                                                        | Perspective (Equivalence / Boundary) | Expected Result                                                       | Notes                                                                            |
| ------- | --------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| TC-010  | uri.query="commit=abc123&repo=%2Fpath%2Fto%2Frepo", uri.path="/src/file.ts" | Equivalence - normal                 | { filePath: "/src/file.ts", commit: "abc123", repo: "/path/to/repo" } | 基本的なデコード                                                                 |
| TC-011  | uri.query="commit=abc%20def&repo=%2Frepo", uri.path="/file.ts"              | Equivalence - normal                 | { filePath: "/file.ts", commit: "abc def", repo: "/repo" }            | パーセントエンコードのデコード確認                                               |
| TC-012  | uri.query=""（空文字列）, uri.path="/file.ts"                               | Equivalence - abnormal               | filePath="/file.ts"、commitとrepoはundefined                          | L70: split("&")→[""]、split("=")→[""]でpair[1]はundefined。L75: 空文字列がセット |
| TC-013  | uri.query="commit=abc"（repoなし）, uri.path="/file.ts"                     | Equivalence - abnormal               | { filePath: "/file.ts", commit: "abc", repo: undefined }              | repoキーが存在しない                                                             |
| TC-014  | uri.query="repo=%2Frepo"（commitなし）, uri.path="/file.ts"                 | Equivalence - abnormal               | { filePath: "/file.ts", commit: undefined, repo: "/repo" }            | commitキーが存在しない                                                           |
| TC-015  | uri.query="key"（"="なし）, uri.path="/file.ts"                             | Equivalence - abnormal               | 返り値オブジェクトのkeyプロパティが""（空文字列）                     | L75: pair[1]===undefined → 空文字列フォールバック                                |
| TC-016  | uri.query="commit=&repo=%2Frepo", uri.path="/file.ts"                       | Boundary - empty value               | { filePath: "/file.ts", commit: "", repo: "/repo" }                   | L75: pair[1]===""、decodeURIComponent("")===""                                   |
| TC-017  | uri.query="key=first&key=second"（重複キー）, uri.path="/file.ts"           | Boundary - duplicate keys            | keyプロパティが"second"（後勝ち）                                     | L75: forループで後のキーが上書き                                                 |
| TC-018  | uri.path=""（空パス）, uri.query="commit=abc&repo=%2Frepo"                  | Boundary - empty path                | { filePath: "", commit: "abc", repo: "/repo" }                        | L66: uri.pathがそのまま返される                                                  |
| TC-019  | uri.query="commit=%20%26%3D&repo=%2Frepo", uri.path="/file.ts"              | Boundary - encoded special chars     | { filePath: "/file.ts", commit: " &=", repo: "/repo" }                | decodeURIComponentが%20→スペース、%26→&、%3D→=に変換                             |

### 2.3 DiffDocProvider.constructor

**シグネチャ**: `constructor(dataSource: DataSource)`
**テスト対象パス**: `src/diffDocProvider.ts:13-18`

| Case ID | Input / Precondition                                                           | Perspective (Equivalence / Boundary) | Expected Result                                                               | Notes                                               |
| ------- | ------------------------------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| TC-020  | dataSource=有効なDataSourceモック                                              | Equivalence - normal                 | インスタンスが生成され、docsが空のMapで初期化されること                       | vscode.workspace.onDidCloseTextDocumentの購読を確認 |
| TC-021  | provideTextDocumentContentで1件キャッシュ後、該当URIのドキュメントが閉じられる | Equivalence - normal                 | onDidCloseTextDocumentコールバックにより該当URIがキャッシュから削除されること | L15-17: docs.delete(doc.uri.toString())             |
| TC-022  | キャッシュにないURIのドキュメントが閉じられる                                  | Equivalence - abnormal               | エラーが発生せず、キャッシュが変更されないこと                                | Map.delete()は存在しないキーに対してfalseを返すのみ |

### 2.4 DiffDocProvider.dispose

**シグネチャ**: `public dispose(): void`
**テスト対象パス**: `src/diffDocProvider.ts:20-24`

| Case ID | Input / Precondition                           | Perspective (Equivalence / Boundary) | Expected Result                                                                                                            | Notes                        |
| ------- | ---------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| TC-023  | キャッシュに2件のドキュメントが存在する状態    | Equivalence - normal                 | subscriptions.dispose()が1回呼ばれ、docs.clear()で全エントリが削除され、onDidChangeEventEmitter.dispose()が1回呼ばれること | L21-23: 3つのリソース解放    |
| TC-024  | キャッシュが空の状態                           | Boundary - empty cache               | subscriptions.dispose()、docs.clear()、eventEmitter.dispose()がすべて正常に呼ばれ、エラーが発生しないこと                  | 空Mapに対するclear()はno-op  |
| TC-025  | キャッシュに複数件のドキュメントが存在する状態 | Boundary - multiple entries          | docs.clear()後にMap.sizeが0であること                                                                                      | 全エントリが確実に削除される |

### 2.5 DiffDocProvider.provideTextDocumentContent

**シグネチャ**: `public async provideTextDocumentContent(uri: vscode.Uri): Promise<string>`
**テスト対象パス**: `src/diffDocProvider.ts:30-43`

| Case ID | Input / Precondition                                         | Perspective (Equivalence / Boundary) | Expected Result                                                                                                                       | Notes                                                |
| ------- | ------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| TC-026  | キャッシュに該当URIなし、getCommitFileが"file content"を返す | Equivalence - normal                 | getCommitFileがrequest.repo, request.commit, request.filePathで1回呼ばれ、戻り値が"file content"、該当URIがキャッシュに追加されること | L31-42: キャッシュミス→取得→キャッシュ→返却          |
| TC-027  | キャッシュに該当URIが存在し、値が"cached content"            | Equivalence - normal                 | getCommitFileが呼ばれず、戻り値が"cached content"であること                                                                           | L32: 早期リターン分岐                                |
| TC-028  | キャッシュに該当URIなし、getCommitFileが空文字列を返す       | Boundary - empty content             | 戻り値が""（空文字列）、該当URIがキャッシュに追加されること                                                                           | DiffDocumentは空文字列も保持する                     |
| TC-029  | キャッシュに該当URIなし、getCommitFileがErrorでrejectする    | External - DataSource failure        | Promiseがgetcommitfileと同じErrorでrejectすること                                                                                     | L35-39: try-catchなしのため、rejectionがそのまま伝播 |

### 2.6 DiffDocProvider.onDidChange

**シグネチャ**: `get onDidChange(): vscode.Event<vscode.Uri>`
**テスト対象パス**: `src/diffDocProvider.ts:26-28`

| Case ID | Input / Precondition              | Perspective (Equivalence / Boundary) | Expected Result                                                | Notes                          |
| ------- | --------------------------------- | ------------------------------------ | -------------------------------------------------------------- | ------------------------------ |
| TC-030  | DiffDocProviderインスタンス生成後 | Equivalence - normal                 | onDidChangeプロパティがonDidChangeEventEmitter.eventを返すこと | 単純なgetterアクセサ。分岐なし |

## 3. テストケースサマリー

| カテゴリ (Perspective列で分類)   | ケース数 |
| -------------------------------- | -------- |
| 正常系（Equivalence - normal）   | 10       |
| 異常系（Equivalence - abnormal） | 8        |
| 境界値（Boundary - ...）         | 10       |
| 型・形式（Type - ...）           | 0        |
| 外部依存（External - ...）       | 2        |
| **合計**                         | **30**   |

### 失敗系/正常系比率チェック

| 項目                                        | 値                   |
| ------------------------------------------- | -------------------- |
| 正常系（Perspective: Equivalence - normal） | 10件                 |
| 失敗系（Perspective: 上記以外すべて）       | 20件                 |
| 比率                                        | 2.0 (20/10)          |
| 判定                                        | OK: 失敗系 >= 正常系 |

## 4. 外部依存とモック方針

| 外部依存                                | 種別    | モック方針                                                                                                | 関連ケース     |
| --------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------- | -------------- |
| vscode.Uri.parse                        | API     | vi.fnでスタブ化。入力文字列に対応するUriオブジェクト（scheme, path, query, toString()）を返すモックを作成 | TC-001〜TC-009 |
| vscode.workspace.onDidCloseTextDocument | API     | vi.fnでスタブ化。返り値としてDisposableモックを返し、コールバック関数をキャプチャして手動で発火可能にする | TC-020〜TC-022 |
| DataSource.getCommitFile                | API     | vi.fnでスタブ化。repo, commit, filePathを受け取り、Promiseで文字列を返す（rejectionケースも設定可能）     | TC-026〜TC-029 |
| getPathFromStr                          | Utility | vi.mockでモジュールモック化。入力パスに対する正規化結果を返す                                             | TC-001〜TC-009 |

## 5. 既存テストとのギャップ

既存テスト分析はスキップ

## 6. 網羅性検証

| 検証項目             | 結果                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| 関数カバレッジ       | 6/6 関数 (100%)                                                                                   |
| 分岐カバレッジ       | 3/3 分岐 (100%) — L32キャッシュ判定(TC-026,027)、L75三項演算子(TC-015,016)、forループ(TC-010,012) |
| エラーパスカバレッジ | 1/1 パス (100%) — getCommitFile rejection伝播(TC-029)                                             |
| 境界値カバレッジ     | 10/10 候補 (100%)                                                                                 |
| 失敗系/正常系比率    | 20/10 OK                                                                                          |

## 7. Next Step

テストコード生成:

```
/test-gen docs/testing/perspectives/src/diffDocProvider-test.md
```
