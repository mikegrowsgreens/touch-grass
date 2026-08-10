# 🌿 Touch Grass

A Chrome extension that blocks social media and replaces every doomscroll attempt with a rotating funny, positive page. In the spirit of Allen Carr's *Easyway*: **you're not giving anything up** — there was nothing there.

Want in anyway? You have to **win a mini-game** first. On purpose.

## What it does

- Blocks Facebook, Instagram, Threads, LinkedIn, and Strava (fully editable list) — including subdomains, including **Incognito**.
- Every blocked visit shows a fresh card: a funny/positive one-liner + a GIF (via Giphy) + a "do this instead" nudge. No repeats until the pool cycles.
- No off switch. To get in you must beat **all three games in a row** — lose any and you start over:
  - **Typing gauntlet** — type a commitment sentence perfectly, one typo resets it
  - **Memory match** — 8 pairs in 12 tries
  - **Whack the duck** — 7 clicks, each within 0.7 seconds
- The prize is tiny on purpose: winning unlocks **only the one site you were visiting, for 2 minutes**. Everything else stays blocked. (Exception: a LinkedIn work session buys 30 minutes, for actual work.) Two-plus minutes of effort for two minutes of feed — the math is the deterrent.
- Counts your "feeds dodged" so you can watch the number grow.

## Install (2 minutes)

1. Download this repo: green **Code** button → **Download ZIP** → unzip. (Or `git clone`.)
2. In Chrome, open `chrome://extensions`
3. Toggle **Developer mode** on (top right)
4. Click **Load unpacked** → select the `touch-grass` folder
5. Recommended: click **Details** on the extension → enable **Allow in Incognito** (otherwise private windows bypass it)

That's it — visit facebook.com to test.

## Optional: GIFs

The block page works offline with animated emoji cards. For real GIFs:

1. Get a free key at [developers.giphy.com](https://developers.giphy.com) (Create App → API)
2. Click the Touch Grass icon in the toolbar (opens options) → paste the key → Save

## Edit the block list

Click the extension icon → edit the domain list (one per line) → Save. Subdomains are covered automatically.

## Phone too? (Android)

Extensions don't run in mobile Chrome/Brave. Use DNS blocking instead — it covers every app on the phone, even private tabs. See [NEXTDNS-SETUP.md](NEXTDNS-SETUP.md) (5 minutes, free).

## Honesty clause

You can always disable the extension at `chrome://extensions`. The games defeat the *impulse*, not a determined adult. That's the point — by the time you've navigated there, the autopilot moment has passed and you're choosing on purpose.

## Stack

Vanilla JS, Manifest V3, `declarativeNetRequest` redirects. No build step, no dependencies, no tracking, no server. Your data never leaves your browser (the only network call is to Giphy, if you add a key).
