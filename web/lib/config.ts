// Park config — the single schema behind /setup, /settings, and park-pass
// codes (shared with the extension as park-pass v1). All local, no accounts.
// NextDNS keys are stored separately (tg-nextdns-v1, slice 4) and NEVER
// appear in this object, so pass codes can't leak them.

export type ThemePreset = "cats" | "dogs" | "nature" | "funny" | "custom";

export interface ParkConfig {
  v: 1;
  sites: string[]; // bare lowercase domains
  dayPassMin: number;
  workPermit: { domain: string; min: number };
  strict: { dayPass: boolean; workPermit: boolean };
  theme: { preset: ThemePreset; terms?: string[] };
  /** Gates locked: editing settings first requires winning the gauntlet. */
  locked: boolean;
}

export const DEFAULT_CONFIG: ParkConfig = {
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

export const DAY_PASS_CHOICES = [1, 2, 5, 10] as const;
export const WORK_PERMIT_CHOICES = [15, 30, 45, 60] as const;
export const MAX_SITES = 30;
export const MAX_THEME_TERMS = 5;

const THEME_PRESETS: readonly ThemePreset[] = ["cats", "dogs", "nature", "funny", "custom"];
const KEY = "tg-config-v1";

/** "https://www.Facebook.com/feed" → "facebook.com". "" if not a domain. */
export function normalizeDomain(input: string): string {
  let s = input.trim().toLowerCase();
  if (!s) return "";
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").replace(/^www\./, "");
  s = s.split(/[/?#:@\s]/)[0];
  const label = "[a-z0-9]([a-z0-9-]*[a-z0-9])?";
  if (!new RegExp(`^${label}(\\.${label})+$`).test(s)) return "";
  return s;
}

function clampInt(n: unknown, lo: number, hi: number, fallback: number): number {
  const x = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.min(hi, Math.max(lo, x));
}

/**
 * Coerce anything (imported pass code, stale stored blob) into a valid
 * ParkConfig. Unknown fields dropped, bad values fall back to defaults.
 */
export function sanitizeConfig(raw: unknown): ParkConfig {
  const d = DEFAULT_CONFIG;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;

  let sites: string[] = Array.isArray(o.sites)
    ? [...new Set(o.sites.map((s: unknown) => normalizeDomain(String(s))).filter(Boolean))]
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
  let preset: ThemePreset = THEME_PRESETS.includes(themeRaw.preset)
    ? themeRaw.preset
    : d.theme.preset;
  let terms: string[] | undefined;
  if (preset === "custom") {
    const cleaned: string[] = Array.isArray(themeRaw.terms)
      ? themeRaw.terms
          .map((t: unknown) => String(t).trim().slice(0, 40))
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

/** null = never set up (park shows the onboarding CTA). */
export function loadConfig(): ParkConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? sanitizeConfig(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveConfig(cfg: ParkConfig): ParkConfig {
  const clean = sanitizeConfig(cfg);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(clean));
    } catch {
      /* storage blocked — config is best-effort until saved again */
    }
  }
  return clean;
}
