// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import type { GitFileChange } from "../../src/types";
import { generateGitFileListHtml } from "../../web/fileTree";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeFile(overrides: Partial<GitFileChange> = {}): GitFileChange {
  return {
    oldFilePath: "src/file.ts",
    newFilePath: "src/file.ts",
    type: "M",
    additions: 5,
    deletions: 2,
    ...overrides
  };
}

function parseHtml(html: string): DocumentFragment {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
}

/* ------------------------------------------------------------------ */
/* S1: generateGitFileListHtml (fileTree-test.md)                     */
/* ------------------------------------------------------------------ */

describe("generateGitFileListHtml", () => {
  it("renders files in alphabetical order by newFilePath (TC-001)", () => {
    // Given: 3 files (A, M, D) in non-alphabetical order
    const files: GitFileChange[] = [
      makeFile({
        newFilePath: "src/z.ts",
        oldFilePath: "src/z.ts",
        type: "D",
        additions: null,
        deletions: null
      }),
      makeFile({
        newFilePath: "src/a.ts",
        oldFilePath: "src/a.ts",
        type: "A",
        additions: null,
        deletions: null
      }),
      makeFile({ newFilePath: "src/m.ts", oldFilePath: "src/m.ts", type: "M" })
    ];

    // When: flat list HTML is generated
    const html = generateGitFileListHtml(files);
    const fragment = parseHtml(html);

    // Then: files are sorted alphabetically
    const items = fragment.querySelectorAll("li");
    expect(items).toHaveLength(3);
    expect(decodeURIComponent(items[0].dataset.newfilepath!)).toBe("src/a.ts");
    expect(decodeURIComponent(items[1].dataset.newfilepath!)).toBe("src/m.ts");
    expect(decodeURIComponent(items[2].dataset.newfilepath!)).toBe("src/z.ts");
  });

  it("applies type 'A' CSS class for added files (TC-002)", () => {
    // Given: a file with type A
    const files = [makeFile({ type: "A", additions: null, deletions: null })];

    // When: flat list HTML is generated
    const html = generateGitFileListHtml(files);
    const fragment = parseHtml(html);

    // Then: the li element has CSS class 'A'
    const item = fragment.querySelector("li")!;
    expect(item.classList.contains("gitFile")).toBe(true);
    expect(item.classList.contains("A")).toBe(true);
    expect(item.dataset.type).toBe("A");
  });

  it("applies type 'D' CSS class for deleted files (TC-003)", () => {
    // Given: a file with type D
    const files = [makeFile({ type: "D", additions: null, deletions: null })];

    // When: flat list HTML is generated
    const html = generateGitFileListHtml(files);
    const fragment = parseHtml(html);

    // Then: the li element has CSS class 'D'
    const item = fragment.querySelector("li")!;
    expect(item.classList.contains("D")).toBe(true);
    expect(item.dataset.type).toBe("D");
  });

  it("applies type 'M' CSS class for modified files (TC-004)", () => {
    // Given: a file with type M and diff data
    const files = [makeFile({ type: "M", additions: 3, deletions: 1 })];

    // When: flat list HTML is generated
    const html = generateGitFileListHtml(files);
    const fragment = parseHtml(html);

    // Then: the li element has CSS class 'M' and 'gitDiffPossible'
    const item = fragment.querySelector("li")!;
    expect(item.classList.contains("M")).toBe(true);
    expect(item.classList.contains("gitDiffPossible")).toBe(true);
    expect(item.dataset.type).toBe("M");
  });

  it("displays rename badge with old path tooltip for type R (TC-005)", () => {
    // Given: a renamed file
    const files = [
      makeFile({
        oldFilePath: "src/old.ts",
        newFilePath: "src/new.ts",
        type: "R",
        additions: 0,
        deletions: 0
      })
    ];

    // When: flat list HTML is generated
    const html = generateGitFileListHtml(files);
    const fragment = parseHtml(html);

    // Then: rename badge 'R' is displayed with tooltip containing old path
    const renameSpan = fragment.querySelector(".gitFileRename");
    expect(renameSpan).not.toBeNull();
    expect(renameSpan!.textContent).toBe("R");
    expect(renameSpan!.getAttribute("title")).toContain("old.ts");
    expect(renameSpan!.getAttribute("title")).toContain("new.ts");
  });

  it("returns empty list HTML for empty file array (TC-006)", () => {
    // Given: empty file change array
    const files: GitFileChange[] = [];

    // When: flat list HTML is generated
    const html = generateGitFileListHtml(files);
    const fragment = parseHtml(html);

    // Then: an empty <ul> is returned (no <li> elements, no error)
    const ul = fragment.querySelector("ul");
    expect(ul).not.toBeNull();
    expect(ul!.querySelectorAll("li")).toHaveLength(0);
  });

  it("applies gitFile CSS class to all file elements (TC-007)", () => {
    // Given: files of different types
    const files = [
      makeFile({ newFilePath: "a.ts", type: "A", additions: null, deletions: null }),
      makeFile({ newFilePath: "b.ts", type: "M" }),
      makeFile({ newFilePath: "c.ts", type: "D", additions: null, deletions: null })
    ];

    // When: flat list HTML is generated
    const html = generateGitFileListHtml(files);
    const fragment = parseHtml(html);

    // Then: every li has gitFile class + its type class
    const items = fragment.querySelectorAll("li");
    for (const item of items) {
      expect(item.classList.contains("gitFile")).toBe(true);
    }
  });

  it("sets data-oldfilepath, data-newfilepath, and data-type attributes (TC-008)", () => {
    // Given: a modified file with specific paths
    const files = [
      makeFile({
        oldFilePath: "src/old-path.ts",
        newFilePath: "src/new-path.ts",
        type: "R",
        additions: 1,
        deletions: 0
      })
    ];

    // When: flat list HTML is generated
    const html = generateGitFileListHtml(files);
    const fragment = parseHtml(html);

    // Then: data attributes are correctly set (URI-encoded)
    const item = fragment.querySelector("li")!;
    expect(decodeURIComponent(item.dataset.oldfilepath!)).toBe("src/old-path.ts");
    expect(decodeURIComponent(item.dataset.newfilepath!)).toBe("src/new-path.ts");
    expect(item.dataset.type).toBe("R");
  });

  it("displays additions/deletions counter for modified files (TC-009)", () => {
    // Given: a modified file with additions and deletions
    const files = [makeFile({ type: "M", additions: 10, deletions: 3 })];

    // When: flat list HTML is generated
    const html = generateGitFileListHtml(files);
    const fragment = parseHtml(html);

    // Then: additions and deletions counters are displayed
    const addSpan = fragment.querySelector(".gitFileAdditions");
    const delSpan = fragment.querySelector(".gitFileDeletions");
    expect(addSpan).not.toBeNull();
    expect(addSpan!.textContent).toBe("+10");
    expect(delSpan).not.toBeNull();
    expect(delSpan!.textContent).toBe("-3");
  });

  it("renders a single file correctly (TC-010)", () => {
    // Given: exactly 1 file change
    const files = [makeFile({ newFilePath: "index.ts", oldFilePath: "index.ts", type: "M" })];

    // When: flat list HTML is generated
    const html = generateGitFileListHtml(files);
    const fragment = parseHtml(html);

    // Then: exactly 1 list item is rendered
    const items = fragment.querySelectorAll("li");
    expect(items).toHaveLength(1);
    expect(items[0].classList.contains("gitFile")).toBe(true);
    expect(items[0].classList.contains("M")).toBe(true);
  });
});
