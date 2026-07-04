# テスト観点表マニフェスト: web/main.ts

> Source: `web/main.ts`
> Storage Mode: sharded
> Generated: 2026-05-22T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Total Shards: 9
> Total Sections: 43
> Total Cases: 247

## Shards

| Shard File                  | Responsibility     | Sections | Cases | Last Updated |
| --------------------------- | ------------------ | -------- | ----- | ------------ |
| 01-rendering-01.md          | rendering          | 8        | 43    | 2026-03-22   |
| 02-context-menu-01.md       | context-menu       | 5        | 43    | 2026-03-22   |
| 03-compare-find-01.md       | compare-find       | 3        | 25    | 2026-03-22   |
| 04-keyboard-selection-01.md | keyboard-selection | 8        | 46    | 2026-05-17   |
| 05-state-response-01.md     | state-response     | 13       | 54    | 2026-07-04   |
| 05-state-response-02.md     | state-response     | 2        | 12    | 2026-07-04   |
| 06-file-actions-01.md       | file-actions       | 2        | 12    | 2026-04-04   |
| 07-load-count-01.md         | load-count         | 1        | 5     | 2026-05-17   |
| 08-request-queue-01.md      | request-queue      | 1        | 7     | 2026-05-22   |

## Origin Coverage

| Origin                                                               | Shard Files                                                                               |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Feature 001 (menu-bar-enhancement) Task 3.4                          | 01-rendering-01.md                                                                        |
| Feature 001 (menu-bar-enhancement) Task 4.4                          | 02-context-menu-01.md                                                                     |
| Feature 001 (menu-bar-enhancement) Task 5.4                          | 02-context-menu-01.md                                                                     |
| Feature 001 (menu-bar-enhancement) Task 6.2                          | 05-state-response-01.md                                                                   |
| Feature 002 (menubar-search-diff) Task 4.3                           | 03-compare-find-01.md                                                                     |
| Feature 004 (webview-ux-polish) (aidd-spec-tasks-test)               | 01-rendering-01.md                                                                        |
| Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)         | 02-context-menu-01.md, 04-keyboard-selection-01.md, 05-state-response-01.md               |
| Feature 006 (git-graph-parity) (aidd-spec-tasks-test)                | 01-rendering-01.md, 02-context-menu-01.md, 03-compare-find-01.md, 05-state-response-01.md |
| Feature 010 (mute-branch-label-fix) (aidd-spec-tasks-test)           | 01-rendering-01.md                                                                        |
| Feature 011 (author-filter-fix) (aidd-spec-tasks-test)               | 05-state-response-01.md                                                                   |
| Feature 012 (ui-enhancements) (aidd-spec-tasks-test)                 | 05-state-response-01.md                                                                   |
| Feature 013 (arrow-key-navigation) (aidd-spec-tasks-test)            | 04-keyboard-selection-01.md                                                               |
| Feature 013 (scroll-position-restore) (aidd-spec-tasks-test)         | 05-state-response-01.md                                                                   |
| Feature 015 (commit-sort-order) (aidd-spec-tasks-test)               | 02-context-menu-01.md                                                                     |
| Feature 016 (worktree-support) (aidd-spec-tasks-test)                | 01-rendering-01.md                                                                        |
| Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)         | 06-file-actions-01.md                                                                     |
| Feature 027 (commit-file-context-menu) (aidd-spec-tasks-test)        | 06-file-actions-01.md                                                                     |
| Feature 039 (show-recent-actions-runtime-sync)                       | 05-state-response-01.md                                                                   |
| Feature 040 (settings-and-copy-polish) (light-spec-plan)             | 07-load-count-01.md                                                                       |
| Feature 041 (refresh-contention-and-dialog-escape) (light-spec-plan) | 08-request-queue-01.md                                                                    |
| test-plan (既存コード網羅)                                           | 04-keyboard-selection-01.md                                                               |
| フェーズ2 修正 M12 (author-dropdown-merge-options)                   | 05-state-response-02.md                                                                   |
| フェーズ2 修正 M12 (author-dropdown-unconditional-rebuild)           | 05-state-response-02.md                                                                   |
