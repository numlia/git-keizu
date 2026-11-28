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
  version: "1.99.3",
  documents: [] as { uri: Uri; encoding: string }[],
  decode: vi.fn(() => {
    throw new Error("API proposal: textDocumentEncoding");
  }),
  configuration: vi.fn(),
  open: vi.fn<(uri: Uri) => Promise<{ languageId: string }>>()
}));
vi.mock("vscode", () => ({
  get version() {
    return host.version;
  },
  env: host,
  EventEmitter: class {
    dispose() {}
  },
  workspace: {
    textDocuments: host.documents,
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
      const labels = { shiftjis: "shift_jis", utf8: "utf-8", euckr: "euc-kr", windows1252: "windows-1252" };
      exports.encodingExists = encoding => encoding in labels || encoding === "utf16le";
      exports.decode = (bytes, encoding) => new TextDecoder(labels[encoding]).decode(bytes);
      exports.encode = (text, encoding) => Buffer.from(encoding === "euckr" ? text.replaceAll("한", "ÇÑ") : text, "latin1");
      exports.getDecoder = encoding => {
        if (encoding === "utf16le") return { write: bytes => bytes.toString("utf16le"), end: () => "" };
        const decoder = new TextDecoder(labels[encoding]);
        return { write: bytes => decoder.decode(bytes, { stream: true }), end: () => decoder.decode() };
      };`
    ),
    fs.writeFile(
      path.join(detector, "jschardet.min.js"),
      `
      exports.detect = (_bytes, options) => {
        const name = options.detectEncodings[0];
        if (["IBM1125", "ISO-8859-8"].includes(name)) throw new Error(\`Encoding \${name} is not supported. Supported encodings: UTF-8.\`);
        if (name === "EUC-KR" || name === "windows-1252") return { encoding: null };
        return { encoding: "UTF-8" };
      };`
    )
  ]);
});
afterAll(async () => {
  await fs.rm(host.appRoot, { recursive: true, force: true });
});
beforeEach(() => {
  host.version = "1.99.3";
  host.documents.length = 0;
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
it.each(["1.99.3", "1.107.1"])(
  "lets VS Code %s process events across character boundaries in a large file",
  async (version) => {
    host.version = version;
    host.configuration.mockImplementation((_section, scope) =>
      scope === source ? config({ encoding: "shiftjis" }) : config({})
    );
    const chunkBytes = 256 * 1024;
    const padding = Buffer.alloc(chunkBytes - 1, 0x61);
    const large = Buffer.concat([padding, bytes, Buffer.from([0x93])]);
    const hostEvent = vi.fn();
    setImmediate(hostEvent);
    const display = await savedDiffDisplayBytes(large, source, snapshot);
    expect(hostEvent).toHaveBeenCalledOnce();
    expect(display?.toString("utf8")).toBe(`\uFEFF${padding.toString()}日本語\n\uFFFD`);
  }
);

// Case: TC-433
it("retains a modern editor's selected encoding when decoding large saved content", async () => {
  host.version = "1.107.1";
  host.documents.push({ uri: source, encoding: "shiftjis" });
  host.configuration.mockReturnValue(config({ encoding: "utf8" }));
  const padding = Buffer.alloc(256 * 1024, 0x61);
  const display = await savedDiffDisplayBytes(Buffer.concat([bytes, padding]), source, snapshot);
  expect(display?.toString("utf8")).toBe(`\uFEFF日本語\n${padding.toString()}`);
});

// Case: TC-433
it("uses a successful encoding guess for large saved content in a modern editor", async () => {
  host.version = "1.107.1";
  host.configuration.mockImplementation((_section, scope) =>
    scope === source
      ? config({ encoding: "shiftjis", autoGuessEncoding: true, candidateGuessEncodings: ["utf8"] })
      : config({})
  );
  const text = `日本語\n${"a".repeat(256 * 1024)}`;
  const display = await savedDiffDisplayBytes(Buffer.from(text), source, snapshot);
  expect(display?.toString("utf8")).toBe(`\uFEFF${text}`);
});

// Case: TC-433
it.each([
  { version: "1.139.1", candidates: ["euckr"], expected: "��" },
  { version: "1.140.0", candidates: ["euckr"], expected: "한" },
  { version: "1.141.0", candidates: ["euckr", "windows1252"], expected: "��" }
])(
  "resolves an inconclusive guess on $version with $candidates",
  async ({ version, candidates, expected }) => {
    host.version = version;
    host.configuration.mockReturnValue(
      config({ autoGuessEncoding: true, candidateGuessEncodings: candidates })
    );
    const padding = Buffer.alloc(300_000, 0x61);
    const large = Buffer.concat([Buffer.from([0xc7, 0xd1]), padding]);
    const display = await savedDiffDisplayBytes(large, source, snapshot);
    expect(display?.toString("utf8")).toBe(`\uFEFF${expected}${padding.toString()}`);
  }
);

// Case: TC-433
it("keeps UTF-8 when the detection sample ends inside a valid character", async () => {
  host.version = "1.140.0";
  host.configuration.mockReturnValue(
    config({ autoGuessEncoding: true, candidateGuessEncodings: ["windows1252"] })
  );
  const text = `${"a".repeat(64 * 1024 - 1)}é${"a".repeat(256 * 1024)}`;
  const display = await savedDiffDisplayBytes(Buffer.from(text), source, snapshot);
  expect(display?.toString("utf8")).toBe(`\uFEFF${text}`);
});

// Case: TC-433
it("preserves a supplementary character split between decoder outputs", async () => {
  host.configuration.mockImplementation((_section, scope) =>
    scope === source ? config({ encoding: "utf16le" }) : config({})
  );
  const text = `${"䅂".repeat(128 * 1024 - 1)}🙂`;
  const display = await savedDiffDisplayBytes(Buffer.from(text, "utf16le"), source, snapshot);
  expect(display).toEqual(Buffer.from(`\uFEFF${text}`));
});

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
