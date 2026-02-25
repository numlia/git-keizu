# テスト観点表: web/utils.ts

## S1: svgIcons SVGアイコン検証

> Origin: Feature 001 (menu-bar-enhancement) Task 1.2
> Added: 2026-02-25

**テスト対象パス**: `web/utils.ts`

| Case ID | Input / Precondition  | Perspective (Equivalence / Boundary) | Expected Result                | Notes |
| ------- | --------------------- | ------------------------------------ | ------------------------------ | ----- |
| TC-001  | svgIcons.fetch を参照 | Equivalence - normal                 | 空でない文字列で `<svg` を含む | -     |
| TC-002  | svgIcons.stash を参照 | Equivalence - normal                 | 空でない文字列で `<svg` を含む | -     |
