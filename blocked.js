// Touch Grass — the fun page. Rotating humor + Giphy, game-gated pauses.

const ext = typeof chrome !== "undefined" && chrome.storage ? chrome : null;

const MESSAGES = [
  "You're not giving anything up.",
  "The feed doesn't miss you. It never knew you.",
  "Breaking news: nothing happened on the internet just now.",
  "You just dodged 45 minutes of strangers arguing.",
  "The algorithm will survive without you. Barely. But it will.",
  "FOMO is fear of missing out on other people's lunch photos.",
  "Scrolling was never the reward. Stopping is.",
  "Your thumb deserves a vacation.",
  "Somewhere, a push notification just cried. Let it.",
  "You didn't quit social media. You escaped. Different thing.",
  "Plot twist: the feed was the thing making you miss out.",
  "Nothing there was ever going to be as good as right now.",
  "Congratulations, you just chose real life. Bold move. Correct move.",
  "The timeline is infinite. Your afternoon is not.",
  "You were never addicted to the app. You were bored. Go be un-bored.",
  "Imagine explaining doomscrolling to your grandparents.",
  "This is the part where you win.",
  "The internet will still be terrible later. No rush.",
  "You've seen this feed before. It was the same feed.",
  "Free people don't beg an algorithm for crumbs.",
  "That itch you feel? It fades in about 40 seconds. Count with me.",
  "10/10 doctors agree: grass remains touchable.",
  "Your attention is the product. You just declined to be sold.",
  "There is no update. There was never an update.",
  "Big Scroll hates this one weird trick: leaving.",
  "You're not missing the party. The party is wherever you are.",
  "Rest assured, someone is still wrong on the internet. Not your problem.",
  "Every scroll you skip is a tiny high-five to future you.",
  "The dopamine you're looking for is outside.",
  "Nobody ever lay on their deathbed wishing they'd scrolled more.",
  "Ah, you again! Still free, I see. Excellent.",
  "The feed is a slot machine that pays out in mild disappointment.",
  "You have now unlocked: the rest of your day.",
  "Fun fact: birds are outside right now, doing bird stuff. For free.",
  "This blocked page has better vibes than that whole website.",
  "Your future self just fist-pumped. Quietly. But it happened.",
  "Craving = the app leaving your system. It passes. You win.",
  "You're not on a diet from fun. That wasn't fun.",
  "One less scroll. One more life.",
  "Look at you, being all liberated before lunch."
];

const SUBMESSAGES = [
  "Go drink some water. Hydrated legends only.",
  "Text an actual human. They exist!",
  "20 push-ups. Right now. I'll wait.",
  "Step outside for 60 seconds. That's the whole assignment.",
  "Play the song that makes you feel unstoppable.",
  "Write down the one thing you actually meant to do.",
  "Stretch like a cat. Nobody's watching.",
  "Make the coffee. Pet the dog. Live the dream.",
  "Take three deep breaths. Free. No subscription.",
  "Do the dishes and feel weirdly powerful about it."
];

const GIPHY_TERMS = [
  "celebration", "happy dance", "freedom", "good vibes", "victory",
  "dog party", "cat vibes", "nature", "sunshine", "high five"
];

