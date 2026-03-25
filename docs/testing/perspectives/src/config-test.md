# テスト観点表: src/config.ts

> Source: `src/config.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: parseKeybinding() ショートカット設定値パース

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**シグネチャ**: `parseKeybinding(value: string, defaultValue: string): string | null`
**テスト対象パス**: `src/config.ts`

| Case ID | Input / Precondition                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result              | Notes                       |
| ------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------- | --------------------------- |
| TC-001  | value="CTRL/CMD + F", default="CTRL/CMD + F"                | Normal - standard                                                          | "f" を返す                   | 正規表現マッチ → 小文字変換 |
| TC-002  | value="CTRL/CMD + Z", default="CTRL/CMD + F"                | Normal - standard                                                          | "z" を返す                   | 末尾英字を抽出              |
| TC-003  | value="CTRL/CMD + A", default="CTRL/CMD + F"                | Normal - standard                                                          | "a" を返す                   | 先頭英字                    |
| TC-004  | value="UNASSIGNED", default="CTRL/CMD + F"                  | Normal - special value                                                     | null を返す                  | ショートカット無効化        |
| TC-005  | value="Ctrl+F" (不正形式), default="CTRL/CMD + F"           | Validation - invalid format                                                | "f" を返す（デフォルト適用） | スラッシュ・スペース不足    |
| TC-006  | value="" (空文字), default="CTRL/CMD + F"                   | Boundary - empty                                                           | "f" を返す（デフォルト適用） | 空入力                      |
| TC-007  | value="ctrl/cmd + f" (小文字), default="CTRL/CMD + F"       | Validation - case mismatch                                                 | "f" を返す（デフォルト適用） | 正規表現は大文字のみ許可    |
| TC-008  | value="CTRL/CMD + 1" (数字), default="CTRL/CMD + F"         | Validation - non-alpha                                                     | "f" を返す（デフォルト適用） | 英字以外は不正              |
| TC-009  | value="CTRL/CMD + F" (余分スペース), default="CTRL/CMD + F" | Boundary - extra whitespace                                                | "f" を返す（デフォルト適用） | 正規表現厳密一致            |
| TC-010  | value="CTRL/CMD + FF" (2文字), default="CTRL/CMD + F"       | Boundary - extra chars                                                     | "f" を返す（デフォルト適用） | 英字1文字のみ許可           |

## S2: sourceCodeProviderIntegrationLocation() SCMボタン位置設定

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**シグネチャ**: `sourceCodeProviderIntegrationLocation(): string`
**テスト対象パス**: `src/config.ts`

| Case ID | Input / Precondition     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result       | Notes            |
| ------- | ------------------------ | -------------------------------------------------------------------------- | --------------------- | ---------------- |
| TC-011  | 設定未指定（デフォルト） | Normal - default                                                           | "Inline" を返す       | デフォルト値     |
| TC-012  | 設定値="More Actions"    | Normal - standard                                                          | "More Actions" を返す | 有効な代替値     |
| TC-013  | 設定値="Inline"          | Normal - standard                                                          | "Inline" を返す       | 明示的デフォルト |

## S3: keyboardShortcut\*() キーボードショートカット設定

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**テスト対象パス**: `src/config.ts`

| Case ID | Input / Precondition                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes                     |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------- | --------------- | ------------------------- |
| TC-014  | keyboardShortcutFind() デフォルト             | Normal - standard                                                          | "f" を返す      | デフォルト "CTRL/CMD + F" |
| TC-015  | keyboardShortcutRefresh() デフォルト          | Normal - standard                                                          | "r" を返す      | デフォルト "CTRL/CMD + R" |
| TC-016  | keyboardShortcutScrollToHead() デフォルト     | Normal - standard                                                          | "h" を返す      | デフォルト "CTRL/CMD + H" |
| TC-017  | keyboardShortcutScrollToStash() デフォルト    | Normal - standard                                                          | "s" を返す      | デフォルト "CTRL/CMD + S" |
| TC-018  | keyboardShortcutFind() に "CTRL/CMD + A" 設定 | Normal - custom                                                            | "a" を返す      | カスタムキー              |
| TC-019  | keyboardShortcutFind() に "UNASSIGNED" 設定   | Normal - special value                                                     | null を返す     | ショートカット無効        |

## S4: loadMoreCommitsAutomatically() 自動読み込み設定

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**シグネチャ**: `loadMoreCommitsAutomatically(): boolean`
**テスト対象パス**: `src/config.ts`

| Case ID | Input / Precondition     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes          |
| ------- | ------------------------ | -------------------------------------------------------------------------- | --------------- | -------------- |
| TC-020  | 設定未指定（デフォルト） | Normal - default                                                           | true を返す     | デフォルト有効 |
| TC-021  | 設定値=false             | Normal - standard                                                          | false を返す    | 明示的無効化   |

## S5: muteCommitsMergeCommits() マージコミット mute 設定

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**シグネチャ**: `muteCommitsMergeCommits(): boolean`
**テスト対象パス**: `src/config.ts`

| Case ID | Input / Precondition     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes          |
| ------- | ------------------------ | -------------------------------------------------------------------------- | --------------- | -------------- |
| TC-022  | 設定未指定（デフォルト） | Normal - default                                                           | true を返す     | デフォルト有効 |
| TC-023  | 設定値 = false           | Normal - standard                                                          | false を返す    | 明示的無効化   |
| TC-024  | 設定値 = true            | Normal - standard                                                          | true を返す     | 明示的有効     |

## S6: muteCommitsNotAncestorsOfHead() 祖先外 mute 設定

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**シグネチャ**: `muteCommitsNotAncestorsOfHead(): boolean`
**テスト対象パス**: `src/config.ts`

| Case ID | Input / Precondition     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes          |
| ------- | ------------------------ | -------------------------------------------------------------------------- | --------------- | -------------- |
| TC-025  | 設定未指定（デフォルト） | Normal - default                                                           | false を返す    | デフォルト無効 |
| TC-026  | 設定値 = true            | Normal - standard                                                          | true を返す     | 明示的有効     |
| TC-027  | 設定値 = false           | Normal - standard                                                          | false を返す    | 明示的無効     |

## S7: dialogDefaults() ダイアログデフォルト設定

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**シグネチャ**: `dialogDefaults(): DialogDefaults`
**テスト対象パス**: `src/config.ts`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                            | Notes        |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| TC-028  | 全設定未指定（デフォルト）                           | Normal - default                                                           | merge.noFastForward=true, merge.squashCommits=false, merge.noCommit=false, cherryPick.recordOrigin=false, cherryPick.noCommit=false, stashUncommittedChanges.includeUntracked=false を返す | 全デフォルト |
| TC-029  | dialog.merge.noFastForward=false                     | Normal - custom                                                            | merge.noFastForward=false を返す                                                                                                                                                           | カスタム値   |
| TC-030  | dialog.merge.squashCommits=true                      | Normal - custom                                                            | merge.squashCommits=true を返す                                                                                                                                                            | カスタム値   |
| TC-031  | dialog.merge.noCommit=true                           | Normal - custom                                                            | merge.noCommit=true を返す                                                                                                                                                                 | カスタム値   |
| TC-032  | dialog.cherryPick.recordOrigin=true                  | Normal - custom                                                            | cherryPick.recordOrigin=true を返す                                                                                                                                                        | カスタム値   |
| TC-033  | dialog.cherryPick.noCommit=true                      | Normal - custom                                                            | cherryPick.noCommit=true を返す                                                                                                                                                            | カスタム値   |
| TC-034  | dialog.stashUncommittedChanges.includeUntracked=true | Normal - custom                                                            | stashUncommittedChanges.includeUntracked=true を返す                                                                                                                                       | カスタム値   |

## S8: commitOrdering() コミット表示順序設定

> Origin: Feature 015 (commit-sort-order) (aidd-spec-tasks-test)
> Added: 2026-03-10
> Status: active
> Supersedes: -

**シグネチャ**: `commitOrdering(): CommitOrdering`
**テスト対象パス**: `src/config.ts`

| Case ID | Input / Precondition     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result      | Notes        |
| ------- | ------------------------ | -------------------------------------------------------------------------- | -------------------- | ------------ |
| TC-035  | 設定未指定（デフォルト） | Normal - default                                                           | "date" を返す        | デフォルト値 |
| TC-036  | 設定値="topo"            | Normal - standard                                                          | "topo" を返す        | 有効な代替値 |
| TC-037  | 設定値="author-date"     | Normal - standard                                                          | "author-date" を返す | 有効な代替値 |

## S9: dialogDefaults() createWorktree/removeWorktree 設定

> Origin: Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-15
> Status: active
> Supersedes: -

**シグネチャ**: `dialogDefaults(): DialogDefaults`
**テスト対象パス**: `src/config.ts`

| Case ID | Input / Precondition                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                          | Notes                    |
| ------- | ----------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------- | ------------------------ |
| TC-038  | dialog.createWorktree.openTerminal 未指定 | Normal - default                                                           | createWorktree.openTerminal=true を返す  | デフォルト値（後方互換） |
| TC-039  | dialog.createWorktree.openTerminal=false  | Normal - custom                                                            | createWorktree.openTerminal=false を返す | カスタム値               |
| TC-040  | dialog.removeWorktree.deleteBranch 未指定 | Normal - default                                                           | removeWorktree.deleteBranch=true を返す  | デフォルト値             |
| TC-041  | dialog.removeWorktree.deleteBranch=false  | Normal - custom                                                            | removeWorktree.deleteBranch=false を返す | カスタム値               |

## S10: Config fallback defaults vs package.json — 単純値比較（24設定）

> Origin: Feature 021 (loadMoreCommits-default-mismatch) (aidd-spec-tasks-test)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**テスト対象パス**: `src/config.ts`（全 getter メソッド）
**テストファイル**: `tests/src/config-defaults.test.ts`

各 Config メソッドの fallback 値（モックが fallback を返す状態）が `package.json` の `contributes.configuration.properties` のデフォルト値と一致することを検証する。

| Case ID | Input / Precondition                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                   | Notes            |
| ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------- | ---------------- |
| TC-042  | dateFormat fallback                                               | Normal - cross-check                                                       | package.json default と一致       | string 型        |
| TC-043  | dateType fallback                                                 | Normal - cross-check                                                       | package.json default と一致       | string 型        |
| TC-044  | fetchAvatars fallback                                             | Normal - cross-check                                                       | package.json default と一致       | boolean 型       |
| TC-045  | graphStyle fallback                                               | Normal - cross-check                                                       | package.json default と一致       | string 型        |
| TC-046  | initialLoadCommits fallback                                       | Normal - cross-check                                                       | package.json default と一致       | number 型        |
| TC-047  | loadMoreCommits fallback                                          | Normal - cross-check                                                       | package.json default (100) と一致 | REQ-9.1 修正対象 |
| TC-048  | loadMoreCommitsAutomatically fallback                             | Normal - cross-check                                                       | package.json default と一致       | boolean 型       |
| TC-049  | maxDepthOfRepoSearch fallback                                     | Normal - cross-check                                                       | package.json default と一致       | number 型        |
| TC-050  | showCurrentBranchByDefault fallback                               | Normal - cross-check                                                       | package.json default と一致       | boolean 型       |
| TC-051  | showStatusBarItem fallback                                        | Normal - cross-check                                                       | package.json default と一致       | boolean 型       |
| TC-052  | showUncommittedChanges fallback                                   | Normal - cross-check                                                       | package.json default と一致       | boolean 型       |
| TC-053  | tabIconColourTheme fallback                                       | Normal - cross-check                                                       | package.json default と一致       | string 型        |
| TC-054  | sourceCodeProviderIntegrationLocation fallback                    | Normal - cross-check                                                       | package.json default と一致       | string 型        |
| TC-055  | repository.commits.order fallback                                 | Normal - cross-check                                                       | package.json default と一致       | string 型        |
| TC-056  | repository.commits.mute.mergeCommits fallback                     | Normal - cross-check                                                       | package.json default と一致       | boolean 型       |
| TC-057  | repository.commits.mute.commitsThatAreNotAncestorsOfHead fallback | Normal - cross-check                                                       | package.json default と一致       | boolean 型       |
| TC-058  | dialog.merge.noFastForward fallback                               | Normal - cross-check                                                       | package.json default と一致       | boolean 型       |
| TC-059  | dialog.merge.squashCommits fallback                               | Normal - cross-check                                                       | package.json default と一致       | boolean 型       |
| TC-060  | dialog.merge.noCommit fallback                                    | Normal - cross-check                                                       | package.json default と一致       | boolean 型       |
| TC-061  | dialog.cherryPick.recordOrigin fallback                           | Normal - cross-check                                                       | package.json default と一致       | boolean 型       |
| TC-062  | dialog.cherryPick.noCommit fallback                               | Normal - cross-check                                                       | package.json default と一致       | boolean 型       |
| TC-063  | dialog.stashUncommittedChanges.includeUntracked fallback          | Normal - cross-check                                                       | package.json default と一致       | boolean 型       |
| TC-064  | dialog.createWorktree.openTerminal fallback                       | Normal - cross-check                                                       | package.json default と一致       | boolean 型       |
| TC-065  | dialog.removeWorktree.deleteBranch fallback                       | Normal - cross-check                                                       | package.json default と一致       | boolean 型       |

> **失敗系ケースについて**: 本テストは静的値の一致検証であり、入力バリエーションや分岐が存在しない。テスト自体が不一致検出メカニズムとして機能し、任意の fallback が package.json と異なればテストが失敗して対象キー名と値を報告する。このため、従来型の個別失敗系ケースは仕様上意味を持たず省略する。

## S11: Config fallback defaults vs package.json — keybinding 変換後比較（4設定）

> Origin: Feature 021 (loadMoreCommits-default-mismatch) (aidd-spec-tasks-test)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**テスト対象パス**: `src/config.ts`（keyboardShortcut\* メソッド + parseKeybinding）
**テストファイル**: `tests/src/config-defaults.test.ts`

keybinding 設定は `parseKeybinding()` により変換されるため、package.json の `"CTRL/CMD + X"` から末尾文字の小文字が期待値となる。

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes                  |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | --------------- | ---------------------- |
| TC-066  | keyboardShortcutFind fallback ("CTRL/CMD + F")          | Normal - cross-check + transform                                           | "f" を返す      | parseKeybinding 変換後 |
| TC-067  | keyboardShortcutRefresh fallback ("CTRL/CMD + R")       | Normal - cross-check + transform                                           | "r" を返す      | parseKeybinding 変換後 |
| TC-068  | keyboardShortcutScrollToHead fallback ("CTRL/CMD + H")  | Normal - cross-check + transform                                           | "h" を返す      | parseKeybinding 変換後 |
| TC-069  | keyboardShortcutScrollToStash fallback ("CTRL/CMD + S") | Normal - cross-check + transform                                           | "s" を返す      | parseKeybinding 変換後 |

## S12: Config fallback defaults vs package.json — graphColours filter 後比較

> Origin: Feature 021 (loadMoreCommits-default-mismatch) (aidd-spec-tasks-test)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**テスト対象パス**: `src/config.ts`（graphColours メソッド）
**テストファイル**: `tests/src/config-defaults.test.ts`

`graphColours()` は fallback 配列に filter を適用する。package.json の12色はすべて有効な6桁HEXであるため、filter 後も同一配列となる。

| Case ID | Input / Precondition              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                    | Notes                               |
| ------- | --------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------- |
| TC-070  | graphColours fallback（12色配列） | Normal - cross-check + filter                                              | package.json default の12色配列と一致（deepEqual） | REQ-9.2 修正対象。filter は全色通過 |
