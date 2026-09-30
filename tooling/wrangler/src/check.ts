import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { checkConfig, fixConfig, parseJsonc } from "./policy.ts";

const root = join(import.meta.dirname, "../../..");
const fix = process.argv.includes("--fix");
const base = parseJsonc(readFileSync(join(import.meta.dirname, "../base.jsonc"), "utf8"), "base");

const packageDirs = ["apps", "packages"].flatMap((group) => {
  const dir = join(root, group);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(dir, entry.name));
});

let failures = 0;
let checked = 0;

for (const dir of packageDirs) {
  for (const other of ["wrangler.toml", "wrangler.json"]) {
    if (existsSync(join(dir, other))) {
      console.error(`✗ ${relative(root, join(dir, other))}: use wrangler.jsonc instead`);
      failures++;
    }
  }

  const file = join(dir, "wrangler.jsonc");
  if (!existsSync(file)) continue;
  checked++;

  const name = relative(root, file);
  if (fix) {
    const before = readFileSync(file, "utf8");
    const after = fixConfig(before, base);
    if (after !== before) {
      writeFileSync(file, after);
      console.log(`✎ ${name}`);
    }
  }

  const problems = checkConfig(parseJsonc(readFileSync(file, "utf8"), name), base);
  for (const problem of problems) console.error(`✗ ${name}: ${problem}`);
  if (problems.length === 0) console.log(`✓ ${name}`);
  failures += problems.length;
}

if (failures > 0) {
  console.error(
    `\n${failures} problem(s). Run \`pnpm fix:wrangler\` to apply tooling/wrangler/base.jsonc.`,
  );
  process.exit(1);
}
console.log(`\n${checked} Worker config(s) match tooling/wrangler/base.jsonc.`);
