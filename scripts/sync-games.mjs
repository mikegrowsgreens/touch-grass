// Copies shared/games.js (the single source) into the two consumers:
//   extension/games/games.js — loaded by the extension's blocked.html
//   web/lib/vendor/games.js  — side-effect import in the web app
// Run from anywhere: node scripts/sync-games.mjs
import { copyFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "shared", "games.js");
const targets = [
  join(root, "extension", "games", "games.js"),
  join(root, "web", "lib", "vendor", "games.js"),
];

readFileSync(src); // fail loudly if the source is missing
for (const t of targets) {
  copyFileSync(src, t);
  console.log(`synced → ${t}`);
}
