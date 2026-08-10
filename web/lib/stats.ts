// Visitor ledger — all local, no accounts. Guarded for SSR.

export interface ParkStats {
  dodges: number; // park visits (each one = a feed not scrolled)
  msgIndex: number; // rotating notice cursor
  lastVisitDay: string; // YYYY-MM-DD
  lastPassAt: number; // ms epoch of last issued pass, 0 = never
  streakStart: number; // ms epoch when current no-pass streak began
}

const KEY = "tg-stats-v1";

const DEFAULTS: ParkStats = {
  dodges: 0,
  msgIndex: 0,
  lastVisitDay: "",
  lastPassAt: 0,
  streakStart: 0,
};

export function loadStats(): ParkStats {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveStats(stats: ParkStats): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    /* storage full or blocked — stats are best-effort */
  }
}

/** Record a park visit; returns updated stats (already persisted). */
export function recordVisit(now = Date.now()): ParkStats {
  const stats = loadStats();
  stats.dodges += 1;
  stats.msgIndex += 1;
  stats.lastVisitDay = new Date(now).toISOString().slice(0, 10);
  if (stats.streakStart === 0) stats.streakStart = now;
  saveStats(stats);
  return stats;
}

/** Record that a pass was issued — resets the clean streak. */
export function recordPass(now = Date.now()): ParkStats {
  const stats = loadStats();
  stats.lastPassAt = now;
  stats.streakStart = now;
  saveStats(stats);
  return stats;
}

/** Whole days since the streak began. */
export function streakDays(stats: ParkStats, now = Date.now()): number {
  if (stats.streakStart === 0) return 0;
  return Math.floor((now - stats.streakStart) / 86_400_000);
}
