// Park sync — auto-push config on save, pull on open, across every device
// sharing one sync code. The relay stores park-pass codes only (no keys).
// Latest save wins: the relay stamps each push with a version; a device
// adopts the remote config only when that stamp is newer than what it
// last pushed or applied.

import { saveConfig, type ParkConfig } from "./config";
import { decodePass, encodePass } from "./parkpass";

const KEY = "tg-sync-v1";

export type SyncState = { id: string; lastVersion: number };

export function loadSyncState(): SyncState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: unknown; lastVersion?: unknown };
    if (typeof parsed.id !== "string" || !/^[a-z0-9]{20,40}$/.test(parsed.id)) return null;
    return {
      id: parsed.id,
      lastVersion: typeof parsed.lastVersion === "number" ? parsed.lastVersion : 0,
    };
  } catch {
    return null;
  }
}

function saveSyncState(state: SyncState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearSyncState(): void {
  localStorage.removeItem(KEY);
}

/** 26 lowercase base36 chars ≈ 134 bits — unguessable, copy-friendly. */
export function newSyncId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(26));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

/** Push cfg to the relay. Silent no-op when sync is off or the network is out. */
export async function pushConfig(cfg: ParkConfig): Promise<void> {
  const state = loadSyncState();
  if (!state) return;
  try {
    const res = await fetch(`/api/sync/${state.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: encodePass(cfg) }),
    });
    if (!res.ok) return;
    const { version } = (await res.json()) as { version?: number };
    if (typeof version === "number") saveSyncState({ ...state, lastVersion: version });
  } catch {
    /* offline — next save pushes again */
  }
}

/**
 * Pull from the relay and adopt a newer remote config.
 * Returns the applied config, or null when local is already current.
 */
export async function pullConfig(): Promise<ParkConfig | null> {
  const state = loadSyncState();
  if (!state) return null;
  try {
    const res = await fetch(`/api/sync/${state.id}`);
    if (!res.ok) return null;
    const { code, version } = (await res.json()) as { code?: string; version?: number };
    if (typeof code !== "string" || typeof version !== "number") return null;
    if (version <= state.lastVersion) return null;
    const cfg = decodePass(code);
    if (!cfg) return null;
    const clean = saveConfig(cfg);
    saveSyncState({ ...state, lastVersion: version });
    return clean;
  } catch {
    return null;
  }
}

/** Start a new sync group from this device's config. Returns the sync code. */
export async function createSync(cfg: ParkConfig): Promise<string> {
  const id = newSyncId();
  saveSyncState({ id, lastVersion: 0 });
  await pushConfig(cfg);
  return id;
}

/**
 * Join an existing sync group: adopt its config if the relay has one,
 * otherwise claim the id by pushing ours. Returns the config now in effect,
 * or null when the id is malformed.
 */
export async function joinSync(id: string, cfg: ParkConfig): Promise<ParkConfig | null> {
  const trimmed = id.trim().toLowerCase();
  if (!/^[a-z0-9]{20,40}$/.test(trimmed)) return null;
  saveSyncState({ id: trimmed, lastVersion: 0 });
  const applied = await pullConfig();
  if (applied) return applied;
  await pushConfig(cfg);
  return cfg;
}
