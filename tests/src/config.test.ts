import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();

vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: mockGet
    }))
  },
  ViewColumn: {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3,
    Four: 4,
    Five: 5,
    Six: 6,
    Seven: 7,
    Eight: 8,
    Nine: 9
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

// S14: showRecentActions() Recent 表示設定
describe("showRecentActions", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("returns true by default (TC-078)", () => {
    // Case: TC-078
    // Given: default configuration
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);

    // When: reading showRecentActions
    const config = getConfig();
    const result = config.showRecentActions();

    // Then: returns true
    expect(result).toBe(true);
  });

  it("returns false when explicitly disabled (TC-079)", () => {
    // Case: TC-079
    // Given: menu.showRecentActions is explicitly disabled
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "menu.showRecentActions" ? false : defaultValue
    );

    // When: reading showRecentActions
    const config = getConfig();
    const result = config.showRecentActions();

    // Then: returns false
    expect(result).toBe(false);
  });
});

// S5: muteCommitsMergeCommits() マージコミット mute 設定
describe("muteCommitsMergeCommits", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  // TC-022: default → true
  it("returns true by default", () => {
    // Given: no explicit setting configured
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    // When: reading muteCommitsMergeCommits
    const config = getConfig();
    const result = config.muteCommitsMergeCommits();
    // Then: returns true (mute merge commits enabled by default)
    expect(result).toBe(true);
  });

  // TC-023: configured false → false
  it("returns false when explicitly disabled", () => {
    // Given: setting configured to false
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "repository.commits.mute.mergeCommits" ? false : defaultValue
    );
    // When: reading muteCommitsMergeCommits
    const config = getConfig();
    const result = config.muteCommitsMergeCommits();
    // Then: returns false
    expect(result).toBe(false);
  });

  // TC-024: configured true → true
  it("returns true when explicitly enabled", () => {
    // Given: setting explicitly set to true
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "repository.commits.mute.mergeCommits" ? true : defaultValue
    );
    // When: reading muteCommitsMergeCommits
    const config = getConfig();
    const result = config.muteCommitsMergeCommits();
    // Then: returns true
    expect(result).toBe(true);
  });
});

// S6: muteCommitsNotAncestorsOfHead() 祖先外 mute 設定
describe("muteCommitsNotAncestorsOfHead", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  // TC-025: default → false
  it("returns false by default", () => {
    // Given: no explicit setting configured
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    // When: reading muteCommitsNotAncestorsOfHead
    const config = getConfig();
    const result = config.muteCommitsNotAncestorsOfHead();
    // Then: returns false (mute non-ancestors disabled by default)
    expect(result).toBe(false);
  });

  // TC-026: configured true → true
  it("returns true when explicitly enabled", () => {
    // Given: setting configured to true
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "repository.commits.mute.commitsThatAreNotAncestorsOfHead" ? true : defaultValue
    );
    // When: reading muteCommitsNotAncestorsOfHead
    const config = getConfig();
    const result = config.muteCommitsNotAncestorsOfHead();
    // Then: returns true
    expect(result).toBe(true);
  });

  // TC-027: configured false → false
  it("returns false when explicitly disabled", () => {
    // Given: setting explicitly set to false
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "repository.commits.mute.commitsThatAreNotAncestorsOfHead" ? false : defaultValue
    );
    // When: reading muteCommitsNotAncestorsOfHead
    const config = getConfig();
    const result = config.muteCommitsNotAncestorsOfHead();
    // Then: returns false
    expect(result).toBe(false);
  });
});

