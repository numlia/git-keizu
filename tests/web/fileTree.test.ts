// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import type { GitFileChange } from "../../src/types";
import {
  type FileHistoryActionPredicate,
  generateGitFileListHtml,
  generateGitFileTree,
  generateGitFileTreeHtml
} from "../../web/fileTree";

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

const NO_FILE_HISTORY: FileHistoryActionPredicate = () => false;

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
    const html = generateGitFileListHtml(files, NO_FILE_HISTORY);
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
    const html = generateGitFileListHtml(files, NO_FILE_HISTORY);
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
    const html = generateGitFileListHtml(files, NO_FILE_HISTORY);
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
    const html = generateGitFileListHtml(files, NO_FILE_HISTORY);
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
    const html = generateGitFileListHtml(files, NO_FILE_HISTORY);
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
    const html = generateGitFileListHtml(files, NO_FILE_HISTORY);
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
    const html = generateGitFileListHtml(files, NO_FILE_HISTORY);
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
    const html = generateGitFileListHtml(files, NO_FILE_HISTORY);
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
    const html = generateGitFileListHtml(files, NO_FILE_HISTORY);
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
    const html = generateGitFileListHtml(files, NO_FILE_HISTORY);
    const fragment = parseHtml(html);

    // Then: exactly 1 list item is rendered
    const items = fragment.querySelectorAll("li");
    expect(items).toHaveLength(1);
    expect(items[0].classList.contains("gitFile")).toBe(true);
    expect(items[0].classList.contains("M")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* S5: buildFileItemHtml file history action (fileTree-test.md)        */
/* ------------------------------------------------------------------ */

const ALLOW: FileHistoryActionPredicate = () => true;
const DENY: FileHistoryActionPredicate = () => false;
const HIGHLIGHT_TITLE = "Highlight File History";

/** `A` / `D` / `M` / `R` rows under `src/deep/`, already in tree traversal order. */
function makeDeepFiles(): GitFileChange[] {
  return [
    makeFile({
      oldFilePath: "src/deep/a.ts",
      newFilePath: "src/deep/a.ts",
      type: "A",
      additions: null,
      deletions: null
    }),
    makeFile({
      oldFilePath: "src/deep/d.ts",
      newFilePath: "src/deep/d.ts",
      type: "D",
      additions: null,
      deletions: null
    }),
    makeFile({ oldFilePath: "src/deep/m.ts", newFilePath: "src/deep/m.ts", type: "M" }),
    makeFile({
      oldFilePath: "src/deep/old.ts",
      newFilePath: "src/deep/r.ts",
      type: "R",
      additions: 0,
      deletions: 0
    })
  ];
}

function actionsOf(fragment: ParentNode, newFilePath: string): Element | null {
  const row = fragment.querySelector(`li[data-newfilepath="${encodeURIComponent(newFilePath)}"]`);
  expect(row).not.toBeNull();
  return row!.querySelector(".gitFileActions");
}

// @see docs/testing/perspectives/web/fileTree-test.md
describe("buildFileItemHtml file history action (S5)", () => {
  it("renders openFile then highlightFileHistory for a modified row (TC-031)", () => {
    // Case: TC-031
    // Given: a list with one M row and an allowing predicate
    const files = [makeFile()];

    // When: the list HTML is generated
    const fragment = parseHtml(generateGitFileListHtml(files, ALLOW));

    // Then: .gitFileActions has exactly two children in the fixed order
    const actions = fragment.querySelector(".gitFileActions");
    expect(actions).not.toBeNull();
    expect(actions!.children).toHaveLength(2);
    expect(actions!.children[0].matches(".gitFileAction.openFile")).toBe(true);
    expect(actions!.children[1].matches(".gitFileAction.highlightFileHistory")).toBe(true);
  });

  it("renders the history icon with its title and codicon glyph (TC-032)", () => {
    // Case: TC-032
    // Given: a list with one M row and an allowing predicate
    const files = [makeFile()];

    // When: the list HTML is generated
    const fragment = parseHtml(generateGitFileListHtml(files, ALLOW));

    // Then: the history icon carries the title and wraps a .codicon-history element
    const icon = fragment.querySelector(".highlightFileHistory");
    expect(icon).not.toBeNull();
    expect(icon!.getAttribute("title")).toBe(HIGHLIGHT_TITLE);
    expect(icon!.querySelector(".codicon-history")).not.toBeNull();
  });

  it("renders only the history icon for a deleted row (TC-033)", () => {
    // Case: TC-033
    // Given: a list with one D row and an allowing predicate
    const files = [makeFile({ type: "D", additions: null, deletions: null })];

    // When: the list HTML is generated
    const fragment = parseHtml(generateGitFileListHtml(files, ALLOW));

    // Then: .gitFileActions exists with a single highlightFileHistory child and no openFile
    const actions = fragment.querySelector(".gitFileActions");
    expect(actions).not.toBeNull();
    expect(actions!.children).toHaveLength(1);
    expect(actions!.children[0].matches(".highlightFileHistory")).toBe(true);
    expect(actions!.querySelector(".openFile")).toBeNull();
  });

  it("renders both icons for added and renamed rows (TC-034)", () => {
    // Case: TC-034
    // Given: a list with an A row and an R row and an allowing predicate
    const files = [
      makeFile({ newFilePath: "src/a.ts", type: "A", additions: null, deletions: null }),
      makeFile({
        oldFilePath: "src/old.ts",
        newFilePath: "src/r.ts",
        type: "R",
        additions: 0,
        deletions: 0
      })
    ];

    // When: the list HTML is generated
    const fragment = parseHtml(generateGitFileListHtml(files, ALLOW));

    // Then: both rows have two children with the history icon second
    for (const path of ["src/a.ts", "src/r.ts"]) {
      const actions = actionsOf(fragment, path);
      expect(actions, path).not.toBeNull();
      expect(actions!.children, path).toHaveLength(2);
      expect(actions!.children[1].matches(".highlightFileHistory"), path).toBe(true);
    }
  });

  it("renders only openFile when the predicate denies a modified row (TC-035)", () => {
    // Case: TC-035
    // Given: a list with one M row and a denying predicate
    const files = [makeFile()];

    // When: the list HTML is generated
    const fragment = parseHtml(generateGitFileListHtml(files, DENY));

    // Then: openFile is present, the history icon is absent and .gitFileActions has one child
    expect(fragment.querySelector(".openFile")).not.toBeNull();
    expect(fragment.querySelector(".highlightFileHistory")).toBeNull();
    expect(fragment.querySelector(".gitFileActions")!.children).toHaveLength(1);
  });

  it("omits .gitFileActions when a deleted row has no action (TC-036)", () => {
    // Case: TC-036
    // Given: a list with one D row and a denying predicate
    const files = [makeFile({ type: "D", additions: null, deletions: null })];

    // When: the list HTML is generated
    const fragment = parseHtml(generateGitFileListHtml(files, DENY));

    // Then: no .gitFileActions wrapper is rendered at all
    expect(fragment.querySelector(".gitFileActions")).toBeNull();
  });

  it("renders four history icons and three openFile icons for mixed types (TC-037)", () => {
    // Case: TC-037
    // Given: a list with A / M / D / R rows and an allowing predicate
    const files = makeDeepFiles();

    // When: the list HTML is generated
    const fragment = parseHtml(generateGitFileListHtml(files, ALLOW));

    // Then: every row has a history icon and every non-D row has an openFile icon
    expect(fragment.querySelectorAll(".highlightFileHistory")).toHaveLength(4);
    expect(fragment.querySelectorAll(".openFile")).toHaveLength(3);
    expect(fragment.querySelectorAll(".codicon-go-to-file")).toHaveLength(3);
  });

  it("calls the predicate once per list row with that row's GitFileChange (TC-038)", () => {
    // Case: TC-038
    // Given: three rows already in sorted order and a spying predicate
    const files = [
      makeFile({ oldFilePath: "src/a.ts", newFilePath: "src/a.ts" }),
      makeFile({ oldFilePath: "src/b.ts", newFilePath: "src/b.ts" }),
      makeFile({ oldFilePath: "src/c.ts", newFilePath: "src/c.ts" })
    ];
    const predicate = vi.fn(() => true);

    // When: the list HTML is generated
    generateGitFileListHtml(files, predicate);

    // Then: three calls, each receiving the same GitFileChange reference as its row
    expect(predicate).toHaveBeenCalledTimes(3);
    for (let i = 0; i < files.length; i++) {
      expect(predicate.mock.calls[i][0]).toBe(files[i]);
    }
  });

  it("passes the predicate through tree recursion (TC-039)", () => {
    // Case: TC-039
    // Given: A / D / M / R rows under src/deep/ and a spying predicate
    const files = makeDeepFiles();
    const tree = generateGitFileTree(files);
    const predicate = vi.fn(() => true);

    // When: the tree HTML is generated
    const fragment = parseHtml(generateGitFileTreeHtml(tree, files, predicate));

    // Then: four history icons, three openFile icons and one predicate call per row
    expect(fragment.querySelectorAll(".highlightFileHistory")).toHaveLength(4);
    expect(fragment.querySelectorAll(".openFile")).toHaveLength(3);
    expect(predicate).toHaveBeenCalledTimes(4);
    for (let i = 0; i < files.length; i++) {
      expect(predicate.mock.calls[i][0]).toBe(files[i]);
    }
  });

  it("renders no history icon through tree recursion when denied (TC-040)", () => {
    // Case: TC-040
    // Given: the same src/deep/ rows and a denying predicate
    const files = makeDeepFiles();
    const tree = generateGitFileTree(files);

    // When: the tree HTML is generated
    const fragment = parseHtml(generateGitFileTreeHtml(tree, files, DENY));

    // Then: no history icon, three openFile icons and three .gitFileActions wrappers (D omitted)
    expect(fragment.querySelectorAll(".highlightFileHistory")).toHaveLength(0);
    expect(fragment.querySelectorAll(".openFile")).toHaveLength(3);
    expect(fragment.querySelectorAll(".gitFileActions")).toHaveLength(3);
  });

  it("renders identical .gitFileActions in list and tree views (TC-041)", () => {
    // Case: TC-041
    // Given: the same M and D rows for both views and an allowing predicate
    const files = [
      makeFile({ oldFilePath: "src/m.ts", newFilePath: "src/m.ts" }),
      makeFile({
        oldFilePath: "src/d.ts",
        newFilePath: "src/d.ts",
        type: "D",
        additions: null,
        deletions: null
      })
    ];

    // When: both views are generated
    const listFragment = parseHtml(generateGitFileListHtml(files, ALLOW));
    const treeFragment = parseHtml(
      generateGitFileTreeHtml(generateGitFileTree(files), files, ALLOW)
    );

    // Then: rows with the same data-newfilepath have the same .gitFileActions innerHTML
    for (const path of ["src/m.ts", "src/d.ts"]) {
      const listActions = actionsOf(listFragment, path);
      const treeActions = actionsOf(treeFragment, path);
      expect(listActions, path).not.toBeNull();
      expect(treeActions, path).not.toBeNull();
      expect(treeActions!.innerHTML, path).toBe(listActions!.innerHTML);
    }
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
    const html = generateGitFileTreeHtml(folder, [], NO_FILE_HISTORY);

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
    const html = generateGitFileTreeHtml(folder, [], NO_FILE_HISTORY);

    // Then: the ampersand is escaped and the raw "a&b" is not present
    expect(html).toContain('<span class="gitFolderName">a&amp;b</span>');
    expect(html).not.toContain("a&b");
  });

  it("escapes double and single quotes in a folder name (TC-019)", () => {
    // Case: TC-019
    // Given: a folder name containing double and single quotes
    const folder = makeFolder('say"hi" it\'s');

    // When: the tree HTML is generated
    const html = generateGitFileTreeHtml(folder, [], NO_FILE_HISTORY);

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
    const html = generateGitFileTreeHtml(folder, [], NO_FILE_HISTORY);

    // Then: the slash is escaped to &#x2F; and the raw "a/b" is not present
    expect(html).toContain('<span class="gitFolderName">a&#x2F;b</span>');
    expect(html).not.toContain("a/b");
  });

  it("leaves a plain folder name unchanged (TC-021)", () => {
    // Case: TC-021
    // Given: a folder name with no special characters
    const folder = makeFolder("src");

    // When: the tree HTML is generated
    const html = generateGitFileTreeHtml(folder, [], NO_FILE_HISTORY);

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
    const html = generateGitFileTreeHtml(folder, [], NO_FILE_HISTORY);

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
    const html = generateGitFileTreeHtml(folder, gitFiles, NO_FILE_HISTORY);

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
    const html = generateGitFileTreeHtml(folder, gitFiles, NO_FILE_HISTORY);

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
    const html = generateGitFileTreeHtml(folder, [], NO_FILE_HISTORY);

    // Then: the recursively rendered child folder name is escaped
    expect(html).toContain('<span class="gitFolderName">&lt;b&gt;&amp;</span>');
    expect(html).not.toContain("<b>&");
  });
});

/* ------------------------------------------------------------------ */
/* S4: generateGitFileTree file→folder replacement (fileTree-test.md)  */
/* ------------------------------------------------------------------ */

function asFolder(node: GitFolderOrFile): GitFolder {
  if (node.type !== "folder") {
    throw new Error(`expected folder, got ${node.type}`);
  }
  return node;
}

describe("generateGitFileTree", () => {
  it("creates a new folder node for an undefined intermediate segment (TC-026)", () => {
    // Case: TC-026
    // Given: a single file under a not-yet-seen folder
    const files = [makeFile({ newFilePath: "a/b", oldFilePath: "a/b" })];

    // When: the tree is generated
    const tree = generateGitFileTree(files);

    // Then: segment "a" is a new folder that the walk descends into
    const a = asFolder(tree.contents["a"]);
    expect(a.type).toBe("folder");
    expect(a.contents["b"].type).toBe("file");
  });

  it("reuses an existing folder node for a shared segment (TC-027)", () => {
    // Case: TC-027
    // Given: two files sharing the intermediate folder "a"
    const files = [
      makeFile({ newFilePath: "a/b", oldFilePath: "a/b" }),
      makeFile({ newFilePath: "a/c", oldFilePath: "a/c" })
    ];

    // When: the tree is generated
    const tree = generateGitFileTree(files);

    // Then: the existing folder is reused and both leaves are preserved
    const a = asFolder(tree.contents["a"]);
    expect(a.contents["b"].type).toBe("file");
    expect(a.contents["c"].type).toBe("file");
  });

  it("replaces a same-named file node with a folder node (TC-028)", () => {
    // Case: TC-028
    // Given: first a file "foo", then a file "foo/bar" needing foo as a directory
    const files = [
      makeFile({ newFilePath: "foo", oldFilePath: "foo" }),
      makeFile({ newFilePath: "foo/bar", oldFilePath: "foo/bar" })
    ];

    // When: the tree is generated
    const tree = generateGitFileTree(files);

    // Then: the "foo" file node is replaced by a folder node
    expect(tree.contents["foo"].type).toBe("folder");
  });

  it("adds the leaf under the replaced folder (TC-029)", () => {
    // Case: TC-029
    // Given: the file→folder replacement scenario
    const files = [
      makeFile({ newFilePath: "foo", oldFilePath: "foo" }),
      makeFile({ newFilePath: "foo/bar", oldFilePath: "foo/bar" })
    ];

    // When: the tree is generated
    const tree = generateGitFileTree(files);

    // Then: the leaf "bar" is registered under the replaced folder
    const foo = asFolder(tree.contents["foo"]);
    expect(foo.contents["bar"].type).toBe("file");
  });

  it("handles a name collision without throwing (TC-030)", () => {
    // Case: TC-030
    // Given: colliding entries foo (file) and foo/bar (file)
    const files = [
      makeFile({ newFilePath: "foo", oldFilePath: "foo" }),
      makeFile({ newFilePath: "foo/bar", oldFilePath: "foo/bar" })
    ];

    // When / Then: generation completes without throwing
    expect(() => generateGitFileTree(files)).not.toThrow();

    // Then: foo is a folder that contains bar
    const tree = generateGitFileTree(files);
    const foo = asFolder(tree.contents["foo"]);
    expect(foo.contents["bar"].type).toBe("file");
  });
});
