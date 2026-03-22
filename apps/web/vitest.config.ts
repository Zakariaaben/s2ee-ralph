import { defineConfig } from "vitest/config";

import { bunOnlyTestGlob } from "./src/server/rpc/test-placement";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },

  test: {
    exclude: [bunOnlyTestGlob],
    fileParallelism: false,
    hookTimeout: 60_000,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 60_000,
  },
});
