# テスト観点表: src/repoFileWatcher.ts

> Source: `src/repoFileWatcher.ts`
> Generated: 2026-05-02T01:46:44Z
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
> Status: superseded
> Supersedes: -
> Superseded By: S11

**シグネチャ**: `public mute()`
**テスト対象パス**: `src/repoFileWatcher.ts:39-41`

| Case ID | Input / Precondition   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result             | Notes |
| ------- | ---------------------- | -------------------------------------------------------------------------- | --------------------------- | ----- |
| TC-009  | 初期状態 (muted=false) | Normal - standard                                                          | mutedプロパティがtrueになる | L40   |

## S5: unmute() ミュート解除

> Origin: test-plan (既存コード分析)
> Added: 2026-03-22
> Status: superseded
> Supersedes: -
> Superseded By: S11

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
> Status: superseded
> Supersedes: -
> Superseded By: S13

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

## S9: Git 管理ディレクトリ限定監視と複数 watch root

> Origin: Feature 033 (watch-refresh-scope) Task 2
> Added: 2026-05-02T01:46:44Z
> Status: active
> Supersedes: S2, S3, S6, S7, S8
> Signature: `public start(watchRoots: string[]): void`
> Target Path: `src/repoFileWatcher.ts`

| Case ID | Input / Precondition                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                      | Notes                             |
| ------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| TC-032  | watchRoots=[`/path/to/main/.git/worktrees/feature-x`, `/path/to/main/.git`]       | Normal - multi-root start                                                  | `createFileSystemWatcher` が2回呼ばれ、両 watcher に `onDidCreate` / `onDidChange` / `onDidDelete` が各1回登録される | linked worktree                   |
| TC-033  | 既存 watcher 起動後に別の watchRoots で `start()` を再実行                        | Normal - restart                                                           | 旧 watcher の `dispose()` が1回呼ばれた後、新しい root 群で watcher が再作成される                                   | 再起動                            |
| TC-034  | 複数 root で起動済み                                                              | Normal - stop all                                                          | `stop()` で各 watcher の `dispose()` が1回ずつ呼ばれる                                                               | 全破棄                            |
| TC-035  | watchRoot=`/path/to/repo/.git`, 変更パス=`src/index.ts`                           | Validation - non-git working tree path                                     | `repoChangeCallback` が呼ばれない                                                                                    | working tree 変更は無視           |
| TC-036  | watchRoot=`/path/to/repo/.git`, 変更パス=`.gitignore`                             | Validation - ignored dotfile                                               | `repoChangeCallback` が呼ばれない                                                                                    | dotfile は監視対象外              |
| TC-037  | watchRoot=`/path/to/repo/.git`, 変更パス=`HEAD`                                   | Normal - head update                                                       | 750ms 後に `repoChangeCallback` が1回呼ばれる                                                                        | Git 管理ファイル                  |
| TC-038  | watchRoot=`/path/to/repo/.git`, 変更パス=`packed-refs`                            | Normal - packed refs                                                       | 750ms 後に `repoChangeCallback` が1回呼ばれる                                                                        | packed refs 更新                  |
| TC-039  | watchRoot=`/path/to/repo/.git`, 変更パス=`refs/remotes/origin/main`               | Normal - remote ref                                                        | 750ms 後に `repoChangeCallback` が1回呼ばれる                                                                        | remote-tracking ref               |
| TC-040  | watchRoot=`/path/to/repo/.git`, 変更パス=`refs/heads/`                            | Boundary - empty ref suffix                                                | `repoChangeCallback` が呼ばれない                                                                                    | `refs/heads/*` は空名を許可しない |
| TC-041  | muted=true, 変更パス=`HEAD`                                                       | Validation - muted                                                         | `repoChangeCallback` が呼ばれない                                                                                    | mute 維持                         |
| TC-042  | `unmute()` 直後、現在時刻 < `resumeAt`, 変更パス=`HEAD`                           | Boundary - grace period                                                    | `repoChangeCallback` が呼ばれない                                                                                    | 1500ms 猶予維持                   |
| TC-043  | watchRoots=[linked git-dir, common-dir], common-dir で `refs/heads/main` が変化   | Normal - second watch root                                                 | 共通 root 側イベントでも 750ms 後に `repoChangeCallback` が1回呼ばれる                                               | shared refs                       |
| TC-044  | 複数 root から 750ms 以内に `HEAD` と `refs/remotes/origin/main` の変更が連続到達 | Normal - cross-root debounce                                               | `clearTimeout` が1回呼ばれ、750ms 後の `repoChangeCallback` は合計1回だけ実行される                                  | デバウンス維持                    |
| TC-045  | watchRoots=[linked git-dir], common-dir 配下の `refs/heads/main` を誤って渡す     | Validation - outside configured roots                                      | `repoChangeCallback` が呼ばれない                                                                                    | root 外イベントを拒否             |

