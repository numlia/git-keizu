import { describe, expect, it } from "vitest";

import { arraysEqual, escapeHtml, pad2, unescapeHtml } from "../../web/utils";

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than", () => {
    expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#x27;s");
  });

  it("escapes forward slashes", () => {
    expect(escapeHtml("a/b")).toBe("a&#x2F;b");
  });

  it("escapes multiple special characters", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;"
    );
  });

  it("returns empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("returns plain text unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

describe("unescapeHtml", () => {
  it("unescapes ampersand", () => {
    expect(unescapeHtml("a &amp; b")).toBe("a & b");
  });

  it("unescapes less-than and greater-than", () => {
    expect(unescapeHtml("&lt;div&gt;")).toBe("<div>");
  });

  it("unescapes double quotes", () => {
    expect(unescapeHtml("&quot;hello&quot;")).toBe('"hello"');
  });

  it("unescapes single quotes", () => {
    expect(unescapeHtml("it&#x27;s")).toBe("it's");
  });

  it("unescapes forward slashes", () => {
    expect(unescapeHtml("a&#x2F;b")).toBe("a/b");
  });

  it("round-trips with escapeHtml", () => {
    const original = '<a href="test">it\'s & done</a>';
    expect(unescapeHtml(escapeHtml(original))).toBe(original);
  });
});

describe("arraysEqual", () => {
  it("returns true for equal arrays", () => {
    expect(arraysEqual([1, 2, 3], [1, 2, 3], (a, b) => a === b)).toBe(true);
  });

  it("returns false for different lengths", () => {
    expect(arraysEqual([1, 2], [1, 2, 3], (a, b) => a === b)).toBe(false);
  });

  it("returns false for different elements", () => {
    expect(arraysEqual([1, 2, 3], [1, 4, 3], (a, b) => a === b)).toBe(false);
  });

  it("returns true for empty arrays", () => {
    expect(arraysEqual([], [], (a, b) => a === b)).toBe(true);
  });

  it("uses custom comparator", () => {
    const a = [{ id: 1 }, { id: 2 }];
    const b = [{ id: 1 }, { id: 2 }];
    expect(arraysEqual(a, b, (x, y) => x.id === y.id)).toBe(true);
  });

  it("detects difference with custom comparator", () => {
    const a = [{ id: 1 }, { id: 2 }];
    const b = [{ id: 1 }, { id: 3 }];
    expect(arraysEqual(a, b, (x, y) => x.id === y.id)).toBe(false);
  });
});

describe("pad2", () => {
  it("pads single digit with leading zero", () => {
    expect(pad2(0)).toBe("00");
    expect(pad2(1)).toBe("01");
    expect(pad2(9)).toBe("09");
  });

  it("returns two-digit number as-is", () => {
    expect(pad2(10)).toBe(10);
    expect(pad2(23)).toBe(23);
    expect(pad2(59)).toBe(59);
  });
});
