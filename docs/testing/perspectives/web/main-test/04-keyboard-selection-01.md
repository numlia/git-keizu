# テスト観点表: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-03-22T14:25:09Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: keyboard-selection

## S10: handleKeyboardShortcut() ショートカットキーマッチング

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**シグネチャ**: `handleKeyboardShortcut(e: KeyboardEvent): void`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                               | Notes                  |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------- |
| TC-065  | Ctrl+F (config find="f")                          | Normal - standard                                                          | findWidget.show(true) が呼ばれる                              | Find アクション        |
| TC-066  | Cmd+F (metaKey=true, config find="f")             | Normal - macOS                                                             | findWidget.show(true) が呼ばれる                              | macOS対応              |
| TC-067  | Ctrl+R (config refresh="r")                       | Normal - standard                                                          | refresh(true) が呼ばれる                                      | Refresh アクション     |
| TC-068  | Ctrl+H (config scrollToHead="h"), commitHead 存在 | Normal - standard                                                          | scrollToCommit(commitHead, true, true) が呼ばれる             | HEAD スクロール        |
| TC-069  | Ctrl+H, commitHead が null                        | Boundary - no HEAD                                                         | 何も起きない                                                  | HEAD 不在時            |
| TC-070  | キー押下（Ctrl/Cmd なし）                         | Validation - no modifier                                                   | 何も起きない                                                  | 修飾キーなし           |
| TC-071  | Ctrl + 設定に存在しないキー                       | Validation - unmapped key                                                  | 何も起きない                                                  | マッチなし             |
| TC-072  | isComposing=true の状態でCtrl+F                   | Boundary - IME composing                                                   | 何も起きない                                                  | IME入力中は無視        |
| TC-073  | Shift+Ctrl+F (Shift修飾あり)                      | Normal - with shift                                                        | e.key を toLowerCase して "f" にマッチ、findWidget.show(true) | Shift時の大文字対応    |
| TC-074  | Ctrl+F だが find 設定が null (UNASSIGNED)         | Boundary - disabled shortcut                                               | 何も起きない                                                  | ショートカット無効化時 |

## S11: scrollToStash() スタッシュナビゲーション

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**シグネチャ**: `scrollToStash(forward: boolean): void`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                 | Notes                       |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------- |
| TC-075  | forward=true, stash 3件, index=-1 (初期)          | Normal - first nav                                                         | 最初の stash (index 0) にスクロール、フラッシュ | index=-1 → 0                |
| TC-076  | forward=true, stash 3件, index=0                  | Normal - standard                                                          | 次の stash (index 1) にスクロール               | 前方移動                    |
| TC-077  | forward=true, stash 3件, index=2 (末尾)           | Boundary - wrap forward                                                    | 最初の stash (index 0) に循環移動               | 末尾 → 先頭                 |
| TC-078  | forward=false (Shift), stash 3件, index=-1 (初期) | Normal - reverse first nav                                                 | 最後の stash (index 2) にスクロール             | 逆方向初期                  |
| TC-079  | forward=false, stash 3件, index=0 (先頭)          | Boundary - wrap backward                                                   | 最後の stash (index 2) に循環移動               | 先頭 → 末尾                 |
| TC-080  | stash コミットが 0 件                             | Boundary - no stashes                                                      | 何も起きない（サイレント）                      | stash 不在                  |
| TC-081  | stash 操作後、5秒タイムアウト経過                 | Boundary - timeout reset                                                   | stashNavigationIndex が -1 にリセットされる     | STASH_NAVIGATION_TIMEOUT_MS |
| TC-082  | stash 1件のみ, forward=true                       | Boundary - single stash                                                    | 同じ stash にスクロール（循環）                 | index 0 → 0                 |

## S29: handleKeyboardShortcut() Arrow キー テーブル順ナビゲーション

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                          | Notes       |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | ----------- |
| TC-164  | expandedCommit あり、index=2、ArrowDown（修飾キーなし）        | Normal - standard                                                          | index=3 のコミット詳細を表示（loadCommitDetails 呼出）   | REQ-2.1     |
| TC-165  | expandedCommit あり、index=2、ArrowUp（修飾キーなし）          | Normal - standard                                                          | index=1 のコミット詳細を表示（loadCommitDetails 呼出）   | REQ-2.1     |
| TC-166  | expandedCommit あり、index=0（先頭）、ArrowUp                  | Boundary - table start                                                     | 何も起きない（loadCommitDetails 未呼出、イベント未消費） | newIndex=-1 |
| TC-167  | expandedCommit あり、index=commits.length-1（末尾）、ArrowDown | Boundary - table end                                                       | 何も起きない（loadCommitDetails 未呼出、イベント未消費） | 範囲外      |

