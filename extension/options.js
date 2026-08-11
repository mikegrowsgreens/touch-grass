// Park management — blocklist + Giphy key, plus Park sync linking.
// parkConfig (park-pass v1 schema, shared with the web app) is the source
// of truth; blocklist stays as a mirror of parkConfig.sites because
// background.js builds its rules from it (and rebuilds on its change).
import { normalizeDomain, sanitizeConfig } from "./parkpass.js";
import { clearSync, getSyncState, pullConfig, pushConfig, setSyncId } from "./sync.js";

const DEFAULTS = {
  blocklist: ["facebook.com", "instagram.com", "threads.net", "linkedin.com", "strava.com"],
  parkConfig: null,
  giphyKey: "",
  blocksDodged: 0,
  pauses: {}
};

const $ = (id) => document.getElementById(id);

async function currentConfig() {
  const s = await chrome.storage.local.get(DEFAULTS);
  // Pre-park-pass installs have only a blocklist — adopt it into the schema.
  return sanitizeConfig(s.parkConfig ?? { sites: s.blocklist });
}

async function saveConfig(cfg) {
  const clean = sanitizeConfig(cfg);
  // nextGif was prefetched under the OLD theme — drop it so the next
  // blocked page live-loads the new one instead of lagging a visit behind.
  await chrome.storage.local.set({ parkConfig: clean, blocklist: clean.sites, nextGif: "" });
  chrome.runtime.sendMessage({ type: "rebuild" });
  return clean;
}

function flash(id) {
  const el = $(id);
  el.style.display = "inline";
  setTimeout(() => (el.style.display = "none"), 1800);
}

async function load() {
  // Adopt newer synced settings before painting the form.
  await pullConfig();
  const s = await chrome.storage.local.get(DEFAULTS);
  const cfg = await currentConfig();
  const sync = await getSyncState();
  $("syncCode").value = sync?.syncId ?? "";
  $("syncStatus").textContent = sync ? "Following the shared park settings." : "";
  $("syncStatus").className = "pass-status ok";
  $("domains").value = cfg.sites.join("\n");
  $("giphyKey").value = s.giphyKey;

  const now = Date.now();
  const active = Object.entries(s.pauses)
    .filter(([, until]) => until > now)
    .map(([d, until]) => `${d} unlocked until ${new Date(until).toLocaleTimeString()}`);
  const pause = active.length ? ` · ${active.join(" · ")}` : "";
  const theme =
    cfg.theme.preset === "custom"
      ? `custom (${(cfg.theme.terms ?? []).join(", ")})`
      : cfg.theme.preset;
  $("stats").textContent = `Feeds dodged so far: ${s.blocksDodged} · trail cam: ${theme}${pause}`;
}

// Key persists as soon as it's pasted — losing it to a missed Save click
// (or a closed tab) means re-hunting it from notes.
let keyTimer;
$("giphyKey").addEventListener("input", () => {
  clearTimeout(keyTimer);
  keyTimer = setTimeout(
    () => chrome.storage.local.set({ giphyKey: $("giphyKey").value.trim() }),
    400
  );
});

$("save").addEventListener("click", async () => {
  const sites = $("domains")
    .value.split("\n")
    .map(normalizeDomain)
    .filter(Boolean);
  const giphyKey = $("giphyKey").value.trim();

  const cfg = await currentConfig();
  const clean = await saveConfig({ ...cfg, sites });
  await chrome.storage.local.set({ giphyKey });
  await pushConfig(clean);
  $("domains").value = clean.sites.join("\n");
  flash("saved");
});

$("syncLink").addEventListener("click", async () => {
  const status = $("syncStatus");
  if (!(await setSyncId($("syncCode").value))) {
    status.textContent = "That doesn't look like a sync code (26 letters/numbers).";
    status.className = "pass-status bad";
    return;
  }
  const applied = await pullConfig();
  if (!applied) await pushConfig(await currentConfig()); // empty frequency — claim it
  await load();
  status.textContent = applied
    ? "Linked — adopted the shared park settings."
    : "Linked — this park's settings now lead.";
  status.className = "pass-status ok";
  flash("syncSaved");
});

$("syncUnlink").addEventListener("click", async () => {
  await clearSync();
  $("syncCode").value = "";
  $("syncStatus").textContent = "Unlinked — back to manual pass codes.";
  $("syncStatus").className = "pass-status ok";
});

load();
