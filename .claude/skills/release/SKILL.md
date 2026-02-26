---
name: release
description: "VSマーケットプレイスとOpenVSXへのリリース（バージョンバンプ → タグ作成 → push → GitHub Actions 自動公開）"
allowed-tools: Read, Edit, Bash(cd:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git tag:*), Bash(npx:*)
argument-hint: <version> # 例: v0.2.2 または 0.2.2
---

# Release Workflow

VS Code 拡張機能 git-keizu を VSマーケットプレイスと OpenVSX に公開します。
`v*` タグを GitHub に push すると、`.github/workflows/publish.yml` が自動で以下を実行します:

- VSIX ビルド
- VS Marketplace への公開（`VS_MARKETPLACE_TOKEN`）
- OpenVSX への公開（`OPEN_VSX_TOKEN`）
- GitHub Release 作成（VSIX 添付）

## 前提条件

- リポジトリルート: `/home/numlia/work/ai/git-keizu`
- 最初の Bash tool call で必ず `cd /home/numlia/work/ai/git-keizu` を実行すること
- GitHub Secrets に `VS_MARKETPLACE_TOKEN` と `OPEN_VSX_TOKEN` が設定済みであること

## 引数（$ARGUMENTS）

リリースするバージョンを指定します。`v` プレフィックスはあってもなくても可。

- `/release v0.2.2` → バージョン `0.2.2` でリリース
- `/release 0.2.2` → 同上

## 実行手順

### Step 1: バージョン引数の正規化

`$ARGUMENTS` からバージョン番号を取得し、以下の形式に正規化する:

- **タグ形式**: `v0.2.2`（`v` プレフィックスあり）
- **パッケージ形式**: `0.2.2`（`v` プレフィックスなし）

引数が指定されていない場合はエラーを出力して中止する:

```
エラー: バージョン番号を指定してください。
例: /release v0.2.2
```

### Step 2: リポジトリルートへ移動

```bash
cd /home/numlia/work/ai/git-keizu
```

### Step 3: ワーキングツリーの状態確認

`git status` を実行し、コミットされていない変更を確認する。

- **変更がある場合**: 変更内容を表示し、以下を確認してユーザーに報告する
  - バージョンバンプ以外の変更がある場合は、先にそれらをコミットするよう促す
  - リリース作業を続行するか確認を求める
- **クリーンな場合**: そのまま続行

### Step 4: 現在のバージョン確認

`package.json` を Read ツールで読み込み、現在の `"version"` フィールドを確認する。

- **現在のバージョン == 指定バージョン**: バンプ不要、Step 6 へスキップ
- **現在のバージョン != 指定バージョン**: Step 5 でバンプを実行

### Step 5: package.json バージョンバンプ

Edit ツールで `package.json` の `"version"` フィールドを更新する。

更新後、以下の手順でコミットする:

```bash
# ステージング
git add package.json

# コミット（バージョン番号は実際の値に置き換え）
git commit -m "chore: bump version to <パッケージ形式バージョン>"
```

### Step 6: CI チェック（任意）

⚠️ タグ push 前に品質チェックを行うことを推奨する。

以下を順番に実行する（いずれかが失敗した場合は中止してユーザーに報告する）:

```bash
npx --yes pnpm@10.29.3 run format
npx --yes pnpm@10.29.3 run lint
npx --yes pnpm@10.29.3 run typecheck
npx --yes pnpm@10.29.3 run test:ci
```

失敗した場合はエラー内容を表示して中止する。

### Step 7: タグが既存でないか確認

```bash
git tag -l <タグ形式バージョン>
```

- **タグが既に存在する場合**: エラーを出力して中止する
  ```
  エラー: タグ v0.2.2 は既に存在します。
  別のバージョンを指定するか、既存タグを削除してください。
  ```
- **タグが存在しない場合**: そのまま続行

### Step 8: タグ作成

```bash
git tag <タグ形式バージョン>
```

### Step 9: Push（手動実行）

push はアヤ（AI）では実行しない。以下のコマンドをリアに伝え、ターミナルで実行してもらう:

```
以下のコマンドをターミナルで実行してください:

git push origin main && git push origin <タグ形式バージョン>
```

## 完了報告

以下の形式でレポートを出力する:

```
## リリース準備完了

- バージョン: <タグ形式バージョン>
- コミット: chore: bump version to <パッケージ形式バージョン>
- タグ: <タグ形式バージョン>（ローカル作成済み）

### 以下のコマンドをターミナルで実行してください
git push origin main && git push origin <タグ形式バージョン>

push 後、GitHub Actions が自動で publish.yml を実行し、VS Marketplace と OpenVSX への公開と GitHub Release 作成が行われます。
https://github.com/numlia/git-keizu/actions/workflows/publish.yml
```

## 注意事項

- **コマンドは1つずつ実行**: `&&` や `;` で繋げない（allowed-tools の制約）
- **cd は最初の1回のみ**: 以降のコマンドはシンプルな形式で実行
- **タグの push は慎重に**: push 後のタグ削除は `git push origin --delete <tag>` が必要
- **GitHub Secrets 未設定の場合**: publish workflow は失敗するため、事前に GitHub リポジトリの Settings > Secrets で確認すること
