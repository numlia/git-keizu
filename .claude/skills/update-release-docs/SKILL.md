---
name: update-release-docs
description: "main との差分と要件ドキュメントを参考に、次バージョン用の README と CHANGELOG を更新する"
allowed-tools: Read, Edit, Bash(cd:*), Bash(git log:*), Bash(git diff:*)
argument-hint: <要件ドキュメントのパス> [バージョン] # 例: notes/features/007-xxx/要件整理.md 0.2.7
---

# Release Docs Update Workflow

main ブランチとの差分と指定された要件ドキュメントを参照し、
次バージョン用の `CHANGELOG.md` と `README.md` を更新します。

## 前提条件

- リポジトリルート: `/home/numlia/work/ai/git-keizu`
- 最初の Bash tool call で必ず `cd /home/numlia/work/ai/git-keizu` を実行すること
- 現在のブランチが機能ブランチ（main ではない）であること

## 引数（$ARGUMENTS）

スペース区切りで最大2トークンを受け取る。

| 位置    | 必須   | 説明                                                                   |
| ------- | ------ | ---------------------------------------------------------------------- |
| 第1引数 | 必須   | 要件ドキュメントのパス（リポジトリルートからの相対パスまたは絶対パス） |
| 第2引数 | 省略可 | バージョン番号（例: `0.2.7` または `v0.2.7`、v-prefix は任意）         |

```
# バージョンを明示する場合
/update-release-docs notes/features/007-foo/要件整理.md 0.2.7

# バージョンを省略する場合（package.json から自動取得）
/update-release-docs notes/features/007-foo/要件整理.md
```

引数が指定されていない場合は、要件ドキュメントのパスをユーザーに確認してから進めること。

## 実行手順

### Step 1: リポジトリルートへ移動

```bash
cd /home/numlia/work/ai/git-keizu
```

### Step 2: 情報収集（並列実行可）

以下を並列で Read/Bash 実行し、内容を把握する:

1. **要件ドキュメントを読む**: `$ARGUMENTS` で指定されたファイルを Read ツールで読む
2. **main との差分ログを取得**:
   ```bash
   git log main..HEAD --oneline
   ```
3. **main との差分（ファイル変更内容）を取得**:
   ```bash
   git diff main...HEAD
   ```
   差分が大きい場合は `git diff main...HEAD --stat` で概要を先に把握し、
   必要なファイルだけ個別に Read で確認する
4. **現在の CHANGELOG.md を読む**: `CHANGELOG.md` を Read ツールで読む
5. **現在の README.md を読む**: `README.md` を Read ツールで読む
6. **package.json のバージョンを確認**:
   ```bash
   # Read ツールで package.json を読み "version" フィールドを取得
   ```

### Step 3: バージョンと日付の決定

#### バージョンの決定（優先順位順）

1. **第2引数が指定されている場合** — その値を使用する（`v` prefix は除去して正規化。例: `v0.2.7` → `0.2.7`）
2. **第2引数が省略されている場合** — `package.json` の `"version"` フィールドを Read ツールで読んで使用する

#### 安全チェック（必須）

決定したバージョンが CHANGELOG に既存エントリとして存在する場合は**処理を中断**し、以下の形式でユーザーに確認する：

```
⚠️ CHANGELOG に [X.Y.Z] エントリが既に存在します。
  - 別のバージョン番号を指定して再実行するか
  - 既存エントリを上書きしても良い場合は「続行」と入力してください
```

ユーザーが「続行」または続行の意思を示した場合のみ、既存エントリを上書きして処理を進める。

- **日付**: 今日の日付（YYYY-MM-DD 形式、MEMORY.md の currentDate を参照）

### Step 4: CHANGELOG.md の更新

`## [Unreleased]` セクションの直後に新バージョンのセクションを挿入する。

#### 書き方のルール

- **言語**: 英語（`docs/development/project-settings.md` の `commit-language: en` に準拠）
- **形式**: [Keep a Changelog](https://keepachangelog.com/) 準拠
- **セクション**: `Added` / `Changed` / `Fixed` / `Removed` のうち該当するもの
- **各項目**: `- **機能名**: 説明文` の形式。何を・どう変えたかを1文で明確に書く
- **情報源の優先順位**: 要件ドキュメント（ユーザー向け説明）> git diff（実装の事実）

#### 盛り込む内容の判断基準

- 要件ドキュメントに記載された機能（REQ-xxx）を中心に記述する
- git diff から読み取れる実装上の改善（UX 修正、バグ修正、リファクタリングの副産物）も含める
- 内部実装の詳細（定数名、関数名、型名）はユーザー向けに言い換える
- テスト・ドキュメント変更は CHANGELOG に記載しない

#### URL 参照セクションの更新

ファイル末尾のリンク定義を更新する:

```
[Unreleased]: https://github.com/numlia/git-keizu/compare/v{新バージョン}...HEAD
[{新バージョン}]: https://github.com/numlia/git-keizu/compare/v{前バージョン}...v{新バージョン}
```

前バージョンは既存の CHANGELOG エントリから読み取ること。

### Step 5: README.md の更新

`## Features` セクションのリストを更新する。

#### 書き方のルール

- **言語**: 英語
- **形式**: `- **機能名**: 説明文` の箇条書き
- **新機能**: 適切な位置に新しい bullet を追加する
  - 関連する既存 bullet の近くに配置する（例: Branch Actions の隣に Remote Branch Actions）
  - または既存 bullet の説明文に追記する（例: Commit Details に親ハッシュリンクの説明を追加）
- **既存機能**: 動作が変わった場合のみ説明文を更新する
- **削除機能**: bullet を削除またはコメントアウトする

#### 変更しないもの

- `## Security` セクション（機能変更でない限り手をつけない）
- `## Installation` / `## Contributing & Support` / `## License` セクション
- badge 行やタイトル行

### Step 6: 変更内容の確認と報告

更新後、以下の形式でレポートを出力する:

```
## 📊 Report

**Overview**: [バージョン X.Y.Z の CHANGELOG と README を更新した旨]

**Changed files**: 2 files
- `CHANGELOG.md`
- `README.md`

**CHANGELOG の主な変更**:
- Added: N 項目
- Changed: N 項目

**README の主な変更**:
- [追加・変更した bullet の概要]

**Next step**: /commit または /release X.Y.Z を実行してください
```

## 注意事項

- **コミットはしない**: このスキルは編集のみ行う。コミットは `/commit` スキルで別途実行する
- **既存エントリを消さない**: CHANGELOG の過去バージョンエントリは一切変更しない
- **`## [Unreleased]` は空のまま**: 新バージョンのセクションはその下に追加する
- **要件外の変更も拾う**: 要件ドキュメントになくても git diff に含まれるユーザー向け改善は記述する
- **重複チェック**: 追加しようとしているバージョンが CHANGELOG に既に存在する場合はユーザーに確認する
