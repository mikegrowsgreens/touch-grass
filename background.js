// Touch Grass — service worker
// Builds declarativeNetRequest redirect rules from the stored block list.
// Game wins temporarily lift rules (all sites, or LinkedIn only) via chrome.alarms.

const DEFAULT_BLOCKLIST = [
  "facebook.com",
  "instagram.com",
  "threads.net",
  "linkedin.com",
  "strava.com"
];

const RULE_ID_BASE = 1000;
const ALARM_RESUME_ALL = "resume-all";
const ALARM_RESUME_LINKEDIN = "resume-linkedin";

async function getState() {
  const s = await chrome.storage.local.get({
    blocklist: DEFAULT_BLOCKLIST,
    pauseAllUntil: 0,
    pauseLinkedinUntil: 0
  });
  return s;
}

function domainRule(domain, index) {
  return {
    id: RULE_ID_BASE + index,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        url: chrome.runtime.getURL("blocked.html") + "?site=" + encodeURIComponent(domain)
      }
    },
    condition: {
      requestDomains: [domain],
      resourceTypes: ["main_frame"]
    }
  };
}

// Rebuild all dynamic rules from storage, honoring active pauses.
// Serialized: concurrent triggers (onInstalled + storage.onChanged) would
// otherwise both see the same "existing" rules and add duplicate IDs.
let rebuildChain = Promise.resolve();
function rebuildRules() {
  rebuildChain = rebuildChain.then(doRebuild, doRebuild);
  return rebuildChain;
}

async function doRebuild() {
  const { blocklist, pauseAllUntil, pauseLinkedinUntil } = await getState();
  const now = Date.now();

  const active = blocklist.filter((d) => {
    if (pauseAllUntil > now) return false;
    if (pauseLinkedinUntil > now && d.includes("linkedin")) return false;
    return true;
  });

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules: active.map((d, i) => domainRule(d, i))
  });
}

async function pause(mode, minutes) {
  const until = Date.now() + minutes * 60 * 1000;
  if (mode === "linkedin") {
    await chrome.storage.local.set({ pauseLinkedinUntil: until });
    chrome.alarms.create(ALARM_RESUME_LINKEDIN, { when: until + 1000 });
  } else {
    await chrome.storage.local.set({ pauseAllUntil: until });
    chrome.alarms.create(ALARM_RESUME_ALL, { when: until + 1000 });
  }
  await rebuildRules();
}

chrome.runtime.onInstalled.addListener(async () => {
  const { blocklist } = await chrome.storage.local.get("blocklist");
  if (!blocklist) await chrome.storage.local.set({ blocklist: DEFAULT_BLOCKLIST });
  await rebuildRules();
});

chrome.runtime.onStartup.addListener(rebuildRules);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_RESUME_ALL) {
    await chrome.storage.local.set({ pauseAllUntil: 0 });
  } else if (alarm.name === ALARM_RESUME_LINKEDIN) {
    await chrome.storage.local.set({ pauseLinkedinUntil: 0 });
  } else {
    return;
  }
  await rebuildRules();
});

// Options page edits the blocklist → rebuild.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.blocklist) rebuildRules();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "pause") {
    pause(msg.mode, msg.minutes).then(() => sendResponse({ ok: true }));
    return true; // async response
  }
  if (msg && msg.type === "rebuild") {
    rebuildRules().then(() => sendResponse({ ok: true }));
    return true;
  }
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
