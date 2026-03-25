# テスト観点表: src/repoFileWatcher.ts

> Source: `src/repoFileWatcher.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: constructor() コンストラクタ

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `constructor(repoChangeCallback: () => void)`
**テスト対象パス**: `src/repoFileWatcher.ts:16-18`

| Case ID | Input / Precondition       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                            | Notes |
| ------- | -------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----- |
| TC-001  | repoChangeCallback=vi.fn() | Normal - standard                                                          | RepoFileWatcherインスタンスが生成される。内部状態: fsWatcher=null, muted=false, resumeAt=0 | -     |

## S2: start(repo) ファイル監視開始

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public start(repo: string)`
**テスト対象パス**: `src/repoFileWatcher.ts:20-30`

| Case ID | Input / Precondition                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                    | Notes                     |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| TC-002  | repo="/path/to/repo", fsWatcher=null (初回呼び出し) | Normal - standard                                                          | createFileSystemWatcher が `/path/to/repo/**` で1回呼ばれる。onDidCreate, onDidChange, onDidDelete の3イベントリスナーが登録される | L26-29                    |
| TC-003  | repo="/new/repo", fsWatcher=既存 (再呼び出し)       | Normal - branch                                                            | 既存watcherのdispose()が1回呼ばれた後、新しいwatcherが `/new/repo/**` で作成される                                                 | L21 true分岐              |
| TC-004  | repo="" (空文字列)                                  | Boundary - empty                                                           | createFileSystemWatcher が `/**` で呼ばれる。予期しない監視範囲になる可能性                                                        | L26のテンプレートリテラル |
| TC-005  | repo="/path/to/repo/" (末尾スラッシュ)              | Boundary - format                                                          | createFileSystemWatcher が `/path/to/repo//**` で呼ばれる。二重スラッシュを含むglob                                                | L26                       |

## S3: stop() ファイル監視停止

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public stop()`
**テスト対象パス**: `src/repoFileWatcher.ts:32-37`

| Case ID | Input / Precondition             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                  | Notes         |
| ------- | -------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------- |
| TC-006  | fsWatcher=監視中のwatcher        | Normal - standard                                                          | fsWatcher.dispose()が1回呼ばれる。fsWatcherがnullに設定される    | L34-35        |
| TC-007  | fsWatcher=null (未開始/停止済み) | Validation - rejected precondition                                         | 何も実行されない。エラーが発生しない                             | L33 false分岐 |
| TC-008  | stop()を2回連続呼び出し          | Boundary - repeated call                                                   | 1回目: dispose呼出+null設定。2回目: 何も実行されない。エラーなし | L33           |

## S4: mute() ミュート設定

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public mute()`
**テスト対象パス**: `src/repoFileWatcher.ts:39-41`

| Case ID | Input / Precondition   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result             | Notes |
| ------- | ---------------------- | -------------------------------------------------------------------------- | --------------------------- | ----- |
| TC-009  | 初期状態 (muted=false) | Normal - standard                                                          | mutedプロパティがtrueになる | L40   |

## S5: unmute() ミュート解除

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `public unmute()`
**テスト対象パス**: `src/repoFileWatcher.ts:43-46`

| Case ID | Input / Precondition             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                   | Notes                         |
| ------- | -------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------- |
| TC-010  | mute()呼び出し後                 | Normal - standard                                                          | mutedがfalseになる。resumeAtが現在時刻+1500ms付近の値に設定される | L44-45                        |
| TC-011  | unmute()呼び出し時のresumeAt精度 | Boundary - timing                                                          | resumeAtの値がDate.now()+1500の±50ms以内である                    | L45: 1500ms猶予期間の精度検証 |

## S6: refresh(uri) ミュート/猶予期間ガード

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**シグネチャ**: `private async refresh(uri: vscode.Uri)`
**テスト対象パス**: `src/repoFileWatcher.ts:48-58`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                        | Notes             |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------- |
| TC-012  | muted=true, uri=マッチする有効なパス                         | Validation - rejected precondition                                         | 早期リターン。repoChangeCallbackが呼ばれない                                           | L49               |
| TC-013  | muted=false, 現在時刻 < resumeAt (猶予期間内)                | Validation - rejected precondition                                         | 早期リターン。repoChangeCallbackが呼ばれない                                           | L51               |
| TC-014  | muted=false, 現在時刻 == resumeAt (境界値ちょうど)           | Boundary - exact                                                           | 早期リターンしない。`<` は厳密比較のため等値は通過し、コールバックがスケジュールされる | L51: `<` not `<=` |
| TC-015  | muted=false, 現在時刻 > resumeAt (猶予期間後), マッチするURI | Normal - standard                                                          | 猶予期間チェックを通過し、コールバックがスケジュールされる                             | L51通過           |