const FALLBACKS = [
  ["🌿", "grass: available for touching"],
  ["🦆", "this duck is having a better day than that feed"],
  ["🌞", "vitamin D speedrun, any%"],
  ["🏄", "riding the wave of not caring"],
  ["🧘", "inner peace: loading… done."],
  ["🐢", "slow is fine. scrolling was the rush."],
  ["🎉", "you showed up here instead. legend."]
];

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
  const siteLabel = blockedSite ? blockedSite.replace(/^www\./, "") : "that site";
  $("stats").textContent = `Feeds dodged so far: ${dodged} · blocked: ${siteLabel}`;

  // rotate message — no repeats until the pool cycles
  $("message").textContent = MESSAGES[state.msgIndex % MESSAGES.length];
  $("submessage").textContent = SUBMESSAGES[state.msgIndex % SUBMESSAGES.length];
  await storageSet({ msgIndex: state.msgIndex + 1 });

  // rotate fallback card
  const [emoji, caption] = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
  $("fallbackEmoji").textContent = emoji;
  $("fallbackCaption").textContent = caption;

  // Giphy (graceful: fallback card stays if no key / offline / error)
  if (state.giphyKey) {
    try {
      const term = GIPHY_TERMS[Math.floor(Math.random() * GIPHY_TERMS.length)];
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/random?api_key=${encodeURIComponent(state.giphyKey)}&tag=${encodeURIComponent(term)}&rating=pg`
      );
      const json = await res.json();
      const url = json?.data?.images?.downsized_medium?.url || json?.data?.images?.original?.url;
      if (url) {
        const img = document.createElement("img");
        img.alt = term;
        img.src = url;
        img.addEventListener("load", () => {
          $("gifFrame").innerHTML = "";
          $("gifFrame").appendChild(img);
        });
      }
    } catch (_) {
      /* fallback card already showing */
    }
  }
}

// ---------- game gauntlet ----------
// Beat ALL THREE games in a row. Any loss resets to game 1 in a new order.
// The prize is tiny on purpose: the math should never feel worth it.

const UNLOCK_MINUTES = 2;
const LINKEDIN_MINUTES = 30;

let pending = null; // { domain, minutes }
let order = [];
let step = 0;

function progressLabel() {
  return `Game ${step + 1} of 3`;
}

function startStep() {
  const arena = $("gameArena");
  const ui = { title: $("gameTitle"), intro: $("gameIntro") };
  TouchGrassGames.start(order[step], arena, ui, { onWin: wonStep, onLose: lost });
  ui.title.textContent = `${progressLabel()} — ${ui.title.textContent}`;
}

function openGate(domain, minutes) {
  pending = { domain, minutes };
  order = TouchGrassGames.shuffle(TouchGrassGames.keys);
  step = 0;
  $("overlay").classList.remove("hidden");
  startStep();
}

function lost() {
  const arena = $("gameArena");
  arena.innerHTML = `<div class="result lose">Back to square one 😅<span class="sub">All three, in a row. Or — hear me out — don't.</span></div>`;
  order = TouchGrassGames.shuffle(TouchGrassGames.keys);
  step = 0;
  setTimeout(startStep, 1400);
}

function wonStep() {
  step++;
  if (step < 3) {
    const arena = $("gameArena");
    arena.innerHTML = `<div class="result win">${step} down, ${3 - step} to go<span class="sub">Still time to walk away with your dignity AND your afternoon.</span></div>`;
    setTimeout(startStep, 1100);
    return;
  }
  grandWin();
}

async function grandWin() {
  const arena = $("gameArena");
  const { domain, minutes } = pending;
  arena.innerHTML = `<div class="result win">Fine. You earned it 🎉<span class="sub">${domain} only, ${minutes} minutes. Everything else stays blocked. Clock's ticking.</span></div>`;

  if (ext && ext.runtime) {
    await new Promise((resolve) =>
      ext.runtime.sendMessage({ type: "pause", domain, minutes }, resolve)
    );
  }

  setTimeout(() => {
    location.href = "https://" + (domain === "linkedin.com" ? "www.linkedin.com" : domain);
  }, 1400);
}

const unlockLabel = blockedSite
  ? `Unlock ${blockedSite.replace(/^www\./, "")} (${UNLOCK_MINUTES} min) — beat all 3 games`
  : `Unlock this site (${UNLOCK_MINUTES} min) — beat all 3 games`;
$("btnPause").textContent = unlockLabel;
$("btnLinkedin").textContent = `LinkedIn work session (${LINKEDIN_MINUTES} min) — beat all 3 games`;

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
