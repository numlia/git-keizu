# テスト観点表: web/stashMenu.ts

> Source: `web/stashMenu.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: 返り値配列の構造

> Origin: test-plan
> Added: 2026-03-21
> Status: active
> Supersedes: -

**シグネチャ**: `buildStashContextMenuItems(repo: string, hash: string, selector: string, sourceElem: HTMLElement): ContextMenuElement[]`
**テスト対象パス**: `web/stashMenu.ts:4-108`

| Case ID | Input / Precondition                                                            | Perspective (Equivalence / Boundary) | Expected Result                                                                                                                                                                                                           | Notes              |
| ------- | ------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| TC-001  | repo="repo1", hash="abc123", selector="stash@{0}", sourceElem=valid HTMLElement | Equivalence - normal                 | 返り値が7要素の配列で、index 0-3が非null、index 4がnull（セパレータ）、index 5-6が非null                                                                                                                                  | L10-107            |
| TC-002  | 同上                                                                            | Equivalence - normal                 | 各メニューtitle: [0]=`Apply Stash${ELLIPSIS}`, [1]=`Create Branch from Stash${ELLIPSIS}`, [2]=`Pop Stash${ELLIPSIS}`, [3]=`Drop Stash${ELLIPSIS}`, [5]="Copy Stash Name to Clipboard", [6]="Copy Stash Hash to Clipboard" | L12,32,51,71,88,98 |

## S2: Apply Stash メニュー項目

> Origin: test-plan
> Added: 2026-03-21
> Status: active
> Supersedes: -

**テスト対象パス**: `web/stashMenu.ts:11-30`

| Case ID | Input / Precondition                     | Perspective (Equivalence / Boundary) | Expected Result                                                                                                                                                                                       | Notes  |
| ------- | ---------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| TC-003  | Apply Stash の onClick 実行              | Equivalence - normal                 | showCheckboxDialog が1回呼ばれ、引数: message に escapeHtml(selector) の結果を含む HTML, label="Reinstate Index", defaultValue=false, actionName="Yes, apply stash", callback=関数, target=sourceElem | L14-28 |
| TC-004  | Apply コールバック: reinstateIndex=true  | Equivalence - normal                 | sendMessage({command:"applyStash", repo:"repo1", selector:"stash@{0}", reinstateIndex:true}) が1回呼ばれる                                                                                            | L20-25 |
| TC-005  | Apply コールバック: reinstateIndex=false | Equivalence - normal                 | sendMessage({command:"applyStash", repo:"repo1", selector:"stash@{0}", reinstateIndex:false}) が1回呼ばれる                                                                                           | L20-25 |

## S3: Create Branch from Stash メニュー項目

> Origin: test-plan
> Added: 2026-03-21
> Status: active
> Supersedes: -

**テスト対象パス**: `web/stashMenu.ts:31-49`

| Case ID | Input / Precondition                              | Perspective (Equivalence / Boundary) | Expected Result                                                                                                                                                        | Notes  |
| ------- | ------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| TC-006  | Create Branch の onClick 実行                     | Equivalence - normal                 | showRefInputDialog が1回呼ばれ、引数: message に escapeHtml(selector) の結果を含む HTML, defaultValue="", actionName="Create Branch", callback=関数, target=sourceElem | L34-47 |
| TC-007  | Create Branch コールバック: name="feature-branch" | Equivalence - normal                 | sendMessage({command:"branchFromStash", repo:"repo1", branchName:"feature-branch", selector:"stash@{0}"}) が1回呼ばれる                                                | L39-44 |

## S4: Pop Stash メニュー項目

> Origin: test-plan
> Added: 2026-03-21
> Status: active
> Supersedes: -

**テスト対象パス**: `web/stashMenu.ts:50-68`

| Case ID | Input / Precondition                   | Perspective (Equivalence / Boundary) | Expected Result                                                                                                                                                                                                           | Notes  |
| ------- | -------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| TC-008  | Pop Stash の onClick 実行              | Equivalence - normal                 | showCheckboxDialog が1回呼ばれ、引数: message に escapeHtml(selector) と "remove the stash entry" を含む HTML, label="Reinstate Index", defaultValue=false, actionName="Yes, pop stash", callback=関数, target=sourceElem | L53-66 |
| TC-009  | Pop コールバック: reinstateIndex=true  | Equivalence - normal                 | sendMessage({command:"popStash", repo:"repo1", selector:"stash@{0}", reinstateIndex:true}) が1回呼ばれる                                                                                                                  | L59-64 |
| TC-010  | Pop コールバック: reinstateIndex=false | Equivalence - normal                 | sendMessage({command:"popStash", repo:"repo1", selector:"stash@{0}", reinstateIndex:false}) が1回呼ばれる                                                                                                                 | L59-64 |

## S5: Drop Stash メニュー項目

> Origin: test-plan
> Added: 2026-03-21
> Status: active
> Supersedes: -

**テスト対象パス**: `web/stashMenu.ts:70-85`

| Case ID | Input / Precondition       | Perspective (Equivalence / Boundary) | Expected Result                                                                                                                               | Notes  |
| ------- | -------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| TC-011  | Drop Stash の onClick 実行 | Equivalence - normal                 | showConfirmationDialog が1回呼ばれ、引数: message に escapeHtml(selector) と "cannot be undone" を含む HTML, callback=関数, target=sourceElem | L73-83 |
| TC-012  | Drop コールバック実行      | Equivalence - normal                 | sendMessage({command:"dropStash", repo:"repo1", selector:"stash@{0}"}) が1回呼ばれる                                                          | L76-80 |

## S6: Copy to Clipboard メニュー項目

> Origin: test-plan
> Added: 2026-03-21
> Status: active
> Supersedes: -

**テスト対象パス**: `web/stashMenu.ts:87-106`

| Case ID | Input / Precondition            | Perspective (Equivalence / Boundary) | Expected Result                                                                                              | Notes    |
| ------- | ------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------- |
| TC-013  | Copy Stash Name の onClick 実行 | Equivalence - normal                 | sendMessage({command:"copyToClipboard", type:"Stash Name", data:"stash@{0}"}) が1回呼ばれる（data=selector） | L90-94   |
| TC-014  | Copy Stash Hash の onClick 実行 | Equivalence - normal                 | sendMessage({command:"copyToClipboard", type:"Stash Hash", data:"abc123"}) が1回呼ばれる（data=hash）        | L100-104 |

## S7: 入力境界値 / HTMLエスケープ検証

> Origin: test-plan
> Added: 2026-03-21
> Status: active
> Supersedes: -

**テスト対象パス**: `web/stashMenu.ts:4-108`

| Case ID | Input / Precondition                                 | Perspective (Equivalence / Boundary) | Expected Result                                                                                          | Notes                                         |
| ------- | ---------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| TC-015  | selector="" (空文字)                                 | Boundary - empty                     | 全ダイアログメッセージに escapeHtml("") の結果（空文字）が埋め込まれ、sendMessage の selector/data が "" | 4箇所の escapeHtml 呼出                       |
| TC-016  | repo="" (空文字)                                     | Boundary - empty                     | 全 sendMessage 呼出の repo フィールドが ""                                                               | バリデーションなし                            |
| TC-017  | hash="" (空文字)                                     | Boundary - empty                     | Copy Hash の sendMessage data が ""                                                                      | L100-104                                      |
| TC-018  | selector=`<b>&"test'</b>` (HTML特殊文字)             | Boundary - special chars             | 全ダイアログメッセージで HTML特殊文字がエスケープされた形式で埋め込まれる                                | escapeHtml L15,35,54,74                       |
| TC-019  | selector=`<script>alert(1)</script>` (XSS)           | Equivalence - abnormal               | ダイアログメッセージ内で `<script>` がエスケープされ、スクリプト実行されない形式になる                   | XSS防止                                       |
| TC-020  | selector="stash@{0}" (典型的stash参照)               | Boundary - stash format              | `@` と `{}` は escapeHtml のエスケープ対象外のため、そのままダイアログメッセージに含まれる               | escapeHtml は `&<>"'/` の6種のみ              |
| TC-021  | selector="日本語スタッシュ" (unicode)                | Type - unicode                       | escapeHtml を通過し、ダイアログメッセージに unicode がそのまま埋め込まれる                               | -                                             |
| TC-022  | selector="line1\nline2" (改行文字含む)               | Boundary - whitespace                | escapeHtml は改行をエスケープせず、そのままダイアログ HTML に埋め込まれる                                | ダイアログ表示は HTML 解釈に依存              |
| TC-023  | selector="&amp;already-encoded" (事前エンコード済み) | Boundary - double encoding           | escapeHtml が `&` を再エスケープし `&amp;amp;already-encoded` になる                                     | 二重エンコードの確認                          |
| TC-024  | repo="/path/with spaces/repo" (空白含むパス)         | Boundary - spaces                    | sendMessage の repo にそのまま渡される                                                                   | バリデーションなし                            |
| TC-025  | hash="not-a-hex-value" (非16進文字)                  | Type - invalid format                | sendMessage の data にそのまま渡される（バリデーションなし）                                             | Copy Hash                                     |
| TC-026  | selector=null (TypeScript型違反 runtime)             | Boundary - null                      | escapeHtml(null) の挙動に依存（エラーまたは "null" 文字列化）                                            | TS型は string だが runtime では null の可能性 |
| TC-027  | hash=null (TypeScript型違反 runtime)                 | Boundary - null                      | sendMessage の data に null が渡される                                                                   | 同上                                          |
| TC-028  | selector="a".repeat(10000) (極長文字列)              | Boundary - max length                | escapeHtml と sendMessage に切り詰めなく渡される（関数内に truncation 処理なし）                         | -                                             |
