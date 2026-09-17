# テスト観点表マニフェスト: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Storage Mode: sharded
> Generated: 2026-09-13T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Total Shards: 10
> Total Sections: 36
> Total Cases: 180

## Shards

| Shard File                           | Responsibility              | Sections | Cases | Last Updated |
| ------------------------------------ | --------------------------- | -------- | ----- | ------------ |
| 01-message-routing-01.md             | message-routing             | 9        | 27    | 2026-05-17   |
| 01-message-routing-02.md             | message-routing             | 1        | 7     | 2026-07-04   |
| 01-message-routing-03.md             | message-routing             | 3        | 26    | 2026-08-06   |
| 02-state-lifecycle-01.md             | state-lifecycle             | 12       | 47    | 2026-09-12   |
| 02-state-lifecycle-02.md             | state-lifecycle             | 1        | 1     | 2026-09-12   |
| 03-worktree-actions-01.md            | worktree-actions            | 5        | 34    | 2026-09-13   |
| 04-context-menu-recent-actions-01.md | context-menu-recent-actions | 2        | 3     | 2026-05-10   |
| 05-branch-cleanup-01.md              | branch-cleanup              | 1        | 15    | 2026-08-25   |
| 06-file-history-01.md                | file-history                | 1        | 12    | 2026-09-08   |
| 07-retain-context-01.md              | retain-context              | 1        | 8     | 2026-09-12   |

## Origin Coverage

| Origin                                                                 | Shard Files                                         |
| ---------------------------------------------------------------------- | --------------------------------------------------- |
| Feature 001 (menu-bar-enhancement) Task 4.2                            | 01-message-routing-01.md                            |
| Feature 001 (menu-bar-enhancement) Task 5.2                            | 01-message-routing-01.md                            |
| Feature 002 (menubar-search-diff) Task 2.4                             | 01-message-routing-01.md                            |
| Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)           | 02-state-lifecycle-01.md                            |
| Feature 006 (git-graph-parity) (aidd-spec-tasks-test)                  | 01-message-routing-01.md                            |
| Feature 012 (ui-enhancements) (aidd-spec-tasks-test)                   | 02-state-lifecycle-01.md                            |
| Feature 014 (dialog-defaults) (aidd-spec-tasks-test)                   | 03-worktree-actions-01.md                           |
| Feature 015 (commit-sort-order) (aidd-spec-tasks-test)                 | 02-state-lifecycle-01.md                            |
| Feature 016 (worktree-support) (aidd-spec-tasks-test)                  | 03-worktree-actions-01.md                           |
| Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)             | 03-worktree-actions-01.md                           |
| Feature 020 (legacy-branding-cleanup) (aidd-spec-tasks-test)           | 02-state-lifecycle-01.md                            |
| Feature 033 (watch-refresh-scope) Task 3                               | 02-state-lifecycle-01.md                            |
| Feature 034 (context-menu-recent-actions) Task 1                       | 04-context-menu-recent-actions-01.md                |
| Feature 039 (show-recent-actions-runtime-sync) (light-spec-plan)       | 04-context-menu-recent-actions-01.md                |
| Feature 040 (settings-and-copy-polish) (light-spec-plan)               | 01-message-routing-01.md                            |
| Feature 045 (defensive-fixes) (light-spec-plan)                        | 02-state-lifecycle-01.md, 03-worktree-actions-01.md |
| Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan) | 01-message-routing-03.md                            |
| Feature 051 (remote-checkout-pull) (light-spec-plan)                   | 01-message-routing-03.md                            |
| Feature 053 (detached-worktree-menu) (light-spec-plan)                 | 03-worktree-actions-01.md                           |
| Feature 055-03 (light-spec-plan)                                       | 05-branch-cleanup-01.md                             |
| Feature 055-07 (light-spec-plan)                                       | 06-file-history-01.md                               |
| Feature 056 (retain-context-when-hidden) issue #48                     | 07-retain-context-01.md                             |
| Feature 057 (multi-repo-single-folder-workspace) issue #49             | 02-state-lifecycle-01.md, 02-state-lifecycle-02.md  |
| test-plan (既存コード網羅)                                             | 01-message-routing-01.md                            |
| フェーズ2 修正 M5 (message-handler-try-finally-unmute)                 | 02-state-lifecycle-01.md                            |
| フェーズ2 修正 M9/M10 (view-diff-resolve-head)                         | 01-message-routing-02.md                            |
| フェーズ3 修正 L8 (avatar-storage-init-await)                          | 02-state-lifecycle-01.md                            |
