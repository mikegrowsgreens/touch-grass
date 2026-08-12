// Ranger radio — NextDNS API client. Credentials live in their own
// localStorage key (tg-nextdns-v1), separate from ParkConfig, so park-pass
// codes can never carry them. All calls go through /api/nextdns (the API has
// no CORS); the key rides a request header and is never stored server-side.

export interface NextDnsCreds {
  apiKey: string;
  profileId: string;
}

export interface DenylistEntry {
  id: string; // the domain — NextDNS uses it as the entry id
  active: boolean;
}

const KEY = "tg-nextdns-v1";
export const KEY_HEADER = "x-nextdns-key";

/** Profile IDs are short alphanumerics (e.g. "ab12cd"). */
export function normalizeProfileId(input: string): string {
  const s = input.trim().toLowerCase();
  return /^[a-z0-9]{4,12}$/.test(s) ? s : "";
}

export function sanitizeCreds(raw: unknown): NextDnsCreds | null {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const apiKey = typeof o.apiKey === "string" ? o.apiKey.trim() : "";
  const profileId = normalizeProfileId(String(o.profileId ?? ""));
  if (!apiKey || apiKey.length > 200 || !profileId) return null;
  return { apiKey, profileId };
}

export function loadCreds(): NextDnsCreds | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? sanitizeCreds(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveCreds(creds: NextDnsCreds): NextDnsCreds | null {
  const clean = sanitizeCreds(creds);
  if (clean && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(clean));
    } catch {
      /* storage blocked — connection is best-effort until saved again */
    }
  }
  return clean;
}

export function clearCreds(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

async function call(
  creds: NextDnsCreds,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(`/api/nextdns/profiles/${creds.profileId}/${path}`, {
    method,
    headers: {
      [KEY_HEADER]: creds.apiKey,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  if (!res.ok) {
    const hint =
      res.status === 403 || res.status === 401
        ? "NextDNS rejected the API key"
        : res.status === 404
          ? "profile (or entry) not found"
          : `NextDNS error ${res.status}`;
    throw new Error(hint);
  }
  // NextDNS returns 204 with no body on writes.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function getDenylist(creds: NextDnsCreds): Promise<DenylistEntry[]> {
  const json = (await call(creds, "GET", "denylist")) as { data?: unknown } | null;
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({ id: String(r.id ?? ""), active: r.active !== false }))
    .filter((r) => r.id);
}

/** Also serves as the "test connection" call. */
export async function testConnection(creds: NextDnsCreds): Promise<DenylistEntry[]> {
  return getDenylist(creds);
}

/**
 * One-tap "build my denylist": add every configured site that isn't already
 * on the profile's denylist. Existing entries are left untouched (including
 * their active state — an in-flight pass isn't cancelled by a rebuild).
 */
export async function buildDenylist(
  creds: NextDnsCreds,
  sites: string[],
): Promise<{ added: string[]; existing: string[] }> {
  const current = await getDenylist(creds);
  const have = new Set(current.map((e) => e.id));
  const added: string[] = [];
  const existing: string[] = [];
  for (const site of sites) {
    if (have.has(site)) {
      existing.push(site);
      continue;
    }
    await call(creds, "POST", "denylist", { id: site, active: true });
    added.push(site);
  }
  return { added, existing };
}

/** Flip one denylist entry — active:false = pass issued, true = relocked. */
export async function setActive(
  creds: NextDnsCreds,
  domain: string,
  active: boolean,
): Promise<void> {
  await call(creds, "PATCH", `denylist/${encodeURIComponent(domain)}`, { active });
}

/**
 * Unlock for a pass, self-healing: when the domain was never pushed to the
 * denylist (added in the app after setup), the PATCH 404s — create the entry
 * unlocked instead. The relock later flips it active and the denylist has
 * quietly repaired itself.
 */
export async function unlockDomain(creds: NextDnsCreds, domain: string): Promise<void> {
  try {
    await setActive(creds, domain, false);
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes("not found")) throw e;
    await call(creds, "POST", "denylist", { id: domain, active: false });
  }
}

/**
 * Keep the profile's denylist in lockstep with the configured sites: add
 * what's missing, drop what's no longer configured. Existing entries keep
 * their active state (an in-flight pass survives a reconcile). Treats the
 * denylist as Touch-Grass-owned — hand-added entries for unconfigured
 * domains get removed.
 */
export async function reconcileDenylist(
  creds: NextDnsCreds,
  sites: string[],
): Promise<{ added: string[]; removed: string[] }> {
  const want = new Set(sites);
  const current = await getDenylist(creds);
  const have = new Set(current.map((e) => e.id));
  const added: string[] = [];
  const removed: string[] = [];
  for (const site of sites) {
    if (have.has(site)) continue;
    await call(creds, "POST", "denylist", { id: site, active: true });
    added.push(site);
  }
  for (const entry of current) {
    if (want.has(entry.id)) continue;
    await call(creds, "DELETE", `denylist/${encodeURIComponent(entry.id)}`);
    removed.push(entry.id);
  }
  return { added, removed };
}
