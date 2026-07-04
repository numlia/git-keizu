// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import type { GitFileChange } from "../../src/types";
import { generateGitFileListHtml, generateGitFileTreeHtml } from "../../web/fileTree";

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

  // S2: アクションアイコン（ファイルを開く）の条件付きレンダリング

  // TC-011: 変更ファイルにアクションアイコンが表示される
  it("renders open-file action icon for modified file (TC-011)", () => {
    // Given: a modified file (type "M")
    const files = [makeFile({ type: "M" })];

    // When: flat list HTML is generated
    const html = generateGitFileListHtml(files);
    const fragment = parseHtml(html);

    // Then: action icon with openFile class is present
    const actionIcon = fragment.querySelector(".gitFileAction.openFile");
    expect(actionIcon).not.toBeNull();
  });

  // TC-012: 追加ファイルにアクションアイコンが表示される
  it("renders open-file action icon for added file (TC-012)", () => {
    // Given: an added file (type "A")
    const files = [makeFile({ type: "A", additions: null, deletions: null })];

    // When: flat list HTML is generated
    const html = generateGitFileListHtml(files);
    const fragment = parseHtml(html);

    // Then: action icon with openFile class is present
    const actionIcon = fragment.querySelector(".gitFileAction.openFile");
    expect(actionIcon).not.toBeNull();
  });

  // TC-013: リネームファイルにアクションアイコンが表示される
  it("renders open-file action icon for renamed file (TC-013)", () => {
    // Given: a renamed file (type "R")
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

    // Then: action icon with openFile class is present
    const actionIcon = fragment.querySelector(".gitFileAction.openFile");
    expect(actionIcon).not.toBeNull();
  });

  // TC-014: 削除ファイルにはアクションアイコンが表示されない
  it("does not render open-file action icon for deleted file (TC-014)", () => {
    // Given: a deleted file (type "D")
    const files = [makeFile({ type: "D", additions: null, deletions: null })];

    // When: flat list HTML is generated
    const html = generateGitFileListHtml(files);
    const fragment = parseHtml(html);

    // Then: no action icon is present
    const actionIcon = fragment.querySelector(".gitFileAction.openFile");
    expect(actionIcon).toBeNull();
  });

  // TC-015: アイコンに codicon-go-to-file クラスが含まれる
  it("action icon contains codicon-go-to-file class (TC-015)", () => {
    // Given: a modified file (type "M")
    const files = [makeFile({ type: "M" })];

    // When: flat list HTML is generated
    const html = generateGitFileListHtml(files);
    const fragment = parseHtml(html);

    // Then: icon element contains codicon-go-to-file class
    const icon = fragment.querySelector(".codicon-go-to-file");
    expect(icon).not.toBeNull();
  });

  // TC-016: 混在ファイルタイプでアイコン数が非削除ファイル数と一致する
  it("renders action icons only for non-deleted files (TC-016)", () => {
    // Given: 4 files of types A, M, D, R
    const files: GitFileChange[] = [
      makeFile({ newFilePath: "a.ts", type: "A", additions: null, deletions: null }),
      makeFile({ newFilePath: "m.ts", type: "M" }),
      makeFile({ newFilePath: "d.ts", type: "D", additions: null, deletions: null }),
      makeFile({
        oldFilePath: "old.ts",
        newFilePath: "r.ts",
        type: "R",
        additions: 0,
        deletions: 0
      })
    ];

    // When: flat list HTML is generated
    const html = generateGitFileListHtml(files);
    const fragment = parseHtml(html);

    // Then: exactly 3 action icons (A, M, R — not D)
    const actionIcons = fragment.querySelectorAll(".gitFileAction.openFile");
    expect(actionIcons).toHaveLength(3);
  });
});

/* ------------------------------------------------------------------ */
/* S3: generateGitFileTreeHtml HTML escaping (fileTree-test.md)        */
/* ------------------------------------------------------------------ */

function makeFolder(name: string, contents: GitFolderContents = {}): GitFolder {
  return {
    type: "folder",
    name,
    folderPath: "folder",
    contents,
    open: true
  };
}

