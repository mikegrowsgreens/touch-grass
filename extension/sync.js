// Park sync — extension side. Mirrors web/lib/sync.ts against the same
// relay: push the pass code on every save, pull + adopt newer versions.
// Sync state lives in chrome.storage.local as { syncId, syncVersion }.

import { decodePass, encodePass, sanitizeConfig } from "./parkpass.js";

const SYNC_BASE = "https://touchgrass.mikegrowsgreens.com/api/sync/";
const ID = /^[a-z0-9]{20,40}$/;

export async function getSyncState() {
  const { syncId, syncVersion } = await chrome.storage.local.get({
    syncId: "",
    syncVersion: 0
  });
  return ID.test(syncId) ? { syncId, syncVersion } : null;
}

export async function setSyncId(id) {
  const trimmed = (id || "").trim().toLowerCase();
  if (!ID.test(trimmed)) return false;
  await chrome.storage.local.set({ syncId: trimmed, syncVersion: 0 });
  return true;
}

export async function clearSync() {
  await chrome.storage.local.remove(["syncId", "syncVersion"]);
}

/** Push cfg to the relay. Silent no-op when sync is off or offline. */
export async function pushConfig(cfg) {
  const state = await getSyncState();
  if (!state) return;
  try {
    const res = await fetch(SYNC_BASE + state.syncId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: encodePass(cfg) })
    });
    if (!res.ok) return;
    const { version } = await res.json();
    if (typeof version === "number") await chrome.storage.local.set({ syncVersion: version });
  } catch (_) {
    /* offline — next save pushes again */
  }
}

/**
 * Pull from the relay; adopt a newer remote config into storage (parkConfig
 * + blocklist mirror, stale gif cache dropped). Returns the applied config
 * or null when local is already current.
 */
export async function pullConfig() {
  const state = await getSyncState();
  if (!state) return null;
  try {
    const res = await fetch(SYNC_BASE + state.syncId);
    if (!res.ok) return null;
    const { code, version } = await res.json();
    if (typeof code !== "string" || typeof version !== "number") return null;
    if (version <= state.syncVersion) return null;
    const cfg = decodePass(code);
    if (!cfg) return null;
    const clean = sanitizeConfig(cfg);
    await chrome.storage.local.set({
      parkConfig: clean,
      blocklist: clean.sites, // background rebuilds rules on this change
      nextGif: "",
      syncVersion: version
    });
    return clean;
  } catch (_) {
    return null;
  }
}
