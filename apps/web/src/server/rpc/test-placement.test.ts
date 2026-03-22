import { describe, expect, it } from "@effect/vitest";

import { bunOnlyTestGlob, isBunOnlyTestFile, isPortableVitestFile } from "./test-placement";

describe("rpc test placement", () => {
  it("routes Bun-coupled suites to bun:test by filename", () => {
    expect(bunOnlyTestGlob).toBe("src/**/*.bun.test.ts");
    expect(
      isBunOnlyTestFile("src/server/rpc/handlers/interview.bun.test.ts"),
    ).toBe(true);
    expect(
      isPortableVitestFile("src/server/rpc/handlers/interview.bun.test.ts"),
    ).toBe(false);
  });

  it("keeps portable suites on Vitest by filename", () => {
    expect(
      isPortableVitestFile("src/server/rpc/handlers/actor.test.ts"),
    ).toBe(true);
    expect(
      isPortableVitestFile("src/components/venue-directory.test.tsx"),
    ).toBe(true);
    expect(
      isBunOnlyTestFile("src/server/rpc/handlers/actor.test.ts"),
    ).toBe(false);
  });
});
