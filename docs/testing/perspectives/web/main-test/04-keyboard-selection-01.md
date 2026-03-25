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