## S30: handleKeyboardShortcut() Arrow キー ブランチ追跡ナビゲーション

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                          | Notes   |
| ------- | -------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | ------- |
| TC-168  | expandedCommit あり、Ctrl+ArrowDown                      | Normal - standard                                                          | getFirstParentIndex で同一ブランチの親へ移動             | REQ-2.2 |
| TC-169  | expandedCommit あり、Ctrl+ArrowUp                        | Normal - standard                                                          | getFirstChildIndex で同一ブランチの子へ移動              | REQ-2.2 |
| TC-170  | ブランチ終端、Ctrl+ArrowDown（getFirstParentIndex → -1） | Boundary - branch end                                                      | 何も起きない（loadCommitDetails 未呼出、イベント未消費） | -       |
| TC-171  | ブランチ始端、Ctrl+ArrowUp（getFirstChildIndex → -1）    | Boundary - branch start                                                    | 何も起きない（loadCommitDetails 未呼出、イベント未消費） | -       |

## S31: handleKeyboardShortcut() Arrow キー 代替ブランチナビゲーション

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                               | Notes   |
| ------- | -------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- | ------- |
| TC-172  | マージコミット展開中、Ctrl+Shift+ArrowDown               | Normal - standard                                                          | getAlternativeParentIndex で代替親コミットへ移動              | REQ-2.3 |
| TC-173  | 展開中、Ctrl+Shift+ArrowUp                               | Normal - standard                                                          | getAlternativeChildIndex で代替子コミットへ移動               | REQ-2.3 |
| TC-174  | 代替ブランチなし（親/子が1つ以下）、Ctrl+Shift+ArrowDown | Normal - fallback                                                          | フォールバック動作（親が1つならその親、なしなら何も起きない） | -       |

## S32: handleKeyboardShortcut() Arrow キー 前提条件チェック

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                      | Notes      |
| ------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------- | ---------- |
| TC-175  | expandedCommit が null の状態で ArrowDown              | Validation - rejected precondition                                         | Arrow キー処理スキップ（loadCommitDetails 未呼出）   | REQ-2.4    |
| TC-176  | expandedCommit.compareWithHash が非 null で ArrowDown  | Validation - rejected precondition                                         | Arrow キー処理スキップ（比較モード中）               | REQ-2.4    |
| TC-177  | commitLookup に expandedCommit.hash が不在で ArrowDown | Boundary - unknown hash                                                    | ナビゲーション処理スキップ                           | -          |
| TC-178  | isComposing=true の状態で ArrowDown                    | Validation - rejected precondition                                         | handleKeyboardShortcut 全体が即座に return           | IME 入力中 |
| TC-179  | expandedCommit あり、ArrowLeft キー                    | Validation - rejected precondition                                         | Arrow キー処理スキップ（ArrowUp/ArrowDown のみ対象） | -          |

## S33: handleKeyboardShortcut() Arrow キー イベント制御

> Origin: Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)
> Added: 2026-03-08
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                        | Notes          |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ | -------------- |
| TC-180  | ナビゲーション成功（有効な newIndex + DOM 要素あり） | Normal - standard                                                          | preventDefault() と stopPropagation() が呼び出される   | REQ-2.5        |
| TC-181  | ナビゲーション失敗（newIndex=-1 or DOM 要素なし）    | Normal - no nav                                                            | preventDefault() と stopPropagation() が呼び出されない | イベント透過   |
| TC-182  | Shift のみ + ArrowUp（Ctrl/Cmd なし）                | Validation - rejected precondition                                         | Arrow キー処理スキップ（修飾キーパターン不一致）       | フォールスルー |
| TC-183  | Alt + ArrowUp（Ctrl/Cmd なし）                       | Validation - rejected precondition                                         | Arrow キー処理スキップ（修飾キーパターン不一致）       | フォールスルー |

## S40: handleEscape() 優先順位チェーン

> Origin: test-plan (既存コード網羅)
> Added: 2026-05-17
> Status: active
> Supersedes: -
> Signature: `handleEscape(): void`
> Target Path: `web/main.ts`

Escape キー押下時の dismissal チェーン: `contextMenu → dialog → repoDropdown → branchDropdown → authorDropdown → findWidget → expandedCommit`。各レベルで該当する UI が active なら hide / close を呼んで早期 return し、後段は実行されない。

| Case ID | Input / Precondition                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                             | Notes                          |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-221  | `isContextMenuActive()` が true                           | Normal - first priority                                                    | `hideContextMenu()` が 1 回呼ばれ、以降の hide 系（dialog/dropdown/findWidget）は呼ばれない | 最優先で context menu を閉じる |
| TC-222  | contextMenu inactive、`isDialogActive()` true             | Normal - second priority                                                   | `hideDialog()` が 1 回呼ばれ、dropdown / findWidget / expandedCommit は触られない           | dialog 優先                    |
| TC-223  | contextMenu/dialog inactive、`repoDropdown.isOpen()` true | Normal - third priority                                                    | `repoDropdown.close()` が呼ばれ、後段の branch/author dropdown は close されない            | repo dropdown のみ閉じる       |
| TC-224  | repo dropdown も閉じている、`findWidget.isVisible()` true | Normal - findWidget priority                                               | `findWidget.close()` が呼ばれ、`hideCommitDetails` は呼ばれない                             | findWidget が次優先            |
| TC-225  | findWidget も非表示、`expandedCommit !== null`            | Normal - last fallback                                                     | `hideCommitDetails()` が呼ばれる                                                            | チェーンの最後段               |
| TC-226  | 上記すべて非アクティブ                                    | Boundary - no active UI                                                    | hide/close 系 API は一切呼ばれず、Escape は no-op として透過する                            | DOM 状態に副作用なし           |
| TC-227  | `contextMenu` と `dialog` が両方 active                   | Validation - priority order                                                | `hideContextMenu()` のみ呼ばれ、`hideDialog()` は呼ばれない                                 | contextMenu が dialog より優先 |
| TC-228  | `repoDropdown` と `branchDropdown` が両方 open            | Validation - priority order                                                | `repoDropdown.close()` のみ呼ばれ、`branchDropdown.close()` は呼ばれない                    | 宣言順に最初に open のもの優先 |

