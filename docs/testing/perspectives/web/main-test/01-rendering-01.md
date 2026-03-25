# テスト観点表: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-03-22T14:25:09Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: rendering

## S1: スタッシュ行描画（行構成・ラベル）

> Origin: Feature 001 (menu-bar-enhancement) Task 3.4
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                              | Notes                 |
| ------- | ------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------- |
| TC-001  | commit.stash !== null のコミットノード     | Normal - standard                                                          | 行要素の CSS クラスに `"commit"` と `"stash"` が両方含まれる | -                     |
| TC-002  | commit.stash.selector が `"stash@{0}"`     | Normal - standard                                                          | ラベルに `"@{0}"` が表示される（"stash" プレフィックス除去） | selector.substring(5) |
| TC-003  | commit.stash.selector が `"stash@{12}"`    | Boundary - multi-digit index                                               | ラベルに `"@{12}"` が表示される                              | 2桁インデックス       |
| TC-004  | commit.stash !== null のコミットノード     | Normal - standard                                                          | data-hash 属性にスタッシュのコミットハッシュが設定される     | -                     |
| TC-005  | commit.stash === null の通常コミットノード | Normal - non-stash                                                         | 行要素の CSS クラスに `"stash"` が含まれない                 | 既存動作が維持される  |

## S7: calculateCdvHeight() CDV高さ算出

> Origin: Feature 004 (webview-ux-polish) (aidd-spec-tasks-test)
> Added: 2026-02-26
> Status: active
> Supersedes: -

**シグネチャ**: `private calculateCdvHeight(): number`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                     | Notes                          |
| ------- | ---------------------------------- | -------------------------------------------------------------------------- | ----------------------------------- | ------------------------------ |
| TC-050  | innerHeight=800, controlsHeight=50 | Normal - standard                                                          | 250 (CDV_DEFAULT_HEIGHT)            | available=695 > 250            |
| TC-051  | innerHeight=355, controlsHeight=50 | Boundary - available == default                                            | 250                                 | available=250, 境界一致        |
| TC-052  | innerHeight=354, controlsHeight=50 | Boundary - available == default-1                                          | 249                                 | available=249 < 250            |
| TC-053  | innerHeight=205, controlsHeight=50 | Boundary - available == min                                                | 100 (CDV_MIN_HEIGHT)                | available=100, 最小境界一致    |
| TC-054  | innerHeight=204, controlsHeight=50 | Boundary - available == min-1                                              | 100 (CDV_MIN_HEIGHT)                | available=99 → 100にクランプ   |
| TC-055  | innerHeight=0                      | Boundary - zero viewport                                                   | 100 (CDV_MIN_HEIGHT)                | 負の available → 100にクランプ |
| TC-056  | #controls要素が存在しない          | Boundary - missing element                                                 | ビューポート全体 - マージンから算出 | controlsHeight=0フォールバック |

## S8: showCommitDetails() CDV高さ適用・スクロール制御

> Origin: Feature 004 (webview-ux-polish) (aidd-spec-tasks-test)
> Added: 2026-02-26
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                             | Notes                    |
| ------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------ |
| TC-057  | CDVがビューポート内に完全に収まる (offsetTop > scrollTop, offsetTop + expandY < scrollTop + viewHeight) | Normal - standard                                                          | scrollTop が変化しない                                                      | スクロール位置維持       |
| TC-058  | CDV上端がビューポートより上 (offsetTop - CDV_SCROLL_PADDING < scrollTop)                                | Normal - top overflow                                                      | scrollTop = offsetTop - CDV_SCROLL_PADDING                                  | 上方はみ出し時スクロール |
| TC-059  | CDV下端がビューポートより下 (offsetTop + expandY + CDV_SCROLL_BOTTOM_OFFSET > scrollTop + viewHeight)   | Normal - bottom overflow                                                   | scrollTop = offsetTop + expandY - viewHeight + CDV_SCROLL_BOTTOM_OFFSET     | 下方はみ出し時スクロール |
| TC-060  | showCommitDetails() 呼び出し                                                                            | Normal - standard                                                          | CDV要素の style.height に calculateCdvHeight() の結果が px 単位で設定される | 動的高さ適用             |
| TC-061  | showCommitDetails() 呼び出し                                                                            | Normal - standard                                                          | renderGraph() が CDV高さ適用後に呼ばれる                                    | 描画座標更新             |

## S9: updateCommitDetailsHeight() リサイズ対応

> Origin: Feature 004 (webview-ux-polish) (aidd-spec-tasks-test)
> Added: 2026-02-26
> Status: active
> Supersedes: -

**シグネチャ**: `private updateCommitDetailsHeight(): void`
**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                          | Notes                         |
| ------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------- |
| TC-062  | CDV表示中 + resize イベント (outer dimensions change) | Normal - standard                                                          | CDV高さ再計算・style.height 更新、renderGraph() 呼び出し | -                             |
| TC-063  | CDV非表示 + resize イベント                           | Normal - no CDV                                                            | CDV高さ変更なし、既存動作維持                            | expandedCommit === null       |
| TC-064  | CDV表示中 + 内部リサイズ (outer unchanged)            | Normal - inner resize                                                      | CDV高さ再計算・更新（パネル幅変更に対応）                | 既存renderGraph動作 + CDV更新 |