## S10: start() glob 構築時の区切り正規化（Windows バックスラッシュ対策）

> Origin: フェーズ1 修正 M4 (watcher-glob-separator-normalize)
> Added: 2026-07-04T01:35:00Z
> Status: active
> Supersedes: -
> Signature: `public start(watchRoots: string[]): void`
> Target Path: `src/repoFileWatcher.ts:41-49`

各 watchRoot を `getPathFromStr(path.normalize(watchRoot))` で正規化してから `` `${watchRoot}/**` `` を連結する修正。`getPathFromStr` はバックスラッシュ `\` を `/` へ置換するため、Windows 形式パスでも glob 区切りがフォワードスラッシュに統一される（POSIX 実行時 `path.normalize` は `\` を区切りとして扱わず、`getPathFromStr` が変換を担う）。

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                              | Notes                                                                                                                                                  |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TC-046  | watchRoots=[`C:\\repo\\.git`]（バックスラッシュ区切り）        | Normal - backslash normalized                                              | `createFileSystemWatcher` が `C:/repo/.git/**` で1回呼ばれる。glob 引数にバックスラッシュ `\` を含まない                     | getPathFromStr による `\`→`/` 変換                                                                                                                     |
| TC-047  | watchRoots=[`/path/to/repo/.git`]（既にフォワードスラッシュ）  | Normal - posix path unchanged                                              | `createFileSystemWatcher` が `/path/to/repo/.git/**` で1回呼ばれる。区切りは変化しない                                       | 変換対象なし                                                                                                                                           |
| TC-048  | watchRoots=[`/path/to/repo/./.git`]（冗長な `./` セグメント）  | Normal - redundant segment collapsed                                       | `path.normalize` により `/./` が畳まれ、`createFileSystemWatcher` が `/path/to/repo/.git/**` で呼ばれる                      | normalize の正規化検証                                                                                                                                 |
| TC-049  | watchRoots=[]（空配列）                                        | Boundary - empty roots array                                               | `createFileSystemWatcher` が呼ばれない（0回）。`fsWatchers.length === 0`                                                     | map が空配列を返す                                                                                                                                     |
| TC-050  | watchRoots=[`""`]（空文字列）                                  | Boundary - empty string root                                               | `path.normalize("")` が `"."` を返し、`createFileSystemWatcher` が `./**` で1回呼ばれる                                      | 空文字 root の境界                                                                                                                                     |
| TC-051  | watchRoots=[`C:\\repo\\.git\\`]（末尾バックスラッシュ）        | Boundary - trailing separator                                              | `path.normalize` が末尾区切りを除去し、`createFileSystemWatcher` が `C:/repo/.git/**` で呼ばれる。`\**` や `//**` を含まない | 末尾区切り + `\`→`/`。テスト未カバー: 期待値は Windows の `path.normalize` 挙動前提で、POSIX 実行環境（CI）では `\` を区切りとして扱わず再現不能のため |
| TC-052  | watchRoots=[`C:\\a\\.git`, `/b/.git`]（混在区切りの複数 root） | Boundary - mixed separators multi-root                                     | `createFileSystemWatcher` が2回呼ばれ、glob は各々 `C:/a/.git/**` と `/b/.git/**`。いずれもバックスラッシュを含まない        | 複数 root ごとに正規化される                                                                                                                           |

## S11: mute()/unmute() 参照カウント方式（muteCount）

> Origin: フェーズ2 修正 L7 (watcher-ref-counted-mute)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: S4, S5
> Signature: `public mute(): void` / `public unmute(): void` / `private refresh(uri)`
> Target Path: `src/repoFileWatcher.ts:34, 60-72`

`muted: boolean` を `muteCount: number` へ変更し、`mute()` で +1、`unmute()` で（`muteCount > 0` のときのみ）-1、`refresh` の無視判定を `muteCount > 0` とする修正。ネストした mute/unmute を正しく釣り合わせ、対応する回数だけ unmute しない限り監視が再開されないことを保証する。過剰 unmute でも負値に沈まない（1回の mute が確実に抑止を成立させる）。旧 S4/S5（boolean `muted`）を置き換える。観測は「マッチする git 管理パス変更時に `repoChangeCallback` がスケジュールされるか」で行う。

| Case ID | Input / Precondition                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                             | Notes                                      |
| ------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-053  | `mute()` を1回呼んだ後、マッチする `HEAD` 変更を発火                        | Normal - single mute suppresses                                            | `muteCount===1` で `refresh` が早期リターンし、`repoChangeCallback` がスケジュールされない                  | 単一 mute の抑止                           |
| TC-054  | `mute()` を2回（ネスト）呼んだ後、マッチする変更を発火                      | Normal - nested mute still suppresses                                      | `muteCount===2`（>0）で `repoChangeCallback` がスケジュールされない                                         | ネスト mute で加算                         |
| TC-055  | `mute()`×2 → `unmute()`×1 の後、マッチする変更を発火                        | Boundary - partial unmute still muted                                      | `muteCount===1`（まだ>0）で `repoChangeCallback` がスケジュールされない                                     | 参照カウントの肝（対応回数まで再開しない） |
| TC-056  | `mute()`×2 → `unmute()`×2 の後、`resumeAt` 経過後にマッチする変更を発火     | Boundary - fully balanced resumes                                          | `muteCount===0` かつ猶予期間経過で、750ms 後に `repoChangeCallback` が1回呼ばれる                           | 釣り合った unmute で再開                   |
| TC-057  | `muteCount===0` の状態で `unmute()`（過剰）→ 続けて `mute()`×1 → 変更を発火 | Boundary - underflow guard                                                 | 過剰 unmute で `muteCount` が負に沈まず0維持。後続 `mute()`×1 で確実に `muteCount===1` となり callback 抑止 | `if (muteCount > 0)` ガードの効果          |
| TC-058  | `mute()` 後に `unmute()` を呼ぶ                                             | Boundary - resumeAt set on unmute                                          | `unmute()` 実行時に `resumeAt` が `Date.now() + 1500` 付近（±50ms）に設定される                             | 猶予期間の維持（旧 S5 の観点を継承）       |

## S12: stop()/mute() 保留デバウンスタイマーのクリア

> Origin: フェーズ2 修正 L9 (watcher-clear-pending-timer)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `public stop(): void` / `public mute(): void`
> Target Path: `src/repoFileWatcher.ts:57-70`

`stop()` と `mute()` に「`refreshTimeout !== null` なら `clearTimeout` して `null` 化する」処理を追加する修正。監視停止・ミュート時に保留中のデバウンス済み `repoChangeCallback` が後から発火してしまうのを防ぐ。

| Case ID | Input / Precondition                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                           | Notes                          |
| ------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-059  | マッチ変更で `refreshTimeout` 保留中に `stop()` を呼ぶ                 | Normal - stop clears pending timer                                         | `clearTimeout(refreshTimeout)` が呼ばれ `refreshTimeout=null`。タイマー満了時刻を過ぎても callback 未発火 | 停止時の保留クリア             |
| TC-060  | `refreshTimeout===null`（保留なし）で `stop()` を呼ぶ                  | Boundary - stop no pending timer                                           | `refreshTimeout` 用の `clearTimeout` は呼ばれない（既に null）。エラーなく完了                            | 保留なし境界                   |
| TC-061  | マッチ変更で `refreshTimeout` 保留中に `mute()` を呼ぶ                 | Normal - mute clears pending timer                                         | `clearTimeout(refreshTimeout)` が呼ばれ `refreshTimeout=null`。加えて `muteCount` が +1 される            | ミュート時の保留クリア         |
| TC-062  | `refreshTimeout===null`（保留なし）で `mute()` を呼ぶ                  | Boundary - mute no pending timer                                           | `refreshTimeout` 用の `clearTimeout` は呼ばれず、`muteCount` のみ +1 される                               | 保留なし境界                   |
| TC-063  | `mute()` で保留タイマークリア後、時間を `advanceTimersByTime` で進める | Boundary - cleared timer never fires                                       | クリア済みの保留分の `repoChangeCallback` が発火しない（0回）                                             | クリア済みタイマーの非発火保証 |

## S13: refresh(uri) linked worktree の Git 状態監視（`worktrees/` prefix）

> Origin: Feature 052 (detached-worktree-display) (light-spec-plan)
> Added: 2026-08-08
> Status: active
> Supersedes: S7
> Signature: `private refresh(uri: vscode.Uri)` / `watchedRepositoryStatePrefixes`
> Target Path: `src/repoFileWatcher.ts`（`watchedRepositoryStatePrefixes` と `isWatchedRepositoryStatePath()`。実装後に行範囲へ更新）
> Test File: `tests/src/repoFileWatcher.test.ts`

`watchedRepositoryStatePrefixes` へ `worktrees/` を追加し、共通 Git directory を watch root とした `worktrees/<name>` とその任意の非空 descendant の create / change / delete を既存 750ms debounce へ流す変更。`pathValue.startsWith(prefix) && pathValue !== prefix` の既存判定を維持するため prefix 自体は発火させない。旧 S7 は `.git` 前置の regex を前提に「`.git` で始まらない全ファイルが発火する」「`.git/logs/HEAD` は発火しない」を固定しており、現行の watch root 相対判定でも本追加でも成立しないため supersede する。watch root の構築・複数 root・stop / restart の契約は S9 が active のまま担保し、glob 正規化は S10、`muteCount` は S11、保留タイマーのクリアは S12 の責務。watch root 自体の取得は `src/dataSource-test/03-author-watch-paths-01.md` の責務。

| Case ID | Input / Precondition                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                      | Notes                               |
| ------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------- |
| TC-064  | watchRoot=`/repo/.git`、`worktrees/feature-x/HEAD` の create を通知                                  | Normal - worktree head create                                              | 750ms 経過後に `repoChangeCallback` が 1 回呼ばれる                                                  | 8.1 の解消ケース                    |
| TC-065  | 同 path の change を通知                                                                             | Normal - worktree head change                                              | 750ms 経過後に `repoChangeCallback` が 1 回呼ばれる                                                  | HEAD 移動の検知                     |
| TC-066  | 同 path の delete を通知                                                                             | Normal - worktree head delete                                              | 750ms 経過後に `repoChangeCallback` が 1 回呼ばれる                                                  | worktree 削除の検知                 |
| TC-067  | `worktrees/feature-x`（prefix 直下、最短の非空 descendant）の create を通知                          | Boundary - minimum non-empty descendant                                    | 750ms 経過後に `repoChangeCallback` が 1 回呼ばれる                                                  | prefix + 1 セグメント               |
| TC-068  | `worktrees/feature-x` の delete を通知                                                               | Boundary - minimum descendant delete                                       | 750ms 経過後に `repoChangeCallback` が 1 回呼ばれる                                                  | worktree ディレクトリごとの削除     |
| TC-069  | `worktrees/feature-x/gitdir` の create を通知                                                        | Normal - gitdir create                                                     | 750ms 経過後に `repoChangeCallback` が 1 回呼ばれる                                                  | 8.1 の gitdir create                |
| TC-070  | `worktrees/feature-x/gitdir` の delete を通知                                                        | Normal - gitdir delete                                                     | 750ms 経過後に `repoChangeCallback` が 1 回呼ばれる                                                  | 8.1 の gitdir delete                |
| TC-071  | `worktrees/feature-x/commondir` の change を通知                                                     | Normal - commondir change                                                  | 750ms 経過後に `repoChangeCallback` が 1 回呼ばれる                                                  | 4.6 の列挙 path                     |
| TC-072  | `worktrees/feature-x/index` の change を通知                                                         | Normal - worktree index change                                             | 750ms 経過後に `repoChangeCallback` が 1 回呼ばれる                                                  | 4.6 の列挙 path                     |
| TC-073  | `worktrees/feature-x/logs/HEAD`（多段 nested）の change を通知                                       | Normal - nested descendant                                                 | 750ms 経過後に `repoChangeCallback` が 1 回呼ばれる                                                  | 任意の非空 descendant               |
| TC-074  | `worktrees/`（prefix 自体）の create を通知                                                          | Boundary - prefix itself rejected                                          | `repoChangeCallback` が呼ばれない（0回）                                                             | `pathValue !== prefix` の維持       |
| TC-075  | `worktrees`（末尾区切りなし）の create を通知                                                        | Boundary - prefix without separator rejected                               | `repoChangeCallback` が呼ばれない（0回）                                                             | `startsWith("worktrees/")` に不一致 |
| TC-076  | `objects/ab/cd1234` の change を通知                                                                 | Validation - git object path rejected                                      | `repoChangeCallback` が呼ばれない（0回）                                                             | 8.2 の維持ケース                    |
| TC-077  | working tree の `src/index.ts` の change を通知                                                      | Validation - working tree path rejected                                    | `repoChangeCallback` が呼ばれない（0回）                                                             | 8.2 の維持ケース                    |
| TC-078  | watchRoots=[`/repo/.git`]、`/other/.git/worktrees/feature-x/HEAD` の change を通知                   | Validation - outside watch roots rejected                                  | `repoChangeCallback` が呼ばれない（0回）                                                             | root 外イベントの拒否               |
| TC-079  | watchRoot=`/repo/.git`、`HEAD` の change を通知                                                      | Normal - existing allowlist retained (HEAD)                                | 750ms 経過後に `repoChangeCallback` が 1 回呼ばれる                                                  | 既存許可リストの維持                |
| TC-080  | watchRoot=`/repo/.git`、`refs/heads/main` の change を通知                                           | Normal - existing allowlist retained (branch ref)                          | 750ms 経過後に `repoChangeCallback` が 1 回呼ばれる                                                  | 既存 prefix の維持                  |
| TC-081  | watchRoot=`/repo/.git`、`refs/heads/`（空 suffix）の change を通知                                   | Boundary - empty ref suffix rejected                                       | `repoChangeCallback` が呼ばれない（0回）                                                             | 既存 prefix 境界の維持              |
| TC-082  | watchRoots=[linked git-dir, common-dir]、common-dir 側の `worktrees/feature-x/HEAD` を通知           | Normal - second watch root                                                 | 750ms 経過後に `repoChangeCallback` が 1 回呼ばれる                                                  | 複数 root 契約の維持                |
| TC-083  | 750ms 以内に `worktrees/feature-x/HEAD` と `HEAD` の変更が連続して到達                               | Normal - debounce across paths                                             | `clearTimeout` が 1 回呼ばれ、750ms 経過後の `repoChangeCallback` が合計 1 回だけ実行される          | debounce 契約の維持                 |
| TC-084  | `worktrees/feature-x/HEAD` の change 後、749ms だけ時間を進める                                      | Boundary - before debounce elapses                                         | `repoChangeCallback` が呼ばれない（0回）                                                             | 750ms 未満の境界                    |
| TC-085  | `mute()` 済みの状態で `worktrees/feature-x/HEAD` の change を通知                                    | Validation - muted                                                         | `repoChangeCallback` が呼ばれない（0回）                                                             | mute 契約の維持                     |
| TC-086  | `unmute()` 直後（現在時刻 < `resumeAt`）に `worktrees/feature-x/HEAD` の change を通知               | Boundary - grace period                                                    | `repoChangeCallback` が呼ばれない（0回）                                                             | 1500ms 猶予の維持                   |
| TC-087  | watchRoot=`C:/repo/.git`、`worktrees\feature-x\HEAD`（バックスラッシュ区切り）の change を通知       | Boundary - separator normalized                                            | `normaliseWatchPath()` 適用後に prefix と一致し、750ms 経過後に `repoChangeCallback` が 1 回呼ばれる | 区切り正規化の維持                  |
| TC-088  | `stop()` 実行後に `worktrees/feature-x/HEAD` の change を通知                                        | Validation - after stop                                                    | `repoChangeCallback` が呼ばれない（0回）                                                             | watchRoots が空になる               |
| TC-089  | watchRoot=`/repo/.git`、working tree 側の同名 path `/repo/worktrees/feature-x/HEAD` の change を通知 | Validation - working tree namesake rejected                                | `repoChangeCallback` が呼ばれない（0回）                                                             | 相対 path が `..` 始まりになる      |

### 失敗源インベントリ（include-or-justify）— Feature 052 追加分（S13）

| 失敗源                                                  | 対応ケースまたは除外理由                                                                                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `worktrees/` 配下の変更を検知できない（現行の根本原因） | TC-064〜TC-073                                                                                                                           |
| event 種別ごとに取りこぼす（create / change / delete）  | TC-064（create）、TC-065（change）、TC-066（delete）、TC-067 / TC-068（create / delete）、TC-069 / TC-070（create / delete）             |
| prefix 自体や prefix 前方一致だけの path で発火する     | TC-074、TC-075                                                                                                                           |
| Git 管理外・監視対象外の path まで許可を広げる          | TC-076、TC-077、TC-089                                                                                                                   |
| watch root 外のイベントを受理する                       | TC-078、TC-088                                                                                                                           |
| 既存許可リスト・既存 prefix 境界を壊す                  | TC-079、TC-080、TC-081                                                                                                                   |
| 複数 root のいずれかで発火しなくなる                    | TC-082                                                                                                                                   |
| debounce を壊して多重発火する                           | TC-083、TC-084                                                                                                                           |
| mute / 猶予期間の抑止を貫通する                         | TC-085、TC-086                                                                                                                           |
| 区切り文字の違いで prefix 判定に失敗する                | TC-087                                                                                                                                   |
| 境界値（empty / minimum / +/-1）                        | TC-074（prefix 自体 = 空 suffix）、TC-081（既存 prefix の空 suffix）、TC-067（最短の非空 descendant）、TC-084（debounce -1ms）           |
| 境界値（0 / maximum / NULL）                            | excluded(監視 path の段数と debounce に上限がなく、`uri` は必須引数で `null` を取り得ない。callback 0 回は TC-074〜TC-078 ほかで検証)    |
| 外部依存の失敗                                          | excluded(`vscode.workspace.createFileSystemWatcher` は mock で、watcher 生成失敗時の分岐が実装に存在しない。生成引数の検証は S10 の責務) |
| 例外送出                                                | excluded(`refresh()` は早期 return のみで throw 経路を持たない)                                                                          |
| watch root の取得内容の誤り                             | excluded(`src/dataSource-test/03-author-watch-paths-01.md` の責務)                                                                       |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-076、TC-077、TC-078、TC-085、TC-088、TC-089
- Exception: excluded(throw 経路なし。抑止は早期 return として Validation / Boundary で検証)
- External: excluded(外部依存の失敗分岐が実装に存在しない)
- Boundary: TC-067、TC-068、TC-074、TC-075、TC-081、TC-084、TC-086、TC-087
- Type: excluded(引数が `vscode.Uri` に固定され、不正型は typecheck が拒否する)

**失敗系/正常系比（煙感知器）**: 正常系 12 件（TC-064〜TC-066、TC-069〜TC-073、TC-079、TC-080、TC-082、TC-083）、失敗系 14 件（TC-067、TC-068、TC-074〜TC-078、TC-081、TC-084〜TC-089）。比 1.17 で近接（差 1 以内）ではないが、正常系が多いのは 4.6 が発火すべき path を列挙する仕様であるためであり、インベントリを再導出して拒否側（prefix 自体・前方一致のみ・objects・working tree・root 外・停止後・同名 path・空 suffix・debounce 未経過・mute・猶予）の列挙漏れがないことを確認した。
