# テスト観点表: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-09-12T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: retain-context

## S35: retainContextWhenHidden 設定の panel option 反映と再表示時の分岐

> Origin: Feature 056 (retain-context-when-hidden) issue #48
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `public static createOrShow()` の `createWebviewPanel` option / `onDidChangeViewState` handler の visible 分岐
> Target Path: `src/gitGraphView.ts`（`createOrShow()`・constructor の view-state handler）
> Test File: `tests/src/gitGraphView.test.ts`

`getConfig().retainContextWhenHidden()` を panel 生成時に 1 回読み、`createWebviewPanel` の `retainContextWhenHidden` option と、再表示時の分岐の両方に同じ値を使う観点。保持有効なら再表示時に webview へ `{ command: "refresh" }` を送るだけで HTML を再生成せず、無効なら従来どおり `update()` で HTML を再生成する。ただし保持中の webview は生成時の `viewState`（設定値と repo 集合）を持ち続けるため、`git-keizu` 設定が変わった後、または repo 数が 0 との境界を跨いだ後の再表示は `update()` へ倒し、非表示中に repo 集合だけが変わった場合は `refresh` の前に `loadRepos` を送る（Codex レビュー P1 / P2 対応）。非表示時の処理（`currentRepo` の初期化と watcher 停止）は S18 / TC-064 の責務で本表には含めない。

| Case ID | Input / Precondition                                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                  | Notes                                      |
| ------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-364  | 設定が `true` の状態で `createOrShow()` を呼ぶ                                                             | Normal - option の受け渡し（有効）                                         | `createWebviewPanel` が `retainContextWhenHidden: true` を含む option で 1 回呼ばれる                                                                                            | 既定値                                     |
| TC-365  | 設定が `false` の状態で `createOrShow()` を呼ぶ                                                            | Normal - option の受け渡し（無効）                                         | `createWebviewPanel` が `retainContextWhenHidden: false` を含む option で呼ばれる                                                                                                | 従来挙動の選択                             |
| TC-366  | 設定 `true` で panel を生成し初期 HTML が入った後、`visible=false` → `visible=true` と handler を呼ぶ      | Normal - 保持時の再表示                                                    | `postMessage` が `{ command: "refresh" }` で 1 回だけ呼ばれ、`loadWebviewMessages` の call count が初期生成の 1 回のままである（HTML 再生成なし）                                | 再表示は soft refresh のみ                 |
| TC-367  | 設定 `false` で同じ遷移を行う                                                                              | Normal - 非保持時の再表示                                                  | `loadWebviewMessages` の call count が 2 になる（HTML 再生成）まで待ち、その間 `postMessage` は呼ばれない                                                                        | `refresh` を送らない                       |
| TC-372  | 設定 `true` で非表示中に `onDidChangeConfiguration` が `git-keizu` セクションで発火してから再表示する      | Normal - 設定変更後の再表示                                                | `loadWebviewMessages` の call count が 2 になる（HTML 再生成）まで待ち、`postMessage` は呼ばれない                                                                               | 設定値は HTML 生成時にしか読めない         |
| TC-373  | 設定 `true` で非表示中に `editor` セクションだけの設定変更が発火してから再表示する                         | Validation - 対象外セクションの無視                                        | `postMessage` が `{ command: "refresh" }` で 1 回だけ呼ばれ、`loadWebviewMessages` は 1 回のまま                                                                                 | `affectsConfiguration("git-keizu")` で絞る |
| TC-374  | 設定 `true` で非表示中に repo callback が 2 repo で発火（この時点で `postMessage` なし）してから再表示する | Normal - 非表示中の repo 発見                                              | `postMessage` が 2 回、1 回目 `{ command: "loadRepos", repos: <現在の集合>, lastActiveRepo: null }`、2 回目 `{ command: "refresh" }` の順で、`loadWebviewMessages` は 1 回のまま | 順序固定                                   |
| TC-375  | 設定 `true` で非表示中に repo が 0 件になり callback が `({}, 0)` で発火してから再表示する                 | Boundary - repo 0 件への遷移                                               | `loadWebviewMessages` の call count が 2 になる（HTML 再生成）まで待ち、`postMessage` は呼ばれない                                                                               | graph page では 0 件を表せない             |

### 失敗源インベントリ（include-or-justify）— Feature 056 追加分（S35）

| 失敗源                                                       | 対応ケースまたは除外理由                                                                                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 設定値が panel option へ渡らない                             | TC-364、TC-365                                                                                                          |
| 保持有効時に HTML を再生成して保持を無効化する               | TC-366                                                                                                                  |
| 保持無効時に `refresh` だけ送って破棄済み webview へ届かない | TC-367                                                                                                                  |
| 再表示時に `refresh` が重複送信される                        | TC-366（call count 1）                                                                                                  |
| 保持中に変わった `git-keizu` 設定が再表示後も旧値のまま残る  | TC-372                                                                                                                  |
| 無関係な設定変更で不要な HTML 再生成が起きる                 | TC-373                                                                                                                  |
| 非表示中に発見された repo が dropdown に現れない             | TC-374                                                                                                                  |
| repo 0 件へ遷移した後も graph page を使い続ける              | TC-375                                                                                                                  |
| `retainContextWhenHidden` option 自体が生成後に変わる        | excluded(生成時の値を constructor 引数で固定する設計。option の変更は次回 panel 生成で反映される)                       |
| 非表示時の watcher 停止・`currentRepo` 初期化の欠落          | excluded(S18 TC-064 で既存担保)                                                                                         |
| 境界値（0 / minimum / maximum / +/-1 / empty / NULL）        | 0: TC-375（repo 0 件）。それ以外は excluded(設定入力は boolean のみで、`true` / `false` の両値を TC-364〜TC-367 で網羅) |
| 外部依存×失敗モード                                          | excluded(`createWebviewPanel` の失敗は VS Code API 側で、本変更で例外経路を追加しない)                                  |
| 例外・エラー経路                                             | excluded(分岐に throw を追加しない)                                                                                     |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-373
- Exception: excluded(上表のとおり)
- External: excluded(上表のとおり)
- Boundary: TC-375
- Type: excluded(boolean の既定値契約は `src/config-test/05-feature-056-retain-context-01.md` S20)
- Normal: TC-364〜TC-367、TC-372、TC-374

**失敗系/正常系比（煙感知器）**: 正常系6件、失敗系2件。保持中に古くなり得る入力は設定値と repo 集合の 2 系統で、それぞれ「再生成へ倒す」「差分を送る」「無視する」を上表で網羅したことを確認した。比率合わせのためのケース追加は行わない。
