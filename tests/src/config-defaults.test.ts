import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

type ConfigInstance = ReturnType<typeof getConfig>;

// Read package.json to extract contributes.configuration.properties defaults
const packageJsonPath = resolve(process.cwd(), "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const configProperties = packageJson.contributes.configuration.properties;

const CONFIG_NAMESPACE = "git-keizu";

function getPackageDefault(key: string): unknown {
  return configProperties[`${CONFIG_NAMESPACE}.${key}`]?.default;
}

// S10-S12: Config fallback defaults vs package.json
describe("Config fallback defaults vs package.json", () => {
  beforeEach(() => {
    mockGet.mockReset();
    // Given: vscode.workspace.getConfiguration mock returns fallback values
    mockGet.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
  });

  // S10: Group 1 — simple value comparison (24 settings, TC-042 to TC-065)
  describe("Group 1: simple value comparison", () => {
    const settings: Array<[string, string, (c: ConfigInstance) => unknown]> = [
      ["TC-042", "dateFormat", (c) => c.dateFormat()],
      ["TC-043", "dateType", (c) => c.dateType()],
      ["TC-044", "fetchAvatars", (c) => c.fetchAvatars()],
      ["TC-045", "graphStyle", (c) => c.graphStyle()],
      ["TC-046", "initialLoadCommits", (c) => c.initialLoadCommits()],
      ["TC-047", "loadMoreCommits", (c) => c.loadMoreCommits()],
      ["TC-048", "loadMoreCommitsAutomatically", (c) => c.loadMoreCommitsAutomatically()],
      ["TC-049", "maxDepthOfRepoSearch", (c) => c.maxDepthOfRepoSearch()],
      ["TC-050", "showCurrentBranchByDefault", (c) => c.showCurrentBranchByDefault()],
      ["TC-051", "showStatusBarItem", (c) => c.showStatusBarItem()],
      ["TC-052", "showUncommittedChanges", (c) => c.showUncommittedChanges()],
      ["TC-053", "tabIconColourTheme", (c) => c.tabIconColourTheme()],
      [
        "TC-054",
        "sourceCodeProviderIntegrationLocation",
        (c) => c.sourceCodeProviderIntegrationLocation()
      ],
      ["TC-055", "repository.commits.order", (c) => c.commitOrdering()],
      ["TC-056", "repository.commits.mute.mergeCommits", (c) => c.muteCommitsMergeCommits()],
      [
        "TC-057",
        "repository.commits.mute.commitsThatAreNotAncestorsOfHead",
        (c) => c.muteCommitsNotAncestorsOfHead()
      ],
      ["TC-058", "dialog.merge.noFastForward", (c) => c.dialogDefaults().merge.noFastForward],
      ["TC-059", "dialog.merge.squashCommits", (c) => c.dialogDefaults().merge.squashCommits],
      ["TC-060", "dialog.merge.noCommit", (c) => c.dialogDefaults().merge.noCommit],
      [
        "TC-061",
        "dialog.cherryPick.recordOrigin",
        (c) => c.dialogDefaults().cherryPick.recordOrigin
      ],
      ["TC-062", "dialog.cherryPick.noCommit", (c) => c.dialogDefaults().cherryPick.noCommit],
      [
        "TC-063",
        "dialog.stashUncommittedChanges.includeUntracked",
        (c) => c.dialogDefaults().stashUncommittedChanges.includeUntracked
      ],
      [
        "TC-064",
        "dialog.createWorktree.openTerminal",
        (c) => c.dialogDefaults().createWorktree.openTerminal
      ],
      [
        "TC-065",
        "dialog.removeWorktree.deleteBranch",
        (c) => c.dialogDefaults().removeWorktree.deleteBranch
      ]
    ];

    it.each(settings)("%s: %s fallback matches package.json default", (_tcId, key, getValue) => {
      // Given: mock returns fallback values (configured in beforeEach)
      // When: reading the config value via fallback
      const config = getConfig();
      const actual = getValue(config);
      // Then: the fallback value matches the package.json default
      const expected = getPackageDefault(key);
      expect(actual).toEqual(expected);
    });
  });

  // S11: Group 2 — keybinding post-transform comparison (4 settings, TC-066 to TC-069)
  describe("Group 2: keybinding post-transform comparison", () => {
    const settings: Array<[string, string, (c: ConfigInstance) => string | null]> = [
      ["TC-066", "keyboardShortcutFind", (c) => c.keyboardShortcutFind()],
      ["TC-067", "keyboardShortcutRefresh", (c) => c.keyboardShortcutRefresh()],
      ["TC-068", "keyboardShortcutScrollToHead", (c) => c.keyboardShortcutScrollToHead()],
      ["TC-069", "keyboardShortcutScrollToStash", (c) => c.keyboardShortcutScrollToStash()]
    ];

    it.each(settings)(
      "%s: %s fallback (after parseKeybinding) matches package.json default",
      (_tcId, key, getValue) => {
        // Given: mock returns fallback values (configured in beforeEach)
        // When: reading the keybinding config value (parseKeybinding applied internally)
        const config = getConfig();
        const actual = getValue(config);
        // Then: the transformed fallback matches parseKeybinding applied to package.json default
        const pkgDefault = getPackageDefault(key) as string;
        const expected = parseKeybinding(pkgDefault, pkgDefault);
        expect(actual).toBe(expected);
      }
    );
  });

  // S12: Group 3 — graphColours filter comparison (TC-070)
  describe("Group 3: graphColours filter comparison", () => {
    // TC-070: graphColours fallback after filter matches package.json default
    it("TC-070: graphColours fallback (after filter) matches package.json default", () => {
      // Given: mock returns fallback values (configured in beforeEach)
      // When: reading graphColours via fallback (filter applied internally)
      const config = getConfig();
      const actual = config.graphColours();
      // Then: the filtered fallback array matches package.json default (all 12 colors pass filter)
      const expected = getPackageDefault("graphColours");
      expect(actual).toEqual(expected);
    });
  });

  // S13: Group 4 — openNewTabEditorGroup ViewColumn mapping comparison (TC-077)
  describe("Group 4: openNewTabEditorGroup ViewColumn mapping comparison", () => {
    const viewColumnMapping: Record<string, number> = {
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
    };

    // TC-077: openNewTabEditorGroup fallback (after ViewColumn mapping) matches package.json default
    it("TC-077: openNewTabEditorGroup fallback (after mapping) matches package.json default", () => {
      // Given: mock returns fallback values (configured in beforeEach)
      // When: reading openNewTabEditorGroup via fallback (VIEW_COLUMN_MAPPING applied internally)
      const config = getConfig();
      const actual = config.openNewTabEditorGroup();
      // Then: the mapped fallback matches VIEW_COLUMN_MAPPING applied to package.json default
      const pkgDefault = getPackageDefault("openNewTabEditorGroup") as string;
      const expected = viewColumnMapping[pkgDefault];
      expect(actual).toBe(expected);
    });
  });
});
