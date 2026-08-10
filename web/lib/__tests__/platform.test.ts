import { describe, expect, it } from "vitest";
import { defaultTab, detectPlatform } from "../platform";

const UA = {
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; SM-S921U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  ipadLegacy:
    "Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1",
  ipadOsAsMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  macDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  windows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

describe("detectPlatform", () => {
  it("spots Android", () => {
    expect(detectPlatform(UA.androidChrome)).toBe("android");
  });

  it("spots iPhone and legacy iPad", () => {
    expect(detectPlatform(UA.iphoneSafari)).toBe("ios");
    expect(detectPlatform(UA.ipadLegacy)).toBe("ios");
  });

  it("unmasks iPadOS pretending to be a Mac via touch points", () => {
    expect(detectPlatform(UA.ipadOsAsMac, 5)).toBe("ios");
    expect(detectPlatform(UA.macDesktop, 0)).toBe("other");
  });

  it("desktops are other", () => {
    expect(detectPlatform(UA.windows)).toBe("other");
    expect(detectPlatform("")).toBe("other");
  });
});

describe("defaultTab", () => {
  it("ios stays ios, everything else lands on android", () => {
    expect(defaultTab("ios")).toBe("ios");
    expect(defaultTab("android")).toBe("android");
    expect(defaultTab("other")).toBe("android");
  });
});
