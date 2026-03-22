# テスト観点表: src/worktree.ts

> Source: `src/worktree.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: parseWorktreeList() porcelain 出力パース

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**シグネチャ**: `parseWorktreeList(stdout: string): WorktreeMap`
**テスト対象パス**: `src/worktree.ts`

| Case ID | Input / Precondition                                                  | Perspective (Equivalence / Boundary)  | Expected Result                                                    | Notes                                    |
| ------- | --------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| TC-001  | 通常の porcelain 出力（main worktree + feature branch の 2 エントリ） | Equivalence - normal                  | 2 エントリのマップ。キーはブランチ短縮名、値はパスと isMain フラグ | main: isMain=true, feature: isMain=false |
| TC-002  | 空文字列                                                              | Boundary - empty                      | 空マップ `{}`                                                      | 入力が空の場合                           |
| TC-003  | main worktree のみ（1 エントリ）                                      | Boundary - min (single entry)         | 1 エントリ、isMain=true                                            | 最小有効入力                             |
| TC-004  | detached HEAD エントリを含む出力                                      | Equivalence - normal (skip detached)  | detached HEAD エントリはスキップ。branch ありのみ含む              | branch 行なしのエントリ                  |
| TC-005  | bare エントリを含む出力                                               | Equivalence - normal (skip bare)      | bare エントリはスキップ                                            | bare フラグありのエントリ                |
| TC-006  | 複数 worktree（main + 3 feature branches）                            | Equivalence - normal (multiple)       | 4 エントリのマップ。最初のエントリのみ isMain=true                 | -                                        |
| TC-007  | branch 行に refs/heads/ プレフィックス付き                            | Equivalence - normal (prefix strip)   | キーから refs/heads/ が除去された短縮名を使用                      | branch refs/heads/feature/x → feature/x  |
| TC-008  | 未知のフィールドを含むエントリ                                        | Equivalence - normal (forward compat) | 未知フィールドは無視され、正常にパースされる                       | 前方互換性                               |
| TC-009  | detached HEAD + branch 行ありの混在出力                               | Boundary - mixed                      | branch 行ありのエントリのみマップに含まれる                        | -                                        |
| TC-010  | main worktree のフラグ判定（最初のエントリ）                          | Equivalence - normal (isMain)         | 最初のエントリのみ isMain=true、2 番目以降は false                 | -                                        |
| TC-011  | パスにスペースを含む worktree                                         | Equivalence - normal (space in path)  | パスが正しく保持される                                             | worktree 行のスペース以降も含めてパス    |
