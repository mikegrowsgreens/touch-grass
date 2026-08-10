// shared/games.js is the single source; games/games.js (extension) and
// web/lib/vendor/games.js (web) are generated copies. If someone edits a
// copy — or edits the source and forgets `npm run sync:games` — fail here.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GAME_KEYS } from "../gauntlet";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const source = readFileSync(join(root, "shared", "games.js"), "utf8");

describe("games.js sync", () => {
  it.each([
    ["extension copy", join("games", "games.js")],
    ["web vendor copy", join("web", "lib", "vendor", "games.js")],
  ])("%s matches shared/games.js — run `npm run sync:games` if not", (_label, rel) => {
    expect(readFileSync(join(root, rel), "utf8")).toBe(source);
  });

  it("exposes every game the gauntlet expects", () => {
    for (const key of GAME_KEYS) {
      expect(source).toMatch(new RegExp(`\\b${key}:`));
    }
  });
});
