# テスト観点表マニフェスト: src/dataSource.ts

> Source: `src/dataSource.ts`
> Storage Mode: sharded
> Generated: 2026-08-25T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Total Shards: 8
> Total Sections: 41
> Total Cases: 271

## Shards

| Shard File                  | Responsibility     | Sections | Cases | Last Updated |
| --------------------------- | ------------------ | -------- | ----- | ------------ |
| 01-history-diff-01.md       | history-diff       | 9        | 61    | 2026-07-04   |
| 02-branch-worktree-01.md    | branch-worktree    | 8        | 45    | 2026-07-04   |
| 02-branch-worktree-02.md    | branch-worktree    | 5        | 49    | 2026-08-06   |
| 02-branch-worktree-03.md    | branch-worktree    | 1        | 21    | 2026-08-08   |
| 03-author-watch-paths-01.md | author-watch-paths | 8        | 38    | 2026-07-04   |
| 04-spawn-refname-diff-01.md | spawn-refname-diff | 8        | 40    | 2026-07-19   |
| 05-git-path-01.md           | git-path           | 1        | 3     | 2026-07-19   |
| 06-branch-cleanup-01.md     | branch-cleanup     | 1        | 14    | 2026-08-25   |

## Origin Coverage

| Origin                                                                 | Shard Files                                           |
| ---------------------------------------------------------------------- | ----------------------------------------------------- |
| Feature 001 (menu-bar-enhancement) Task 3.2                            | 01-history-diff-01.md                                 |
| Feature 001 (menu-bar-enhancement) Task 4.2                            | 01-history-diff-01.md                                 |
| Feature 001 (menu-bar-enhancement) Task 5.2                            | 01-history-diff-01.md                                 |
| Feature 003 (ux-fixes-and-enhancements) Task 4.2                       | 01-history-diff-01.md                                 |
| Feature 006 (git-graph-parity) (aidd-spec-tasks-test)                  | 02-branch-worktree-01.md, 03-author-watch-paths-01.md |
| Feature 011 (author-filter-fix) (aidd-spec-tasks-test)                 | 03-author-watch-paths-01.md                           |
| Feature 012 (ui-enhancements) (aidd-spec-tasks-test)                   | 03-author-watch-paths-01.md                           |
| Feature 014 (dialog-defaults) (aidd-spec-tasks-test)                   | 02-branch-worktree-01.md                              |
| Feature 015 (commit-sort-order) (aidd-spec-tasks-test)                 | 02-branch-worktree-01.md                              |
| Feature 016 (worktree-support) (aidd-spec-tasks-test)                  | 02-branch-worktree-01.md                              |
| Feature 033 (watch-refresh-scope) Task 1                               | 03-author-watch-paths-01.md                           |
| Feature 045 (defensive-fixes) (light-spec-plan)                        | 04-spawn-refname-diff-01.md, 05-git-path-01.md        |
| Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan) | 02-branch-worktree-02.md                              |
| Feature 051 (remote-checkout-pull) (light-spec-plan)                   | 02-branch-worktree-02.md                              |
| Feature 052 (detached-worktree-display) (light-spec-plan)              | 02-branch-worktree-03.md                              |
| Feature 055-03 (light-spec-plan)                                       | 06-branch-cleanup-01.md                               |
| test-plan (既存テスト)                                                 | 01-history-diff-01.md                                 |
| フェーズ1 修正 H2 (rename-tracking-repair)                             | 02-branch-worktree-01.md                              |
| フェーズ1 修正 M2 (spawn-buffer-concat)                                | 01-history-diff-01.md                                 |
| フェーズ2 修正 M1 (author-filter-regex-escape)                         | 03-author-watch-paths-01.md                           |
| フェーズ2 修正 M3 (detached-head-detection)                            | 01-history-diff-01.md                                 |
| フェーズ2 修正 M3 (spawn-locale-lc-all-c)                              | 01-history-diff-01.md                                 |
| フェーズ3 修正 L1 (spawn-stderr-drain)                                 | 04-spawn-refname-diff-01.md                           |
| フェーズ3 修正 L2 (spawn-conditional-trailing-slice)                   | 04-spawn-refname-diff-01.md                           |
| フェーズ3 修正 L4 (ref-name-option-injection-guard)                    | 04-spawn-refname-diff-01.md                           |
| フェーズ3 修正 L5 (diff-nul-delimited-parse)                           | 04-spawn-refname-diff-01.md                           |
