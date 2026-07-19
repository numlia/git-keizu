# テスト観点表: src/config.ts

> Source: `src/config.ts`
> Generated: 2026-05-17T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: feature-040-load-and-rgba

## S15: initialLoadCommits() / loadMoreCommits() 1 未満補正

> Origin: Feature 040 (settings-and-copy-polish) (light-spec-plan)
> Added: 2026-05-17
> Status: active
> Supersedes: -
> Signature: `initialLoadCommits(): number`, `loadMoreCommits(): number`
> Target Path: `src/config.ts`

`normalizeCommitLoadCount(value, defaultValue)` により 0 / 負値 / 非有限値を 1 以上の整数に補正することを検証する。

| Case ID | Input / Precondition        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes              |
| ------- | --------------------------- | -------------------------------------------------------------------------- | --------------- | ------------------ |
| TC-081  | `initialLoadCommits` 未指定 | Normal - default                                                           | 300 を返す      | パッケージ default |
| TC-082  | `initialLoadCommits = 0`    | Boundary - lower bound                                                     | 1 を返す        | 0 を 1 に補正      |
| TC-083  | `initialLoadCommits = -50`  | Validation - invalid value                                                 | 1 を返す        | 負値を 1 に補正    |
| TC-084  | `loadMoreCommits` 未指定    | Normal - default                                                           | 100 を返す      | パッケージ default |
| TC-085  | `loadMoreCommits = 0`       | Boundary - lower bound                                                     | 1 を返す        | 0 を 1 に補正      |
| TC-086  | `loadMoreCommits = 250`     | Normal - positive                                                          | 250 を返す      | 正値は維持         |

## S16: graphColours() RGBA filter

> Origin: Feature 040 (settings-and-copy-polish) (light-spec-plan)
> Added: 2026-05-17
> Status: superseded
> Superseded By: S19
> Supersedes: -
> Signature: `graphColours(): string[]`
> Target Path: `src/config.ts`

`GRAPH_COLOUR_PATTERN` 経由で許可形式（HEX 6/8、rgb()、rgba() with alpha 0-1）のみを残すことを検証する。

| Case ID | Input / Precondition                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                            | Notes                                |
| ------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------ |
| TC-087  | `["rgba(1, 2, 3, 0.5)"]`                                            | Normal - alpha mid                                                         | 入力配列がそのまま返る                     | alpha 0.5 を許可                     |
| TC-088  | `["rgba(1, 2, 3, 1)"]`                                              | Boundary - alpha max                                                       | 入力配列がそのまま返る                     | alpha 1 を許可                       |
| TC-089  | `["rgba(1, 2, 3)"]`                                                 | Validation - 3 args                                                        | 空配列                                     | 3 引数 rgba は拒否                   |
| TC-090  | `["rgba(1, 2, 3, 1.5)"]`                                            | Validation - alpha out of range                                            | 空配列                                     | alpha > 1 は拒否                     |
| TC-091  | `["rgb(1, 2, 3)", "#0085d9", "#0085d9cc"]`                          | Normal - classic forms                                                     | 入力配列がそのまま返る                     | HEX/RGB は維持                       |
| TC-092  | `["rgba(1, 2, 3, 0.5)", "rgba(1, 2, 3)", "#0085d9", "not-a-color"]` | Mixed                                                                      | `["rgba(1, 2, 3, 0.5)", "#0085d9"]` を返す | 不正値のみ filter される（順序保持） |
