import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { getWebviewLocale, t } from "../../web/i18n";

const originalMessages = globalThis.webviewMessages;
const originalLocale = globalThis.webviewLocale;

afterEach(() => {
  globalThis.webviewMessages = originalMessages;
  globalThis.webviewLocale = originalLocale;
});

describe("web i18n helper", () => {
  it("TC-001: returns a translated key with placeholders", () => {
    // Given: webviewMessages contains a template with two placeholders
    globalThis.webviewMessages = { greeting: "Hello {0}, {1}" };

    // When: t is called with arguments
    const result = t("greeting", "Git", "Keizu");

    // Then: placeholders are replaced in order
    expect(result).toBe("Hello Git, Keizu");
  });

  it("TC-002: falls back to the key for missing messages", () => {
    // Given: webviewMessages does not contain the key
    globalThis.webviewMessages = {};

    // When: t is called
    const result = t("missing.key");

    // Then: the key itself is returned
    expect(result).toBe("missing.key");
  });

  it("TC-003: replaces missing placeholder arguments with an empty string", () => {
    // Given: a template references an argument that is not provided
    globalThis.webviewMessages = { missingArg: "Value: {0}/{1}" };

    // When: t is called with only one argument
    const result = t("missingArg", "A");

    // Then: the missing argument is rendered as an empty string
    expect(result).toBe("Value: A/");
  });

  it("TC-004: treats undefined global messages as an empty dictionary", () => {
    // Given: webviewMessages is unavailable
    delete (globalThis as Partial<typeof globalThis>).webviewMessages;

    // When: t is called
    const result = t("fallback.key");

    // Then: the helper falls back to the key
    expect(result).toBe("fallback.key");
  });

  // Cases below reference perspectives: docs/testing/perspectives/l10n/web/web.l10n.ja.json-test.md
  it("Japanese l10n JSON contains the commit-origin Create Branch key (l10n TC-001)", () => {
    // Case: TC-001 (l10n/web/web.l10n.ja.json-test.md)
    // Given: the Japanese l10n bundle on disk
    const jsonPath = resolve(process.cwd(), "l10n/web/web.l10n.ja.json");
    const messages = JSON.parse(readFileSync(jsonPath, "utf-8"));

    // When: looking up the commit-origin Create Branch dialog key
    const key = "Enter the name of the branch you would like to create from commit {0}:";
    const value = messages[key];

    // Then: a non-empty Japanese translation is present
    expect(typeof value).toBe("string");
    expect(value).toContain("コミット");
    expect(value).toContain("{0}");
  });

  it("Japanese l10n JSON keeps the stash-origin Create Branch key intact (l10n TC-002)", () => {
    // Case: TC-002 (l10n/web/web.l10n.ja.json-test.md)
    // Given: the Japanese l10n bundle on disk
    const jsonPath = resolve(process.cwd(), "l10n/web/web.l10n.ja.json");
    const messages = JSON.parse(readFileSync(jsonPath, "utf-8"));

    // When: looking up the stash-origin Create Branch dialog key
    const key = "Enter the name of the branch you would like to create from {0}:";
    const value = messages[key];

    // Then: the original Japanese translation is preserved
    expect(value).toBe("{0} から作成するブランチ名を入力してください:");
  });

  it("TC-005: normalizes locale to ja only when webviewLocale is ja", () => {
    // Given: locale is ja
    globalThis.webviewLocale = "ja";

    // When/Then: ja is returned
    expect(getWebviewLocale()).toBe("ja");

    // Given: locale is not ja
    globalThis.webviewLocale = "en";

    // When/Then: en is returned
    expect(getWebviewLocale()).toBe("en");
  });
});

