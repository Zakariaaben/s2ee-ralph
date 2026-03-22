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

for (const file of files) {
  const command = Bun.spawn(["bun", "test", "--timeout", "60000", file], {
    cwd: process.cwd(),
    stderr: "inherit",
    stdout: "inherit",
  });

  const exitCode = await command.exited;

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
