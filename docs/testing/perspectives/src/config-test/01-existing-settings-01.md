# テスト観点表: src/config.ts

> Source: `src/config.ts`
> Generated: 2026-05-17T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: existing-settings

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

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                      | Notes        |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- | ------------ |
| TC-028  | 全設定未指定（デフォルト）                           | Normal - default                                                           | 全デフォルト値が返される                             | 全デフォルト |
| TC-029  | dialog.merge.noFastForward=false                     | Normal - custom                                                            | merge.noFastForward=false を返す                     | カスタム値   |
| TC-030  | dialog.merge.squashCommits=true                      | Normal - custom                                                            | merge.squashCommits=true を返す                      | カスタム値   |
| TC-031  | dialog.merge.noCommit=true                           | Normal - custom                                                            | merge.noCommit=true を返す                           | カスタム値   |
| TC-032  | dialog.cherryPick.recordOrigin=true                  | Normal - custom                                                            | cherryPick.recordOrigin=true を返す                  | カスタム値   |
| TC-033  | dialog.cherryPick.noCommit=true                      | Normal - custom                                                            | cherryPick.noCommit=true を返す                      | カスタム値   |
| TC-034  | dialog.stashUncommittedChanges.includeUntracked=true | Normal - custom                                                            | stashUncommittedChanges.includeUntracked=true を返す | カスタム値   |

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

## S17: gitPath() Git 実行パス解決

> Origin: test-plan (既存コード網羅)
> Added: 2026-05-17
> Status: superseded
> Superseded By: S18
> Supersedes: -
> Signature: `gitPath(): string`
> Target Path: `src/config.ts`

`vscode.workspace.getConfiguration("git").get("path", null)` の結果を三項演算で評価し、`null` のときに既定値 `"git"` を返す。

| Case ID | Input / Precondition                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result               | Notes                                              |
| ------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------- |
| TC-093  | `git.path` が `null`（未設定の VS Code 既定）                      | Normal - default fallback                                                  | `"git"` を返す                | `path !== null` の false 分岐                      |
| TC-094  | `git.path = "/usr/local/bin/git"`                                  | Normal - configured                                                        | `"/usr/local/bin/git"` を返す | true 分岐でそのまま返却                            |
| TC-095  | `git.path = ""`（空文字）                                          | Boundary - empty string                                                    | `""` を返す                   | 仕様上 `!== null` のみ判定するため空文字も透過する |
| TC-096  | `git.path = "C:\\Program Files\\Git\\bin\\git.exe"` (Windows path) | Normal - cross-platform                                                    | 入力された Windows パスを返す | プラットフォーム依存                               |
