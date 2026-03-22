export {};

const pattern = "src/**/*.bun.test.ts";
const files: Array<string> = [];

for await (const file of new Bun.Glob(pattern).scan(".")) {
  files.push(file);
}

if (files.length === 0) {
  console.log(`No bun:test suites found under ${pattern}`);
  process.exit(0);
}

const command = Bun.spawn(["bun", "test", ...files], {
  cwd: process.cwd(),
  stderr: "inherit",
  stdout: "inherit",
});

const exitCode = await command.exited;

process.exit(exitCode);
