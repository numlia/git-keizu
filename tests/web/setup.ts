import { vi } from "vitest";

vi.stubGlobal(
  "acquireVsCodeApi",
  vi.fn(() => ({
    getState: vi.fn(() => null),
    postMessage: vi.fn(),
    setState: vi.fn()
  }))
);
