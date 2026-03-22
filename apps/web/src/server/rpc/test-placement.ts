const portableTestFilePattern = /\.test\.(ts|tsx)$/;

export const bunOnlyTestGlob = "src/**/*.bun.test.ts";

export const isBunOnlyTestFile = (filePath: string) =>
  filePath.endsWith(".bun.test.ts");

export const isPortableVitestFile = (filePath: string) =>
  portableTestFilePattern.test(filePath) && !isBunOnlyTestFile(filePath);