## S7: refresh(uri) fileChangeRegexフィルタ

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**テスト対象パス**: `src/repoFileWatcher.ts:50` (regex: L5-6)

fileChangeRegex は3パターンのOR:

1. `.git/` 配下の特定ファイル (config, index, HEAD, refs/stash, refs/heads/\*, refs/remotes/\*, refs/tags/\*)
2. `.git` で始まらない全ファイル
3. `.git` + 非スラッシュ文字のファイル (.gitignore等)

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                         | Notes                       |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| TC-016  | uri path=".git/config" (replace後)                           | Normal - standard                                                          | パターン1にマッチ。コールバックがスケジュールされる                                                                     | Git設定ファイル             |
| TC-017  | uri path=".git/refs/heads/main" (replace後)                  | Normal - standard                                                          | パターン1にマッチ。コールバックがスケジュールされる                                                                     | ブランチ参照                |
| TC-018  | uri path="src/index.ts" (replace後)                          | Normal - standard                                                          | パターン2にマッチ。コールバックがスケジュールされる                                                                     | 一般ソースファイル          |
| TC-019  | uri path=".gitignore" (replace後)                            | Normal - standard                                                          | パターン3にマッチ。コールバックがスケジュールされる                                                                     | .gitドットファイル          |
| TC-020  | uri path=".git/objects/ab/cd1234" (replace後)                | Validation - rejected precondition                                         | どのパターンにもマッチしない。早期リターン                                                                              | L50: Gitオブジェクト        |
| TC-021  | uri path=".git/hooks/pre-commit" (replace後)                 | Validation - rejected precondition                                         | どのパターンにもマッチしない。早期リターン                                                                              | L50: Gitフック              |
| TC-022  | uri path=".git/logs/HEAD" (replace後)                        | Validation - rejected precondition                                         | どのパターンにもマッチしない。早期リターン                                                                              | L50: Gitログ                |
| TC-023  | uri path=".git/COMMIT_EDITMSG" (replace後)                   | Validation - rejected precondition                                         | どのパターンにもマッチしない。早期リターン                                                                              | L50: コミットメッセージ編集 |
| TC-024  | uri path=".git/" (ディレクトリのみ)                          | Boundary - edge                                                            | パターン1: config等に不一致。パターン2: `.git`で始まるため不一致。パターン3: スラッシュ含むため不一致。早期リターン     | 3パターンすべて不一致       |
| TC-025  | uri path=".git" (スラッシュなし)                             | Boundary - edge                                                            | パターン1: スラッシュ不足で不一致。パターン2: `.git`で始まるため不一致。パターン3: `[^/]+`が0文字で不一致。早期リターン | `.git`ちょうどの境界        |
| TC-026  | uri path="" (repoプレフィックス除去後に空文字)               | Boundary - empty                                                           | パターン2 `^(?!\.git).*$` にマッチ（空文字は`.git`で始まらない）。コールバックがスケジュールされる                      | L50: replace結果が空の場合  |
| TC-027  | uri path=".git/refs/heads/" (末尾スラッシュ、ブランチ名なし) | Boundary - format                                                          | パターン1の `refs\/heads\/.*` にマッチ（`.*`は空文字列も許容）。コールバックがスケジュールされる                        | L5: `.*`の空マッチ          |

## S8: refresh(uri) デバウンス動作

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: active
> Supersedes: -

**テスト対象パス**: `src/repoFileWatcher.ts:53-58`

| Case ID | Input / Precondition                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                     | Notes              |
| ------- | --------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------ |
| TC-028  | マッチするURI1回、refreshTimeout=null   | Normal - standard                                                          | setTimeout(750ms)でrepoChangeCallbackがスケジュールされる。clearTimeoutは呼ばれない | L53 false → L56-58 |
| TC-029  | 500ms以内に3回連続でマッチするURIの変更 | Normal - standard                                                          | clearTimeoutが2回呼ばれる。750ms後に最後の1回分のrepoChangeCallbackのみ実行される   | L53-54でデバウンス |
| TC-030  | refreshTimeout=null (初回)              | Normal - standard                                                          | clearTimeoutが呼ばれない。setTimeoutのみ呼ばれる                                    | L53 false分岐      |
| TC-031  | refreshTimeout=既存タイムアウトあり     | Normal - standard                                                          | clearTimeout(既存ID)が1回呼ばれた後、新しいsetTimeoutが設定される                   | L53 true → L54     |
