# テスト観点表: src/types.ts

## S1: UNCOMMITTED_CHANGES_HASH / VALID_UNCOMMITTED_RESET_MODES 定数検証

> Origin: Feature 001 (menu-bar-enhancement) Task 1.2
> Added: 2026-02-25

**テスト対象パス**: `src/types.ts`

| Case ID | Input / Precondition                                | Perspective (Equivalence / Boundary) | Expected Result         | Notes                                          |
| ------- | --------------------------------------------------- | ------------------------------------ | ----------------------- | ---------------------------------------------- |
| TC-001  | UNCOMMITTED_CHANGES_HASH 定数を参照                 | Equivalence - normal                 | 値が `"*"` と一致する   | 既存のハードコード値との互換性保証             |
| TC-002  | VALID_UNCOMMITTED_RESET_MODES を参照                | Equivalence - normal                 | `"mixed"` を含む        | -                                              |
| TC-003  | VALID_UNCOMMITTED_RESET_MODES を参照                | Equivalence - normal                 | `"hard"` を含む         | -                                              |
| TC-004  | VALID_UNCOMMITTED_RESET_MODES のサイズ              | Boundary - exact count               | Set のサイズが 2 である | "soft" は含まないことの間接検証                |
| TC-005  | VALID_UNCOMMITTED_RESET_MODES に `"soft"` で has()  | Equivalence - invalid                | `false` を返す          | Uncommitted リセットでは soft は意味をなさない |
| TC-006  | VALID_UNCOMMITTED_RESET_MODES に `""` で has()      | Boundary - empty                     | `false` を返す          | -                                              |
| TC-007  | VALID_UNCOMMITTED_RESET_MODES に `"MIXED"` で has() | Boundary - case sensitivity          | `false` を返す          | 大文字は受け付けない                           |
