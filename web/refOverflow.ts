export const REF_BADGE_WIDTH_RATIO = 0.6;
export const DESCRIPTION_MIN_WIDTH = 64;

const DESCRIPTION_WIDTH_RATIO = 1 - REF_BADGE_WIDTH_RATIO;

export interface RefMinimumWidthInput {
  readonly paddingWidth: number;
  readonly headWidth: number;
  readonly emWidth: number;
  readonly maxCounterWidth: number;
}

function isPositiveFinite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function getPrefixSums(widths: readonly number[]): number[] {
  const sums = [0];
  for (let i = 0; i < widths.length; i++) {
    sums.push(sums[i] + widths[i]);
  }
  return sums;
}

export function selectVisibleRefCount(
  badgeWidths: readonly number[],
  budget: number,
  counterWidths: ReadonlyMap<number, number>
): number | null {
  const badgeCount = badgeWidths.length;
  if (badgeCount === 0) return 0;
  if (!isPositiveFinite(budget) || !badgeWidths.every(isPositiveFinite)) return null;

  const prefixSums = getPrefixSums(badgeWidths);
  if (prefixSums[badgeCount] <= budget) return badgeCount;

  const requiredCounterWidths: number[] = [];
  for (let hiddenCount = 1; hiddenCount <= badgeCount; hiddenCount++) {
    const counterWidth = counterWidths.get(hiddenCount);
    if (!isPositiveFinite(counterWidth)) return null;
    requiredCounterWidths[hiddenCount] = counterWidth;
  }

  // Keeping only a leading run preserves ref order; skipping a long badge to fit a later short one would not.
  for (let visibleCount = badgeCount - 1; visibleCount >= 0; visibleCount--) {
    const hiddenCount = badgeCount - visibleCount;
    if (prefixSums[visibleCount] + requiredCounterWidths[hiddenCount] <= budget) {
      return visibleCount;
    }
  }
  return null;
}

function isValidMinimumWidthInput(row: RefMinimumWidthInput): boolean {
  return (
    isNonNegativeFinite(row.paddingWidth) &&
    isNonNegativeFinite(row.headWidth) &&
    isPositiveFinite(row.emWidth) &&
    isPositiveFinite(row.maxCounterWidth)
  );
}

export function calculateMinimumDescriptionWidth(
  rows: readonly RefMinimumWidthInput[]
): number | null {
  let minimumWidth = DESCRIPTION_MIN_WIDTH;
  for (const row of rows) {
    if (!isValidMinimumWidthInput(row)) return null;
    const refAreaWidth = Math.max(
      row.maxCounterWidth / REF_BADGE_WIDTH_RATIO,
      row.emWidth / DESCRIPTION_WIDTH_RATIO
    );
    minimumWidth = Math.max(minimumWidth, row.paddingWidth + row.headWidth + refAreaWidth);
  }
  // Rounding only the final value keeps fractional sub-pixel widths from undershooting the 60/40 split.
  return Math.ceil(minimumWidth);
}
