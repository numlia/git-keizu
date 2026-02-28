import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();

vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: mockGet
    }))
  }
}));

import { getConfig, parseKeybinding } from "../../src/config";

// S1: parseKeybinding() ショートカット設定値パース
describe("parseKeybinding", () => {
  // TC-001: valid format "CTRL/CMD + F" → "f"
  it("returns lowercase letter for valid 'CTRL/CMD + F'", () => {
    // Given: a valid keybinding format "CTRL/CMD + F"
    // When: parseKeybinding is called
    const result = parseKeybinding("CTRL/CMD + F", "CTRL/CMD + F");
    // Then: returns the lowercase letter "f"
    expect(result).toBe("f");
  });

  // TC-002: valid format "CTRL/CMD + Z" → "z"
  it("returns lowercase letter for valid 'CTRL/CMD + Z'", () => {
    // Given: a valid keybinding with a different letter
    // When: parseKeybinding is called
    const result = parseKeybinding("CTRL/CMD + Z", "CTRL/CMD + F");
    // Then: extracts the last letter in lowercase
    expect(result).toBe("z");
  });

  // TC-003: valid format "CTRL/CMD + A" → "a"
  it("returns lowercase letter for valid 'CTRL/CMD + A'", () => {
    // Given: a valid keybinding with the first alphabet letter
    // When: parseKeybinding is called
    const result = parseKeybinding("CTRL/CMD + A", "CTRL/CMD + F");
    // Then: returns "a"
    expect(result).toBe("a");
  });

  // TC-004: special value "UNASSIGNED" → null
  it("returns null for UNASSIGNED", () => {
    // Given: the special "UNASSIGNED" value to disable the shortcut
    // When: parseKeybinding is called
    const result = parseKeybinding("UNASSIGNED", "CTRL/CMD + F");
    // Then: returns null
    expect(result).toBeNull();
  });

  // TC-005: invalid format "Ctrl+F" → fallback to default "f"
  it("falls back to default for invalid format 'Ctrl+F'", () => {
    // Given: an invalid format missing slashes and spaces
    // When: parseKeybinding is called
    const result = parseKeybinding("Ctrl+F", "CTRL/CMD + F");
    // Then: falls back to default → "f"
    expect(result).toBe("f");
  });

  // TC-006: empty string → fallback to default "f"
  it("falls back to default for empty string", () => {
    // Given: an empty string input
    // When: parseKeybinding is called
    const result = parseKeybinding("", "CTRL/CMD + F");
    // Then: falls back to default → "f"
    expect(result).toBe("f");
  });

  // TC-007: lowercase "ctrl/cmd + f" → fallback to default "f"
  it("falls back to default for lowercase 'ctrl/cmd + f'", () => {
    // Given: lowercase variant (regex requires uppercase)
    // When: parseKeybinding is called
    const result = parseKeybinding("ctrl/cmd + f", "CTRL/CMD + F");
    // Then: falls back to default → "f"
    expect(result).toBe("f");
  });

  // TC-008: non-alpha "CTRL/CMD + 1" → fallback to default "f"
  it("falls back to default for non-alpha 'CTRL/CMD + 1'", () => {
    // Given: a digit instead of a letter
    // When: parseKeybinding is called
    const result = parseKeybinding("CTRL/CMD + 1", "CTRL/CMD + F");
    // Then: falls back to default → "f"
    expect(result).toBe("f");
  });

  // TC-009: extra whitespace → fallback to default "f"
  it("falls back to default for value with extra whitespace", () => {
    // Given: extra leading whitespace (strict regex requires exact match)
    // When: parseKeybinding is called
    const result = parseKeybinding(" CTRL/CMD + F", "CTRL/CMD + F");
    // Then: regex fails, falls back to default → "f"
    expect(result).toBe("f");
  });

  // TC-010: two-character key "CTRL/CMD + FF" → fallback to default "f"
  it("falls back to default for two-character key 'CTRL/CMD + FF'", () => {
    // Given: two characters after the plus sign (only single letter allowed)
    // When: parseKeybinding is called
    const result = parseKeybinding("CTRL/CMD + FF", "CTRL/CMD + F");
    // Then: regex fails, falls back to default → "f"
    expect(result).toBe("f");
  });
});

