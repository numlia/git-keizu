# Test Plan: branchLabels

> Generated: 2026-03-21T00:00:00+09:00
> Source: `web/branchLabels.ts`
> Language: TypeScript
> Test Framework: Vitest

## 1. ソース概要

| 項目            | 値                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| ファイルパス    | `web/branchLabels.ts`                                                                                 |
| 主要な責務      | GitRef配列をhead/remote/tagに分類し、リモートブランチをローカルブランチに紐付けるラベル構造を生成する |
| 関数/メソッド数 | 1                                                                                                     |
| 総分岐数        | 5                                                                                                     |
| エラーパス数    | 0                                                                                                     |
| 外部依存数      | 0                                                                                                     |

## 2. テスト観点表

### 2.1 getBranchLabels

**シグネチャ**: `export function getBranchLabels(refs: GG.GitRef[]): BranchLabels`
**テスト対象パス**: `web/branchLabels.ts:14-46`

| Case ID | Input / Precondition                                                                                                                           | Perspective (Equivalence / Boundary)        | Expected Result                                                                                     | Notes                                                                                     |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| TC-001  | refs=[{hash:"a",name:"main",type:"head"}, {hash:"b",name:"v1.0",type:"tag"}, {hash:"c",name:"origin/main",type:"remote"}] で "main" headが存在 | Equivalence - normal                        | heads=[{name:"main",remotes:["origin"]}], tags=[{hash:"b",name:"v1.0",type:"tag"}], remotes=[]      | 3種類すべてが正しく分類され、リモートがheadに紐付く                                       |
| TC-002  | refs=[{hash:"a",name:"main",type:"head"}]                                                                                                      | Equivalence - normal (branch: L21 true)     | heads=[{name:"main",remotes:[]}], remotes=[], tags=[]                                               | L21: type==="head"のtrue分岐                                                              |
| TC-003  | refs=[{hash:"a",name:"v1.0",type:"tag"}]                                                                                                       | Equivalence - normal (branch: L24 true)     | heads=[], remotes=[], tags=[{hash:"a",name:"v1.0",type:"tag"}]                                      | L24: type==="tag"のtrue分岐                                                               |
| TC-004  | refs=[{hash:"a",name:"origin/feature",type:"remote"}] でheadsが空                                                                              | Equivalence - normal (branch: L26 else)     | heads=[], remotes=[{hash:"a",name:"origin/feature",type:"remote"}], tags=[]                         | L26: else分岐（remote）、headなしのためremainingRemotesへ                                 |
| TC-005  | refs=[{hash:"a",name:"main",type:"head"}, {hash:"b",name:"origin/main",type:"remote"}]                                                         | Equivalence - normal (branch: L34+L37 true) | heads=[{name:"main",remotes:["origin"]}], remotes=[], tags=[]                                       | L34: slashIndex>0=true、L37: headLookup一致=true → head.remotesに追加                     |
| TC-006  | refs=[{hash:"a",name:"main",type:"head"}, {hash:"b",name:"origin/develop",type:"remote"}]                                                      | Equivalence - normal (branch: L37 false)    | heads=[{name:"main",remotes:[]}], remotes=[{hash:"b",name:"origin/develop",type:"remote"}], tags=[] | L37: headLookup["develop"]がundefined → remainingRemotesへ                                |
| TC-007  | refs=[{hash:"a",name:"main",type:"head"}, {hash:"b",name:"origin/main",type:"remote"}, {hash:"c",name:"upstream/main",type:"remote"}]          | Equivalence - normal                        | heads=[{name:"main",remotes:["origin","upstream"]}], remotes=[], tags=[]                            | 複数リモートが同一headに紐付く                                                            |
| TC-008  | refs=[]                                                                                                                                        | Boundary - empty                            | heads=[], remotes=[], tags=[]                                                                       | 空配列: L20のforループが即終了                                                            |
| TC-009  | refs=[{hash:"a",name:"main",type:"head"}, {hash:"b",name:"dev",type:"head"}] のみ                                                              | Boundary - zero (remotes/tags)              | heads=[{name:"main",remotes:[]},{name:"dev",remotes:[]}], remotes=[], tags=[]                       | head のみでremotes/tagsが空                                                               |
| TC-010  | refs=[{hash:"a",name:"v1",type:"tag"}, {hash:"b",name:"v2",type:"tag"}] のみ                                                                   | Boundary - zero (heads/remotes)             | heads=[], remotes=[...tags 2件], tags=[2件のtag]                                                    | tagのみでheads/remotesが空                                                                |
| TC-011  | refs=[{hash:"a",name:"origin/feat",type:"remote"}] のみ（headsなし）                                                                           | Boundary - zero (heads/tags)                | heads=[], remotes=[1件], tags=[]                                                                    | remoteのみ、headがないため全てremainingRemotesへ                                          |
| TC-012  | refs=[{hash:"a",name:"origin",type:"remote"}]（スラッシュなし）                                                                                | Boundary - no slash                         | heads=[], remotes=[{hash:"a",name:"origin",type:"remote"}], tags=[]                                 | L33: indexOf("/")=-1 → slashIndex>0はfalse → remainingRemotesへ                           |
| TC-013  | refs=[{hash:"a",name:"/branch",type:"remote"}]（先頭スラッシュ）                                                                               | Boundary - slash at start                   | heads=[], remotes=[{hash:"a",name:"/branch",type:"remote"}], tags=[]                                | L33: indexOf("/")=0 → 0>0はfalse → remainingRemotesへ                                     |
| TC-014  | refs=[{hash:"a",name:"main",type:"head"}, {hash:"b",name:"origin/",type:"remote"}]（末尾スラッシュ）                                           | Boundary - trailing slash                   | heads=[{name:"main",remotes:[]}], remotes=[{hash:"b",name:"origin/",type:"remote"}], tags=[]        | L36: branchName="" → headLookup[""]はundefined → remainingRemotesへ                       |
| TC-015  | refs=[{hash:"a",name:"feature/xyz",type:"head"}, {hash:"b",name:"origin/feature/xyz",type:"remote"}]（複数スラッシュ）                         | Boundary - multiple slashes                 | heads=[{name:"feature/xyz",remotes:["origin"]}], remotes=[], tags=[]                                | L33: 最初の"/"で分割 → remoteName="origin", branchName="feature/xyz" → headLookup一致     |
| TC-016  | refs=[{hash:"a",name:"",type:"remote"}]（空文字名）                                                                                            | Boundary - empty string                     | heads=[], remotes=[{hash:"a",name:"",type:"remote"}], tags=[]                                       | L33: indexOf("/")=-1 → remainingRemotesへ                                                 |
| TC-017  | refs=[{hash:"a",name:"main",type:"head"}, {hash:"b",name:"origin/main",type:"remote"}] で "main" がheads配列のindex=0                          | Boundary - index zero                       | heads=[{name:"main",remotes:["origin"]}], remotes=[], tags=[]                                       | L37: headLookup["main"]=0、typeof 0 === "number" → 正しくtrue判定（falsyな0を安全に処理） |

