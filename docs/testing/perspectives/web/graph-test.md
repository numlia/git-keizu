# テスト観点表: web/graph.ts

## S1: スタッシュコミットの頂点描画

> Origin: Feature 001 (menu-bar-enhancement) Task 3.4
> Added: 2026-02-25

**テスト対象パス**: `web/graph.ts`

| Case ID | Input / Precondition           | Perspective (Equivalence / Boundary) | Expected Result                                      | Notes                         |
| ------- | ------------------------------ | ------------------------------------ | ---------------------------------------------------- | ----------------------------- |
| TC-001  | スタッシュコミットの頂点描画   | Equivalence - normal                 | 二重円が描画される（外側: 塗りつぶし、内側: リング） | graph.ts の描画パラメータ検証 |
| TC-002  | 非スタッシュコミットの頂点描画 | Equivalence - normal (non-stash)     | 単一円が描画される（既存動作維持）                   | -                             |
