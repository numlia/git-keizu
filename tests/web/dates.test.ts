import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCommitDate } from "../../web/dates";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Mock current time (milliseconds) for Relative tests. */
const MOCK_NOW_MS = 1_700_000_000_000;
const MOCK_NOW_SEC = MOCK_NOW_MS / 1000;

/** Compute expected "D Mon YYYY" string for a given dateVal (seconds). */
function expectedDateStr(dateVal: number): string {
  const d = new Date(dateVal * 1000);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Compute expected "HH:MM" string for a given dateVal (seconds). */
function expectedTimeStr(dateVal: number): string {
  const d = new Date(dateVal * 1000);
  const pad = (n: number): string => (n > 9 ? `${n}` : `0${n}`);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function setDateFormat(format: string | undefined): void {
  (globalThis as Record<string, unknown>).viewState = { dateFormat: format };
}

describe("getCommitDate", () => {
  describe("S1: dateFormat switch branches", () => {
    const DATE_VAL = 1_700_000_000;

    it("TC-001: returns dateStr + timeStr when dateFormat is unset (default branch)", () => {
      // Case: TC-001
      // Given: viewState.dateFormat is not set (falls to switch default branch)
      setDateFormat(undefined);

      // When: getCommitDate is called
      const result = getCommitDate(DATE_VAL);

      // Then: value equals "dateStr timeStr" and title equals value
      const ds = expectedDateStr(DATE_VAL);
      const ts = expectedTimeStr(DATE_VAL);
      expect(result.value).toBe(`${ds} ${ts}`);
      expect(result.title).toBe(result.value);
    });

    it('TC-002: returns dateStr only when dateFormat is "Date Only"', () => {
      // Case: TC-002
      // Given: viewState.dateFormat = "Date Only"
      setDateFormat("Date Only");

      // When: getCommitDate is called
      const result = getCommitDate(DATE_VAL);

      // Then: value is dateStr without time, title includes time
      const ds = expectedDateStr(DATE_VAL);
      const ts = expectedTimeStr(DATE_VAL);
      expect(result.value).toBe(ds);
      expect(result.title).toBe(`${ds} ${ts}`);
    });

    it('TC-003: returns relative time when dateFormat is "Relative" (30 seconds ago)', () => {
      // Case: TC-003
      // Given: viewState.dateFormat = "Relative", diff = 30 seconds
      vi.useFakeTimers();
      vi.setSystemTime(MOCK_NOW_MS);
      setDateFormat("Relative");
      const dateVal = MOCK_NOW_SEC - 30;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value is "30 seconds ago", title is "D Mon YYYY HH:MM" format
      expect(result.value).toBe("30 seconds ago");
      const ds = expectedDateStr(dateVal);
      const ts = expectedTimeStr(dateVal);
      expect(result.title).toBe(`${ds} ${ts}`);

      vi.useRealTimers();
    });
  });

  describe("S2: Relative - time unit selection", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(MOCK_NOW_MS);
      setDateFormat("Relative");
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("TC-004: returns minutes when diff=120s", () => {
      // Case: TC-004
      // Given: diff = 120 seconds (2 minutes)
      const dateVal = MOCK_NOW_SEC - 120;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value is "2 minutes ago"
      expect(result.value).toBe("2 minutes ago");
    });

    it("TC-005: returns hours when diff=7200s", () => {
      // Case: TC-005
      // Given: diff = 7200 seconds (2 hours)
      const dateVal = MOCK_NOW_SEC - 7200;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value is "2 hours ago"
      expect(result.value).toBe("2 hours ago");
    });

    it("TC-006: returns days when diff=172800s", () => {
      // Case: TC-006
      // Given: diff = 172800 seconds (2 days)
      const dateVal = MOCK_NOW_SEC - 172_800;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value is "2 days ago"
      expect(result.value).toBe("2 days ago");
    });

    it("TC-007: returns weeks when diff=1209600s", () => {
      // Case: TC-007
      // Given: diff = 1209600 seconds (2 weeks)
      const dateVal = MOCK_NOW_SEC - 1_209_600;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value is "2 weeks ago"
      expect(result.value).toBe("2 weeks ago");
    });

    it("TC-008: returns months when diff=5259600s", () => {
      // Case: TC-008
      // Given: diff = 5259600 seconds (2 months)
      const dateVal = MOCK_NOW_SEC - 5_259_600;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value is "2 months ago"
      expect(result.value).toBe("2 months ago");
    });

    it("TC-009: returns years when diff=63115200s", () => {
      // Case: TC-009
      // Given: diff = 63115200 seconds (2 years)
      const dateVal = MOCK_NOW_SEC - 63_115_200;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value is "2 years ago"
      expect(result.value).toBe("2 years ago");
    });
  });

  describe("S3: title consistency across formats", () => {
    it("TC-010: title is identical across all dateFormat values for the same dateVal", () => {
      // Case: TC-010
      vi.useFakeTimers();
      vi.setSystemTime(MOCK_NOW_MS);
      const dateVal = MOCK_NOW_SEC - 3600;

      // Given: same dateVal tested with three different dateFormats
      setDateFormat("Date & Time");
      const resultDateTime = getCommitDate(dateVal);

      setDateFormat("Date Only");
      const resultDateOnly = getCommitDate(dateVal);

      setDateFormat("Relative");
      const resultRelative = getCommitDate(dateVal);

      // When: comparing title across all formats
      // Then: all titles are identical "D Mon YYYY HH:MM", only value differs
      expect(resultDateTime.title).toBe(resultDateOnly.title);
      expect(resultDateOnly.title).toBe(resultRelative.title);
      expect(resultDateTime.value).not.toBe(resultDateOnly.value);
      expect(resultDateTime.value).not.toBe(resultRelative.value);

      vi.useRealTimers();
    });
  });

  describe("S4: abnormal edge cases", () => {
    it("TC-011: handles NaN dateVal (Invalid Date)", () => {
      // Case: TC-011
      // Given: dateVal = NaN, dateFormat = "Date & Time"
      setDateFormat("Date & Time");

      // When: getCommitDate is called with NaN
      const result = getCommitDate(NaN);

      // Then: value and title contain "NaN" and "undefined" (months[NaN])
      expect(result.value).toContain("NaN");
      expect(result.value).toContain("undefined");
      expect(result.title).toContain("NaN");
      expect(result.title).toContain("undefined");
    });

    it("TC-012: handles Infinity dateVal (Invalid Date)", () => {
      // Case: TC-012
      // Given: dateVal = Infinity, dateFormat = "Date & Time"
      setDateFormat("Date & Time");

      // When: getCommitDate is called with Infinity
      const result = getCommitDate(Infinity);

      // Then: value and title contain "NaN" (Invalid Date methods return NaN)
      expect(result.value).toContain("NaN");
      expect(result.title).toContain("NaN");
    });

    it("TC-013: handles future dateVal (negative diff) in Relative mode", () => {
      // Case: TC-013
      // Given: dateVal is 30 seconds in the future, dateFormat = "Relative"
      vi.useFakeTimers();
      vi.setSystemTime(MOCK_NOW_MS);
      setDateFormat("Relative");
      const dateVal = MOCK_NOW_SEC + 30;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: diff is negative (-30), falls into seconds branch, value = "-30 seconds ago"
      expect(result.value).toBe("-30 seconds ago");

      vi.useRealTimers();
    });

    it("TC-014: falls to default branch for invalid dateFormat string", () => {
      // Case: TC-014
      // Given: viewState.dateFormat = "InvalidFormat" (not a valid DateFormat)
      setDateFormat("InvalidFormat");
      const dateVal = 1_700_000_000;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value matches default "dateStr timeStr" (same as "Date & Time")
      const ds = expectedDateStr(dateVal);
      const ts = expectedTimeStr(dateVal);
      expect(result.value).toBe(`${ds} ${ts}`);
      expect(result.title).toBe(result.value);
    });
  });

  describe("S5: time unit boundary values", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(MOCK_NOW_MS);
      setDateFormat("Relative");
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("TC-015: diff=0 returns 0 seconds ago", () => {
      // Case: TC-015
      // Given: dateVal equals current time (diff=0)
      const dateVal = MOCK_NOW_SEC;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "0 seconds ago" (0 !== 1 -> plural)
      expect(result.value).toBe("0 seconds ago");
    });

    it("TC-016: diff=59 returns 59 seconds ago (max second)", () => {
      // Case: TC-016
      // Given: diff = 59 seconds (just below SECONDS_IN_MINUTE=60)
      const dateVal = MOCK_NOW_SEC - 59;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "59 seconds ago"
      expect(result.value).toBe("59 seconds ago");
    });

    it("TC-017: diff=60 returns 1 minute ago (seconds -> minutes boundary)", () => {
      // Case: TC-017
      // Given: diff = 60 seconds (exactly SECONDS_IN_MINUTE)
      const dateVal = MOCK_NOW_SEC - 60;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "1 minute ago" (60/60=1, singular)
      expect(result.value).toBe("1 minute ago");
    });

    it("TC-018: diff=3599 returns 60 minutes ago (max minute)", () => {
      // Case: TC-018
      // Given: diff = 3599 seconds (just below SECONDS_IN_HOUR=3600)
      const dateVal = MOCK_NOW_SEC - 3599;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "60 minutes ago" (3599/60 ~ 59.98, Math.round=60)
      expect(result.value).toBe("60 minutes ago");
    });

    it("TC-019: diff=3600 returns 1 hour ago (minutes -> hours boundary)", () => {
      // Case: TC-019
      // Given: diff = 3600 seconds (exactly SECONDS_IN_HOUR)
      const dateVal = MOCK_NOW_SEC - 3600;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "1 hour ago" (3600/3600=1, singular)
      expect(result.value).toBe("1 hour ago");
    });

    it("TC-020: diff=86399 returns 24 hours ago (max hour)", () => {
      // Case: TC-020
      // Given: diff = 86399 seconds (just below SECONDS_IN_DAY=86400)
      const dateVal = MOCK_NOW_SEC - 86_399;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "24 hours ago" (86399/3600 ~ 23.99, Math.round=24)
      expect(result.value).toBe("24 hours ago");
    });

    it("TC-021: diff=86400 returns 1 day ago (hours -> days boundary)", () => {
      // Case: TC-021
      // Given: diff = 86400 seconds (exactly SECONDS_IN_DAY)
      const dateVal = MOCK_NOW_SEC - 86_400;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "1 day ago" (86400/86400=1, singular)
      expect(result.value).toBe("1 day ago");
    });

    it("TC-022: diff=604799 returns 7 days ago (max day)", () => {
      // Case: TC-022
      // Given: diff = 604799 seconds (just below SECONDS_IN_WEEK=604800)
      const dateVal = MOCK_NOW_SEC - 604_799;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "7 days ago" (604799/86400 ~ 6.99, Math.round=7)
      expect(result.value).toBe("7 days ago");
    });

    it("TC-023: diff=604800 returns 1 week ago (days -> weeks boundary)", () => {
      // Case: TC-023
      // Given: diff = 604800 seconds (exactly SECONDS_IN_WEEK)
      const dateVal = MOCK_NOW_SEC - 604_800;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "1 week ago" (604800/604800=1, singular)
      expect(result.value).toBe("1 week ago");
    });

    it("TC-024: diff=2629799 returns 4 weeks ago (max week)", () => {
      // Case: TC-024
      // Given: diff = 2629799 seconds (just below SECONDS_IN_MONTH=2629800)
      const dateVal = MOCK_NOW_SEC - 2_629_799;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "4 weeks ago" (2629799/604800 ~ 4.35, Math.round=4)
      expect(result.value).toBe("4 weeks ago");
    });

    it("TC-025: diff=2629800 returns 1 month ago (weeks -> months boundary)", () => {
      // Case: TC-025
      // Given: diff = 2629800 seconds (exactly SECONDS_IN_MONTH)
      const dateVal = MOCK_NOW_SEC - 2_629_800;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "1 month ago" (2629800/2629800=1, singular)
      expect(result.value).toBe("1 month ago");
    });

    it("TC-026: diff=31557599 returns 12 months ago (max month)", () => {
      // Case: TC-026
      // Given: diff = 31557599 seconds (just below SECONDS_IN_YEAR=31557600)
      const dateVal = MOCK_NOW_SEC - 31_557_599;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "12 months ago" (31557599/2629800 ~ 12.0, Math.round=12)
      expect(result.value).toBe("12 months ago");
    });

    it("TC-027: diff=31557600 returns 1 year ago (months -> years boundary)", () => {
      // Case: TC-027
      // Given: diff = 31557600 seconds (exactly SECONDS_IN_YEAR)
      const dateVal = MOCK_NOW_SEC - 31_557_600;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "1 year ago" (31557600/31557600=1, singular)
      expect(result.value).toBe("1 year ago");
    });
  });

  describe("S6: dateVal extreme values", () => {
    it("TC-028: dateVal=0 produces Unix epoch date string containing 1970", () => {
      // Case: TC-028
      // Given: dateVal=0 (Unix epoch), dateFormat = "Date & Time"
      setDateFormat("Date & Time");

      // When: getCommitDate is called with 0
      const result = getCommitDate(0);

      // Then: value and title contain "1970" (epoch year)
      expect(result.value).toContain("1970");
      expect(result.title).toContain("1970");
    });

    it("TC-029: dateVal=MAX_SAFE_INTEGER produces Invalid Date (NaN)", () => {
      // Case: TC-029
      // Given: dateVal=Number.MAX_SAFE_INTEGER, dateFormat = "Date & Time"
      setDateFormat("Date & Time");

      // When: getCommitDate is called (dateVal*1000 exceeds Date valid range 8.64e15ms)
      const result = getCommitDate(Number.MAX_SAFE_INTEGER);

      // Then: value and title contain "NaN"
      expect(result.value).toContain("NaN");
      expect(result.title).toContain("NaN");
    });
  });

  describe("S7: singular/plural boundary", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(MOCK_NOW_MS);
      setDateFormat("Relative");
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("TC-030: diff=1 returns singular form (1 second ago)", () => {
      // Case: TC-030
      // Given: diff = 1 second
      const dateVal = MOCK_NOW_SEC - 1;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "1 second ago" (1 !== 1 is false -> no "s" suffix)
      expect(result.value).toBe("1 second ago");
    });

    it("TC-031: diff=2 returns plural form (2 seconds ago)", () => {
      // Case: TC-031
      // Given: diff = 2 seconds
      const dateVal = MOCK_NOW_SEC - 2;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "2 seconds ago" (2 !== 1 is true -> "s" suffix appended)
      expect(result.value).toBe("2 seconds ago");
    });
  });
});