## 3. テストケースサマリー

| カテゴリ (Perspective列で分類)   | ケース数 |
| -------------------------------- | -------- |
| 正常系（Equivalence - normal）   | 7        |
| 異常系（Equivalence - abnormal） | 0        |
| 境界値（Boundary - ...）         | 10       |
| 型・形式（Type - ...）           | 0        |
| 外部依存（External - ...）       | 0        |
| **合計**                         | **17**   |

### 失敗系/正常系比率チェック

| 項目                                        | 値                   |
| ------------------------------------------- | -------------------- |
| 正常系（Perspective: Equivalence - normal） | 7件                  |
| 失敗系（Perspective: 上記以外すべて）       | 10件                 |
| 比率                                        | 10/7 = 1.43          |
| 判定                                        | OK: 失敗系 >= 正常系 |

## 4. 外部依存とモック方針

該当なし

## 5. 既存テストとのギャップ

既存テスト分析はスキップ

## 6. 網羅性検証

| 検証項目             | 結果              |
| -------------------- | ----------------- |
| 関数カバレッジ       | 1/1 関数 (100%)   |
| 分岐カバレッジ       | 5/5 分岐 (100%)   |
| エラーパスカバレッジ | 0/0 パス (N/A)    |
| 境界値カバレッジ     | 10/10 候補 (100%) |
| 失敗系/正常系比率    | 10/7 OK           |

## 7. Next Step

テストコード生成:

```
/test-gen docs/testing/perspectives/web/branchLabels-test.md
```
