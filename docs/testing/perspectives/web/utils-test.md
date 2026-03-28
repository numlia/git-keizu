# テスト観点表: web/utils.ts

> Source: `web/utils.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: svgIcons SVGアイコン検証

> Origin: Feature 001 (menu-bar-enhancement) Task 1.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**テスト対象パス**: `web/utils.ts`

| Case ID | Input / Precondition  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                | Notes |
| ------- | --------------------- | -------------------------------------------------------------------------- | ------------------------------ | ----- |
| TC-001  | svgIcons.fetch を参照 | Normal - standard                                                          | 空でない文字列で `<svg` を含む | -     |
| TC-002  | svgIcons.stash を参照 | Normal - standard                                                          | 空でない文字列で `<svg` を含む | -     |

## S2: buildCommitRowAttributes() muted パラメータ

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**シグネチャ**: `buildCommitRowAttributes(hash: string, stash: GG.GitCommitStash | null, muted: boolean): string`
**テスト対象パス**: `web/utils.ts`

| Case ID | Input / Precondition                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                             | Notes                  |
| ------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| TC-003  | hash="abc123", stash=null, muted=true                 | Normal - standard                                                          | class="commit mute" data-hash="abc123" を含む               | mute 適用              |
| TC-004  | hash="abc123", stash=null, muted=false                | Normal - standard                                                          | class="commit" data-hash="abc123" を含む（mute なし）       | mute 非適用            |
| TC-005  | hash="abc123", stash={...}, muted=true                | Normal - special                                                           | class="commit stash" data-hash="abc123" を含む（mute なし） | stash は mute 不適用   |
| TC-006  | hash=UNCOMMITTED_CHANGES_HASH, stash=null, muted=true | Normal - special                                                           | class="unsavedChanges" を含む（mute なし）                  | unsaved は mute 不適用 |
| TC-007  | hash="abc123", stash=null, muted=true                 | Normal - standard                                                          | data-hash="abc123" が含まれる                               | data-hash 保持         |

## S3: svgIcons.worktree アイコン検証

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**テスト対象パス**: `web/utils.ts`

| Case ID | Input / Precondition     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                | Notes   |
| ------- | ------------------------ | -------------------------------------------------------------------------- | ------------------------------ | ------- |
| TC-008  | svgIcons.worktree を参照 | Normal - standard                                                          | 空でない文字列で `<svg` を含む | REQ-2.1 |

## S4: sanitizeBranchNameForPath() branch名パス正規化

> Origin: Feature 024 (worktree-path-normalize) (aidd-spec-tasks-test)
> Added: 2026-03-27
> Status: active
> Supersedes: -

**シグネチャ**: `sanitizeBranchNameForPath(branchName: string): string`
**テスト対象パス**: `web/utils.ts`

| Case ID | Input / Precondition              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                   | Notes                                |
| ------- | --------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| TC-009  | branchName = "feature/x"          | Normal - standard                                                          | 返却値が `"feature-x"` である                                     | REQ-9.1-TC1: / → -                   |
| TC-010  | branchName = "feature/sub/branch" | Normal - standard                                                          | 返却値が `"feature-sub-branch"` である                            | REQ-9.1-TC2: 複数スラッシュ          |
| TC-011  | branchName = "feature//x"         | Normal - consecutive                                                       | 返却値が `"feature-x"` である（連続 / を1つの - に折り畳み）      | REQ-9.1-TC3                          |
| TC-012  | branchName = "path\\file"         | Normal - standard                                                          | 返却値が `"path-file"` である                                     | REQ-9.1-TC4: バックスラッシュ        |
| TC-013  | branchName = "fix:bug"            | Normal - standard                                                          | 返却値が `"fix-bug"` である                                       | REQ-9.1-TC4: コロン                  |
| TC-014  | branchName = 'a\*b?c"d<e>f\|g'    | Normal - standard                                                          | 返却値が `"a-b-c-d-e-f-g"` である                                 | REQ-9.1-TC4: 残り6種 (\* ? " < > \|) |
| TC-015  | branchName = "feature branch"     | Normal - standard                                                          | 返却値が `"feature-branch"` である                                | REQ-9.1-TC4: 半角スペース            |
| TC-016  | branchName = "main"               | Normal - no-change                                                         | 返却値が `"main"` である（無変更）                                | REQ-9.1-TC5                          |
| TC-017  | branchName = "feature/ x"         | Normal - consecutive                                                       | 返却値が `"feature-x"` である（/ + スペースを1つの - に折り畳み） | REQ-9.1-TC6                          |
| TC-018  | branchName = ""                   | Boundary - empty                                                           | 返却値が `""` である                                              | 空文字列                             |
| TC-019  | branchName = "feature-x"          | Normal - idempotent                                                        | 返却値が `"feature-x"` である                                     | 冪等性: f(f(x)) === f(x)             |
