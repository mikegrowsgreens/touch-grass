// Which phone is the visitor holding? Only used to pick the default tab on
// the setup guides — both tabs stay one tap away, so a wrong guess is cheap.

export type Platform = "android" | "ios" | "other";

export function detectPlatform(ua: string, maxTouchPoints = 0): Platform {
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  // iPadOS 13+ reports itself as a Mac; touch points give it away.
  if (/macintosh/i.test(ua) && maxTouchPoints > 1) return "ios";
  return "other";
}

/** Default guide tab: "other" (desktop) readers most often set up an iPhone or
 *  Android second-hand, so fall back to android — the native-settings path. */
export function defaultTab(p: Platform): "android" | "ios" {
  return p === "ios" ? "ios" : "android";
}
