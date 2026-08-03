# テスト観点表マニフェスト: web/refMenu.ts

> Source: `web/refMenu.ts`
> Storage Mode: sharded
> Generated: 2026-08-04T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Total Shards: 3
> Total Sections: 17
> Total Cases: 85

## Shards

| Shard File                           | Responsibility              | Sections | Cases | Last Updated |
| ------------------------------------ | --------------------------- | -------- | ----- | ------------ |
| 01-branch-actions-01.md              | branch-actions              | 10       | 43    | 2026-08-04   |
| 02-worktree-actions-01.md            | worktree-actions            | 4        | 21    | 2026-07-19   |
| 03-context-menu-recent-actions-01.md | context-menu-recent-actions | 3        | 21    | 2026-05-09   |

## Origin Coverage

| Origin                                                                 | Shard Files                          |
| ---------------------------------------------------------------------- | ------------------------------------ |
| Feature 003 (ux-fixes-and-enhancements) Task 2.2                       | 01-branch-actions-01.md              |
| Feature 003 (ux-fixes-and-enhancements) Task 3.3                       | 01-branch-actions-01.md              |
| Feature 006 (git-graph-parity) (aidd-spec-tasks-test)                  | 01-branch-actions-01.md              |
| Feature 014 (dialog-defaults) (aidd-spec-tasks-test)                   | 01-branch-actions-01.md              |
| Feature 016 (worktree-support) (aidd-spec-tasks-test)                  | 02-worktree-actions-01.md            |
| Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)             | 02-worktree-actions-01.md            |
| Feature 032 (context-menu-reorg) Task 7                                | 03-context-menu-recent-actions-01.md |
| Feature 034 (context-menu-recent-actions) Task 4                       | 03-context-menu-recent-actions-01.md |
| Feature 037 (delete-branch-recent-actions) Task 4                      | 03-context-menu-recent-actions-01.md |
| Feature 045 (defensive-fixes) (light-spec-plan)                        | 02-worktree-actions-01.md            |
| Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan) | 01-branch-actions-01.md              |

## 移行履歴

single-file の `web/refMenu-test.md` は 14 sections / 74 cases に達し、shard 成長上限（12 sections）を超えたため 2026-08-03 に sharded mode へ移行した。移行前のスナップショットは `archive/web/refMenu-test/2026-08-03-pre-sharding-refMenu-test.md` に保存し、既存 S1〜S16 と TC-001〜TC-080 は番号・本文とも変更していない。
