import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";

import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import type { Uri } from "vscode";

import type { DataSource } from "../../src/dataSource";
import { DiffDocProvider } from "../../src/diffDocProvider";
import { savedDiffDisplayBytes } from "../../src/savedDiffEncoding";

const host = vi.hoisted(() => ({
  appRoot: "",
  decode: vi.fn(() => {
    throw new Error("API proposal: textDocumentEncoding");
  }),
  configuration: vi.fn(),
  open: vi.fn<(uri: Uri) => Promise<{ languageId: string }>>()
}));
vi.mock("vscode", () => ({
  version: "1.99.3",
  env: host,
  EventEmitter: class {
    dispose() {}
  },
  workspace: {
    textDocuments: [],
    decode: host.decode,
    getConfiguration: host.configuration,
    getWorkspaceFolder: () => undefined,
    openTextDocument: host.open,
    onDidCloseTextDocument: () => ({ dispose() {} })
  }
}));

const bytes = Buffer.from("93fa967b8cea0a", "hex");
const source = {
  scheme: "file",
  path: "/project/sample-repo/data.txt",
  with(changes: Partial<Uri>) {
    return { ...this, ...changes };
  }
} as Uri;
const snapshot = { scheme: "git-keizu-saved", path: "/snapshot/data.txt" } as Uri;

function config(settings: Record<string, unknown>, languageIds: string[] = []) {
  return {
    get: (key: string, fallback: unknown) => settings[key] ?? fallback,
    inspect: () => ({ languageIds })
  };
}

beforeAll(async () => {
  host.appRoot = await fs.mkdtemp(path.join(tmpdir(), "keizu-encoding-host-"));
  const modules = path.join(host.appRoot, "node_modules");
  const codec = path.join(modules, "@vscode/iconv-lite-umd");
  const detector = path.join(modules, "jschardet/dist");
  await Promise.all([
    fs.mkdir(codec, { recursive: true }),
    fs.mkdir(detector, { recursive: true })
  ]);
  await Promise.all([
    fs.writeFile(
      path.join(codec, "index.js"),
      `
      exports.encodingExists = encoding => ["shiftjis", "utf8"].includes(encoding);
      exports.decode = (bytes, encoding) => new TextDecoder(encoding === "shiftjis" ? "shift_jis" : "utf-8").decode(bytes);`
    ),
    fs.writeFile(
      path.join(detector, "jschardet.min.js"),
      `
      exports.detect = (_bytes, options) => {
        const name = options.detectEncodings[0];
        if (["IBM1125", "ISO-8859-8"].includes(name)) throw new Error(\`Encoding \${name} is not supported. Supported encodings: UTF-8.\`);
        return { encoding: "UTF-8" };
      };`
    )
  ]);
});
afterAll(async () => {
  await fs.rm(host.appRoot, { recursive: true, force: true });
});
beforeEach(() => {
  vi.clearAllMocks();
});

// Case: TC-433
it.each(["cp1125", "iso88598"])(
  "uses the source encoding when the legacy detector rejects %s",
  async (id) => {
    host.configuration.mockImplementation((_section, scope) =>
      scope === source
        ? config({ encoding: "shiftjis", autoGuessEncoding: true, candidateGuessEncodings: [id] })
        : config({})
    );
    const display = await savedDiffDisplayBytes(bytes, source, snapshot);
    expect(display).toEqual(Buffer.from("\uFEFF日本語\n"));
    expect(new TextDecoder().decode(display)).toBe("日本語\n");
    expect(host.decode).not.toHaveBeenCalled();
    expect(host.open).not.toHaveBeenCalled();
  }
);

// Case: TC-433
it("resolves the closed source's path association without synchronizing the snapshot", async () => {
  host.configuration.mockImplementation((_section, scope) =>
    config(
      { encoding: scope.uri === source && scope.languageId === "json" ? "shiftjis" : "utf8" },
      ["json"]
    )
  );
  const getCommitFile = vi.fn();
  const documents = new DiffDocProvider({ getCommitFile } as unknown as DataSource);
  try {
    host.open.mockImplementation(async (uri) => {
      if (uri.scheme === snapshot.scheme) throw new Error("File is too large to synchronize");
      expect(uri.scheme).toBe(DiffDocProvider.scheme);
      expect(uri.path).toBe(source.path);
      expect(await documents.provideTextDocumentContent(uri)).toBe("");
      return { languageId: "json" };
    });
    const display = await savedDiffDisplayBytes(bytes, source, snapshot);
    expect(new TextDecoder().decode(display)).toBe("日本語\n");
    expect(host.open).toHaveBeenCalledOnce();
    expect(getCommitFile).not.toHaveBeenCalled();
  } finally {
    documents.dispose();
  }
});
