import { execFileSync } from "node:child_process";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";

import { SavedDiffFileSystem } from "../../src/savedDiffFileSystem";

const lifetime = vi.hoisted(() => ({ close: vi.fn(), emitter: vi.fn() }));

vi.mock("vscode", () => {
  const error = (code: string) => () => Object.assign(new Error(code), { code });
  return {
    Uri: {
      from: vi.fn(({ scheme, path }: { scheme: string; path: string }) => ({
        scheme,
        path,
        toString: () => `${scheme}:${path.split("/").map(encodeURIComponent).join("/")}`
      }))
    },
    FileSystemError: {
      FileNotFound: error("FileNotFound"),
      NoPermissions: error("NoPermissions"),
      FileNotADirectory: error("FileNotADirectory")
    },
    FileType: { File: 1 },
    Disposable: { from: () => ({ dispose() {} }) },
    EventEmitter: class {
      event = vi.fn();
      dispose = lifetime.emitter;
    },
    workspace: { onDidCloseTextDocument: vi.fn(() => ({ dispose: lifetime.close })) }
  };
});

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof fs>();
  return { ...actual, open: vi.fn(actual.open) };
});

// @see docs/testing/perspectives/src/savedDiffFileSystem-test.md (S1)
describe("saved working-tree documents", () => {
  let root: string;
  let repo: string;
  let provider: SavedDiffFileSystem;

  beforeEach(async () => {
    vi.clearAllMocks();
    root = await fs.mkdtemp(path.join(tmpdir(), "git-keizu-saved-"));
    repo = path.join(root, "repo");
    await fs.mkdir(repo);
    provider = new SavedDiffFileSystem();
  });

  afterEach(async () => {
    provider.dispose();
    vi.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });

  // Case: TC-001
  it("keeps independent exact bytes, filenames and stats across two opens", async () => {
    const file = "space 日本語 #%2F.txt";
    const original = Uint8Array.of(0, 255, 13, 10);
    const edited = Uint8Array.of(195, 169);
    await fs.writeFile(path.join(repo, file), original);
    const first = await provider.capture(repo, file, "M");
    const firstStat = provider.stat(first);
    provider.readFile(first).fill(1);

    await fs.writeFile(path.join(repo, file), edited);
    const second = await provider.capture(repo, file, "M");
    expect(first.toString()).not.toBe(second.toString());
    for (const [uri, bytes] of [
      [first, original],
      [second, edited]
    ] as const) {
      expect(uri.scheme).toBe("git-keizu-saved");
      expect(path.posix.basename(uri.path)).toBe(file);
      expect(provider.readFile(uri)).toEqual(bytes);
      expect(provider.stat(uri)).toEqual({
        type: vscode.FileType.File,
        size: bytes.length,
        ctime: expect.any(Number),
        mtime: expect.any(Number)
      });
    }
    expect(provider.stat(first)).toEqual(firstStat);
  });

  // Case: TC-002
  it("opens a deletion without a working tree and a present zero-byte file", async () => {
    const deleted = await provider.capture(path.join(root, "gone"), "old/deleted.txt", "D");
    expect(deleted.path.endsWith("/old/deleted.txt")).toBe(true);
    expect(fs.open).not.toHaveBeenCalled();
    await fs.writeFile(path.join(repo, "empty"), "");
    const empty = await provider.capture(repo, "empty", "A");
    for (const uri of [deleted, empty]) {
      expect(provider.readFile(uri)).toEqual(new Uint8Array());
      expect(provider.stat(uri).size).toBe(0);
    }
  });

  // Case: TC-003
  it("reads the new name and the literal text of existing and dangling links", async () => {
    await fs.writeFile(path.join(repo, "new"), "target bytes");
    const renamed = await provider.capture(repo, "new", "R");
    expect(renamed.path.endsWith("/new")).toBe(true);
    expect(provider.readFile(renamed)).toEqual(new TextEncoder().encode("target bytes"));
    await fs.symlink("new", path.join(repo, "link"), "file");
    const link = await provider.capture(repo, "link", "M");
    await fs.unlink(path.join(repo, "new"));
    const dangling = await provider.capture(repo, "link", "M");
    for (const uri of [link, dangling]) {
      expect(provider.readFile(uri)).toEqual(new TextEncoder().encode("new"));
    }
  });

  // Case: TC-004
  it("rejects malformed paths, missing entries, directories and outside parents", async () => {
    for (const invalid of [repo, "../outside", ".git/config", "nested/.GiT/config"]) {
      for (const type of ["M", "D"] as const) {
        await expect(provider.capture(repo, invalid, type)).rejects.toThrow(/repository-relative/);
      }
    }
    await expect(provider.capture(repo, "missing", "A")).rejects.toMatchObject({ code: "ENOENT" });
    await fs.mkdir(path.join(repo, "dir"));
    await expect(provider.capture(repo, "dir", "M")).rejects.toThrow(
      /regular file or symbolic link/
    );
    await fs.writeFile(path.join(root, "outside"), "outside");
    await fs.symlink(root, path.join(repo, "parent-link"), "dir");
    await expect(provider.capture(repo, "parent-link/outside", "R")).rejects.toThrow(/outside/);
    expect(vscode.Uri.from).not.toHaveBeenCalled();
  });

  // Case: TC-004
  it.skipIf(process.platform === "win32")("rejects a named pipe without opening it", async () => {
    execFileSync("mkfifo", [path.join(repo, "pipe")]);
    await expect(provider.capture(repo, "pipe", "M")).rejects.toThrow(
      /regular file or symbolic link/
    );
    expect(fs.open).not.toHaveBeenCalled();
    expect(vscode.Uri.from).not.toHaveBeenCalled();
  });

  // Case: TC-004
  it.each(["read failure", "replaced entry"])(
    "closes the file handle after a %s",
    async (fault) => {
      const filename = path.join(repo, "file");
      await fs.writeFile(filename, "original");
      const replacement = path.join(repo, "replacement");
      await fs.writeFile(replacement, "different");
      const handle = await fs.open(fault === "read failure" ? filename : replacement);
      const close = vi.spyOn(handle, "close");
      try {
        vi.mocked(fs.open).mockResolvedValueOnce(handle);
        const failure = Object.assign(new Error("cannot read"), { code: "EACCES" });
        if (fault === "read failure") vi.spyOn(handle, "readFile").mockRejectedValueOnce(failure);
        const capture = provider.capture(repo, "file", "M");
        if (fault === "read failure") await expect(capture).rejects.toBe(failure);
        else await expect(capture).rejects.toThrow(/changed while/);
        expect(close).toHaveBeenCalledOnce();
        expect(vscode.Uri.from).not.toHaveBeenCalled();
      } finally {
        await handle.close();
      }
    }
  );

  // Case: TC-005
  it("rejects unknown URIs and mutations, and exposes no directory entries", async () => {
    await fs.writeFile(path.join(repo, "file"), "saved");
    const known = await provider.capture(repo, "file", "M");
    const unknown = vscode.Uri.from({ scheme: known.scheme, path: path.join(repo, "file") });
    for (const query of [
      () => provider.stat(unknown),
      () => provider.readFile(unknown),
      () => provider.readDirectory(unknown)
    ]) {
      expect(query).toThrow(expect.objectContaining({ code: "FileNotFound" }));
    }
    expect(() => provider.readDirectory(known)).toThrow(
      expect.objectContaining({ code: "FileNotADirectory" })
    );
    for (const mutate of [
      () => provider.writeFile(known, Uint8Array.of(1), { create: false, overwrite: true }),
      () => provider.rename(known, unknown, { overwrite: true }),
      () => provider.delete(known, { recursive: false }),
      () => provider.createDirectory(known)
    ]) {
      expect(mutate).toThrow(expect.objectContaining({ code: "NoPermissions" }));
    }
    provider.watch(known, { recursive: false, excludes: [] }).dispose();
    expect(provider.readFile(known)).toEqual(new TextEncoder().encode("saved"));
  });

  // Case: TC-006
  it("releases only the closed or explicitly released URI", async () => {
    await fs.writeFile(path.join(repo, "file"), "saved");
    const first = await provider.capture(repo, "file", "M");
    const second = await provider.capture(repo, "file", "M");
    const [close] = vi.mocked(vscode.workspace.onDidCloseTextDocument).mock.calls[0];
    close({ uri: first } as vscode.TextDocument);
    provider.release(first);
    close({ uri: vscode.Uri.from({ scheme: "file", path: second.path }) } as vscode.TextDocument);
    expect(() => provider.readFile(first)).toThrow(
      expect.objectContaining({ code: "FileNotFound" })
    );
    expect(provider.readFile(second)).toEqual(new TextEncoder().encode("saved"));
    provider.release(second);
    expect(() => provider.stat(second)).toThrow(expect.objectContaining({ code: "FileNotFound" }));
  });

  // Case: TC-007
  it("disposes existing documents and prevents a pending read from issuing a URI", async () => {
    const first = await provider.capture(repo, "deleted", "D");
    const filename = path.join(repo, "file");
    await fs.writeFile(filename, "pending");
    const handle = await fs.open(filename);
    const entered = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();
    vi.mocked(fs.open).mockImplementationOnce(async () => {
      entered.resolve();
      await finish.promise;
      return handle;
    });
    const pending = provider.capture(repo, "file", "M");
    try {
      await entered.promise;
      provider.dispose();
      expect(lifetime.close).toHaveBeenCalledOnce();
      expect(lifetime.emitter).toHaveBeenCalledOnce();
      expect(() => provider.readFile(first)).toThrow(
        expect.objectContaining({ code: "FileNotFound" })
      );
      finish.resolve();
      await expect(pending).rejects.toThrow(/disposed/);
      await expect(provider.capture(repo, "deleted", "D")).rejects.toThrow(/disposed/);
      expect(vscode.Uri.from).toHaveBeenCalledOnce();
    } finally {
      finish.resolve();
      await handle.close();
    }
  });
});