## S46: handleKeyboardShortcut() Arrow ナビゲーション分岐の入力可能要素ガード

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `handleKeyboardShortcut(e: KeyboardEvent): void` の Arrow 分岐 + 入力可能要素判定 predicate
> Target Path: `web/main.ts:1226-1263`

ArrowUp/ArrowDown のコミット移動分岐に、event target が入力可能要素（`input` / `textarea` / `select` / contenteditable）かを判定する小さな predicate を追加し、入力可能要素からの発火時はコミット移動せず return する修正。predicate は Arrow 分岐内だけで使用し、関数先頭では return しない（入力中の Ctrl/Cmd+F 等のグローバルショートカットと、非入力要素の既存 Arrow ナビゲーションを維持する）。[4] の修正。既存 S29〜S33 の Arrow ナビゲーション観点は変更しない。

| Case ID | Input / Precondition                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                         | Notes                                 |
| ------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| TC-257  | CDV 展開中（移動可能な index）、`<input>` 要素を target に ArrowDown keydown を dispatch   | Validation - input target の抑止                                           | `loadCommitDetails` 呼び出し 0 回、`preventDefault()` / `stopPropagation()` 呼び出し 0 回（キャレット操作が奪われない） | 検索欄・ダイアログ入力の代表          |
| TC-258  | CDV 展開中、`<textarea>` 要素を target に ArrowUp keydown を dispatch                      | Validation - textarea target の抑止                                        | `loadCommitDetails` 0 回、`preventDefault()` / `stopPropagation()` 0 回                                                 | -                                     |
| TC-259  | CDV 展開中、`<select>` 要素を target に ArrowDown keydown を dispatch                      | Validation - select target の抑止                                          | `loadCommitDetails` 0 回、`preventDefault()` / `stopPropagation()` 0 回                                                 | ドロップダウン操作の維持              |
| TC-260  | CDV 展開中、`contenteditable` な要素を target に ArrowDown keydown を dispatch             | Validation - contenteditable target の抑止                                 | `loadCommitDetails` 0 回、`preventDefault()` / `stopPropagation()` 0 回                                                 | `document.activeElement` に依存しない |
| TC-261  | CDV 展開中、`document.body` を target に ArrowDown keydown を dispatch（隣接コミットあり） | Normal - 非入力要素の既存ナビ維持                                          | `loadCommitDetails` が1回呼ばれ、`preventDefault()` / `stopPropagation()` が各1回呼ばれる（S29 TC-164 と同挙動）        | ガード追加による退行なし              |
| TC-262  | `<input>` 要素を target に Ctrl+F keydown を dispatch（config find="f"）                   | Normal - 入力中のグローバルショートカット維持                              | `findWidget.show(true)` が1回呼ばれる（関数先頭での一律 return が存在しない）                                           | NO-GO 条件（先頭 return）の検出       |

### 失敗源インベントリ（include-or-justify）— Feature 045 追加分（S46）

| 失敗源                                                           | 対応ケースまたは除外理由                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `input` からの Arrow でコミット移動（入力横取り）                | TC-257                                                             |
| `textarea` からの Arrow                                          | TC-258                                                             |
| `select` からの Arrow                                            | TC-259                                                             |
| contenteditable からの Arrow                                     | TC-260                                                             |
| 関数先頭の一律 return による既存グローバルショートカットの無効化 | TC-262                                                             |
| 非入力要素の Arrow ナビゲーション退行                            | TC-261                                                             |
| IME 入力中の発火                                                 | excluded(既存 S32 TC-178 で担保済み。本変更で挙動を変えない)       |
| 修飾キーパターン・境界 index の分岐                              | excluded(既存 S29〜S33 で担保済み。本変更の対象は target 判定のみ) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-257、TC-258、TC-259、TC-260
- Exception: excluded(predicate は DOM プロパティ参照のみで throw 分岐を持たない)
- External: excluded(外部依存なし。keydown はテスト側で直接 dispatch する)
- Boundary: excluded(数値・空値境界が仕様上存在しない。target 種別4種の列挙が本変更の境界であり Validation 4件で充足)
- Type: excluded(event target は DOM 型で、実行時の型分岐は要素種別判定として Validation 4件に含まれる)

**失敗系/正常系比（煙感知器）**: 正常系2件（TC-261、TC-262）、失敗系4件（TC-257〜TC-260）、比2.0。
