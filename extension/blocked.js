// Touch Grass National Park — trail notices, wildlife cam, ranger station.

const ext = typeof chrome !== "undefined" && chrome.storage ? chrome : null;

const MESSAGES = [
  "You are not giving anything up.",
  "The feed is the same feed it was an hour ago.",
  "Nothing happened on the internet just now. A ranger checked.",
  "You just dodged forty minutes of strangers arguing about a screenshot.",
  "The algorithm has already moved on to someone more engaged.",
  "A craving lasts about forty seconds. You're eight seconds in.",
  "No one has ever finished Instagram.",
  "The group chat will find you if it matters.",
  "Somewhere a notification went unread and everyone survived.",
  "You've read this feed before. It was this exact feed.",
  "Your attention is the product. The store is closed today.",
  "The internet will still be terrible later. There's no rush.",
  "Wildlife report: zero influencers spotted on the trail today.",
  "You came here on autopilot. You can leave on purpose.",
  "The party is wherever you already are.",
  "Someone is wrong on the internet right now. They can stay wrong.",
  "Doomscrolling is a hobby the way a slot machine is a career.",
  "Ten out of ten rangers agree the grass remains touchable.",
  "Your thumb has scrolled roughly a marathon. Let it rest.",
  "There is no update. There was never going to be an update.",
  "Whatever you were about to look for, it wasn't there.",
  "Future you already thinks this was the right call.",
  "The feed pays out like a slot machine, in mild disappointment.",
  "Birds are outside right now, doing bird things, free of charge.",
  "Nobody lies on their deathbed wishing they'd scrolled more.",
  "You were bored, and the cure for boredom was never in there.",
  "This park has better scenery than the entire website it replaced.",
  "The dopamine you're looking for is outside.",
  "The trail is open. The feed is not.",
  "An hour in the feed buys you nothing you can name tomorrow.",
  "Consider this a receipt for time you didn't spend.",
  "You are here, which is the whole point."
];

const SUBMESSAGES = [
  "Water first. Then decide.",
  "Text one actual human.",
  "Twenty push-ups. The feed will wait forever, which is the point.",
  "Sixty seconds outside counts.",
  "Play the song that makes you feel like a protagonist.",
  "Write down the thing you actually sat down to do.",
  "Stretch like a cat. No one is watching.",
  "Make the coffee. Pet the dog.",
  "Three slow breaths. No subscription required.",
  "The dishes. Weirdly powerful."
];

// Theme → Giphy term pools, mirroring the web app's /api/gif route. Cats
// stay keyless via cataas; other themes need a Giphy key or fall back.
const THEME_TERMS = {
  dogs: ["funny dog", "puppy", "dog party", "good dog", "dog zoomies"],
  nature: ["nature", "forest", "mountain river", "sunrise timelapse", "ocean waves", "wildlife"],
  funny: ["fail", "blooper", "funny animals", "wait for it", "laughing"]
};

const CAM_CAPTIONS = [
  "trail cam · wildlife, unbothered, not scrolling",
  "trail cam · resident has never seen a feed",
  "trail cam · footage of zero notifications",
  "trail cam · the recommended replacement activity",
  "trail cam · living in the moment, professionally"
];

const CRITTERS = ["🦆", "🐢", "🦌", "🐇", "🦃"];

// Fallbacks when no park pass has ever been imported (pre-v1.1 installs).
const DEFAULT_PARK_CONFIG = {
  dayPassMin: 2,
  workPermit: { domain: "linkedin.com", min: 30 },
  strict: { dayPass: false, workPermit: true },
  theme: { preset: "cats" }
};

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const blockedSite = params.get("site") || "";
let parkConfig = DEFAULT_PARK_CONFIG;

async function storageGet(defaults) {
  if (!ext) return defaults;
  return ext.storage.local.get(defaults);
}

async function storageSet(obj) {
  if (ext) await ext.storage.local.set(obj);
}