// S2: sourceCodeProviderIntegrationLocation() SCMボタン位置設定
describe("sourceCodeProviderIntegrationLocation", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  // TC-011: default → "Inline"
  it("returns 'Inline' as default when not configured", () => {
    // Given: no setting configured (get returns the provided default)
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    // When: reading the setting
    const config = getConfig();
    const result = config.sourceCodeProviderIntegrationLocation();
    // Then: returns default "Inline"
    expect(result).toBe("Inline");
  });

  // TC-012: configured "More Actions" → "More Actions"
  it("returns 'More Actions' when configured", () => {
    // Given: setting configured to "More Actions"
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "sourceCodeProviderIntegrationLocation" ? "More Actions" : defaultValue
    );
    // When: reading the setting
    const config = getConfig();
    const result = config.sourceCodeProviderIntegrationLocation();
    // Then: returns "More Actions"
    expect(result).toBe("More Actions");
  });

  // TC-013: explicitly configured "Inline" → "Inline"
  it("returns 'Inline' when explicitly configured", () => {
    // Given: setting explicitly set to "Inline"
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "sourceCodeProviderIntegrationLocation" ? "Inline" : defaultValue
    );
    // When: reading the setting
    const config = getConfig();
    const result = config.sourceCodeProviderIntegrationLocation();
    // Then: returns "Inline"
    expect(result).toBe("Inline");
  });
});

// S3: keyboardShortcut*() キーボードショートカット設定
describe("keyboardShortcut*", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  // TC-014: keyboardShortcutFind default → "f"
  it("keyboardShortcutFind returns 'f' by default", () => {
    // Given: default configuration
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    // When: reading keyboardShortcutFind
    const config = getConfig();
    const result = config.keyboardShortcutFind();
    // Then: returns "f" (parsed from default "CTRL/CMD + F")
    expect(result).toBe("f");
  });

  // TC-015: keyboardShortcutRefresh default → "r"
  it("keyboardShortcutRefresh returns 'r' by default", () => {
    // Given: default configuration
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    // When: reading keyboardShortcutRefresh
    const config = getConfig();
    const result = config.keyboardShortcutRefresh();
    // Then: returns "r" (parsed from default "CTRL/CMD + R")
    expect(result).toBe("r");
  });

  // TC-016: keyboardShortcutScrollToHead default → "h"
  it("keyboardShortcutScrollToHead returns 'h' by default", () => {
    // Given: default configuration
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    // When: reading keyboardShortcutScrollToHead
    const config = getConfig();
    const result = config.keyboardShortcutScrollToHead();
    // Then: returns "h" (parsed from default "CTRL/CMD + H")
    expect(result).toBe("h");
  });

  // TC-017: keyboardShortcutScrollToStash default → "s"
  it("keyboardShortcutScrollToStash returns 's' by default", () => {
    // Given: default configuration
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    // When: reading keyboardShortcutScrollToStash
    const config = getConfig();
    const result = config.keyboardShortcutScrollToStash();
    // Then: returns "s" (parsed from default "CTRL/CMD + S")
    expect(result).toBe("s");
  });

  // TC-018: keyboardShortcutFind custom "CTRL/CMD + A" → "a"
  it("keyboardShortcutFind returns custom key when configured", () => {
    // Given: keyboardShortcutFind set to "CTRL/CMD + A"
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "keyboardShortcutFind" ? "CTRL/CMD + A" : defaultValue
    );
    // When: reading keyboardShortcutFind
    const config = getConfig();
    const result = config.keyboardShortcutFind();
    // Then: returns "a"
    expect(result).toBe("a");
  });

  // TC-019: keyboardShortcutFind "UNASSIGNED" → null
  it("keyboardShortcutFind returns null when set to UNASSIGNED", () => {
    // Given: keyboardShortcutFind set to "UNASSIGNED"
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "keyboardShortcutFind" ? "UNASSIGNED" : defaultValue
    );
    // When: reading keyboardShortcutFind
    const config = getConfig();
    const result = config.keyboardShortcutFind();
    // Then: returns null (shortcut disabled)
    expect(result).toBeNull();
  });
});

// S4: loadMoreCommitsAutomatically() 自動読み込み設定
describe("loadMoreCommitsAutomatically", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  // TC-020: default → true
  it("returns true by default", () => {
    // Given: default configuration
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    // When: reading loadMoreCommitsAutomatically
    const config = getConfig();
    const result = config.loadMoreCommitsAutomatically();
    // Then: returns true (auto-load enabled by default)
    expect(result).toBe(true);
  });

  // TC-021: configured false → false
  it("returns false when explicitly disabled", () => {
    // Given: setting configured to false
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "loadMoreCommitsAutomatically" ? false : defaultValue
    );
    // When: reading loadMoreCommitsAutomatically
    const config = getConfig();
    const result = config.loadMoreCommitsAutomatically();
    // Then: returns false
    expect(result).toBe(false);
  });
});
