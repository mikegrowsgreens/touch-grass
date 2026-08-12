import { describe, it, expect } from "vitest";
import { normalizeDomain, sanitizeConfig, DEFAULT_CONFIG } from "../config";

describe("normalizeDomain", () => {
  it.each([
    ["facebook.com", "facebook.com"],
    ["  HTTPS://WWW.Facebook.com/feed?x=1#y ", "facebook.com"],
    ["www.strava.com", "strava.com"],
    ["instagram.com:443", "instagram.com"],
    ["sub.domain.co.uk", "sub.domain.co.uk"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeDomain(input)).toBe(expected);
  });

  it.each(["", "   ", "x", "no spaces here", "javascript:alert(1)", "-bad.com", ".com", "localhost"])(
    "rejects %j",
    (input) => {
      expect(normalizeDomain(input)).toBe("");
    },
  );
});

describe("sanitizeConfig", () => {
  it("returns defaults for junk input", () => {
    expect(sanitizeConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(sanitizeConfig("hi")).toEqual(DEFAULT_CONFIG);
    expect(sanitizeConfig({})).toEqual(DEFAULT_CONFIG);
  });

  it("locked passes through as strict boolean only", () => {
    expect(sanitizeConfig({ v: 1, locked: true }).locked).toBe(true);
    expect(sanitizeConfig({ v: 1 }).locked).toBe(false);
    expect(sanitizeConfig({ v: 1, locked: "yes" }).locked).toBe(false);
    expect(sanitizeConfig({ v: 1, locked: 1 }).locked).toBe(false);
  });

  it("dedupes and normalizes sites, falls back to defaults when all invalid", () => {
    expect(sanitizeConfig({ v: 1, sites: ["a.com", "WWW.A.com", "b.org"] }).sites).toEqual([
      "a.com",
      "b.org",
    ]);
    expect(sanitizeConfig({ v: 1, sites: ["!!!", ""] }).sites).toEqual(DEFAULT_CONFIG.sites);
  });

  it("clamps durations to sane ranges", () => {
    const cfg = sanitizeConfig({
      v: 1,
      dayPassMin: 0.4,
      workPermit: { domain: "linkedin.com", min: 9999 },
    });
    expect(cfg.dayPassMin).toBe(1);
    expect(cfg.workPermit.min).toBe(120);
  });

  it("forces workPermit.domain to be one of the blocked sites", () => {
    const cfg = sanitizeConfig({ v: 1, sites: ["tiktok.com"], workPermit: { domain: "x.com" } });
    expect(cfg.workPermit.domain).toBe("tiktok.com");
  });

  it("keeps custom theme terms, drops empty ones, demotes empty custom to cats", () => {
    const kept = sanitizeConfig({
      v: 1,
      theme: { preset: "custom", terms: [" otters ", "", 42] },
    });
    expect(kept.theme).toEqual({ preset: "custom", terms: ["otters", "42"] });

    const demoted = sanitizeConfig({ v: 1, theme: { preset: "custom", terms: [] } });
    expect(demoted.theme).toEqual({ preset: "cats" });
  });

  it("strips theme terms from non-custom presets", () => {
    const cfg = sanitizeConfig({ v: 1, theme: { preset: "dogs", terms: ["cats"] } });
    expect(cfg.theme).toEqual({ preset: "dogs" });
  });
});
