// scripts/copy-openmoji-svgs.mjs — copy the OpenMoji BLACK svgs for base (non-skintone) emoji into public/.
// Mirrors the codegen style of scripts/gen-icons.mjs. Run via `npm run gen-stickers`.
import { mkdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const openmoji = require("openmoji/data/openmoji.json");
const __dirname = dirname(fileURLToPath(import.meta.url));

const SRC_DIR = resolve(__dirname, "../node_modules/openmoji/black/svg");
const OUT_DIR = resolve(__dirname, "../public/stickers/openmoji/black");

if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

let copied = 0;
const missing = [];
for (const e of openmoji) {
  if (e.skintone !== "") continue; // base emoji only
  const file = `${e.hexcode}.svg`;
  const from = resolve(SRC_DIR, file);
  if (!existsSync(from)) {
    missing.push(e.hexcode);
    continue;
  }
  copyFileSync(from, resolve(OUT_DIR, file));
  copied++;
}
console.log(`Copied ${copied} OpenMoji black svgs to ${OUT_DIR} (${missing.length} missing)`);
