# テスト観点表: src/config.ts

> Source: `src/config.ts`
> Generated: 2026-05-17T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: defaults-schema

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

## S11: Config fallback defaults vs package.json — keybinding 変換後比較（4設定）

> Origin: Feature 021 (loadMoreCommits-default-mismatch) (aidd-spec-tasks-test)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**テスト対象パス**: `src/config.ts`（keyboardShortcut\* メソッド + parseKeybinding）
**テストファイル**: `tests/src/config-defaults.test.ts`

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

| Case ID | Input / Precondition              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                    | Notes                               |
| ------- | --------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------- |
| TC-070  | graphColours fallback（12色配列） | Normal - cross-check + filter                                              | package.json default の12色配列と一致（deepEqual） | REQ-9.2 修正対象。filter は全色通過 |

## S13: openNewTabEditorGroup() エディタグループ設定

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**シグネチャ**: `openNewTabEditorGroup(): vscode.ViewColumn`
**テスト対象パス**: `src/config.ts`

| Case ID | Input / Precondition                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                     | Notes                        |
| ------- | ------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------- | ---------------------------- |
| TC-071  | openNewTabEditorGroup 設定が未設定               | Normal - default fallback                                                  | vscode.ViewColumn.Active が返される | デフォルト値のフォールバック |
| TC-072  | openNewTabEditorGroup = "Active"                 | Normal - explicit active                                                   | vscode.ViewColumn.Active が返される | 明示的な Active 指定         |
| TC-073  | openNewTabEditorGroup = "Beside"                 | Normal - beside                                                            | vscode.ViewColumn.Beside が返される | 隣のグループ                 |
| TC-074  | openNewTabEditorGroup = "One"                    | Normal - numbered group                                                    | vscode.ViewColumn.One が返される    | 番号指定グループ             |
| TC-075  | openNewTabEditorGroup = "Nine"                   | Boundary - max group                                                       | vscode.ViewColumn.Nine が返される   | 最大グループ番号             |
| TC-076  | openNewTabEditorGroup = "InvalidValue"（不正値） | Validation - invalid value                                                 | vscode.ViewColumn.Active が返される | フォールバック動作           |
| TC-077  | openNewTabEditorGroup fallback comparison        | Normal - cross-check + mapping                                             | package.json default と一致         | VIEW_COLUMN_MAPPING 経由     |

## S14: showRecentActions 設定

> Origin: Feature 034 (context-menu-recent-actions) Task 1
> Added: 2026-05-02
> Status: active
> Supersedes: -
> Signature: `showRecentActions(): boolean`
> Target Path: `src/config.ts`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                 | Notes                |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------- |
| TC-078  | `menu.showRecentActions` 設定未指定                  | Normal - default                                                           | `showRecentActions()` が `true` を返す                                                                          | 新規設定のデフォルト |
| TC-079  | `menu.showRecentActions = false`                     | Normal - explicit false                                                    | `showRecentActions()` が `false` を返す                                                                         | 描画のみ OFF         |
| TC-080  | fallback getter と `package.json` default の整合確認 | Normal - cross-check                                                       | `tests/src/config-defaults.test.ts` で `showRecentActions()` の fallback 値が `package.json` default と一致する | static default 整合  |

## S21: maxDepthOfRepoSearch() 既定値 1 と明示設定の透過

> Origin: Feature 057 (multi-repo-single-folder-workspace) issue #49
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `maxDepthOfRepoSearch(): number`
> Target Path: `src/config.ts:178-180`
> Test File: `tests/src/config-defaults.test.ts`

S10 TC-049は両値の一致だけを見るため`0 === 0`でも通る。本セクションは既定値の具体値を固定する。探索の深さの解釈はrepoManager ownerの責務で本表には含めない。

| Case ID | Input / Precondition                                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                      | Notes                  |
| ------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| TC-369  | `get`モックがフォールバック値をそのまま返す状態で`getConfig().maxDepthOfRepoSearch()`を呼ぶ | Normal - 既定値の具体値                                                    | 戻り値が数値`1`と`toBe`で一致し、`package.json`の`git-keizu.maxDepthOfRepoSearch.default`も数値`1`と`toBe`で一致する | 両側を具体値で固定     |
| TC-370  | `get`モックが`"maxDepthOfRepoSearch"`キーに対して`0`を返す（他キーはフォールバック）        | Boundary - 明示設定0の維持                                                 | `getConfig().maxDepthOfRepoSearch()`が数値`0`を返す                                                                  | 明示設定を上書きしない |

### 失敗源インベントリ（include-or-justify）— Feature 057 追加分（S21）

| 失敗源                                                           | 対応ケースまたは除外理由                        |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| フォールバックだけ変更して`package.json`を忘れる（またはその逆） | TC-369                                          |
| 明示設定の上書き                                                 | TC-370                                          |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）            | 0: TC-370。それ以外はexcluded(getterに分岐なし) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(getterに分岐なし)
- Exception: excluded(getterに分岐なし)
- External: excluded(`workspaceConfiguration.get()`は既定値契約でthrowしない既存挙動)
- Boundary: TC-370
- Type: excluded(型はスキーマに委ねる)
- Normal: TC-369

**失敗系/正常系比（煙感知器）**: 正常系1件（TC-369）、失敗系1件（TC-370）。既定値の具体値変更のみで、失敗源は上表で網羅済みであることを確認した。
