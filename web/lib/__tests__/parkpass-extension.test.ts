// The extension ships a vanilla-JS port of the park-pass codec
// (extension/parkpass.js). Codes must round-trip between web and extension,
// so this parity suite fails if the two implementations ever drift.
import { describe, expect, it } from "vitest";
import * as ext from "../../../extension/parkpass.js";
import { DEFAULT_CONFIG, sanitizeConfig } from "../config";
import { decodePass, encodePass } from "../parkpass";

const MESSY_INPUTS: unknown[] = [
  DEFAULT_CONFIG,
  {},
  null,
  { v: 1, sites: ["https://WWW.Facebook.com/feed", "tiktok.com", "not a domain"] },
  { v: 1, sites: ["x.com"], dayPassMin: 999, workPermit: { domain: "y.com", min: -3 } },
  { v: 1, theme: { preset: "custom", terms: ["  capybara  ", "", "a".repeat(80)] } },
  { v: 1, theme: { preset: "custom", terms: [] } },
  { v: 1, strict: { dayPass: true, workPermit: false }, dayPassMin: 5 },
  { v: 1, sites: Array.from({ length: 30 }, (_, i) => `site${i}.com`) },
  { v: 1, locked: true },
  { v: 1, locked: "yes" }, // non-boolean must coerce to false identically
];

describe("extension parkpass parity", () => {
  it.each(MESSY_INPUTS.map((raw, i) => [i, raw] as const))(
    "sanitizeConfig agrees with web (case %#)",
    (_i, raw) => {
      expect(ext.sanitizeConfig(raw)).toEqual(sanitizeConfig(raw));
    }
  );

  it("encodes byte-identical codes", () => {
    for (const raw of MESSY_INPUTS) {
      expect(ext.encodePass(raw)).toBe(encodePass(sanitizeConfig(raw)));
    }
  });

  it("decodes web-encoded codes and vice versa", () => {
    const cfg = sanitizeConfig({
      v: 1,
      sites: ["tiktok.com", "reddit.com"],
      dayPassMin: 5,
      workPermit: { domain: "reddit.com", min: 45 },
      strict: { dayPass: true, workPermit: true },
      theme: { preset: "custom", terms: ["capybara"] },
    });
    expect(ext.decodePass(encodePass(cfg))).toEqual(cfg);
    expect(decodePass(ext.encodePass(cfg))).toEqual(cfg);
  });

  it("rejects garbage the same way", () => {
    for (const bad of ["", "TGP1.", "TGP1.!!!", "TGP2.abcd", "not a code"]) {
      expect(ext.decodePass(bad)).toBeNull();
      expect(decodePass(bad)).toBeNull();
    }
  });
});
