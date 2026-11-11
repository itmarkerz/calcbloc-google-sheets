// Builds the Apps Script project into dist/ (the folder clasp pushes):
//   dist/lib.js         the TypeScript in src/, bundled into one global object (CalcBlocLib)
//   dist/Code.js        global wrappers with the custom-function help text (copied from apps-script/)
//   dist/Sidebar.html   the sidebar (copied)
//   dist/appsscript.json the manifest (copied)
import { build } from "esbuild";
import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

await build({
  entryPoints: [join(root, "src", "index.ts")],
  outfile: join(dist, "lib.js"),
  bundle: true,
  format: "iife",
  globalName: "CalcBlocLib",
  // Apps Script V8 runs ES2019 reliably; it has no module loader, hence one IIFE.
  target: "es2019",
  platform: "neutral",
  legalComments: "none",
  banner: { js: "// CalcBloc for Google Sheets. Built from src/ by scripts/build.mjs. MIT licence. Data by CalcBloc (calcbloc.com/data), CC BY 4.0." },
  logLevel: "warning",
});

for (const f of readdirSync(join(root, "apps-script"))) copyFileSync(join(root, "apps-script", f), join(dist, f));
console.log(`Built ${readdirSync(dist).join(", ")} in dist/`);
