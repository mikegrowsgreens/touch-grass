// Touch Grass — service worker
// Builds declarativeNetRequest redirect rules from the stored block list.
// Winning the game gauntlet lifts the rule for ONE domain, briefly.

import { pullConfig } from "./sync.js";

const SYNC_ALARM = "sync-pull";

const DEFAULT_BLOCKLIST = [
  "facebook.com",
  "instagram.com",
  "threads.net",
  "linkedin.com",
  "strava.com"
];

const RULE_ID_BASE = 1000;
const ALARM_PREFIX = "resume:";

async function getState() {
  const s = await chrome.storage.local.get({
    blocklist: DEFAULT_BLOCKLIST,
    pauses: {} // { domain: unblockedUntilMs }
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

// Rebuild all dynamic rules from storage, honoring active per-domain pauses.
// Serialized: concurrent triggers (onInstalled + storage.onChanged) would
// otherwise both see the same "existing" rules and add duplicate IDs.
let rebuildChain = Promise.resolve();
function rebuildRules() {
  rebuildChain = rebuildChain.then(doRebuild, doRebuild);
  return rebuildChain;
}

async function doRebuild() {
  const { blocklist, pauses } = await getState();
  const now = Date.now();

  const active = blocklist.filter((d) => !(pauses[d] > now));

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules: active.map((d, i) => domainRule(d, i))
  });
}

// Unblock a single domain for `minutes`. Everything else stays blocked.
async function pauseDomain(domain, minutes) {
  const { pauses } = await getState();
  const until = Date.now() + minutes * 60 * 1000;
  pauses[domain] = until;
  await chrome.storage.local.set({ pauses });
  chrome.alarms.create(ALARM_PREFIX + domain, { when: until + 1000 });
  await rebuildRules();
}

chrome.runtime.onInstalled.addListener(async () => {
  const { blocklist } = await chrome.storage.local.get("blocklist");
  if (!blocklist) await chrome.storage.local.set({ blocklist: DEFAULT_BLOCKLIST });
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 15 });
  await pullConfig(); // blocklist change (if any) triggers its own rebuild
  await rebuildRules();
});

chrome.runtime.onStartup.addListener(async () => {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 15 });
  await pullConfig();
  await rebuildRules();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === SYNC_ALARM) {
    await pullConfig(); // storage.onChanged rebuilds rules when sites changed
    return;
  }
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;
  const domain = alarm.name.slice(ALARM_PREFIX.length);
  const { pauses } = await getState();
  delete pauses[domain];
  await chrome.storage.local.set({ pauses });
  await rebuildRules();
});

// Options page edits the blocklist → rebuild.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.blocklist) rebuildRules();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "pause") {
    pauseDomain(msg.domain, msg.minutes).then(() => sendResponse({ ok: true }));
    return true; // async response
  }
  if (msg && msg.type === "rebuild") {
    rebuildRules().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg && msg.type === "sync-pull") {
    pullConfig().then((applied) => sendResponse({ applied: !!applied }));
    return true;
  }
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