// S7: dialogDefaults() ダイアログデフォルト設定
describe("dialogDefaults", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  // TC-028: all defaults
  it("returns all default values when no settings configured", () => {
    // Given: no dialog settings configured (get returns provided defaults)
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    // When: reading dialogDefaults
    const config = getConfig();
    const result = config.dialogDefaults();
    // Then: returns all default values
    expect(result).toEqual({
      merge: {
        noFastForward: true,
        squashCommits: false,
        noCommit: false
      },
      cherryPick: {
        recordOrigin: false,
        noCommit: false
      },
      stashUncommittedChanges: {
        includeUntracked: false
      },
      createWorktree: {
        openTerminal: true
      },
      removeWorktree: {
        deleteBranch: true
      }
    });
  });

  // TC-029: dialog.merge.noFastForward=false
  it("returns merge.noFastForward=false when configured", () => {
    // Given: dialog.merge.noFastForward set to false
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "dialog.merge.noFastForward" ? false : defaultValue
    );
    // When: reading dialogDefaults
    const config = getConfig();
    const result = config.dialogDefaults();
    // Then: merge.noFastForward is false, others unchanged
    expect(result.merge.noFastForward).toBe(false);
    expect(result.merge.squashCommits).toBe(false);
    expect(result.merge.noCommit).toBe(false);
  });

  // TC-030: dialog.merge.squashCommits=true
  it("returns merge.squashCommits=true when configured", () => {
    // Given: dialog.merge.squashCommits set to true
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "dialog.merge.squashCommits" ? true : defaultValue
    );
    // When: reading dialogDefaults
    const config = getConfig();
    const result = config.dialogDefaults();
    // Then: merge.squashCommits is true
    expect(result.merge.squashCommits).toBe(true);
  });

  // TC-031: dialog.merge.noCommit=true
  it("returns merge.noCommit=true when configured", () => {
    // Given: dialog.merge.noCommit set to true
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "dialog.merge.noCommit" ? true : defaultValue
    );
    // When: reading dialogDefaults
    const config = getConfig();
    const result = config.dialogDefaults();
    // Then: merge.noCommit is true
    expect(result.merge.noCommit).toBe(true);
  });

  // TC-032: dialog.cherryPick.recordOrigin=true
  it("returns cherryPick.recordOrigin=true when configured", () => {
    // Given: dialog.cherryPick.recordOrigin set to true
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "dialog.cherryPick.recordOrigin" ? true : defaultValue
    );
    // When: reading dialogDefaults
    const config = getConfig();
    const result = config.dialogDefaults();
    // Then: cherryPick.recordOrigin is true
    expect(result.cherryPick.recordOrigin).toBe(true);
  });

  // TC-033: dialog.cherryPick.noCommit=true
  it("returns cherryPick.noCommit=true when configured", () => {
    // Given: dialog.cherryPick.noCommit set to true
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "dialog.cherryPick.noCommit" ? true : defaultValue
    );
    // When: reading dialogDefaults
    const config = getConfig();
    const result = config.dialogDefaults();
    // Then: cherryPick.noCommit is true
    expect(result.cherryPick.noCommit).toBe(true);
  });

  // TC-034: dialog.stashUncommittedChanges.includeUntracked=true
  it("returns stashUncommittedChanges.includeUntracked=true when configured", () => {
    // Given: dialog.stashUncommittedChanges.includeUntracked set to true
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "dialog.stashUncommittedChanges.includeUntracked" ? true : defaultValue
    );
    // When: reading dialogDefaults
    const config = getConfig();
    const result = config.dialogDefaults();
    // Then: stashUncommittedChanges.includeUntracked is true
    expect(result.stashUncommittedChanges.includeUntracked).toBe(true);
  });
});

