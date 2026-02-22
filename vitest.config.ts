import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/web/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "web/**/*.ts"],
      exclude: ["src/types.ts", "web/global.d.ts"]
    }
  }
});
