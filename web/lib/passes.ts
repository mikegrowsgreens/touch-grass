// Pass ledger — every issued pass is written down (domain + when it must
// relock). The n8n ranger handles the scheduled relock; this ledger is the
// reopen fallback: next park visit, anything past its relockAt gets
// re-activated on NextDNS and crossed off. Local-only, like everything else.

import { setActive, type NextDnsCreds } from "./nextdns";

export interface PassEntry {
  domain: string;
  issuedAt: number; // ms epoch
  relockAt: number; // ms epoch
}

const KEY = "tg-passes-v1";
const MAX_ENTRIES = 50;

export function sanitizeLedger(raw: unknown): PassEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => ({
      domain: typeof e.domain === "string" ? e.domain : "",
      issuedAt: typeof e.issuedAt === "number" && Number.isFinite(e.issuedAt) ? e.issuedAt : 0,
      relockAt: typeof e.relockAt === "number" && Number.isFinite(e.relockAt) ? e.relockAt : 0,
    }))
    .filter((e) => e.domain && e.relockAt > 0)
    .slice(-MAX_ENTRIES);
}

export function loadLedger(): PassEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? sanitizeLedger(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveLedger(entries: PassEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(sanitizeLedger(entries)));
  } catch {
    /* storage blocked — n8n relock still fires */
  }
}

export function recordUnlock(domain: string, relockAt: number, now = Date.now()): void {
  // One live pass per domain — a new pass replaces any stale entry.
  const rest = loadLedger().filter((e) => e.domain !== domain);
  saveLedger([...rest, { domain, issuedAt: now, relockAt }]);
}

/** Pure split used by the reopen fallback (tested directly). */
export function splitExpired(
  entries: PassEntry[],
  now: number,
): { expired: PassEntry[]; live: PassEntry[] } {
  const expired: PassEntry[] = [];
  const live: PassEntry[] = [];
  for (const e of entries) (e.relockAt <= now ? expired : live).push(e);
  return { expired, live };
}

/**
 * Reopen fallback: relock every expired pass. Failures stay in the ledger
 * so the next visit retries them (NextDNS down ≠ free unlimited pass).
 * Returns the domains actually relocked.
 */
export async function reactivateExpired(
  creds: NextDnsCreds,
  now = Date.now(),
): Promise<string[]> {
  const { expired, live } = splitExpired(loadLedger(), now);
  if (expired.length === 0) return [];
  const relocked: string[] = [];
  const stillOwed: PassEntry[] = [];
  for (const e of expired) {
    try {
      await setActive(creds, e.domain, true);
      relocked.push(e.domain);
    } catch {
      stillOwed.push(e);
    }
  }
  saveLedger([...live, ...stillOwed]);
  return relocked;
}