// S8: commitOrdering() コミット表示順序設定
describe("commitOrdering", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  // TC-035: default → "date"
  it("returns 'date' by default when not configured", () => {
    // Given: no explicit setting configured (get returns provided default)
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    // When: reading commitOrdering
    const config = getConfig();
    const result = config.commitOrdering();
    // Then: returns "date" (default value matching existing --date-order behavior)
    expect(result).toBe("date");
  });

  // TC-036: configured "topo" → "topo"
  it("returns 'topo' when configured to topological order", () => {
    // Given: repository.commits.order set to "topo"
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "repository.commits.order" ? "topo" : defaultValue
    );
    // When: reading commitOrdering
    const config = getConfig();
    const result = config.commitOrdering();
    // Then: returns "topo"
    expect(result).toBe("topo");
  });

  // TC-037: configured "author-date" → "author-date"
  it("returns 'author-date' when configured to author date order", () => {
    // Given: repository.commits.order set to "author-date"
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "repository.commits.order" ? "author-date" : defaultValue
    );
    // When: reading commitOrdering
    const config = getConfig();
    const result = config.commitOrdering();
    // Then: returns "author-date"
    expect(result).toBe("author-date");
  });
});

// S9: dialogDefaults() createWorktree/removeWorktree 設定
describe("dialogDefaults createWorktree/removeWorktree", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  // TC-038: createWorktree.openTerminal default → true
  it("returns createWorktree.openTerminal=true by default (TC-038)", () => {
    // Given: no dialog.createWorktree.openTerminal setting configured
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    // When: reading dialogDefaults
    const config = getConfig();
    const result = config.dialogDefaults();
    // Then: createWorktree.openTerminal is true
    expect(result.createWorktree.openTerminal).toBe(true);
  });

  // TC-039: createWorktree.openTerminal=false → false
  it("returns createWorktree.openTerminal=false when configured (TC-039)", () => {
    // Given: dialog.createWorktree.openTerminal set to false
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "dialog.createWorktree.openTerminal" ? false : defaultValue
    );
    // When: reading dialogDefaults
    const config = getConfig();
    const result = config.dialogDefaults();
    // Then: createWorktree.openTerminal is false
    expect(result.createWorktree.openTerminal).toBe(false);
  });

  // TC-040: removeWorktree.deleteBranch default → true
  it("returns removeWorktree.deleteBranch=true by default (TC-040)", () => {
    // Given: no dialog.removeWorktree.deleteBranch setting configured
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    // When: reading dialogDefaults
    const config = getConfig();
    const result = config.dialogDefaults();
    // Then: removeWorktree.deleteBranch is true
    expect(result.removeWorktree.deleteBranch).toBe(true);
  });

  // TC-041: removeWorktree.deleteBranch=false → false
  it("returns removeWorktree.deleteBranch=false when configured (TC-041)", () => {
    // Given: dialog.removeWorktree.deleteBranch set to false
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "dialog.removeWorktree.deleteBranch" ? false : defaultValue
    );
    // When: reading dialogDefaults
    const config = getConfig();
    const result = config.dialogDefaults();
    // Then: removeWorktree.deleteBranch is false
    expect(result.removeWorktree.deleteBranch).toBe(false);
  });
});

// S15: initialLoadCommits() / loadMoreCommits() 1 未満補正
describe("commit load count normalization", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  // Case: TC-081
  it("initialLoadCommits returns 300 by default", () => {
    // Given: no setting configured (mock returns default)
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    // When: reading initialLoadCommits
    const config = getConfig();
    const result = config.initialLoadCommits();
    // Then: default value 300 is returned
    expect(result).toBe(300);
  });

  // Case: TC-082
  it("initialLoadCommits normalizes 0 to 1", () => {
    // Given: initialLoadCommits configured as 0
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "initialLoadCommits" ? 0 : defaultValue
    );
    // When: reading initialLoadCommits
    const config = getConfig();
    const result = config.initialLoadCommits();
    // Then: 0 is normalized to 1
    expect(result).toBe(1);
  });

  // Case: TC-083
  it("initialLoadCommits normalizes negative value to 1", () => {
    // Given: initialLoadCommits configured as -50
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "initialLoadCommits" ? -50 : defaultValue
    );
    // When: reading initialLoadCommits
    const config = getConfig();
    const result = config.initialLoadCommits();
    // Then: negative is normalized to 1
    expect(result).toBe(1);
  });

  // Case: TC-084
  it("loadMoreCommits returns 100 by default", () => {
    // Given: no setting configured
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    // When: reading loadMoreCommits
    const config = getConfig();
    const result = config.loadMoreCommits();
    // Then: default value 100 is returned
    expect(result).toBe(100);
  });

  // Case: TC-085
  it("loadMoreCommits normalizes 0 to 1", () => {
    // Given: loadMoreCommits configured as 0
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "loadMoreCommits" ? 0 : defaultValue
    );
    // When: reading loadMoreCommits
    const config = getConfig();
    const result = config.loadMoreCommits();
    // Then: 0 is normalized to 1
    expect(result).toBe(1);
  });

  // Case: TC-086
  it("loadMoreCommits preserves positive value above 1", () => {
    // Given: loadMoreCommits configured as 250
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "loadMoreCommits" ? 250 : defaultValue
    );
    // When: reading loadMoreCommits
    const config = getConfig();
    const result = config.loadMoreCommits();
    // Then: 250 is preserved
    expect(result).toBe(250);
  });
});

