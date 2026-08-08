---
name: release
description: "リリース実行: リリース準備 PR マージ後の main を検証し、タグを作成してタグ push で GitHub Actions の公開を起動する"
allowed-tools: Read, Bash(cd:*), Bash(git status:*), Bash(git log:*), Bash(git fetch:*), Bash(git switch:*), Bash(git pull:*), Bash(git tag:*), Bash(git ls-remote:*), Bash(npx:*)
argument-hint: <version> # 例: v0.9.0 または 0.9.0
---

# Release Workflow（タグ作成 → 公開）

VS Code 拡張機能 git-keizu を VS Marketplace と OpenVSX に公開します。
`v*` タグを GitHub に push すると、`.github/workflows/publish.yml` が自動で以下を実行します:

- VSIX ビルド
- VS Marketplace への公開（`VS_MARKETPLACE_TOKEN`）
- OpenVSX への公開（`OPEN_VSX_TOKEN`）
- GitHub Release 作成（VSIX 添付）

> main は ruleset（pull_request 必須）で保護されているため、リリース準備 commit
> （CHANGELOG / README / バージョンバンプ）は本スキルでは作らず、事前に
> `/update-release-docs` の PR で main へマージしておくこと。
> 本スキルは main の状態検証とタグ作成だけを行い、push するのは**タグのみ**
> （タグ push はブランチ ruleset の対象外）。

リリースフロー全体:

```
1. /update-release-docs <要件ドキュメント> <バージョン>   ← docs + bump の PR 作成
2. PR をマージ（ユーザー）
3. /release <バージョン>                                  ← 本スキル
```

## 前提条件

- リポジトリルート: `~/work/ai/git-keizu`
- 最初の Bash tool call で必ず `cd ~/work/ai/git-keizu` を実行すること
- `/update-release-docs` のリリース準備 PR（CHANGELOG / README / package.json バンプ）がマージ済みであること
- GitHub Secrets に `VS_MARKETPLACE_TOKEN` と `OPEN_VSX_TOKEN` が設定済みであること

## 引数（$ARGUMENTS）

リリースするバージョンを指定します。`v` プレフィックスはあってもなくても可。

- `/release v0.9.0` → バージョン `0.9.0` でリリース
- `/release 0.9.0` → 同上

引数が指定されていない場合はエラーを出力して中止する。

## 実行手順

### Step 1: バージョン引数の正規化

`$ARGUMENTS` から取得したバージョンを、タグ形式 `v0.9.0` とパッケージ形式 `0.9.0` に正規化する。

### Step 2: main を最新化

```bash
cd ~/work/ai/git-keizu
git fetch origin
git switch main
git pull --ff-only origin main
git status
```

- working tree に未コミット変更がある場合は中断してユーザーに報告する。
- `--ff-only` の pull が失敗した場合（ローカル main がリモートと乖離）は中断してユーザーに報告する。

### Step 3: リリース準備が main に入っていることの検証（必須）

以下をすべて確認する。1つでも満たさない場合は中断し、`/update-release-docs` の実行または PR のマージを促す:

1. `package.json` の `"version"` が **パッケージ形式バージョンと一致**する（Read ツールで確認）
2. `CHANGELOG.md` に `## [{パッケージ形式バージョン}]` エントリが存在する
3. `git log -5 --oneline` にリリース準備 commit（docs / bump）が含まれることを目視確認する

### Step 4: CI チェック（推奨）

タグ push 前の最終品質チェック。いずれかが失敗した場合は中止してユーザーに報告する:

```bash
npx --yes pnpm@10.34.5 run format
npx --yes pnpm@10.34.5 run lint
npx --yes pnpm@10.34.5 run typecheck
npx --yes pnpm@10.34.5 run test:ci
```

### Step 5: タグが既存でないか確認

```bash
git tag -l <タグ形式バージョン>
git ls-remote --tags origin <タグ形式バージョン>
```

- ローカル・リモートいずれかにタグが既に存在する場合はエラーを出力して中止する。

### Step 6: タグ作成

```bash
git tag <タグ形式バージョン>
```

### Step 7: タグ push（手動実行）

push は AI では実行しない。以下のコマンドをユーザーに伝え、ターミナルで実行してもらう:

```
以下のコマンドをターミナルで実行してください:

git push origin <タグ形式バージョン>
```

main の push は不要（リリース準備 PR のマージで反映済み）。

## 完了報告

以下の形式でレポートを出力する:

```
## リリース準備完了

- バージョン: <タグ形式バージョン>
- タグ: <タグ形式バージョン>（ローカル作成済み、対象 commit: <hash>）
- 検証: package.json / CHANGELOG / CI チェックの結果

### 以下のコマンドをターミナルで実行してください
git push origin <タグ形式バージョン>

push 後、GitHub Actions が自動で publish.yml を実行し、VS Marketplace と OpenVSX への公開と GitHub Release 作成が行われます。
https://github.com/numlia/git-keizu/actions/workflows/publish.yml
```

## 注意事項

- **main へは何もコミットしない**: バージョンバンプを含む一切の commit は本スキルの対象外
- **push するのはタグのみ**: `git push origin main` は実行しない（ruleset で拒否される）
- **タグの push は慎重に**: push 後のタグ削除は `git push origin --delete <tag>` が必要で、公開 workflow が起動してしまうため原則やり直し不可と考える
- **GitHub Secrets 未設定の場合**: publish workflow は失敗するため、事前に GitHub リポジトリの Settings > Secrets で確認すること
