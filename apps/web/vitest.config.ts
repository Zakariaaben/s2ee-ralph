import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },

  test: {
    exclude: ["src/server/rpc/handlers/**/*.test.ts"],
    fileParallelism: false,
    hookTimeout: 60_000,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 60_000,
  },
});
