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

function setLocale(locale: "en" | "ja"): void {
  globalThis.webviewLocale = locale;
}

describe("getCommitDate", () => {
  beforeEach(() => {
    setLocale("en");
  });

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

      // Then: value and title contain "NaN" and the missing month key fallback
      expect(result.value).toContain("NaN");
      expect(result.value).toContain("date.month.short.NaN");
      expect(result.title).toContain("NaN");
      expect(result.title).toContain("date.month.short.NaN");
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

  describe("S9: time unit boundaries with round-carry correction", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(MOCK_NOW_MS);
      setDateFormat("Relative");
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("TC-035: diff=60 returns 1 minute ago (min minute, no carry)", () => {
      // Case: TC-035
      // Given: diff = 60 seconds (exactly the minute threshold)
      const dateVal = MOCK_NOW_SEC - 60;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "1 minute ago" (round(60/60)=1, 1*60=60 < 3600 so no carry)
      expect(result.value).toBe("1 minute ago");
    });

    it("TC-036: diff=59 returns 59 seconds ago (max second, no carry)", () => {
      // Case: TC-036
      // Given: diff = 59 seconds (just below the minute threshold)
      const dateVal = MOCK_NOW_SEC - 59;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "59 seconds ago" (59*1=59 < 60 so no carry)
      expect(result.value).toBe("59 seconds ago");
    });

    it("TC-037: diff=3570 carries minute rounding up to 1 hour ago", () => {
      // Case: TC-037
      // Given: diff = 3570 seconds (round(3570/60)=60, reaching the hour threshold)
      const dateVal = MOCK_NOW_SEC - 3570;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "1 hour ago" (60*60=3600 >= 3600 carries to hour, count=1)
      expect(result.value).toBe("1 hour ago");
    });

    it("TC-038: diff=3599 carries max minute up to 1 hour ago", () => {
      // Case: TC-038
      // Given: diff = 3599 seconds (round(3599/60)=60), old behavior was "60 minutes ago"
      const dateVal = MOCK_NOW_SEC - 3599;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "1 hour ago" (carry to hour, replacing old "60 minutes ago")
      expect(result.value).toBe("1 hour ago");
    });

    it("TC-039: diff=86399 carries max hour up to 1 day ago", () => {
      // Case: TC-039
      // Given: diff = 86399 seconds (round(86399/3600)=24), old behavior was "24 hours ago"
      const dateVal = MOCK_NOW_SEC - 86_399;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "1 day ago" (24*3600=86400 >= 86400 carries to day)
      expect(result.value).toBe("1 day ago");
    });

    it("TC-040: diff=604799 carries max day up to 1 week ago", () => {
      // Case: TC-040
      // Given: diff = 604799 seconds (round(604799/86400)=7), old behavior was "7 days ago"
      const dateVal = MOCK_NOW_SEC - 604_799;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "1 week ago" (7*86400=604800 >= 604800 carries to week)
      expect(result.value).toBe("1 week ago");
    });

    it("TC-041: diff=31557599 carries max month up to 1 year ago", () => {
      // Case: TC-041
      // Given: diff = 31557599 seconds (round(31557599/2629800)=12), old behavior was "12 months ago"
      const dateVal = MOCK_NOW_SEC - 31_557_599;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "1 year ago" (12*2629800=31557600 >= 31557600 carries to year)
      expect(result.value).toBe("1 year ago");
    });

    it("TC-042: diff=2629799 returns 4 weeks ago (week max, no carry)", () => {
      // Case: TC-042
      // Given: diff = 2629799 seconds (round(2629799/604800)=4)
      const dateVal = MOCK_NOW_SEC - 2_629_799;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "4 weeks ago" (4*604800=2419200 < 2629800 so no carry)
      expect(result.value).toBe("4 weeks ago");
    });

    it("TC-043: diff=86400 returns 1 day ago (min day, no carry)", () => {
      // Case: TC-043
      // Given: diff = 86400 seconds (exactly the day threshold)
      const dateVal = MOCK_NOW_SEC - 86_400;

      // When: getCommitDate is called
      const result = getCommitDate(dateVal);

      // Then: value = "1 day ago" (1*86400=86400 < 604800 so no carry)
      expect(result.value).toBe("1 day ago");
    });

    it("TC-044: diff=Infinity falls back to the year unit (findIndex -1)", () => {
      // Case: TC-044
      // Given: dateVal = -Infinity so diff = Infinity and findIndex returns -1
      const result = getCommitDate(Number.NEGATIVE_INFINITY);

      // When/Then: fallback selects the last unit (year), count is Infinity (plural)
      expect(result.value).toBe("Infinity years ago");
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

  describe("S8: Japanese locale formatting", () => {
    const DATE_VAL = 1_700_000_000;

    beforeEach(() => {
      setLocale("ja");
      globalThis.webviewMessages = {
        ...globalThis.webviewMessages,
        "date.relative.minute.one": "{0}分前",
        "date.relative.minute.other": "{0}分前"
      };
    });

    it('TC-032: returns YYYY-MM-DD HH:mm for "Date & Time"', () => {
      // Case: TC-032
      // Given: locale = ja and dateFormat = "Date & Time"
      setDateFormat("Date & Time");

      // When: getCommitDate is called
      const result = getCommitDate(DATE_VAL);

      // Then: value and title use ISO-style date-time format
      expect(result.value).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
      expect(result.title).toBe(result.value);
    });

    it('TC-033: returns YYYY-MM-DD for "Date Only"', () => {
      // Case: TC-033
      // Given: locale = ja and dateFormat = "Date Only"
      setDateFormat("Date Only");

      // When: getCommitDate is called
      const result = getCommitDate(DATE_VAL);

      // Then: value uses ISO-style date format and title still includes time
      expect(result.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.title).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('TC-034: returns Japanese relative time for "Relative"', () => {
      // Case: TC-034
      // Given: locale = ja and diff = 5 minutes
      vi.useFakeTimers();
      vi.setSystemTime(MOCK_NOW_MS);
      setDateFormat("Relative");

      // When: getCommitDate is called
      const result = getCommitDate(MOCK_NOW_SEC - 300);

      // Then: value is localized
      expect(result.value).toBe("5分前");

      vi.useRealTimers();
    });
  });
});
