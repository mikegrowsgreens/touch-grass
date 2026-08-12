// Park-pass codes for the extension — vanilla ES-module port of the web
// app's lib/config.ts + lib/parkpass.ts. Same schema (park-pass v1), same
// TGP1. base64url encoding, so codes round-trip between web and extension.
// A vitest parity test in web/lib/__tests__/parkpass-extension.test.ts
// fails if the two implementations ever drift.
// NextDNS keys are never part of this object, so codes can't leak them.

export const DEFAULT_CONFIG = {
  v: 1,
  sites: [
    "facebook.com",
    "instagram.com",
    "threads.net",
    "linkedin.com",
    "strava.com",
  ],
  dayPassMin: 2,
  workPermit: { domain: "linkedin.com", min: 30 },
  strict: { dayPass: false, workPermit: true },
  theme: { preset: "cats" },
  locked: false,
};

export const MAX_SITES = 30;
export const MAX_THEME_TERMS = 5;

const THEME_PRESETS = ["cats", "dogs", "nature", "funny", "custom"];
const PREFIX = "TGP1.";

/** "https://www.Facebook.com/feed" → "facebook.com". "" if not a domain. */
export function normalizeDomain(input) {
  let s = String(input).trim().toLowerCase();
  if (!s) return "";
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").replace(/^www\./, "");
  s = s.split(/[/?#:@\s]/)[0];
  const label = "[a-z0-9]([a-z0-9-]*[a-z0-9])?";
  if (!new RegExp(`^${label}(\\.${label})+$`).test(s)) return "";
  return s;
}

function clampInt(n, lo, hi, fallback) {
  const x = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.min(hi, Math.max(lo, x));
}

/** Coerce anything into a valid park config. Mirrors web sanitizeConfig. */
export function sanitizeConfig(raw) {
  const d = DEFAULT_CONFIG;
  const o = raw && typeof raw === "object" ? raw : {};

  let sites = Array.isArray(o.sites)
    ? [...new Set(o.sites.map((s) => normalizeDomain(String(s))).filter(Boolean))]
    : [];
  if (sites.length === 0) sites = [...d.sites];
  sites = sites.slice(0, MAX_SITES);

  const wpRaw = o.workPermit && typeof o.workPermit === "object" ? o.workPermit : {};
  let wpDomain = normalizeDomain(String(wpRaw.domain ?? ""));
  if (!wpDomain || !sites.includes(wpDomain)) {
    wpDomain = sites.includes(d.workPermit.domain) ? d.workPermit.domain : sites[0];
  }

  const strictRaw = o.strict && typeof o.strict === "object" ? o.strict : {};

  const themeRaw = o.theme && typeof o.theme === "object" ? o.theme : {};
  let preset = THEME_PRESETS.includes(themeRaw.preset) ? themeRaw.preset : d.theme.preset;
  let terms;
  if (preset === "custom") {
    const cleaned = Array.isArray(themeRaw.terms)
      ? themeRaw.terms
          .map((t) => String(t).trim().slice(0, 40))
          .filter(Boolean)
          .slice(0, MAX_THEME_TERMS)
      : [];
    if (cleaned.length === 0) {
      preset = d.theme.preset; // custom with nothing to search = not a theme
    } else {
      terms = cleaned;
    }
  }

  return {
    v: 1,
    sites,
    dayPassMin: clampInt(o.dayPassMin, 1, 60, d.dayPassMin),
    workPermit: { domain: wpDomain, min: clampInt(wpRaw.min, 5, 120, d.workPermit.min) },
    strict: {
      dayPass: typeof strictRaw.dayPass === "boolean" ? strictRaw.dayPass : d.strict.dayPass,
      workPermit:
        typeof strictRaw.workPermit === "boolean" ? strictRaw.workPermit : d.strict.workPermit,
    },
    theme: terms ? { preset, terms } : { preset },
    locked: o.locked === true,
  };
}

export function encodePass(cfg) {
  const bytes = new TextEncoder().encode(JSON.stringify(sanitizeConfig(cfg)));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return PREFIX + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** null = not a valid pass (bad encoding, not JSON, or wrong version). */
export function decodePass(code) {
  const trimmed = String(code).trim();
  const body = trimmed.startsWith(PREFIX) ? trimmed.slice(PREFIX.length) : trimmed;
  if (!body || !/^[A-Za-z0-9_-]+$/.test(body)) return null;
  try {
    const b64 =
      body.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (body.length % 4)) % 4);
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.v !== 1) return null;
    return sanitizeConfig(parsed);
  } catch {
    return null;
  }
}
