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

const GIPHY_TERMS = [
  "celebration", "happy dance", "freedom", "good vibes", "victory",
  "dog party", "cat vibes", "nature", "sunshine", "high five"
];

const CAM_CAPTIONS = [
  "trail cam · wildlife, unbothered, not scrolling",
  "trail cam · resident has never seen a feed",
  "trail cam · footage of zero notifications",
  "trail cam · the recommended replacement activity",
  "trail cam · living in the moment, professionally"
];

const CRITTERS = ["🦆", "🐢", "🦌", "🐇", "🦃"];

const UNLOCK_MINUTES = 2;
const LINKEDIN_MINUTES = 30;

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const blockedSite = params.get("site") || "";

async function storageGet(defaults) {
  if (!ext) return defaults;
  return ext.storage.local.get(defaults);
}

async function storageSet(obj) {
  if (ext) await ext.storage.local.set(obj);
}

async function init() {
  const state = await storageGet({ giphyKey: "", blocksDodged: 0, msgIndex: 0 });

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

  loadTrailCam(state.giphyKey);
}

// Wildlife cam: Giphy if a key is saved, otherwise keyless cat GIFs from
// cataas.com. On any failure the CSS poster scene simply stays.
async function loadTrailCam(giphyKey) {
  let url = "";
  try {
    if (giphyKey) {
      const term = GIPHY_TERMS[Math.floor(Math.random() * GIPHY_TERMS.length)];
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/random?api_key=${encodeURIComponent(giphyKey)}&tag=${encodeURIComponent(term)}&rating=pg`
      );
      const json = await res.json();
      url = json?.data?.images?.downsized_medium?.url || json?.data?.images?.original?.url || "";
    } else {
      url = "https://cataas.com/cat/gif?ts=" + Date.now();
    }
    if (!url) return;
    const img = document.createElement("img");
    img.alt = "trail cam";
    img.src = url;
    img.addEventListener("load", () => {
      $("poster").innerHTML = "";
      $("poster").appendChild(img);
      $("gifCaption").textContent = CAM_CAPTIONS[Math.floor(Math.random() * CAM_CAPTIONS.length)];
    });
  } catch (_) {
    /* poster scene stays */
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
  memory: "Find all 8 matching pairs in 12 tries.",
  reaction: "A duck pops up somewhere in the field. Click it within 0.85 seconds. Seven ducks, no misses."
};

let pending = null; // { domain, minutes }
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

function openGate(domain, minutes) {
  pending = { domain, minutes };
  order = TouchGrassGames.shuffle(TouchGrassGames.keys);
  step = 0;
  $("overlay").classList.remove("hidden");
  showReady();
}

function lost() {
  const arena = $("gameArena");
  arena.innerHTML = `<div class="result lose">Back to challenge one<span class="sub">All three, in a row. Or walk away with the whole afternoon.</span></div>`;
  order = TouchGrassGames.shuffle(TouchGrassGames.keys);
  step = 0;
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

const siteName = (blockedSite || "this site").replace(/^www\./, "");
$("btnPause").textContent = `Day pass: ${siteName} · ${UNLOCK_MINUTES} min · beat 3 challenges`;
$("btnLinkedin").textContent = `Work permit: linkedin.com · ${LINKEDIN_MINUTES} min · beat 3 challenges`;

$("btnPause").addEventListener("click", () => openGate(blockedSite || "unknown", UNLOCK_MINUTES));
$("btnLinkedin").addEventListener("click", () => openGate("linkedin.com", LINKEDIN_MINUTES));

$("gameQuit").addEventListener("click", () => {
  $("overlay").classList.add("hidden");
  $("gameArena").innerHTML = "";
});

$("btnLeave").addEventListener("click", () => {
  window.close();
  // typed-URL tabs can't self-close; go somewhere harmless instead
  setTimeout(() => (location.href = "https://www.google.com"), 150);
});

init();
