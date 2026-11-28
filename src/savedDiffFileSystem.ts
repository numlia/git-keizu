import { randomUUID } from "node:crypto";
import { type BigIntStats, constants } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import * as vscode from "vscode";

import type { GitFileChangeType } from "./types";

const WINDOWS = process.platform === "win32";
const READ_FLAGS = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0);
const STAT_OPTIONS = { bigint: true } as const;

function isGitDirectory(name: string): boolean {
  // HFS+ ignores these characters when looking up filenames.
  const component =
    process.platform === "darwin"
      ? name.replace(/[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/g, "")
      : name;
  return component.toLowerCase() === ".git" || (WINDOWS && /^git~1[ .]*$/i.test(component));
}

function validatePath(repo: string, filePath: string): void {
  const components = filePath.split("/");
  if (
    !path.isAbsolute(repo) ||
    path.isAbsolute(filePath) ||
    filePath.includes("\0") ||
    components.some(
      (part) => part === "" || part === "." || part === ".." || isGitDirectory(part)
    ) ||
    (WINDOWS && components.some((part) => /[\\:]|[. ]$/.test(part)))
  ) {
    throw new Error("Expected a repository-relative working-tree file path.");
  }
}

async function locateParent(repo: string, filePath: string) {
  const [root, parent] = await Promise.all([
    fs.realpath(repo),
    fs.realpath(path.dirname(path.join(repo, filePath)))
  ]);
  const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (
    parent !== root &&
    (!parent.startsWith(prefix) || parent.slice(prefix.length).split(path.sep).some(isGitDirectory))
  ) {
    throw new Error("The file's parent is outside the working tree.");
  }
  const [rootStat, parentStat] = await Promise.all([
    fs.stat(root, STAT_OPTIONS),
    fs.stat(parent, STAT_OPTIONS)
  ]);
  return { root, parent, rootStat, parentStat };
}

function sameEntry(first: BigIntStats, second: BigIntStats): boolean {
  return first.dev === second.dev && first.ino === second.ino;
}

function requireUnchanged(first: BigIntStats, second: BigIntStats): void {
  if (
    !sameEntry(first, second) ||
    first.mode !== second.mode ||
    first.ctimeNs !== second.ctimeNs ||
    first.mtimeNs !== second.mtimeNs ||
    first.size !== second.size
  ) {
    throw new Error("The file changed while its saved contents were being read.");
  }
}

async function readEntry(filename: string, entry: BigIntStats): Promise<Buffer> {
  if (entry.isSymbolicLink()) return await fs.readlink(filename, { encoding: "buffer" });
  if (!entry.isFile()) throw new Error("Expected a regular file or symbolic link.");

  // Nonblocking open also lets us reject a FIFO substituted after lstat without waiting for a writer.
  const handle = await fs.open(filename, READ_FLAGS);
  try {
    requireUnchanged(entry, await handle.stat(STAT_OPTIONS));
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

async function readSavedBytes(repo: string, filePath: string): Promise<Uint8Array> {
  const before = await locateParent(repo, filePath);
  const filename = path.join(before.parent, path.basename(filePath));
  const entry = await fs.lstat(filename, STAT_OPTIONS);
  const bytes = await readEntry(filename, entry);
  requireUnchanged(entry, await fs.lstat(filename, STAT_OPTIONS));
  const after = await locateParent(repo, filePath);
  if (
    before.root !== after.root ||
    before.parent !== after.parent ||
    !sameEntry(before.rootStat, after.rootStat) ||
    !sameEntry(before.parentStat, after.parentStat)
  ) {
    throw new Error("The repository or parent directory changed while reading the file.");
  }
  return bytes;
}

function denyWrite(uri: vscode.Uri): never {
  throw vscode.FileSystemError.NoPermissions(uri);
}

export class SavedDiffFileSystem implements vscode.FileSystemProvider, vscode.Disposable {
  public static readonly scheme = "git-keizu-saved";
  private readonly documents = new Map<string, { bytes: Uint8Array; created: number }>();
  private readonly changes = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  public readonly onDidChangeFile = this.changes.event;
  private readonly closeListener = vscode.workspace.onDidCloseTextDocument((doc) =>
    this.release(doc.uri)
  );
  private disposed = false;

  public async capture(
    repo: string,
    filePath: string,
    type: GitFileChangeType
  ): Promise<vscode.Uri> {
    this.requireActive();
    validatePath(repo, filePath);
    const bytes = type === "D" ? new Uint8Array() : await readSavedBytes(repo, filePath);
    this.requireActive();
    const uri = vscode.Uri.from({
      scheme: SavedDiffFileSystem.scheme,
      path: `/${randomUUID()}/${filePath}`
    });
    this.documents.set(uri.toString(), { bytes, created: Date.now() });
    return uri;
  }

  private requireActive(): void {
    if (this.disposed) throw new Error("The saved diff file system has been disposed.");
  }

  private getDocument(uri: vscode.Uri) {
    const document = this.documents.get(uri.toString());
    if (!document) throw vscode.FileSystemError.FileNotFound(uri);
    return document;
  }

  public readFile(uri: vscode.Uri): Uint8Array {
    return new Uint8Array(this.getDocument(uri).bytes);
  }

  public stat(uri: vscode.Uri): vscode.FileStat {
    const { bytes, created } = this.getDocument(uri);
    return { type: vscode.FileType.File, ctime: created, mtime: created, size: bytes.byteLength };
  }

  public readDirectory(uri: vscode.Uri): never {
    this.getDocument(uri);
    throw vscode.FileSystemError.FileNotADirectory(uri);
  }

  public readonly writeFile: vscode.FileSystemProvider["writeFile"] = denyWrite;
  public readonly rename: vscode.FileSystemProvider["rename"] = denyWrite;
  public readonly delete: vscode.FileSystemProvider["delete"] = denyWrite;
  public readonly createDirectory: vscode.FileSystemProvider["createDirectory"] = denyWrite;

  public readonly watch: vscode.FileSystemProvider["watch"] = () => vscode.Disposable.from();

  public release(uri: vscode.Uri): void {
    if (uri.scheme === SavedDiffFileSystem.scheme) this.documents.delete(uri.toString());
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.closeListener.dispose();
    this.changes.dispose();
    this.documents.clear();
  }
}
