# テスト観点表マニフェスト: src/dataSource.ts

> Source: `src/dataSource.ts`
> Storage Mode: sharded
> Generated: 2026-07-19T09:52:44+09:00
> Language: TypeScript
> Test Framework: Vitest
> Total Shards: 5
> Total Sections: 40
> Total Cases: 230

## Shards

| Shard File                  | Responsibility     | Sections | Cases | Last Updated |
| --------------------------- | ------------------ | -------- | ----- | ------------ |
| 01-history-diff-01.md       | history-diff       | 11       | 83    | 2026-07-04   |
| 02-branch-worktree-01.md    | branch-worktree    | 12       | 66    | 2026-07-04   |
| 03-author-watch-paths-01.md | author-watch-paths | 8        | 38    | 2026-07-04   |
| 04-spawn-refname-diff-01.md | spawn-refname-diff | 8        | 40    | 2026-07-19   |
| 05-git-path-01.md           | git-path           | 1        | 3     | 2026-07-19   |

## Origin Coverage

| Origin                                                       | Shard Files                                           |
| ------------------------------------------------------------ | ----------------------------------------------------- |
| Feature 001 (menu-bar-enhancement) Task 3.2                  | 01-history-diff-01.md                                 |
| Feature 001 (menu-bar-enhancement) Task 4.2                  | 01-history-diff-01.md                                 |
| Feature 001 (menu-bar-enhancement) Task 5.2                  | 01-history-diff-01.md                                 |
| Feature 002 (menubar-search-diff) Task 2.2                   | 01-history-diff-01.md                                 |
| Feature 003 (ux-fixes-and-enhancements) Task 2.2             | 02-branch-worktree-01.md                              |
| Feature 003 (ux-fixes-and-enhancements) Task 3.3             | 02-branch-worktree-01.md                              |
| Feature 003 (ux-fixes-and-enhancements) Task 4.2             | 01-history-diff-01.md                                 |
| Feature 006 (git-graph-parity) (aidd-spec-tasks-test)        | 02-branch-worktree-01.md, 03-author-watch-paths-01.md |
| Feature 011 (author-filter-fix) (aidd-spec-tasks-test)       | 03-author-watch-paths-01.md                           |
| Feature 012 (ui-enhancements) (aidd-spec-tasks-test)         | 03-author-watch-paths-01.md                           |
| Feature 014 (dialog-defaults) (aidd-spec-tasks-test)         | 02-branch-worktree-01.md                              |
| Feature 015 (commit-sort-order) (aidd-spec-tasks-test)       | 02-branch-worktree-01.md                              |
| Feature 016 (worktree-support) (aidd-spec-tasks-test)        | 02-branch-worktree-01.md                              |
| Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test) | 02-branch-worktree-01.md                              |
| Feature 033 (watch-refresh-scope) Task 1                     | 03-author-watch-paths-01.md                           |
| Feature 045 (defensive-fixes) (light-spec-plan)              | 04-spawn-refname-diff-01.md, 05-git-path-01.md        |
| test-plan (既存テスト)                                       | 01-history-diff-01.md                                 |
| フェーズ1 修正 H2 (rename-tracking-repair)                   | 02-branch-worktree-01.md                              |
| フェーズ1 修正 M2 (spawn-buffer-concat)                      | 01-history-diff-01.md                                 |
| フェーズ2 修正 M1 (author-filter-regex-escape)               | 03-author-watch-paths-01.md                           |
| フェーズ2 修正 M3 (detached-head-detection)                  | 01-history-diff-01.md                                 |
| フェーズ2 修正 M3 (spawn-locale-lc-all-c)                    | 01-history-diff-01.md                                 |
| フェーズ3 修正 L1 (spawn-stderr-drain)                       | 04-spawn-refname-diff-01.md                           |
| フェーズ3 修正 L2 (spawn-conditional-trailing-slice)         | 04-spawn-refname-diff-01.md                           |
| フェーズ3 修正 L4 (ref-name-option-injection-guard)          | 04-spawn-refname-diff-01.md                           |
| フェーズ3 修正 L5 (diff-nul-delimited-parse)                 | 04-spawn-refname-diff-01.md                           |
