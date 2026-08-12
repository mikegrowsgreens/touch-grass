import { describe, it, expect } from "vitest";
import { encodePass, decodePass } from "../parkpass";
import { DEFAULT_CONFIG, type ParkConfig } from "../config";

const custom: ParkConfig = {
  v: 1,
  sites: ["tiktok.com", "reddit.com"],
  dayPassMin: 5,
  workPermit: { domain: "reddit.com", min: 45 },
  strict: { dayPass: true, workPermit: true },
  theme: { preset: "custom", terms: ["capybara", "café dög ☕"] },
  locked: true,
};

describe("park-pass codec", () => {
  it("round-trips the default config", () => {
    expect(decodePass(encodePass(DEFAULT_CONFIG))).toEqual(DEFAULT_CONFIG);
  });

  it("round-trips a custom config incl. unicode theme terms", () => {
    expect(decodePass(encodePass(custom))).toEqual(custom);
  });

  it("produces a prefixed, URL-safe code", () => {
    const code = encodePass(custom);
    expect(code.startsWith("TGP1.")).toBe(true);
    expect(code.slice(5)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("accepts a code with the prefix stripped and with padding whitespace", () => {
    const code = encodePass(custom);
    expect(decodePass(`  ${code.slice(5)} \n`)).toEqual(custom);
  });

  it("rejects garbage, empty, and non-JSON codes", () => {
    expect(decodePass("")).toBeNull();
    expect(decodePass("not a pass!!")).toBeNull();
    expect(decodePass("TGP1.%%%")).toBeNull();
    expect(decodePass(btoa("plain text").replace(/=+$/, ""))).toBeNull();
  });

  it("rejects wrong-version and non-object payloads", () => {
    const enc = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, "");
    expect(decodePass(enc({ ...DEFAULT_CONFIG, v: 2 }))).toBeNull();
    expect(decodePass(enc([1, 2, 3]))).toBeNull();
    expect(decodePass(enc(42))).toBeNull();
  });

  it("sanitizes hostile payloads instead of trusting them", () => {
    const hostile = {
      v: 1,
      sites: ["  HTTPS://WWW.Facebook.com/feed ", "javascript:alert(1)", "x"],
      dayPassMin: 99999,
      workPermit: { domain: "evil.com", min: -5 },
      strict: { dayPass: "yes" },
      theme: { preset: "neon", terms: ["x"] },
      apiKey: "should-not-survive",
    };
    const code = btoa(JSON.stringify(hostile)).replace(/=+$/, "");
    const cfg = decodePass(code)!;
    expect(cfg.sites).toEqual(["facebook.com"]);
    expect(cfg.dayPassMin).toBe(60);
    expect(cfg.workPermit).toEqual({ domain: "facebook.com", min: 5 });
    expect(cfg.strict).toEqual(DEFAULT_CONFIG.strict);
    expect(cfg.theme).toEqual({ preset: "cats" });
    expect("apiKey" in cfg).toBe(false);
  });
});
