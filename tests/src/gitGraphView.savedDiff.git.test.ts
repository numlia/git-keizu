import { execFileSync } from "node:child_process";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Uri } from "vscode";

import type { AvatarManager } from "../../src/avatarManager";
import { DataSource } from "../../src/dataSource";
import { decodeDiffDocUri, DiffDocProvider } from "../../src/diffDocProvider";
import type { ExtensionState } from "../../src/extensionState";
import { GitKeizuView } from "../../src/gitGraphView";
import type { RepoManager } from "../../src/repoManager";
import { SavedDiffFileSystem } from "../../src/savedDiffFileSystem";
import type { GitFileChange, RequestMessage, ResponseMessage } from "../../src/types";
import { UNCOMMITTED_CHANGES_HASH } from "../../src/types";

const editor = vi.hoisted(() => ({
  onMessage: vi.fn<(handler: (request: RequestMessage) => Promise<void>) => void>(),
  post: vi.fn<(message: ResponseMessage) => void>(),
  diff: vi.fn<
    (
      command: string,
      left: Uri,
      right: Uri,
      title: string,
      options: { preview: boolean }
    ) => Promise<void>
  >()
}));

vi.mock("vscode", () => ({
  Uri: {
    file: (fsPath: string) => ({ scheme: "file", fsPath, path: fsPath, toString: () => fsPath }),
    from: function from(parts: { scheme: string; path: string; query?: string }) {
      return {
        ...parts,
        with: (changes: Partial<typeof parts>) => from({ ...parts, ...changes }),
        toString: () => `${parts.scheme}:${parts.path}?${parts.query ?? ""}`
      };
    }
  },
  EventEmitter: class {
    event = vi.fn();
    dispose() {}
  },
  FileSystemError: {
    FileNotFound: () => Object.assign(new Error("File not found"), { code: "FileNotFound" })
  },
  ViewColumn: { One: 1 },
  env: { language: "en" },
  l10n: {
    t: (msg: string, ...args: string[]) => msg.replace(/\{(\d+)\}/g, (_, i) => args[Number(i)])
  },
  commands: { executeCommand: editor.diff },
  workspace: {
    getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback }),
    onDidCloseTextDocument: () => ({ dispose() {} }),
    onDidChangeConfiguration: vi.fn()
  },
  window: {
    createWebviewPanel: () => ({
      webview: {
        onDidReceiveMessage: editor.onMessage,
        postMessage: editor.post,
        asWebviewUri: (uri: Uri) => uri
      },
      onDidDispose: vi.fn(),
      onDidChangeViewState: vi.fn(),
      dispose: vi.fn()
    })
  }
}));

const STORY = "story.txt";
const SAVED = "C\nsecond line\n";
const OLD_NAME = "old.txt";
const NEW_NAME = "renamed.txt";
const COMMON = "retained first line\nretained second line\nretained third line\n";
const BEFORE_RENAME = `${COMMON}old tail\n`;
const AFTER_RENAME = `${COMMON}new tail\n`;
const WORKTREE = UNCOMMITTED_CHANGES_HASH;

