# テスト観点表: web/utils.ts

## S1: svgIcons SVGアイコン検証

> Origin: Feature 001 (menu-bar-enhancement) Task 1.2
> Added: 2026-02-25

**テスト対象パス**: `web/utils.ts`

| Case ID | Input / Precondition  | Perspective (Equivalence / Boundary) | Expected Result                | Notes |
| ------- | --------------------- | ------------------------------------ | ------------------------------ | ----- |
| TC-001  | svgIcons.fetch を参照 | Equivalence - normal                 | 空でない文字列で `<svg` を含む | -     |
| TC-002  | svgIcons.stash を参照 | Equivalence - normal                 | 空でない文字列で `<svg` を含む | -     |

## S2: buildCommitRowAttributes() muted パラメータ

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04

**シグネチャ**: `buildCommitRowAttributes(hash: string, stash: GG.GitCommitStash | null, muted: boolean): string`
**テスト対象パス**: `web/utils.ts`

| Case ID | Input / Precondition                                  | Perspective (Equivalence / Boundary) | Expected Result                                             | Notes                  |
| ------- | ----------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------- | ---------------------- |
| TC-003  | hash="abc123", stash=null, muted=true                 | Equivalence - normal                 | class="commit mute" data-hash="abc123" を含む               | mute 適用              |
| TC-004  | hash="abc123", stash=null, muted=false                | Equivalence - normal                 | class="commit" data-hash="abc123" を含む（mute なし）       | mute 非適用            |
| TC-005  | hash="abc123", stash={...}, muted=true                | Equivalence - special                | class="commit stash" data-hash="abc123" を含む（mute なし） | stash は mute 不適用   |
| TC-006  | hash=UNCOMMITTED_CHANGES_HASH, stash=null, muted=true | Equivalence - special                | class="unsavedChanges" を含む（mute なし）                  | unsaved は mute 不適用 |
| TC-007  | hash="abc123", stash=null, muted=true                 | Equivalence - normal                 | data-hash="abc123" が含まれる                               | data-hash 保持         |

## S3: svgIcons.worktree アイコン検証

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12

**テスト対象パス**: `web/utils.ts`

| Case ID | Input / Precondition     | Perspective (Equivalence / Boundary) | Expected Result                | Notes   |
| ------- | ------------------------ | ------------------------------------ | ------------------------------ | ------- |
| TC-008  | svgIcons.worktree を参照 | Equivalence - normal                 | 空でない文字列で `<svg` を含む | REQ-2.1 |