// S1 (en) / S2 (ja): worktree 操作エラーの翻訳キー (Feature 045)
// @see docs/testing/perspectives/l10n/web/web.l10n.en.json-test.md
// @see docs/testing/perspectives/l10n/web/web.l10n.ja.json-test.md
describe("worktree open/reveal error l10n keys (Feature 045)", () => {
  const OPEN_WORKTREE_KEY = "error.openWorktreeInNewWindow";
  const REVEAL_WORKTREE_KEY = "error.revealWorktreeInOS";

  function loadBundle(fileName: string): Record<string, string> {
    const jsonPath = resolve(process.cwd(), `l10n/web/${fileName}`);
    return JSON.parse(readFileSync(jsonPath, "utf-8"));
  }

  it("English l10n JSON contains a non-empty open-worktree error key (en l10n TC-001)", () => {
    // Case: TC-001 (l10n/web/web.l10n.en.json-test.md)
    // Given: the English l10n bundle on disk
    const messages = loadBundle("web.l10n.en.json");

    // When: looking up the open-worktree error key
    const value = messages[OPEN_WORKTREE_KEY];

    // Then: the key exists with a non-empty English string
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it("English l10n JSON contains a non-empty reveal-worktree error key (en l10n TC-002)", () => {
    // Case: TC-002 (l10n/web/web.l10n.en.json-test.md)
    // Given: the English l10n bundle on disk
    const messages = loadBundle("web.l10n.en.json");

    // When: looking up the reveal-worktree error key
    const value = messages[REVEAL_WORKTREE_KEY];

    // Then: the key exists with a non-empty English string
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it("Japanese l10n JSON contains a non-empty open-worktree error key (ja l10n TC-003)", () => {
    // Case: TC-003 (l10n/web/web.l10n.ja.json-test.md)
    // Given: the Japanese l10n bundle on disk
    const messages = loadBundle("web.l10n.ja.json");

    // When: looking up the open-worktree error key
    const value = messages[OPEN_WORKTREE_KEY];

    // Then: the key exists with a non-empty Japanese string
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it("Japanese l10n JSON contains a non-empty reveal-worktree error key (ja l10n TC-004)", () => {
    // Case: TC-004 (l10n/web/web.l10n.ja.json-test.md)
    // Given: the Japanese l10n bundle on disk
    const messages = loadBundle("web.l10n.ja.json");

    // When: looking up the reveal-worktree error key
    const value = messages[REVEAL_WORKTREE_KEY];

    // Then: the key exists with a non-empty Japanese string
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });
});

// S2 (en) / S3 (ja): 安全な checkout と Push 先選択の翻訳キー (Feature 047)
// @see docs/testing/perspectives/l10n/web/web.l10n.en.json-test.md
// @see docs/testing/perspectives/l10n/web/web.l10n.ja.json-test.md
describe("safe checkout and push selection l10n keys (Feature 047)", () => {
  const ADDED_KEYS = [
    "error.checkoutBranchExists",
    "error.checkoutInvalidRef",
    "error.pushNoRemotes",
    "push.selectRemote",
    "push.selectRemoteAction"
  ];

  function loadBundle(fileName: string): Record<string, string> {
    const jsonPath = resolve(process.cwd(), `l10n/web/${fileName}`);
    return JSON.parse(readFileSync(jsonPath, "utf-8"));
  }

  function missingKeys(bundle: Record<string, string>): string[] {
    return ADDED_KEYS.filter((key) => bundle[key] === undefined);
  }

  it("English bundle has a non-empty branch-exists reason (en l10n TC-003)", () => {
    // Case: TC-003 (l10n/web/web.l10n.en.json-test.md)
    // Given: the English l10n bundle on disk
    const messages = loadBundle("web.l10n.en.json");

    // When: looking up the branch-exists reason
    const value = messages["error.checkoutBranchExists"];

    // Then: the key exists with a non-empty English string
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it("English bundle has a non-empty invalid-ref reason (en l10n TC-004)", () => {
    // Case: TC-004 (l10n/web/web.l10n.en.json-test.md)
    // Given: the English l10n bundle on disk
    const messages = loadBundle("web.l10n.en.json");

    // When: looking up the invalid-ref reason
    const value = messages["error.checkoutInvalidRef"];

    // Then: the key exists with a non-empty English string
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it("English bundle has a non-empty no-remotes reason (en l10n TC-005)", () => {
    // Case: TC-005 (l10n/web/web.l10n.en.json-test.md)
    // Given: the English l10n bundle on disk
    const messages = loadBundle("web.l10n.en.json");

    // When: looking up the no-remotes reason
    const value = messages["error.pushNoRemotes"];

    // Then: the key exists with a non-empty English string
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it("English bundle has a non-empty remote selection prompt (en l10n TC-006)", () => {
    // Case: TC-006 (l10n/web/web.l10n.en.json-test.md)
    // Given: the English l10n bundle on disk
    const messages = loadBundle("web.l10n.en.json");

    // When: looking up the selection prompt
    const value = messages["push.selectRemote"];

    // Then: the key exists with a non-empty English string
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it("English bundle has a non-empty remote selection action label (en l10n TC-007)", () => {
    // Case: TC-007 (l10n/web/web.l10n.en.json-test.md)
    // Given: the English l10n bundle on disk
    const messages = loadBundle("web.l10n.en.json");

    // When: looking up the selection action label
    const value = messages["push.selectRemoteAction"];

    // Then: the key exists with a non-empty English string
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it("Japanese bundle is missing none of the added keys (en l10n TC-008)", () => {
    // Case: TC-008 (l10n/web/web.l10n.en.json-test.md)
    // Given: both l10n bundles on disk
    const japanese = loadBundle("web.l10n.ja.json");

    // When: the added key set is compared against the Japanese bundle
    const missing = missingKeys(japanese);

    // Then: no key was added to English only
    expect(missing).toEqual([]);
  });

  it("Japanese bundle has a non-empty branch-exists reason (ja l10n TC-005)", () => {
    // Case: TC-005 (l10n/web/web.l10n.ja.json-test.md)
    // Given: the Japanese l10n bundle on disk
    const messages = loadBundle("web.l10n.ja.json");

    // When: looking up the branch-exists reason
    const value = messages["error.checkoutBranchExists"];

    // Then: the key exists with a non-empty Japanese string
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it("Japanese bundle has a non-empty invalid-ref reason (ja l10n TC-006)", () => {
    // Case: TC-006 (l10n/web/web.l10n.ja.json-test.md)
    // Given: the Japanese l10n bundle on disk
    const messages = loadBundle("web.l10n.ja.json");

    // When: looking up the invalid-ref reason
    const value = messages["error.checkoutInvalidRef"];

    // Then: the key exists with a non-empty Japanese string
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it("Japanese bundle has a non-empty no-remotes reason (ja l10n TC-007)", () => {
    // Case: TC-007 (l10n/web/web.l10n.ja.json-test.md)
    // Given: the Japanese l10n bundle on disk
    const messages = loadBundle("web.l10n.ja.json");

    // When: looking up the no-remotes reason
    const value = messages["error.pushNoRemotes"];

    // Then: the key exists with a non-empty Japanese string
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it("Japanese bundle has a non-empty remote selection prompt (ja l10n TC-008)", () => {
    // Case: TC-008 (l10n/web/web.l10n.ja.json-test.md)
    // Given: the Japanese l10n bundle on disk
    const messages = loadBundle("web.l10n.ja.json");

    // When: looking up the selection prompt
    const value = messages["push.selectRemote"];

    // Then: the key exists with a non-empty Japanese string
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it("Japanese bundle has a non-empty remote selection action label (ja l10n TC-009)", () => {
    // Case: TC-009 (l10n/web/web.l10n.ja.json-test.md)
    // Given: the Japanese l10n bundle on disk
    const messages = loadBundle("web.l10n.ja.json");

    // When: looking up the selection action label
    const value = messages["push.selectRemoteAction"];

    // Then: the key exists with a non-empty Japanese string
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it("English bundle is complete and Japanese values are translated (ja l10n TC-010)", () => {
    // Case: TC-010 (l10n/web/web.l10n.ja.json-test.md)
    // Given: both l10n bundles on disk
    const english = loadBundle("web.l10n.en.json");
    const japanese = loadBundle("web.l10n.ja.json");

    // When: the added key set is compared against English and against the raw keys
    const missing = missingKeys(english);
    const untranslated = ADDED_KEYS.filter((key) => japanese[key] === key);

    // Then: no key was added to Japanese only and no value fell back to the raw key
    expect(missing).toEqual([]);
    expect(untranslated).toEqual([]);
  });
});