// @see docs/testing/perspectives/src/gitGraphView-test/01-message-routing-02.md (S47)
describe("opening Git comparison rows through the graph", () => {
  let repo: string;
  let older: string;
  let tip: string;
  let commits: DiffDocProvider;
  let saved: SavedDiffFileSystem;

  function git(...args: string[]) {
    return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
  }
  function write(name: string, body: string | Buffer) {
    return fs.writeFile(path.join(repo, name), body);
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    repo = await fs.mkdtemp(path.join(tmpdir(), "git-keizu-comparison-"));
    git("init", "-b", "main");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Test User");
    git("config", "commit.gpgsign", "false");
    git("config", "core.autocrlf", "false");
    git("config", "core.symlinks", "true");
    await write(STORY, "A\n");
    await write(OLD_NAME, BEFORE_RENAME);
    await write("deleted.txt", "removed\n");
    await write("binary.bin", Buffer.from([0, 1]));
    await fs.mkdir(path.join(repo, "entry"));
    await write("entry/old.txt", "old child\n");
    await fs.symlink(OLD_NAME, path.join(repo, "link"), "file");
    git("add", ".");
    git("commit", "-m", "older");
    older = git("rev-parse", "HEAD");
    await write(STORY, "B\n");
    git("commit", "-am", "tip");
    tip = git("rev-parse", "HEAD");
    await write(STORY, SAVED);
    await write("added.txt", "index\n");
    git("add", "added.txt");
    git("rm", "-r", "entry");
    await write("entry", "replacement file\n");
    git("add", "entry");
    git("mv", OLD_NAME, NEW_NAME);
    await write(NEW_NAME, AFTER_RENAME);
    await fs.unlink(path.join(repo, "deleted.txt"));
    await fs.unlink(path.join(repo, "link"));
    await fs.symlink(NEW_NAME, path.join(repo, "link"), "file");
    await write("binary.bin", Buffer.from([0, 2]));
    await write("untracked.txt", "untracked\n");

    const data = new DataSource();
    commits = new DiffDocProvider(data);
    saved = new SavedDiffFileSystem();
    await GitKeizuView.createOrShow(
      process.cwd(),
      data,
      {
        getLastActiveRepo: () => repo,
        waitForAvatarStorage: async () => {}
      } as unknown as ExtensionState,
      { registerView() {}, deregisterView() {} } as unknown as AvatarManager,
      {
        getRepos: () => ({ [repo]: {} }),
        registerViewCallback() {},
        deregisterViewCallback() {}
      } as unknown as RepoManager,
      saved
    );
  });

  afterEach(async () => {
    GitKeizuView.currentPanel?.dispose();
    saved?.dispose();
    commits?.dispose();
    await fs.rm(repo, { recursive: true, force: true });
  });

  async function send(request: RequestMessage) {
    editor.post.mockClear();
    const [receive] = editor.onMessage.mock.calls[0];
    await receive(request);
    expect(editor.post).toHaveBeenCalledOnce();
    return editor.post.mock.calls[0][0];
  }

  async function compare(fromHash: string, toHash: string) {
    const requestId = "list";
    const response = await send({ command: "compareCommits", requestId, repo, fromHash, toHash });
    expect(response).toMatchObject({ command: "compareCommits", requestId, fromHash, toHash });
    if (response.command !== "compareCommits" || !response.fileChanges)
      throw new Error("Missing comparison rows");
    return response.fileChanges;
  }

  function rowNamed(rows: GitFileChange[], filename: string) {
    const row = rows.find((row) => row.newFilePath === filename);
    if (!row) throw new Error(`Missing Git row: ${filename}`);
    return row;
  }

  function view(row: GitFileChange, commitHash: string, compareWithHash?: string) {
    const { oldFilePath, newFilePath, type } = row;
    return send({
      command: "viewDiff",
      repo,
      commitHash,
      compareWithHash,
      oldFilePath,
      newFilePath,
      type
    });
  }

  async function open(row: GitFileChange, commitHash: string, compareWithHash?: string) {
    editor.diff.mockClear();
    expect(await view(row, commitHash, compareWithHash)).toEqual({
      command: "viewDiff",
      success: true
    });
    expect(editor.diff).toHaveBeenCalledOnce();
    const [command, left, right, title, options] = editor.diff.mock.calls[0];
    expect(command).toBe("vscode.diff");
    expect(options).toEqual({ preview: true });
    return { left, right, title };
  }

  // Case: TC-433
  it.each([
    ["older", "working tree first"],
    ["older", "commit first"],
    ["tip", "working tree first"],
    ["tip", "commit first"]
  ])("opens exact Git and saved contents for %s, %s", async (revision, order) => {
    const hash = revision === "older" ? older : tip;
    const rows = await compare(WORKTREE, hash);
    await write("added.txt", "disk\n");
    const expected = [
      [STORY, STORY, "M", 2, 1, revision === "older" ? "A\n" : "B\n", SAVED],
      ["added.txt", "added.txt", "A", 1, 0, "", "disk\n"],
      ["entry", "entry", "A", 1, 0, "", "replacement file\n"],
      ["deleted.txt", "deleted.txt", "D", 0, 1, "removed\n", ""],
      [OLD_NAME, NEW_NAME, "R", 1, 1, BEFORE_RENAME, AFTER_RENAME],
      ["link", "link", "M", 1, 1, OLD_NAME, NEW_NAME]
    ] as const;
    for (const [oldFilePath, newFilePath, type, additions, deletions, before, after] of expected) {
      const row = rowNamed(rows, newFilePath);
      expect(row).toEqual({ oldFilePath, newFilePath, type, additions, deletions });
      const [first, second] = order === "working tree first" ? [WORKTREE, hash] : [hash, WORKTREE];
      const { left, right, title } = await open(row, first, second);
      expect(title).toBe(`${newFilePath} (${hash.slice(0, 8)} ↔ Uncommitted)`);
      expect(left.scheme).toBe("git-keizu");
      expect(decodeDiffDocUri(left)).toEqual({ repo, filePath: oldFilePath, commit: hash });
      expect(right.scheme).toBe("git-keizu-saved");
      expect(right.path.endsWith(`/${newFilePath}`)).toBe(true);
      expect(await commits.provideTextDocumentContent(left)).toBe(before);
      expect(saved.readFile(right)).toEqual(new TextEncoder().encode(after));
    }
    for (const name of ["binary.bin", "untracked.txt"]) {
      expect(rowNamed(rows, name)).toMatchObject({ additions: null, deletions: null });
    }
  });

  // Case: TC-434
  it("keeps an open preview readable when a required file disappears or an editor rejects its URI", async () => {
    const rows = await compare(WORKTREE, tip);
    const story = rowNamed(rows, STORY);
    const kept = await open(story, WORKTREE, tip);
    editor.diff.mockClear();
    editor.diff.mockRejectedValueOnce(new Error("Cannot open diff"));
    expect(await view(story, WORKTREE, tip)).toEqual({ command: "viewDiff", success: false });
    expect(editor.diff).toHaveBeenCalledOnce();
    const rejected = editor.diff.mock.calls[0][2];
    expect(rejected.toString()).not.toBe(kept.right.toString());
    expect(() => saved.readFile(rejected)).toThrow(
      expect.objectContaining({ code: "FileNotFound" })
    );
    editor.diff.mockClear();
    for (const name of [STORY, "added.txt", NEW_NAME]) {
      await fs.unlink(path.join(repo, name));
      expect(await view(rowNamed(rows, name), WORKTREE, tip)).toEqual({
        command: "viewDiff",
        success: false
      });
      expect(editor.diff).not.toHaveBeenCalled();
    }
    expect(saved.readFile(kept.right)).toEqual(new TextEncoder().encode(SAVED));
  });

  // Case: TC-435
  it("compares A to B from Git and opens standalone B against the editable saved file", async () => {
    const capture = vi.spyOn(saved, "capture");
    const pairRow = rowNamed(await compare(older, tip), STORY);
    expect(pairRow).toMatchObject({ type: "M", additions: 1, deletions: 1 });
    const pair = await open(pairRow, older, tip);
    expect(pair.title).toBe(`${STORY} (${older.slice(0, 8)} ↔ ${tip.slice(0, 8)})`);
    expect([pair.left.scheme, pair.right.scheme]).toEqual(["git-keizu", "git-keizu"]);
    expect(await commits.provideTextDocumentContent(pair.left)).toBe("A\n");
    expect(await commits.provideTextDocumentContent(pair.right)).toBe("B\n");

    const details = await send({
      command: "commitDetails",
      repo,
      commitHash: WORKTREE,
      hasParents: false,
      isStash: false
    });
    if (details.command !== "commitDetails" || !details.commitDetails)
      throw new Error("Missing standalone details");
    const row = rowNamed(details.commitDetails.fileChanges, STORY);
    expect(row).toMatchObject({ type: "M", additions: 2, deletions: 1 });
    const standalone = await open(row, WORKTREE);
    expect(standalone.title).toBe(`${STORY} (Uncommitted - Modified)`);
    expect(standalone.left.scheme).toBe("git-keizu");
    expect(decodeDiffDocUri(standalone.left)).toEqual({ repo, filePath: STORY, commit: tip });
    expect(await commits.provideTextDocumentContent(standalone.left)).toBe("B\n");
    expect(standalone.right.scheme).toBe("file");
    expect(standalone.right.fsPath).toBe(path.join(repo, STORY));
    expect(await fs.readFile(standalone.right.fsPath, "utf8")).toBe(SAVED);
    expect(capture).not.toHaveBeenCalled();
  });
});
