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

/** Default guide tab straight from the platform — desktop readers land on the
 *  computer guide (guides without one clamp to android themselves). */
export function defaultTab(p: Platform): "android" | "ios" | "computer" {
  if (p === "ios") return "ios";
  if (p === "android") return "android";
  return "computer";
}
