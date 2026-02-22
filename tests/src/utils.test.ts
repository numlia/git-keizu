import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  env: {
    clipboard: {
      writeText: vi.fn()
    }
  }
}));

import { abbrevCommit, evalPromises, getPathFromStr } from "../../src/utils";

describe("abbrevCommit", () => {
  it("returns first 8 characters of a full commit hash", () => {
    expect(abbrevCommit("abcdef1234567890abcdef1234567890abcdef12")).toBe("abcdef12");
  });

  it("returns full string when shorter than 8 characters", () => {
    expect(abbrevCommit("abcde")).toBe("abcde");
  });

  it("returns exactly 8 characters for an 8-char input", () => {
    expect(abbrevCommit("12345678")).toBe("12345678");
  });
});

describe("getPathFromStr", () => {
  it("replaces backslashes with forward slashes", () => {
    expect(getPathFromStr("C:\\Users\\test\\project")).toBe("C:/Users/test/project");
  });

  it("leaves forward slashes unchanged", () => {
    expect(getPathFromStr("/home/user/project")).toBe("/home/user/project");
  });

  it("handles mixed slashes", () => {
    expect(getPathFromStr("C:\\Users/test\\project")).toBe("C:/Users/test/project");
  });

  it("handles empty string", () => {
    expect(getPathFromStr("")).toBe("");
  });

  it("handles consecutive backslashes", () => {
    expect(getPathFromStr("C:\\\\double")).toBe("C://double");
  });
});

describe("evalPromises", () => {
  it("resolves with empty array for empty input", async () => {
    const result = await evalPromises([], 3, async (x: number) => x * 2);
    expect(result).toEqual([]);
  });

  it("handles single element", async () => {
    const result = await evalPromises([5], 3, async (x: number) => x * 2);
    expect(result).toEqual([10]);
  });

  it("processes multiple elements with results in correct order", async () => {
    const result = await evalPromises([1, 2, 3, 4, 5], 2, async (x: number) => x * 10);
    expect(result).toEqual([10, 20, 30, 40, 50]);
  });

  it("respects maxParallel limit", async () => {
    let concurrentCount = 0;
    let maxConcurrent = 0;

    const result = await evalPromises([1, 2, 3, 4, 5], 2, async (x: number) => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await new Promise((r) => setTimeout(r, 10));
      concurrentCount--;
      return x;
    });

    expect(result).toEqual([1, 2, 3, 4, 5]);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it("rejects when a promise fails (single element)", async () => {
    await expect(
      evalPromises([1], 3, async () => {
        throw new Error("fail");
      })
    ).rejects.toThrow("fail");
  });

  it("rejects when a promise fails (multiple elements)", async () => {
    await expect(
      evalPromises([1, 2, 3], 2, async (x: number) => {
        if (x === 2) throw new Error("fail");
        return x;
      })
    ).rejects.toThrow("fail");
  });
});
