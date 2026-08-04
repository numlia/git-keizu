# テスト観点表: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-05-22T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: request-queue

## S40: ロード要求の保留と再送 (Feature 041)

> Origin: Feature 041 (refresh-contention-and-dialog-escape) (light-spec-plan)
> Added: 2026-05-22
> Status: active
> Supersedes: -
> Signature: `GitKeizuView.requestLoadBranchesAndCommits(forceRender) / requestLoadCommits(forceRender, loadedCallback)`
> Target Path: `web/main.ts`
> Test File: `tests/web/main.test.ts`

`loadBranches` / `loadCommits` の応答待ち中に発生した後続要求を保留し、現在処理中の応答 callback 完了後に最新 state で再送する挙動を検証する。`loadBranchesCallback` / `loadCommitsCallback` は callback 実行前に null 化されるため、callback 内および flush 内の再送判定で stale な in-flight 状態に阻害されない。

| Case ID | Input / Precondition                                                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                    | Notes                   |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| TC-221  | `loadBranches` in-flight 中に `refresh("hard")` を呼び、その後 `loadBranches` レスポンスが届く                                     | Normal - refresh during loadBranches                                       | 現在の `loadBranches` 応答処理後に `loadBranches` を再送する `sendMessage` が呼ばれる                                              | forceRender=true の再送 |
| TC-222  | `loadCommits` in-flight 中に branch filter を `["main"]` に変更し、その後 `loadCommits` レスポンスが届く                           | Normal - filter change during loadCommits                                  | 現在の `loadCommits` 応答処理後に `loadCommits` を再送し、payload の `branches` が最新 `["main"]` を使う                           | 最新 state で再送       |
| TC-223  | 自動 Load More が in-flight 中に filter 変更で再送が queue され、最終的に再送応答 callback が完了する                              | Normal - auto Load More callback queue                                     | queue された Load More callback が再送応答時に実行され `isLoadingMoreCommits` が `false` に戻り、次の自動 Load More が再度発火可能 | callback 喪失なし       |
| TC-224  | `loadCommits` in-flight 中に `requestLoadCommits(false, cb1)`、続けて `requestLoadCommits(true, cb2)` を queue する                | Boundary - forceRender OR 合成                                             | 再送時の `loadCommits` payload で `hard=true` が使われ、`cb1` と `cb2` の両方が一度ずつ呼ばれる                                    | OR 合成と callback 集約 |
| TC-225  | `loadCommits` in-flight 中に branch filter を `["a"]` → `["b"]` に連続で変更し、その後 `loadCommits` レスポンスが届く              | Boundary - latest state at resend                                          | 再送 payload の `branches` が最後の `["b"]` を使い、`["a"]` の payload は送信されない                                              | 中間 state は破棄       |
| TC-226  | `pendingLoadCommits === null` の状態で `triggerLoadCommitsCallback` を呼ぶ                                                         | Boundary - empty queue flush                                               | 追加の `sendMessage` 呼び出しが発生せず、`pendingLoadCommits` は `null` のまま                                                     | no-op                   |
| TC-227  | `loadCommitsCallback` 内から再度 `requestLoadCommits(true, cb)` を呼ぶ（callback 実行時点で `loadCommitsCallback` は null になる） | Boundary - re-entrant request                                              | 再 entry 時に in-flight 判定で queue されず、新規 `loadCommits` `sendMessage` が即時送信される                                     | null 化のタイミング     |

## S47: checkout 成功後の active branch 強制再描画

> Origin: 回帰修正 (checkout-active-branch-force-render)
> Added: 2026-08-04
> Status: active
> Supersedes: -
> Signature: `GitKeizuView.refresh(mode) / requestLoadBranchesAndCommits(forceRender)`
> Target Path: `web/main.ts`
> Test File: `tests/web/main.test.ts`

checkout 成功時は `forceRender` により、ブランチ・コミットの取得結果と内部キャッシュが一致する場合でもグラフを再描画し、切替先ブランチへ `.active` を付け直す。一方で hard refresh 固有のローディング表示と展開状態の即時リセットは行わない。soft refresh の応答待ち中に checkout が完了した場合も、キューの `forceRender` が OR 合成で保持されることを保証する。ホスト通信の `hard` は互換性のため強制再描画フラグとして維持する。

| Case ID | Input / Precondition                                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                  | Notes                           |
| ------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| TC-270  | 内部キャッシュの HEAD は `feature/checkout`、DOM の `.active` だけが `main` の状態で checkout 成功応答を受信 | Normal - stale DOM recovery                                                | 現在のグラフを表示したまま `hard=true` で取得し、手動リロードなしで `.active` が `feature/checkout` へ更新される | loading 非表示も検証            |
| TC-271  | soft `loadBranches` の応答待ち中に checkout 成功応答を受信                                                   | Boundary - checkout during in-flight load                                  | checkout の後続要求が強制再描画のままキュー・再送され、最終応答後に `.active` が `feature/checkout` へ更新される | forceRender の競合時保持        |
| TC-272  | checkout 後のグラフに残るコミットを展開している                                                              | Normal - expanded commit preservation                                      | ローディングを表示せず、展開中のコミット詳細を保持する                                                           | 対象が新グラフに存在            |
| TC-273  | checkout 後のグラフから消えるコミットを展開している                                                          | Boundary - missing expanded commit                                         | 参照できない展開状態を閉じる                                                                                     | stale 詳細を残さない            |
| TC-274  | checkout 後のグラフに残る 2 コミットを比較している                                                           | Normal - comparison preservation                                           | 比較元と比較先の両方が存在するため、比較詳細を保持する                                                           | 2 コミットの存在を検証          |
| TC-275  | 比較元または比較先が checkout 後のグラフから消える                                                           | Boundary - missing comparison commit                                       | 比較詳細全体を閉じる                                                                                             | 一部だけの stale 表示を残さない |
| TC-276  | コミット展開中に手動リフレッシュを実行                                                                       | Normal - hard refresh compatibility                                        | 従来どおり展開状態を即時に閉じ、ローディングを表示し、`hard=true` で取得する                                     | hard refresh 固有動作の保護     |

### 失敗源インベントリ（include-or-justify）

| 失敗源                                                  | 対応ケースまたは除外理由                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 同一ブランチ・コミットデータによる再描画省略            | TC-270                                                                                     |
| in-flight 中のキュー格納で forceRender が失われる       | TC-271                                                                                     |
| forceRender でローディングが表示される                  | TC-270、TC-272                                                                             |
| 展開コミットが不必要に閉じる、または stale な状態で残る | TC-272、TC-273                                                                             |
| 比較元・比較先の存在判定が片側だけになる                | TC-274、TC-275                                                                             |
| hard refresh のローディング・展開リセットが回帰する     | TC-276                                                                                     |
| checkout 失敗時にも forceRender が実行される            | `web/messageHandler-test.md` S14 TC-049 で refresh 未実行を担保                            |
| checkout 拒否時にも forceRender が実行される            | `web/messageHandler-test.md` S14 TC-046 / TC-047 で refresh 未実行を担保                   |
| ブランチごとに異なるコミット列での描画                  | excluded(同一データ時が早期 return の厳しい境界であり、異なるデータは既存描画テストで担保) |
