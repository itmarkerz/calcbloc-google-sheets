// Loads the built Apps Script files (dist/lib.js, then dist/Code.js) into one V8 context with the mocked services,
// the way Apps Script loads a project's files into one global scope. Returns the context, whose globals are the
// functions Sheets would call (CALCBLOC_NET, onOpen, sidebarInit, ...).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

export function loadBundle(globals) {
  const context = vm.createContext({ console, ...globals });
  for (const f of ["lib.js", "Code.js"]) vm.runInContext(readFileSync(join(DIST, f), "utf8"), context, { filename: f });
  return context;
}

export function manifest() {
  return JSON.parse(readFileSync(join(DIST, "appsscript.json"), "utf8"));
}