// S16: graphColours() RGBA filter
describe("graphColours RGBA filter", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  function withGraphColours(values: string[]) {
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "graphColours" ? values : defaultValue
    );
  }

  // Case: TC-087
  it("accepts rgba(r, g, b, 0.5)", () => {
    // Given: graphColours contains rgba with alpha 0.5
    withGraphColours(["rgba(1, 2, 3, 0.5)"]);
    // When: reading graphColours
    const config = getConfig();
    const result = config.graphColours();
    // Then: rgba alpha 0.5 passes the filter
    expect(result).toEqual(["rgba(1, 2, 3, 0.5)"]);
  });

  // Case: TC-088
  it("accepts rgba(r, g, b, 1)", () => {
    // Given: graphColours contains rgba with alpha 1
    withGraphColours(["rgba(1, 2, 3, 1)"]);
    // When: reading graphColours
    const config = getConfig();
    const result = config.graphColours();
    // Then: rgba alpha 1 passes the filter
    expect(result).toEqual(["rgba(1, 2, 3, 1)"]);
  });

  // Case: TC-091
  it("accepts rgb(r, g, b) and 6/8-digit HEX", () => {
    // Given: a mix of valid formats
    withGraphColours(["rgb(1, 2, 3)", "#0085d9", "#0085d9cc"]);
    // When: reading graphColours
    const config = getConfig();
    const result = config.graphColours();
    // Then: all classic formats pass the filter
    expect(result).toEqual(["rgb(1, 2, 3)", "#0085d9", "#0085d9cc"]);
  });

  // Case: TC-092
  it("filters out invalid entries while keeping valid ones", () => {
    // Given: mixed valid and invalid entries
    withGraphColours(["rgba(1, 2, 3, 0.5)", "rgba(1, 2, 3)", "#0085d9", "not-a-color"]);
    // When: reading graphColours
    const config = getConfig();
    const result = config.graphColours();
    // Then: only valid entries remain in original order
    expect(result).toEqual(["rgba(1, 2, 3, 0.5)", "#0085d9"]);
  });
});

