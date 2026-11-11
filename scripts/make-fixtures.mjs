// Copies a few tax tables from the calcbloc-data repository into test/fixtures/tables (minified), so the tests
// and the offline demo run on the same JSON the API serves. Usage:
//   node scripts/make-fixtures.mjs [path-to-calcbloc-data]     (default: ../calcbloc-data)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = resolve(process.argv[2] ?? join(root, "..", "calcbloc-data"));
const FILES = [
  "us/2026.json",
  "us/2026/ca.json",
  "uk/2026-27.json",
  "uk/2026-27/scotland.json",
  "uk/2025-26.json",
  "canada/2026.json",
  "norway/2026.json",
  "austria/2026.json",
  "poland/2026.json",
  "france/2026.json",
];

for (const f of FILES) {
  const json = JSON.parse(readFileSync(join(data, "tables", f), "utf8"));
  const out = join(root, "test", "fixtures", "tables", f);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(json));
  console.log(`copied ${f} (${json.rows.length} rows)`);
}
