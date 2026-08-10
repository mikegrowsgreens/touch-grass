# 🌿 Touch Grass National Park

Two ways in to the park:

- **Chrome extension** (`extension/`) — blocks the feeds on desktop Chrome. Install below, or from the Chrome Web Store (link coming once the listing is live — see [STORE-LISTING.md](STORE-LISTING.md)).
- **Web park + phone** (`web/`) — installable PWA at [touchgrass.mikegrowsgreens.com](https://touchgrass.mikegrowsgreens.com) that blocks sites on your *phone* via NextDNS. Guided setup included.

One **park pass code** (options page ↔ web settings) moves your whole setup — sites, pass rules, trail-cam theme — between both, and to friends. Codes never contain API keys.

A Chrome extension that closes social media for maintenance, permanently. Every doomscroll attempt lands at the gates of Touch Grass National Park: a WPA-poster park sign, a trail-cam GIF of an animal having a better day than you, and a rotating trail notice in the spirit of Allen Carr's *Easyway* — **you're not giving anything up**; there was nothing there.

Want in anyway? Take it up with the ranger station.

## What it does

- Blocks Facebook, Instagram, Threads, LinkedIn, and Strava (fully editable list) — including subdomains, including **Incognito**.
- Every blocked visit shows a fresh trail notice + trail-cam footage (random cat GIFs out of the box via cataas.com; add a free Giphy key for the full zoo). No repeated notices until the pool cycles.
- No off switch. Permits require beating **all three ranger challenges**. Each one shows its rules and waits for you to hit Start:
  - **Typing gauntlet** — type the posted sentence perfectly, one typo resets it (the same pattern Cold Turkey and StayFocusd use for their unlock challenges)
  - **Memory match** — 8 pairs in 20 tries (under 16 is considered excellent play, so normal humans can pass)
  - **Duck reflex** — 5 ducks, each clicked within 1.25 seconds (median human click-on-target time is ~1.12s)
- Two tiers of stakes:
  - **Day pass** — 2 minutes, only the one site you were visiting. Lose a challenge and you retry it; progress is kept.
  - **Work permit** — 30 minutes of LinkedIn for actual work. Requires a **flawless run**: lose any challenge and you're back to challenge one.
- The prize is tiny on purpose. Two-plus minutes of effort for two minutes of feed — the math is the deterrent.
- Counts your "feeds dodged" so you can watch the number grow.

## Install (2 minutes)

1. Download this repo: green **Code** button → **Download ZIP** → unzip. (Or `git clone`.)
2. In Chrome, open `chrome://extensions`
3. Toggle **Developer mode** on (top right)
4. Click **Load unpacked** → select the `extension/` folder inside the repo
5. Recommended: click **Details** on the extension → enable **Allow in Incognito** (otherwise private windows bypass it)

That's it — visit facebook.com to test.

## GIFs

Cat GIFs work out of the box, no setup (cataas.com, keyless). Offline you get a hand-drawn CSS park scene with a wandering duck. For Giphy's full catalog instead of cats:

1. Get a free key at [developers.giphy.com](https://developers.giphy.com) (Create App → API)
2. Click the Touch Grass icon in the toolbar (opens options) → paste the key → Save

Or, if you cloned this repo: create a `giphy-key.js` in the `extension/` folder (it's gitignored) containing

```js
window.TG_GIPHY_KEY = "your-key-here";
```

## Edit the block list

Click the extension icon → edit the domain list (one per line) → Save. Subdomains are covered automatically.

## Phone too? (Android)

Extensions don't run in mobile Chrome/Brave. Use DNS blocking instead — it covers every app on the phone, even private tabs. See [NEXTDNS-SETUP.md](NEXTDNS-SETUP.md) (5 minutes, free).

## Honesty clause

You can always disable the extension at `chrome://extensions`. The games defeat the *impulse*, not a determined adult. That's the point — by the time you've navigated there, the autopilot moment has passed and you're choosing on purpose.

## Stack

Vanilla JS, Manifest V3, `declarativeNetRequest` redirects. No build step, no dependencies, no tracking, no server. Your data never leaves your browser (the only network call is to Giphy, if you add a key).
