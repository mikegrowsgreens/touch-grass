// Park management — blocklist + Giphy key, plus park-pass import/export.
// parkConfig (park-pass v1 schema, shared with the web app) is the source
// of truth; blocklist stays as a mirror of parkConfig.sites because
// background.js builds its rules from it (and rebuilds on its change).
import { decodePass, encodePass, normalizeDomain, sanitizeConfig } from "./parkpass.js";

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
  await chrome.storage.local.set({ parkConfig: clean, blocklist: clean.sites });
  chrome.runtime.sendMessage({ type: "rebuild" });
  return clean;
}

function flash(id) {
  const el = $(id);
  el.style.display = "inline";
  setTimeout(() => (el.style.display = "none"), 1800);
}

async function load() {
  const s = await chrome.storage.local.get(DEFAULTS);
  const cfg = await currentConfig();
  $("domains").value = cfg.sites.join("\n");
  $("giphyKey").value = s.giphyKey;

  const now = Date.now();
  const active = Object.entries(s.pauses)
    .filter(([, until]) => until > now)
    .map(([d, until]) => `${d} unlocked until ${new Date(until).toLocaleTimeString()}`);
  const pause = active.length ? ` · ${active.join(" · ")}` : "";
  $("stats").textContent = `Feeds dodged so far: ${s.blocksDodged}${pause}`;
}

$("save").addEventListener("click", async () => {
  const sites = $("domains")
    .value.split("\n")
    .map(normalizeDomain)
    .filter(Boolean);
  const giphyKey = $("giphyKey").value.trim();

  const cfg = await currentConfig();
  const clean = await saveConfig({ ...cfg, sites });
  await chrome.storage.local.set({ giphyKey });
  $("domains").value = clean.sites.join("\n");
  flash("saved");
});

$("passExport").addEventListener("click", async () => {
  const code = encodePass(await currentConfig());
  $("passCode").value = code;
  try {
    await navigator.clipboard.writeText(code);
    flash("passCopied");
  } catch {
    $("passCode").focus();
    $("passCode").select(); // clipboard blocked — leave it selected to copy by hand
  }
});

$("passImport").addEventListener("click", async () => {
  const cfg = decodePass($("passCode").value);
  const status = $("passStatus");
  if (!cfg) {
    status.textContent = "That code didn't scan. Codes start with TGP1.";
    status.className = "pass-status bad";
    return;
  }
  const clean = await saveConfig(cfg);
  $("domains").value = clean.sites.join("\n");
  status.textContent =
    `Pass accepted — ${clean.sites.length} closed area${clean.sites.length === 1 ? "" : "s"}, ` +
    `${clean.dayPassMin} min day passes, ${clean.workPermit.min} min work permit on ${clean.workPermit.domain}.`;
  status.className = "pass-status ok";
});

load();