// S19: graphColours() 空フィルタ結果の既定色フォールバック
// @see docs/testing/perspectives/src/config-test/04-feature-045-defensive-fixes-01.md
describe("graphColours empty-filter fallback", () => {
  const DEFAULT_COLOUR_COUNT = 12;
  const DEFAULT_FIRST_COLOUR = "#0085d9";
  const DEFAULT_LAST_COLOUR = "#ffcc00";

  beforeEach(() => {
    mockGet.mockReset();
  });

  function withGraphColours(values: string[]) {
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "graphColours" ? values : defaultValue
    );
  }

  it("falls back to the 12 default colours when configured as an empty array (TC-101)", () => {
    // Case: TC-101
    // Given: graphColours is explicitly configured as an empty array
    withGraphColours([]);

    // When: reading graphColours
    const config = getConfig();
    const result = config.graphColours();

    // Then: the 12 default colours are returned (first #0085d9, last #ffcc00)
    expect(result).toHaveLength(DEFAULT_COLOUR_COUNT);
    expect(result[0]).toBe(DEFAULT_FIRST_COLOUR);
    expect(result[result.length - 1]).toBe(DEFAULT_LAST_COLOUR);
  });

  it("falls back to the 12 default colours when every entry is filtered out (TC-102)", () => {
    // Case: TC-102
    // Given: graphColours contains only entries that fail the colour pattern
    withGraphColours(["not-a-color", "rgba(1, 2, 3)"]);

    // When: reading graphColours
    const config = getConfig();
    const result = config.graphColours();

    // Then: the 12 default colours are returned instead of an empty array
    expect(result).toHaveLength(DEFAULT_COLOUR_COUNT);
    expect(result[0]).toBe(DEFAULT_FIRST_COLOUR);
    expect(result[result.length - 1]).toBe(DEFAULT_LAST_COLOUR);
  });

  it("keeps only the valid colours in order for mixed input without falling back (TC-103)", () => {
    // Case: TC-103
    // Given: graphColours mixes valid and invalid entries
    withGraphColours(["rgba(1, 2, 3, 0.5)", "bad", "#0085d9"]);

    // When: reading graphColours
    const config = getConfig();
    const result = config.graphColours();

    // Then: only the valid colours remain in input order and the fallback is not applied
    expect(result).toEqual(["rgba(1, 2, 3, 0.5)", "#0085d9"]);
  });

  it("passes through a fully valid colour list in input order (TC-104)", () => {
    // Case: TC-104
    // Given: graphColours contains only valid entries
    withGraphColours(["#0085d9cc", "rgb(1, 2, 3)"]);

    // When: reading graphColours
    const config = getConfig();
    const result = config.graphColours();

    // Then: the configured colours are returned unchanged in input order
    expect(result).toEqual(["#0085d9cc", "rgb(1, 2, 3)"]);
  });

  it("returns an independent copy of the default colours on each fallback (TC-105)", () => {
    // Case: TC-105
    // Given: an empty configuration triggered the fallback and the returned array is mutated
    withGraphColours([]);
    const config = getConfig();
    const firstResult = config.graphColours();
    firstResult.push("#000000");

    // When: graphColours is read again
    const secondResult = config.graphColours();

    // Then: the second result is an unaffected 12-colour default array
    expect(secondResult).toHaveLength(DEFAULT_COLOUR_COUNT);
    expect(secondResult).not.toContain("#000000");
    expect(secondResult[0]).toBe(DEFAULT_FIRST_COLOUR);
    expect(secondResult[secondResult.length - 1]).toBe(DEFAULT_LAST_COLOUR);
  });
});