describe("generateGitFileTreeHtml", () => {
  it("escapes angle brackets and slashes in a folder name (TC-017)", () => {
    // Case: TC-017
    // Given: an opened folder whose name is a script-injection payload
    const folder = makeFolder("<script>alert(1)</script>");

    // When: the tree HTML is generated
    const html = generateGitFileTreeHtml(folder, []);

    // Then: the folder name is HTML-escaped and no raw <script> tag is emitted
    expect(html).toContain(
      '<span class="gitFolderName">&lt;script&gt;alert(1)&lt;&#x2F;script&gt;</span>'
    );
    expect(html).not.toContain("<script>");
  });

  it("escapes an ampersand in a folder name (TC-018)", () => {
    // Case: TC-018
    // Given: a folder name containing a raw ampersand
    const folder = makeFolder("a&b");

    // When: the tree HTML is generated
    const html = generateGitFileTreeHtml(folder, []);

    // Then: the ampersand is escaped and the raw "a&b" is not present
    expect(html).toContain('<span class="gitFolderName">a&amp;b</span>');
    expect(html).not.toContain("a&b");
  });

  it("escapes double and single quotes in a folder name (TC-019)", () => {
    // Case: TC-019
    // Given: a folder name containing double and single quotes
    const folder = makeFolder('say"hi" it\'s');

    // When: the tree HTML is generated
    const html = generateGitFileTreeHtml(folder, []);

    // Then: quotes are escaped and the raw quoted substrings are absent
    expect(html).toContain('<span class="gitFolderName">say&quot;hi&quot; it&#x27;s</span>');
    expect(html).not.toContain('say"hi"');
    expect(html).not.toContain("it's");
  });

  it("escapes a forward slash in a folder name (TC-020)", () => {
    // Case: TC-020
    // Given: a folder name that contains a forward slash
    const folder = makeFolder("a/b");

    // When: the tree HTML is generated
    const html = generateGitFileTreeHtml(folder, []);

    // Then: the slash is escaped to &#x2F; and the raw "a/b" is not present
    expect(html).toContain('<span class="gitFolderName">a&#x2F;b</span>');
    expect(html).not.toContain("a/b");
  });

  it("leaves a plain folder name unchanged (TC-021)", () => {
    // Case: TC-021
    // Given: a folder name with no special characters
    const folder = makeFolder("src");

    // When: the tree HTML is generated
    const html = generateGitFileTreeHtml(folder, []);

    // Then: the name is rendered as-is with no HTML entities
    expect(html).toContain('<span class="gitFolderName">src</span>');
    expect(html).not.toContain("&amp;");
    expect(html).not.toContain("&lt;");
  });

  it("renders no folder name span for the empty root folder (TC-022)", () => {
    // Case: TC-022
    // Given: the root folder with an empty name and no children
    const folder = makeFolder("");

    // When: the tree HTML is generated
    const html = generateGitFileTreeHtml(folder, []);

    // Then: neither the gitFolder wrapper nor the gitFolderName span is rendered
    expect(html).not.toContain('class="gitFolder"');
    expect(html).not.toContain("gitFolderName");
  });

  it("escapes an XSS payload in a file basename (TC-023)", () => {
    // Case: TC-023
    // Given: a root folder containing a file whose basename is an <img> payload
    const maliciousName = "<img src=x onerror=y>.ts";
    const folder = makeFolder("", {
      f: { type: "file", name: maliciousName, index: 0 }
    });
    const gitFiles = [
      makeFile({ oldFilePath: maliciousName, newFilePath: maliciousName, type: "M" })
    ];

    // When: the tree HTML is generated
    const html = generateGitFileTreeHtml(folder, gitFiles);

    // Then: the display name is escaped and no raw <img tag is emitted
    expect(html).toContain("&lt;img src=x onerror=y&gt;.ts");
    expect(html).not.toContain("<img");
  });

  it("leaves a plain file basename unchanged (TC-024)", () => {
    // Case: TC-024
    // Given: a root folder containing a file with a plain basename
    const folder = makeFolder("", {
      f: { type: "file", name: "main.ts", index: 0 }
    });
    const gitFiles = [makeFile({ oldFilePath: "main.ts", newFilePath: "main.ts", type: "M" })];

    // When: the tree HTML is generated
    const html = generateGitFileTreeHtml(folder, gitFiles);

    // Then: the basename is rendered as-is with no HTML entities
    expect(html).toContain("main.ts");
    expect(html).not.toContain("&lt;");
    expect(html).not.toContain("&amp;");
  });

  it("escapes a nested child folder name through recursion (TC-025)", () => {
    // Case: TC-025
    // Given: a parent folder containing a child folder with a special-character name
    const child = makeFolder("<b>&");
    const folder = makeFolder("parent", { child });

    // When: the tree HTML is generated
    const html = generateGitFileTreeHtml(folder, []);

    // Then: the recursively rendered child folder name is escaped
    expect(html).toContain('<span class="gitFolderName">&lt;b&gt;&amp;</span>');
    expect(html).not.toContain("<b>&");
  });
});
