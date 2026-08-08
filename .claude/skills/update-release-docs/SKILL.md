---
name: update-release-docs
description: "リリース準備: 前回リリースタグとの差分と要件ドキュメントから CHANGELOG / README を更新し、バージョンバンプとあわせてリリース準備 PR を作成する"
allowed-tools: Read, Edit, Bash(cd:*), Bash(git log:*), Bash(git diff:*), Bash(git status:*), Bash(git tag:*), Bash(git switch:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(gh pr:*)
argument-hint: <要件ドキュメントのパス> [バージョン] # 例: notes/features/052/memo.md 0.9.0
---

# Release Prep Workflow（docs + version bump → PR）

前回リリースタグ以降の main の変更と指定された要件ドキュメントを参照し、
次バージョン用の `CHANGELOG.md` / `README.md` の更新と `package.json` のバージョンバンプを
**リリース準備ブランチ + Draft PR** として作成します。

> main ブランチは ruleset（pull_request 必須・bypass なし）で保護されているため、
> リリース準備 commit を main へ直接 push することはできません。
> 本スキルは PR 作成まで、タグ作成と公開トリガーは `/release` が担当します。

リリースフロー全体:

```
1. /update-release-docs <要件ドキュメント> <バージョン>   ← 本スキル（docs + bump の PR 作成）
2. PR をマージ（ユーザー）
3. /release <バージョン>                                  ← 検証 → タグ作成 → タグ push
```

## 前提条件

- リポジトリルート: `~/work/ai/git-keizu`
- 最初の Bash tool call で必ず `cd ~/work/ai/git-keizu` を実行すること
- リリース対象の機能 PR がすべて main へマージ済みであること
- ローカル main が `origin/main` と一致していること（`git status` で確認。乖離している場合は中断してユーザーに報告する）

## 引数（$ARGUMENTS）

スペース区切りで最大2トークンを受け取る。

| 位置    | 必須   | 説明                                                                   |
| ------- | ------ | ---------------------------------------------------------------------- |
| 第1引数 | 必須   | 要件ドキュメントのパス（リポジトリルートからの相対パスまたは絶対パス） |
| 第2引数 | 省略可 | バージョン番号（例: `0.9.0` または `v0.9.0`、v-prefix は任意）         |

引数が指定されていない場合は、要件ドキュメントのパスをユーザーに確認してから進めること。

## ⚠️ CRITICAL: ドキュメント更新前に必ず実行すること

コミットメッセージ・PR 本文を生成する前に、以下を必ず実行すること。

### 言語設定の確認（MANDATORY）

1. `docs/development/project-settings.md` を **Read ツール**で読む
   - 読めた場合: `commit-language: en` があれば**英語**、`commit-language: ja` または記述なしなら**日本語**を使用
   - 読めなかった場合（ファイルが存在しない）: 次へ
2. プロジェクトルートの `CLAUDE.md` を **Read ツール**で読む
   - 同様に `commit-language:` を探す
   - 読めなかった場合: 日本語（グローバルデフォルト）を使用

**言語の優先順位**: `docs/development/project-settings.md` > `CLAUDE.md` > グローバルデフォルト（日本語）

## 実行手順

### Step 1: リポジトリルートへ移動と前提確認

```bash
cd ~/work/ai/git-keizu
git status
```

- 現在のブランチが main でない、または working tree に未コミット変更がある場合は中断してユーザーに報告する。

### Step 2: 情報収集（並列実行可）

1. **前回リリースタグを特定**:
   ```bash
   git tag -l 'v*' --sort=-v:refname
   ```
   先頭（最新）のタグを `v{前バージョン}` とする。
2. **要件ドキュメントを読む**: 第1引数のファイルを Read ツールで読む
3. **前回タグ以降の変更ログを取得**:
   ```bash
   git log v{前バージョン}..main --oneline
   ```
4. **前回タグ以降の差分を取得**:
   ```bash
   git diff v{前バージョン}...main --stat
   ```
   概要を把握し、必要なファイルだけ個別に Read で確認する
5. **現在の CHANGELOG.md / README.md / package.json を読む**（package.json は `"version"` フィールドの確認）

### Step 3: バージョンと日付の決定

#### バージョンの決定

1. **第2引数が指定されている場合** — その値を使用する（`v` prefix は除去して正規化）
2. **第2引数が省略されている場合** — ユーザーに確認する（bump を含むため、自動決定はしない）

#### 安全チェック（必須）

- 決定したバージョンが CHANGELOG に既存エントリとして存在する場合は**処理を中断**し、別バージョンの指定か上書きの了承をユーザーに確認する。
- 決定したバージョンのタグ `v{バージョン}` が既に存在する場合も中断する。
- **日付**: 今日の日付（YYYY-MM-DD 形式）

### Step 4: リリース準備ブランチの作成

```bash
git switch -c docs/release-v{バージョン} main
```

### Step 5: CHANGELOG.md の更新

`## [Unreleased]` セクションの直後に新バージョンのセクションを挿入する。

#### 書き方のルール

- **言語**: 英語（`commit-language: en` に準拠）
- **形式**: [Keep a Changelog](https://keepachangelog.com/) 準拠
- **セクション**: `Added` / `Changed` / `Fixed` / `Removed` のうち該当するもの
- **各項目**: `- **機能名**: 説明文` の形式。何を・どう変えたかを明確に書く
- **情報源の優先順位**: 要件ドキュメント（ユーザー向け説明）> git diff（実装の事実）

#### 盛り込む内容の判断基準

- 要件ドキュメントに記載された機能を中心に記述する
- git diff から読み取れる実装上の改善（UX 修正、バグ修正、リファクタリングの副産物）も含める
- 内部実装の詳細（定数名、関数名、型名）はユーザー向けに言い換える
- テスト・ドキュメント変更は CHANGELOG に記載しない

#### URL 参照セクションの更新

ファイル末尾のリンク定義を更新する:

```
[Unreleased]: https://github.com/numlia/git-keizu/compare/v{新バージョン}...HEAD
[{新バージョン}]: https://github.com/numlia/git-keizu/compare/v{前バージョン}...v{新バージョン}
```

### Step 6: README.md の更新

`## Features` セクションのリストを更新する。

- **言語**: 英語
- **新機能**: 関連する既存 bullet の近くに新しい bullet を追加するか、既存 bullet の説明文に追記する
- **既存機能**: 動作が変わった場合のみ説明文を更新する
- **変更しないもの**: `## Security` / `## Installation` / `## Contributing & Support` / `## License`、badge 行、タイトル行

### Step 7: package.json のバージョンバンプ

Edit ツールで `package.json` の `"version"` フィールドを `{バージョン}` へ更新する。

### Step 8: コミット（2コミット構成）

```bash
# docs コミット
git add CHANGELOG.md README.md
git commit -m "docs: update CHANGELOG and README for v{バージョン}"

# bump コミット
git add package.json
git commit -m "chore: bump version to {バージョン}"
```

- コミットメッセージの言語は言語設定に従う（英語の場合は上記の定型）
- 🚫 ブランチ情報 `(#issue-number)` は手動で付けない

### Step 9: Push と Draft PR 作成

```bash
git push -u origin docs/release-v{バージョン}
gh pr create --draft --assignee @me --base main --title "docs: prepare release v{バージョン}" --body "..."
```

PR 本文は `pr-language` 設定に従い、変更内容（CHANGELOG 追加・README 更新・バージョンバンプ）と「マージ後に `/release {バージョン}` でタグを作成する」旨を簡潔に記載する。

### Step 10: 変更内容の確認と報告

```
## 📊 Report

**Overview**: [バージョン X.Y.Z のリリース準備 PR（docs + bump）を作成した旨]

**Changed files**: 3 files
- `CHANGELOG.md`
- `README.md`
- `package.json`

**PR**: #{番号}（Draft）

**CHANGELOG の主な変更**:
- Added: N 項目

**README の主な変更**:
- [追加・変更した bullet の概要]

**Next step**: PR #{番号} をマージ後、/release X.Y.Z を実行してください
```

## 注意事項

- **main へ直接コミットしない**: すべての変更はリリース準備ブランチ上で行う
- **既存エントリを消さない**: CHANGELOG の過去バージョンエントリは一切変更しない
- **`## [Unreleased]` は空のまま**: 新バージョンのセクションはその下に追加する
- **要件外の変更も拾う**: 要件ドキュメントになくても前回タグ以降の差分に含まれるユーザー向け改善は記述する
- **タグは作成しない**: タグ作成・push は `/release` の担当