// S13: openNewTabEditorGroup() エディタグループ設定
describe("openNewTabEditorGroup", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  // TC-071: default (未設定) → ViewColumn.Active
  it("returns ViewColumn.Active by default when not configured", () => {
    // Given: no openNewTabEditorGroup setting configured
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    // When: reading openNewTabEditorGroup
    const config = getConfig();
    const result = config.openNewTabEditorGroup();
    // Then: returns ViewColumn.Active (-1)
    expect(result).toBe(-1);
  });

  // TC-072: "Active" → ViewColumn.Active
  it("returns ViewColumn.Active when set to 'Active'", () => {
    // Given: openNewTabEditorGroup set to "Active"
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "openNewTabEditorGroup" ? "Active" : defaultValue
    );
    // When: reading openNewTabEditorGroup
    const config = getConfig();
    const result = config.openNewTabEditorGroup();
    // Then: returns ViewColumn.Active (-1)
    expect(result).toBe(-1);
  });

  // TC-073: "Beside" → ViewColumn.Beside
  it("returns ViewColumn.Beside when set to 'Beside'", () => {
    // Given: openNewTabEditorGroup set to "Beside"
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "openNewTabEditorGroup" ? "Beside" : defaultValue
    );
    // When: reading openNewTabEditorGroup
    const config = getConfig();
    const result = config.openNewTabEditorGroup();
    // Then: returns ViewColumn.Beside (-2)
    expect(result).toBe(-2);
  });

  // TC-074: "One" → ViewColumn.One
  it("returns ViewColumn.One when set to 'One'", () => {
    // Given: openNewTabEditorGroup set to "One"
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "openNewTabEditorGroup" ? "One" : defaultValue
    );
    // When: reading openNewTabEditorGroup
    const config = getConfig();
    const result = config.openNewTabEditorGroup();
    // Then: returns ViewColumn.One (1)
    expect(result).toBe(1);
  });

  // TC-075: "Nine" → ViewColumn.Nine
  it("returns ViewColumn.Nine when set to 'Nine'", () => {
    // Given: openNewTabEditorGroup set to "Nine"
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "openNewTabEditorGroup" ? "Nine" : defaultValue
    );
    // When: reading openNewTabEditorGroup
    const config = getConfig();
    const result = config.openNewTabEditorGroup();
    // Then: returns ViewColumn.Nine (9)
    expect(result).toBe(9);
  });

  // TC-076: "InvalidValue" → ViewColumn.Active (フォールバック)
  it("returns ViewColumn.Active for invalid value (fallback)", () => {
    // Given: openNewTabEditorGroup set to an invalid value
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "openNewTabEditorGroup" ? "InvalidValue" : defaultValue
    );
    // When: reading openNewTabEditorGroup
    const config = getConfig();
    const result = config.openNewTabEditorGroup();
    // Then: falls back to ViewColumn.Active (-1)
    expect(result).toBe(-1);
  });
});

// S18: gitPath() git.path 設定の候補列正規化
// @see docs/testing/perspectives/src/config-test/04-feature-045-defensive-fixes-01.md
describe("gitPath", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  function withGitPath(value: unknown) {
    mockGet.mockImplementation((key: string, defaultValue: unknown) =>
      key === "path" ? value : defaultValue
    );
  }

  it("wraps a string git.path into a single-candidate list (TC-097)", () => {
    // Case: TC-097
    // Given: git.path configured to a single string path
    withGitPath("/usr/local/bin/git");

    // When: reading gitPath
    const config = getConfig();
    const result = config.gitPath();

    // Then: a one-element candidate list containing the configured path is returned
    expect(result).toEqual(["/usr/local/bin/git"]);
  });

  it("returns an array git.path in configured order (TC-098)", () => {
    // Case: TC-098
    // Given: git.path configured to an array of candidate paths
    withGitPath(["C:\\Git\\git.exe", "/usr/bin/git"]);

    // When: reading gitPath
    const config = getConfig();
    const result = config.gitPath();

    // Then: the candidates are returned in the exact input order
    expect(result).toEqual(["C:\\Git\\git.exe", "/usr/bin/git"]);
  });

  it("returns an empty candidate list when git.path is null (TC-099)", () => {
    // Case: TC-099
    // Given: git.path setting returns null (VS Code default behavior)
    withGitPath(null);

    // When: reading gitPath
    const config = getConfig();
    const result = config.gitPath();

    // Then: an empty array is returned (the final git fallback belongs to the resolver)
    expect(result).toEqual([]);
  });

  it("filters non-string elements from an array git.path while keeping order (TC-100)", () => {
    // Case: TC-100
    // Given: git.path configured to an array with non-string elements mixed in
    withGitPath(["/usr/bin/git", 42, null, {}]);

    // When: reading gitPath
    const config = getConfig();
    const result = config.gitPath();

    // Then: only the string elements remain in input order
    expect(result).toEqual(["/usr/bin/git"]);
  });
});
