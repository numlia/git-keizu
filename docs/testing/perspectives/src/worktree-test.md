# テスト観点表: src/worktree.ts

> Source: `src/worktree.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: parseWorktreeList() porcelain 出力パース

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: superseded
> Supersedes: -
> Superseded By: S2

**シグネチャ**: `parseWorktreeList(stdout: string): WorktreeMap`
**テスト対象パス**: `src/worktree.ts`

| Case ID | Input / Precondition                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                    | Notes                                    |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| TC-001  | 通常の porcelain 出力（main worktree + feature branch の 2 エントリ） | Normal - standard                                                          | 2 エントリのマップ。キーはブランチ短縮名、値はパスと isMain フラグ | main: isMain=true, feature: isMain=false |
| TC-002  | 空文字列                                                              | Boundary - empty                                                           | 空マップ `{}`                                                      | 入力が空の場合                           |
| TC-003  | main worktree のみ（1 エントリ）                                      | Boundary - min (single entry)                                              | 1 エントリ、isMain=true                                            | 最小有効入力                             |
| TC-004  | detached HEAD エントリを含む出力                                      | Normal - skip detached                                                     | detached HEAD エントリはスキップ。branch ありのみ含む              | branch 行なしのエントリ                  |
| TC-005  | bare エントリを含む出力                                               | Normal - skip bare                                                         | bare エントリはスキップ                                            | bare フラグありのエントリ                |
| TC-006  | 複数 worktree（main + 3 feature branches）                            | Normal - multiple                                                          | 4 エントリのマップ。最初のエントリのみ isMain=true                 | -                                        |
| TC-007  | branch 行に refs/heads/ プレフィックス付き                            | Normal - prefix strip                                                      | キーから refs/heads/ が除去された短縮名を使用                      | branch refs/heads/feature/x → feature/x  |
| TC-008  | 未知のフィールドを含むエントリ                                        | Normal - forward compat                                                    | 未知フィールドは無視され、正常にパースされる                       | 前方互換性                               |
| TC-009  | detached HEAD + branch 行ありの混在出力                               | Boundary - mixed                                                           | branch 行ありのエントリのみマップに含まれる                        | -                                        |
| TC-010  | main worktree のフラグ判定（最初のエントリ）                          | Normal - isMain                                                            | 最初のエントリのみ isMain=true、2 番目以降は false                 | -                                        |
| TC-011  | パスにスペースを含む worktree                                         | Normal - space in path                                                     | パスが正しく保持される                                             | worktree 行のスペース以降も含めてパス    |

## S2: parseWorktreeList() porcelain レコードの branch / detached / bare 分類

> Origin: Feature 052 (detached-worktree-display) (light-spec-plan)
> Added: 2026-08-08
> Status: active
> Supersedes: S1
> Signature: `parseWorktreeList(stdout: string): WorktreeCollection`
> Target Path: `src/worktree.ts`（`parseWorktreeList()`。実装後に行範囲へ更新）
> Test File: `tests/src/worktree.test.ts`

戻り値を `WorktreeMap` から `WorktreeCollection`（`branches` / `detached`）へ変え、branch 行を持たないレコードを一律に捨てる現行契約を、bare → branch → detached の優先順で分類する契約へ置き換える。detached レコードは `HEAD` のコミットハッシュを共有 helper `isValidCommitHash()` で検証してから `detached` へ入れ、矛盾・欠損・不正 hash はそのレコードだけを除外して他レコードの parse を続ける。`detached` は完全 path の昇順で返す。S1 は「detached HEAD エントリはスキップ」（TC-004 / TC-009）と戻り値が flat map であることを固定していたため supersede する。hash 値域そのものの検証は `src/utils-test.md` S7、Git 実行と fallback は `src/dataSource-test/02-branch-worktree-03.md` S47 の責務。

| Case ID | Input / Precondition                                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                           | Notes                                                     |
| ------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| TC-012  | main（`branch refs/heads/main`）と linked（`branch refs/heads/feature/x`）の 2 レコード | Normal - branch entries retained                                           | `branches` が `{ main: { path: "/repo", isMain: true }, "feature/x": { path: "/wt/x", isMain: false } }` と `toEqual` で一致し、`detached` が `[]` である | S1/TC-001・TC-006・TC-010 の引き継ぎ                      |
| TC-013  | `branch refs/heads/feature/x` を持つレコード                                            | Normal - refs/heads prefix strip                                           | `branches` のキーが `"feature/x"` である（`refs/heads/` を含まない）                                                                                      | S1/TC-007 の引き継ぎ                                      |
| TC-014  | `worktree /tmp/wt8` / `HEAD abc1234` / `detached` を持つ 2 番目のレコード               | Normal - detached entry added                                              | `detached` が `[{ path: "/tmp/wt8", head: "abc1234", isMain: false }]` と `toEqual` で一致し、`branches` が `{}` である                                   | 8.1 の解消ケース。現行実装では失敗する                    |
| TC-015  | 先頭レコードが `HEAD` + `detached`（branch なし）、2 番目が branch 付き                 | Boundary - first record isMain                                             | `detached[0].isMain` が `true`、`branches` 側の entry の `isMain` が `false` である                                                                       | 先頭レコードだけ main                                     |
| TC-016  | `bare` と `HEAD` を持つレコード + branch 付きレコード                                   | Normal - bare excluded                                                     | `branches` に bare レコードのキーがなく、`detached` の長さが `0` である                                                                                   | S1/TC-005 の引き継ぎ。`HEAD` があっても detached にしない |
| TC-017  | `branch refs/heads/x` と `detached` を同時に持つレコード + 正常な branch レコード       | Validation - conflicting attributes                                        | 矛盾レコードは `branches` にも `detached` にも入らず、正常レコードだけが `branches` に 1 件入る                                                           | 4.2-4 の矛盾除外                                          |
| TC-018  | `worktree` と `detached` を持つが `HEAD` 行がないレコード + 正常な detached レコード    | Validation - missing HEAD                                                  | 欠損レコードは除外され、`detached` の長さが `1`（正常レコードのみ）である                                                                                 | パーサー全体を止めない                                    |
| TC-019  | `HEAD zzzz`（16進外）と `detached` を持つレコード                                       | Type - invalid head hash                                                   | `detached` が `[]` である。例外を送出しない                                                                                                               | 共有 hash helper で拒否                                   |
| TC-020  | `HEAD abc`（3 文字）と `detached` を持つレコード                                        | Boundary - head below minimum length                                       | `detached` が `[]` である                                                                                                                                 | 4 文字未満は不正                                          |
| TC-021  | branch レコードに `locked`、`prunable reason`、未知の値付き属性が付く                   | Normal - unknown fields ignored                                            | `branches` の entry が属性なしの場合と `toEqual` で一致する                                                                                               | S1/TC-008 の引き継ぎ。5 章の維持契約                      |
| TC-022  | detached レコード 3 件が path 降順（`/c`, `/b`, `/a`）で出現する                        | Normal - detached sorted by path                                           | `detached.map((entry) => entry.path)` が `["/a", "/b", "/c"]` である                                                                                      | 応答と webview 差分判定の決定性                           |
| TC-023  | 同じ `HEAD abc1234` を持つ detached レコード 2 件（path が異なる）                      | Boundary - duplicate head hash                                             | `detached` の長さが `2` で、両 entry の `head` が `"abc1234"` である（重複排除しない）                                                                    | ラベルは worktree ごとに表示する                          |
| TC-024  | `stdout = ""`（空文字列）                                                               | Boundary - empty input                                                     | 戻り値が `{ branches: {}, detached: [] }` と `toEqual` で一致する                                                                                         | S1/TC-002 の引き継ぎ。空 fallback と同形                  |
| TC-025  | `worktree` 行がなく `HEAD` と `detached` だけを持つレコード                             | Validation - empty worktree path                                           | `detached` が `[]` である                                                                                                                                 | 4.2-4 の worktree 空除外                                  |
| TC-026  | `worktree /tmp/my worktree/wt8` と `HEAD`・`detached` を持つレコード                    | Boundary - space in path                                                   | `detached[0].path` が `"/tmp/my worktree/wt8"` である                                                                                                     | S1/TC-011 の引き継ぎ                                      |
| TC-027  | main worktree のみ（branch 付き 1 レコード）                                            | Boundary - single entry                                                    | `branches` のキーが 1 件で `isMain` が `true`、`detached` が `[]` である                                                                                  | S1/TC-003 の引き継ぎ                                      |
| TC-028  | 末尾に空行が連続し空レコードを含む出力                                                  | Boundary - blank trailing record                                           | 空レコードは無視され、有効レコードの件数だけが `branches` / `detached` に反映される                                                                       | 区切りの境界                                              |

### 失敗源インベントリ（include-or-justify）— Feature 052 追加分（S2）

| 失敗源                                            | 対応ケースまたは除外理由                                                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| detached レコードを一律に捨てる（現行の根本原因） | TC-014、TC-015、TC-022、TC-023                                                                                                                        |
| bare を detached とみなす                         | TC-016                                                                                                                                                |
| branch と detached の同時保持を許す               | TC-017                                                                                                                                                |
| `HEAD` の欠落・不正 hash を通す                   | TC-018、TC-019、TC-020                                                                                                                                |
| `worktree` path の欠落を通す                      | TC-025                                                                                                                                                |
| 1 レコードの不正でパーサー全体を失敗させる        | TC-017、TC-018（正常レコードが残ることを同時に検証）                                                                                                  |
| 未知・値付き属性で分類が変わる                    | TC-021                                                                                                                                                |
| `detached` の順序が入力依存になる                 | TC-022                                                                                                                                                |
| 同一 hash の worktree を重複排除してラベルを失う  | TC-023                                                                                                                                                |
| 境界値（empty / minimum / +/-1）                  | TC-020（hash 最小 -1）、TC-024（空入力）、TC-027（最小有効入力）、TC-028（空レコード）                                                                |
| 境界値（0 / maximum）                             | excluded(porcelain 出力の件数に上限がなく、hash 長の最大境界は `src/utils-test.md` S7 TC-021 / TC-022 の責務)                                         |
| 境界値（NULL）                                    | excluded(引数が `string` 型で `null` を取り得ない。空文字は TC-024 で検証)                                                                            |
| 外部依存の失敗（Git 実行、spawn）                 | excluded(`parseWorktreeList()` は純関数で外部依存を持たない。Git 失敗時 fallback は `src/dataSource-test/02-branch-worktree-03.md` S47 TC-293 の責務) |
| 例外送出                                          | excluded(4.2-4 により throw 経路を持たない設計。不正レコードの除外は TC-017〜TC-020、TC-025 で検証)                                                   |
| hash 値域そのものの誤り                           | excluded(`src/utils-test.md` S7 TC-019〜TC-029 の責務)                                                                                                |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-017、TC-018、TC-025
- Exception: excluded(throw 経路を持たない。不正レコードは Validation / Type / Boundary で検証)
- External: excluded(外部依存なし)
- Boundary: TC-015、TC-020、TC-023、TC-024、TC-026、TC-027、TC-028
- Type: TC-019

**失敗系/正常系比（煙感知器）**: 正常系 6 件（TC-012、TC-013、TC-014、TC-016、TC-021、TC-022）、失敗系 11 件（TC-015、TC-017〜TC-020、TC-023〜TC-028）。比 1.83 で近接（差 1 以内）ではないため、インベントリ再導出は不要と判断した。
