import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  language: "en",
  readFile: vi.fn(),
  l10nT: vi.fn((message: string, ...args: unknown[]) =>
    args.length === 0
      ? message
      : message.replace(/\{(\d+)\}/g, (_match, index) => String(args[Number(index)] ?? ""))
  )
}));

vi.mock("vscode", () => ({
  env: {
    get language() {
      return mocks.language;
    }
  },
  l10n: {
    t: mocks.l10nT
  }
}));

vi.mock("node:fs/promises", () => ({
  readFile: mocks.readFile
}));

import { getLocale, loadWebviewMessages, t } from "../../src/i18n";

describe("src i18n helper", () => {
  beforeEach(() => {
    mocks.language = "en";
    mocks.readFile.mockReset();
    mocks.l10nT.mockClear();
  });

  it("TC-001: maps ja and ja-* VS Code languages to ja", () => {
    // Given/When/Then: exact ja maps to ja
    mocks.language = "ja";
    expect(getLocale()).toBe("ja");

    // Given/When/Then: regional ja maps to ja
    mocks.language = "ja-JP";
    expect(getLocale()).toBe("ja");
  });

  it("TC-002: maps unsupported languages to en", () => {
    // Given: VS Code language is unsupported
    mocks.language = "fr";

    // When/Then: the extension falls back to en
    expect(getLocale()).toBe("en");
  });

  it("TC-003: delegates host translation to vscode.l10n.t", () => {
    // Given: a message with placeholders
    const result = t("Hello {0}", "Git Keizu");

    // Then: vscode.l10n.t is called and its result is returned
    expect(result).toBe("Hello Git Keizu");
    expect(mocks.l10nT).toHaveBeenCalledWith("Hello {0}", "Git Keizu");
  });

  it("TC-004: prefers locale-specific values over English for shared keys", async () => {
    // Given: locale is ja and both dictionaries define the same key
    mocks.language = "ja-JP";
    mocks.readFile.mockResolvedValueOnce('{"hello":"こんにちは"}');
    mocks.readFile.mockResolvedValueOnce('{"hello":"Hello"}');

    // When: webview messages are loaded
    const result = await loadWebviewMessages("/ext");

    // Then: the locale-specific value wins over the English base
    expect(result).toEqual({ hello: "こんにちは" });
    expect(mocks.readFile).toHaveBeenCalledTimes(2);
    expect(String(mocks.readFile.mock.calls[0][0])).toContain("web.l10n.ja.json");
    expect(String(mocks.readFile.mock.calls[1][0])).toContain("web.l10n.en.json");
  });

  it("TC-005: falls back to English when locale dictionary is missing", async () => {
    // Given: ja load fails and en load succeeds
    mocks.language = "ja";
    mocks.readFile.mockRejectedValueOnce(new Error("missing"));
    mocks.readFile.mockResolvedValueOnce('{"hello":"Hello"}');

    // When: webview messages are loaded
    const result = await loadWebviewMessages("/ext");

    // Then: English messages are returned
    expect(result).toEqual({ hello: "Hello" });
    expect(String(mocks.readFile.mock.calls[1][0])).toContain("web.l10n.en.json");
  });

  it("TC-006: returns an empty dictionary when every dictionary fails or is invalid", async () => {
    // Given: locale JSON is invalid and English is missing
    mocks.language = "ja";
    mocks.readFile.mockResolvedValueOnce("{invalid");
    mocks.readFile.mockRejectedValueOnce(new Error("missing"));

    // When: webview messages are loaded
    const result = await loadWebviewMessages("/ext");

    // Then: the loader degrades to an empty dictionary
    expect(result).toEqual({});
  });

  it("TC-007: fills keys missing from the locale dictionary with English", async () => {
    // Given: the ja dictionary covers only part of the English key set
    mocks.language = "ja";
    mocks.readFile.mockResolvedValueOnce('{"hello":"こんにちは"}');
    mocks.readFile.mockResolvedValueOnce('{"hello":"Hello","bye":"Bye"}');

    // When: webview messages are loaded
    const result = await loadWebviewMessages("/ext");

    // Then: the untranslated key resolves to English instead of the raw key
    expect(result).toEqual({ hello: "こんにちは", bye: "Bye" });
  });

  it("TC-008: reads only the English dictionary when locale is en", async () => {
    // Given: locale is en
    mocks.language = "en";
    mocks.readFile.mockResolvedValueOnce('{"hello":"Hello"}');

    // When: webview messages are loaded
    const result = await loadWebviewMessages("/ext");

    // Then: the English dictionary is read once with no redundant second read
    expect(result).toEqual({ hello: "Hello" });
    expect(mocks.readFile).toHaveBeenCalledTimes(1);
    expect(String(mocks.readFile.mock.calls[0][0])).toContain("web.l10n.en.json");
  });
});
