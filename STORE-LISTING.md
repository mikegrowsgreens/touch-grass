# Chrome Web Store listing — Touch Grass

Draft for the developer dashboard. Upload zip = `scripts/build-store-zip.sh` → `dist/touch-grass-extension-v1.1.0.zip`.

## Store listing tab

**Name:** Touch Grass

**Summary** (≤132 chars):
> Blocks your feeds behind a 3-game gauntlet. Earn a tiny day pass or walk away with your afternoon. National-park energy.

**Category:** Productivity → Workflow & Planning

**Language:** English

**Description:**

> Welcome to Touch Grass National Park.
>
> The feeds you can't stop opening — Facebook, Instagram, Threads, LinkedIn, Strava, or any list you choose — are now closed areas. Type one on autopilot and you'll land at the ranger station instead: a WPA-style park poster, a rotating trail notice, and a wildlife cam that has never once shown you a hot take.
>
> Want in anyway? Earn it. Beat all three ranger challenges in a row — the typing gauntlet, memory match, and duck reflex — and the ranger issues a day pass: ONE site, a couple of minutes, then the gate closes again. Need LinkedIn for actual work? A work permit runs longer but demands a flawless run. Any slip sends you back to challenge one.
>
> The games aren't hard because you can't win. They're hard so the autopilot moment passes. By the time you've beaten three challenges, you're choosing on purpose — and most of the time you'll close the tab instead.
>
> Features:
> • Your own closed-area list — block any sites, not just the defaults
> • Two-tier passes: short day passes (progress kept between challenges) and strict work permits (flawless run required)
> • Park passes: one shareable code moves your whole setup — sites, pass rules, trail-cam theme — between the extension, the Touch Grass web park (touchgrass.mikegrowsgreens.com), and friends
> • Trail-cam themes: cats (no key needed), dogs, nature, or your own search terms
> • Dodge counter — a running tally of every feed visit you didn't make
> • No accounts, no tracking, no server. Everything lives in your browser.
>
> You are not giving anything up. You're getting your life back.

**Screenshots** (1280×800, capture before submitting):
1. Blocked page — poster scene + trail notice + pass buttons
2. Gauntlet mid-challenge (typing or duck reflex)
3. Options page — closed areas + park pass section
4. "Pass issued" win screen

**Promo tile** (440×280, optional): park badge (mountain + sun) on pine background with "TOUCH GRASS NATIONAL PARK" in Alfa Slab One.

## Privacy tab

**Single purpose:** Blocks user-chosen distracting websites and redirects them to a motivational page where a short game challenge can grant a brief, time-boxed unlock.

**Permission justifications:**
- `declarativeNetRequest` — core function: redirect navigation to user-blocked domains to the extension's blocked page.
- `host_permissions <all_urls>` — the block list is user-configurable to any domain, so redirect rules must be able to match any host. No page content is read.
- `storage` — stores the user's block list, pass rules, theme, stats, and active unlock timers locally.
- `alarms` — re-locks a site when its earned pass expires.

**Data usage disclosures:** No user data is collected, transmitted, or sold. All settings are stored locally via chrome.storage. Remote content is limited to fetching GIF images (cataas.com, or api.giphy.com if the user pastes their own Giphy key) and Google Fonts on extension pages.

**Remote code:** None. All JavaScript ships in the package.

## Submission checklist (Mike)

1. Register Chrome Web Store developer account ($5 one-time): https://chrome.google.com/webstore/devconsole
2. Run `scripts/build-store-zip.sh`, upload the zip from `dist/`
3. Paste listing + privacy sections above
4. Capture the 4 screenshots at 1280×800 (load unpacked → visit facebook.com)
5. Submit for review (first review often takes a few days; <all_urls> can trigger in-depth review — the justification above covers it)
6. Once live: add the store link to README.md and the web app landing page