async function init() {
  const state = await storageGet({
    giphyKey: "",
    blocksDodged: 0,
    msgIndex: 0,
    nextGif: "",
    parkConfig: null
  });
  // options-page key wins; otherwise the local gitignored giphy-key.js
  state.giphyKey = state.giphyKey || window.TG_GIPHY_KEY || "";
  // parkConfig is sanitized by the options page on every save/import.
  if (state.parkConfig) parkConfig = { ...DEFAULT_PARK_CONFIG, ...state.parkConfig };
  wireGateButtons();

  // count the dodge
  const dodged = state.blocksDodged + 1;
  await storageSet({ blocksDodged: dodged });
  const siteLabel = blockedSite ? blockedSite.replace(/^www\./, "") : "the feed";
  $("stats").textContent = `Visitors redirected: ${dodged} · today's closure: ${siteLabel}`;

  // rotate message — no repeats until the pool cycles
  $("message").textContent = MESSAGES[state.msgIndex % MESSAGES.length];
  $("submessage").textContent = SUBMESSAGES[state.msgIndex % SUBMESSAGES.length];
  await storageSet({ msgIndex: state.msgIndex + 1 });

  // rotate the poster's critter
  $("critter").textContent = CRITTERS[Math.floor(Math.random() * CRITTERS.length)];
  $("gifCaption").textContent = `scenic overlook nº ${((dodged - 1) % 12) + 1}`;

  loadTrailCam(state);
}

// Wildlife cam: Giphy if a key is saved, otherwise keyless cat GIFs from
// cataas.com. The previous visit's GIF is cached as a data URL so it shows
// instantly; a fresh one downloads in the background for next time.
// On any failure the CSS poster scene simply stays.

function showCamImage(src) {
  const img = document.createElement("img");
  img.alt = "trail cam";
  img.src = src;
  img.addEventListener("load", () => {
    $("poster").innerHTML = "";
    $("poster").appendChild(img);
    $("gifCaption").textContent = CAM_CAPTIONS[Math.floor(Math.random() * CAM_CAPTIONS.length)];
  });
}

