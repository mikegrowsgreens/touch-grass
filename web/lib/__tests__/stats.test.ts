import { describe, it, expect } from "vitest";
import { streakDays, recordPass, recordVisit, type ParkStats } from "../stats";

const DAY = 86_400_000;

const base: ParkStats = {
  dodges: 3,
  msgIndex: 3,
  lastVisitDay: "2026-08-01",
  lastPassAt: 0,
  streakStart: 0,
};

describe("streakDays", () => {
  it("is 0 before any visit", () => {
    expect(streakDays(base)).toBe(0);
  });

  it("counts whole days since streak start", () => {
    const now = 10 * DAY;
    expect(streakDays({ ...base, streakStart: now - 3 * DAY }, now)).toBe(3);
    expect(streakDays({ ...base, streakStart: now - 3 * DAY + 1 }, now)).toBe(2);
  });
});

describe("ledger updates (SSR-safe: no window in test env)", () => {
  it("recordVisit bumps dodges and starts a streak", () => {
    const now = 5 * DAY;
    const s = recordVisit(now);
    expect(s.dodges).toBe(1);
    expect(s.streakStart).toBe(now);
    expect(s.lastVisitDay).toBe(new Date(now).toISOString().slice(0, 10));
  });

  it("recordPass resets the clean streak to now", () => {
    const now = 7 * DAY;
    const s = recordPass(now);
    expect(s.lastPassAt).toBe(now);
    expect(s.streakStart).toBe(now);
    expect(streakDays(s, now)).toBe(0);
  });
});