## S15: ファイルリスト表示切替（Tree/List トグル）

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                               | Notes              |
| ------- | ----------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------ |
| TC-101  | fileViewType="tree" の状態でトグルクリック      | Normal - standard                                                          | fileViewType が "list" に変更され、フラットリスト描画関数が呼ばれる           | tree → list        |
| TC-102  | fileViewType="list" の状態でトグルクリック      | Normal - standard                                                          | fileViewType が "tree" に変更され、ツリー描画関数が呼ばれる                   | list → tree        |
| TC-103  | トグルクリック後                                | Normal - standard                                                          | saveRepoState メッセージが新しい fileViewType を含んで送信される              | 永続化             |
| TC-104  | 初期表示: GitRepoState.fileViewType = "list"    | Normal - standard                                                          | リスト表示で初期描画される                                                    | 保存値の復元       |
| TC-105  | 初期表示: GitRepoState.fileViewType = undefined | Boundary - default                                                         | ツリー表示で初期描画される（現行動作と同一）                                  | デフォルト値       |
| TC-106  | トグルアイコンの表示                            | Normal - standard                                                          | 現在のモードに応じたアイコンが表示される（Tree アイコンまたは List アイコン） | 視覚フィードバック |

## S17: コミット詳細表示改善

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                             | Notes             |
| ------- | -------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------- |
| TC-112  | コミット詳細表示                             | Normal - standard                                                          | 表示順: Commit → Parents → Author → Committer → Date        | 表示順変更        |
| TC-113  | Committer に committerEmail が設定されている | Normal - standard                                                          | "Committer: {name} <{email}>" 形式で表示。mailto リンク付き | Author 行と同形式 |
| TC-114  | committerEmail が空文字列                    | Boundary - empty email                                                     | Committer 名のみ表示（メールアドレス部分は省略）            | 防御的表示        |

## S20: renderTable() commitMessage ラッパー生成

> Origin: Feature 010 (mute-branch-label-fix) (aidd-spec-tasks-test)
> Added: 2026-03-05
> Status: active
> Supersedes: -

**シグネチャ**: `private renderTable(): void`
**テスト対象パス**: `web/main.ts:610`

| Case ID | Input / Precondition                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                    | Notes                      |
| ------- | ----------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------- |
| TC-123  | 通常コミット（mute=false）の行HTML生成          | Normal - standard                                                          | メッセージテキストが `<span class="commitMessage">` で囲まれている | 全コミット行に適用         |
| TC-124  | ミュートコミット（mute=true）の行HTML生成       | Normal - muted                                                             | メッセージテキストが `<span class="commitMessage">` で囲まれている | CSS と連携してミュート表示 |
| TC-125  | currentHash と一致するコミットの行HTML生成      | Normal - current                                                           | `<span class="commitMessage"><b>メッセージ</b></span>` 形式        | bold がラッパー内側        |
| TC-126  | currentHash と一致しないコミットの行HTML生成    | Normal - standard                                                          | `<span class="commitMessage">メッセージ</span>` 形式               | plain text                 |
| TC-127  | リファレンスラベル付きコミットの行HTML生成      | Normal - with refs                                                         | `.gitRef` スパンが `.commitMessage` の外側（直前）にある           | ラベルが wrapper 外        |
| TC-128  | HEAD コミット（commitHeadDot 付き）の行HTML生成 | Normal - HEAD                                                              | `.commitHeadDot` スパンが `.commitMessage` の外側にある            | HEAD dot が wrapper 外     |

## S35: worktree アイコン描画とデータ属性

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**テスト対象パス**: `web/main.ts`

| Case ID | Input / Precondition                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                       | Notes        |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------ |
| TC-194  | worktreeMap にブランチ名が存在するラベル                        | Normal - standard                                                          | span に worktree CSS クラス、data-worktree-path 属性、worktree アイコン要素が含まれる | REQ-2.1      |
| TC-195  | worktreeMap にブランチ名が存在しないラベル                      | Normal - no worktree                                                       | 従来通りの描画（worktree CSS クラスなし、アイコンなし）                               | REQ-2.1-TC2  |
| TC-196  | worktree アイコンの title 属性                                  | Normal - standard                                                          | title="Worktree: <path>" が設定される                                                 | REQ-2.2      |
| TC-197  | worktree パスに HTML 特殊文字を含む（例: `<script>` 含むパス）  | Boundary - XSS prevention                                                  | data-worktree-path の値が escapeHtml() 適用済み                                       | セキュリティ |
| TC-198  | リモートブランチ（worktreeMap にエントリがあっても）            | Normal - exclusion                                                         | worktree アイコンが表示されない                                                       | REQ-2.1-TC3  |
| TC-199  | コンテキストメニューへの worktreeInfo 受け渡し（worktree あり） | Normal - standard                                                          | worktreeInfo に path と isMainWorktree が含まれる                                     | REQ-2.3      |
| TC-200  | コンテキストメニューへの worktreeInfo 受け渡し（worktree なし） | Normal - null                                                              | worktreeInfo が null                                                                  | REQ-2.3      |
| TC-201  | worktreeMap が空オブジェクト                                    | Boundary - empty map                                                       | すべてのブランチラベルが従来通り（worktree 関連表示なし）                             | 後方互換     |