async function resolveGifUrl(giphyKey) {
  const theme = parkConfig.theme || DEFAULT_PARK_CONFIG.theme;
  const pool =
    theme.preset === "custom" && Array.isArray(theme.terms) && theme.terms.length
      ? theme.terms
      : THEME_TERMS[theme.preset];
  if (giphyKey && pool) {
    const term = pool[Math.floor(Math.random() * pool.length)];
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/random?api_key=${encodeURIComponent(giphyKey)}&tag=${encodeURIComponent(term)}&rating=pg`
    );
    const json = await res.json();
    // smallest full-size rendition first — downsized caps ~2MB, so the page
    // paints fast and the prefetch cache (4MB guard) almost always stores it
    const imgs = json?.data?.images;
    return imgs?.downsized?.url || imgs?.downsized_medium?.url || imgs?.original?.url || "";
  }
  // cats theme, no key, or no pool — resident mousers cover every shortage
  return "https://cataas.com/cat/gif?width=640&ts=" + Date.now();
}

async function loadTrailCam(state) {
  try {
    if (state.nextGif) {
      showCamImage(state.nextGif); // instant, from cache
    } else {
      const url = await resolveGifUrl(state.giphyKey);
      if (url) showCamImage(url); // first visit: live load
    }
  } catch (_) {
    /* poster scene stays */
  }
  prefetchNextGif(state.giphyKey);
}

async function prefetchNextGif(giphyKey) {
  if (!ext) return;
  try {
    const url = await resolveGifUrl(giphyKey);
    if (!url) return;
    const blob = await (await fetch(url)).blob();
    if (blob.size > 4 * 1024 * 1024) return; // keep chrome.storage under quota
    const dataUrl = await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.readAsDataURL(blob);
    });
    await storageSet({ nextGif: dataUrl });
  } catch (_) {
    /* next visit falls back to a live load */
  }
}

// ---------- ranger station: the 3-challenge gauntlet ----------
// Beat ALL THREE in a row. Any loss resets to challenge 1 in a new order.
// Each challenge waits for an explicit Start click — no ambushes.

const GAME_NAMES = {
  typing: "Typing gauntlet",
  memory: "Memory match",
  reaction: "Duck reflex"
};

const GAME_HOWTO = {
  typing: "Type the posted sentence perfectly. One wrong character resets it.",
  memory: "Find all 8 matching pairs in 20 tries.",
  reaction: "A duck pops up somewhere in the field. Click it within 1.25 seconds. Five ducks."
};

// Two tiers of stakes:
//  - Day pass (2 min): beat all three; losing a challenge just retries it.
//  - Work permit (30 min): beat all three WITHOUT a single loss; any slip
//    resets to challenge one in a fresh order.
let pending = null; // { domain, minutes, strict }
let order = [];
let step = 0;

function showReady() {
  const arena = $("gameArena");
  const key = order[step];
  $("gameTitle").textContent = `Challenge ${step + 1} of 3 — ${GAME_NAMES[key]}`;
  $("gameIntro").textContent = GAME_HOWTO[key];
  arena.innerHTML = "";
  const start = document.createElement("button");
  start.className = "start";
  start.textContent = "Start";
  start.addEventListener("click", () => {
    TouchGrassGames.start(key, arena, { title: $("gameTitle"), intro: $("gameIntro") }, { onWin: wonStep, onLose: lost });
    $("gameTitle").textContent = `Challenge ${step + 1} of 3 — ${GAME_NAMES[key]}`;
    $("gameIntro").textContent = GAME_HOWTO[key];
  });
  arena.appendChild(start);
  start.focus();
}

function openGate(domain, minutes, strict) {
  pending = { domain, minutes, strict };
  order = TouchGrassGames.shuffle(TouchGrassGames.keys);
  step = 0;
  $("overlay").classList.remove("hidden");
  showReady();
}

function lost() {
  const arena = $("gameArena");
  if (pending.strict) {
    arena.innerHTML = `<div class="result lose">Back to challenge one<span class="sub">Work permits require a flawless run. All three, no misses.</span></div>`;
    order = TouchGrassGames.shuffle(TouchGrassGames.keys);
    step = 0;
  } else {
    arena.innerHTML = `<div class="result lose">Try that one again<span class="sub">Progress kept. Or walk away with the whole afternoon.</span></div>`;
  }
  setTimeout(showReady, 1500);
}

function wonStep() {
  step++;
  if (step < 3) {
    const arena = $("gameArena");
    arena.innerHTML = `<div class="result win">${step} down, ${3 - step} to go<span class="sub">Quitting now still counts as winning, for the record.</span></div>`;
    setTimeout(showReady, 1300);
    return;
  }
  grandWin();
}

async function grandWin() {
  const arena = $("gameArena");
  const { domain, minutes } = pending;
  arena.innerHTML = `<div class="result win">Pass issued<span class="sub">${domain} only, ${minutes} minutes. Everything else stays closed. The clock is running.</span></div>`;

  if (ext && ext.runtime) {
    await new Promise((resolve) =>
      ext.runtime.sendMessage({ type: "pause", domain, minutes }, resolve)
    );
  }

  setTimeout(() => {
    location.href = "https://" + (domain === "linkedin.com" ? "www.linkedin.com" : domain);
  }, 1400);
}

// Pass buttons honor the park config (durations, strictness, work-permit
// domain) — wired from init() once parkConfig is loaded.
function wireGateButtons() {
  const siteName = (blockedSite || "this site").replace(/^www\./, "");
  const wp = parkConfig.workPermit;
  const rule = (strict) => (strict ? "beat all 3 without a single loss" : "beat all 3 challenges");
  $("btnPause").textContent =
    `Day pass: ${siteName} · ${parkConfig.dayPassMin} min · ${rule(parkConfig.strict.dayPass)}`;
  $("btnLinkedin").textContent =
    `Work permit: ${wp.domain} · ${wp.min} min · ${rule(parkConfig.strict.workPermit)}`;
  $("btnPause").addEventListener("click", () =>
    openGate(blockedSite || "unknown", parkConfig.dayPassMin, parkConfig.strict.dayPass)
  );
  $("btnLinkedin").addEventListener("click", () =>
    openGate(wp.domain, wp.min, parkConfig.strict.workPermit)
  );
}

$("gameQuit").addEventListener("click", () => {
  $("overlay").classList.add("hidden");
  $("gameArena").innerHTML = "";
});

$("btnLeave").addEventListener("click", () => {
  window.close();
  // typed-URL tabs can't self-close; the trail leads to the park itself
  setTimeout(() => (location.href = "https://touchgrass.mikegrowsgreens.com"), 150);
});

init();
