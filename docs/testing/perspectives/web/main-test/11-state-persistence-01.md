# テスト観点表: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-09-12T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: state-persistence

## S53: saveState() の worktrees 保存と復元後の soft refresh 再描画抑止

> Origin: Feature 056 (retain-context-when-hidden) issue #48
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: private `saveState(): void` / constructor の `prevState` 復元（`loadCommits(..., prevState.worktrees)`） / `public loadCommits()` の変更判定
> Target Path: `web/main.ts`（constructor の `prevState` 復元・`saveState()`）、`web/global.d.ts`（`WebViewState.worktrees?`）
> Test File: `tests/web/main.test.ts`

`loadCommits` response で受け取った `worktrees` を `vscode.setState` に含め、状態復元時に `loadCommits` へ渡す観点。復元直後の `this.worktrees` が空のままだと、soft refresh の応答（main worktree を含む）と `worktreeCollectionsEqual` が false になり毎回フル再描画していた（Feature 056 計測で確認）。`WebViewState.worktrees` は省略可能とし、旧ビルドが保存した状態は従来どおり空扱いで復元する。再描画の有無は `Graph.render` の call count で観測する。

| Case ID | Input / Precondition                                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                | Notes                                  |
| ------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- |
| TC-369  | `prevState = null` で初期化後、`loadBranches` と `worktrees` 付き `loadCommits` response を受ける                     | Normal - worktrees の保存                                                  | 最後の `setState` 引数の `worktrees` が response の collection と `toEqual` で一致する         | main worktree 1 件の collection        |
| TC-370  | `worktrees` を含む `prevState` で初期化（復元描画 1 回）後、同一 commits・同一 `worktrees` の soft response を受ける | Normal - 復元後の再描画抑止                                                | `Graph.render` の call count が 1 のまま（soft response で再描画しない）                       | 変更判定が `worktrees` 一致を認識する  |
| TC-371  | `worktrees: undefined` の `prevState`（旧ビルド保存）で初期化後、main worktree を含む soft response を受ける          | Boundary - 旧状態からの復元                                                | `Graph.render` の call count が 2 になる（従来どおり 1 回だけ再描画し、以後は一致する）        | 後方互換。空扱いで復元                 |

### 失敗源インベントリ（include-or-justify）— Feature 056 追加分（S53）

| 失敗源                                                      | 対応ケースまたは除外理由                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `saveState()` が `worktrees` を落とす                       | TC-369                                                                                                             |
| 復元時に保存済み `worktrees` を `loadCommits` へ渡さない    | TC-370（渡さなければ空と比較され call count が 2 になる）                                                          |
| 旧状態（`worktrees` 欠落）の復元で例外・空以外の扱いになる  | TC-371                                                                                                             |
| 復元後の一致判定が worktrees 以外の差分を見落とす           | excluded(`loadCommits` の commits / head / moreAvailable 比較は S24・S28 と既存の request-queue 表で担保)          |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）       | empty: TC-371（空 collection 扱い）。NULL: excluded(`WebViewState.worktrees` は `undefined` か collection のみ)     |
| 外部依存×失敗モード                                         | excluded(`vscode.setState` / `getState` は mock で、失敗経路を追加しない)                                          |
| 例外・エラー経路                                            | excluded(復元と保存に throw 分岐なし)                                                                              |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: excluded(state の型検証は既存 S24 の後方互換マイグレーションが担う)
- Exception: excluded(上表のとおり)
- External: excluded(上表のとおり)
- Boundary: TC-371
- Type: excluded(上表のとおり)
- Normal: TC-369、TC-370

**失敗系/正常系比（煙感知器）**: 正常系2件、失敗系1件。保存・復元・後方互換の 3 経路で失敗源は上表で網羅済みであることを確認した。比率合わせのためのケース追加は行わない。
