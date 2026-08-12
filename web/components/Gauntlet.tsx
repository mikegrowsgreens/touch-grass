"use client";

// Ranger station overlay: runs the 3-game gauntlet for a pass. The games
// (lib/vendor/games.js, synced from shared/) are DOM-imperative and own the
// arena <div> completely — React never renders children into it, so the two
// can't fight over the same nodes. Banners/buttons live in sibling divs.

import "@/lib/vendor/games";
import { useEffect, useRef, useState } from "react";
import {
  GAME_HOWTO,
  GAME_NAMES,
  afterLoss,
  afterWin,
  currentGame,
  newGauntlet,
  type GauntletState,
} from "@/lib/gauntlet";
import { loadCreds, unlockDomain } from "@/lib/nextdns";
import { recordUnlock } from "@/lib/passes";
import { scheduleRelock } from "@/lib/relock";

export interface GatePass {
  domain: string;
  minutes: number;
  strict: boolean;
  /** "office" gates the park office (settings) — no NextDNS call, no pass. */
  kind: "day" | "work" | "office";
}

type Phase =
  | { at: "ready" }
  | { at: "playing" }
  | { at: "banner"; win: boolean; head: string; sub: string }
  | { at: "issued" };

// Radio = the NextDNS unlock riding along with an issued pass.
type Radio =
  | { state: "honorary" } // no NextDNS connected
  | { state: "calling" }
  | { state: "open"; until: number }
  | { state: "failed"; why: string };

const TOTAL = 3;

export default function Gauntlet({
  pass,
  onQuit,
  onIssued,
}: {
  pass: GatePass;
  onQuit: () => void;
  onIssued: () => void;
}) {
  const [g, setG] = useState<GauntletState>(() => newGauntlet(pass.strict));
  const [phase, setPhase] = useState<Phase>({ at: "ready" });
  const [radio, setRadio] = useState<Radio>({ state: "honorary" });
  const arenaRef = useRef<HTMLDivElement>(null);
  // Stale-callback guard: a quit or reset mid-game bumps this, so a game's
  // late onWin/onLose (e.g. the duck timer) can't advance a dead run.
  const runId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const id = runId;
    const t = timer;
    return () => {
      id.current++;
      clearTimeout(t.current);
    };
  }, []);

  const key = currentGame(g);

  function clearArena() {
    if (arenaRef.current) arenaRef.current.innerHTML = "";
  }

  function backToReady(delayMs: number) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase({ at: "ready" }), delayMs);
  }

  // Radio NextDNS: reopen this one trail, book the relock. The ledger write
  // and n8n call must land even if the overlay closes — only setRadio is
  // cosmetic. Failures leave the pass honorary (the site simply stays blocked).
  async function unlockViaNextDns() {
    const creds = loadCreds();
    if (!creds) return; // radio stays "honorary"
    setRadio({ state: "calling" });
    try {
      await unlockDomain(creds, pass.domain);
      const relockAt = Date.now() + pass.minutes * 60_000;
      recordUnlock(pass.domain, relockAt);
      void scheduleRelock(creds, pass.domain, relockAt); // fallback covers a miss
      setRadio({ state: "open", until: relockAt });
    } catch (e) {
      setRadio({ state: "failed", why: e instanceof Error ? e.message : "radio silence" });
    }
  }

  function start() {
    const arena = arenaRef.current;
    if (!arena || typeof window === "undefined" || !window.TouchGrassGames) return;
    const id = ++runId.current;
    setPhase({ at: "playing" });
    // Games set ui.title/intro on start; we render those from React instead,
    // so hand them throwaway nodes to keep the shared API untouched.
    const dummy = { title: document.createElement("div"), intro: document.createElement("div") };
    window.TouchGrassGames.start(key, arena, dummy, {
      onWin: () => {
        if (id !== runId.current) return;
        runId.current++;
        clearArena();
        const r = afterWin(g);
        if (r.done) {
          setPhase({ at: "issued" });
          onIssued();
          if (pass.kind !== "office") void unlockViaNextDns();
          return;
        }
        setG(r.state);
        setPhase({
          at: "banner",
          win: true,
          head: `${r.state.step} down, ${TOTAL - r.state.step} to go`,
          sub: "Quitting now still counts as winning, for the record.",
        });
        backToReady(1300);
      },
      onLose: () => {
        if (id !== runId.current) return;
        runId.current++;
        clearArena();
        setG(afterLoss(g));
        setPhase(
          g.strict
            ? {
                at: "banner",
                win: false,
                head: "Back to challenge one",
                sub: "This pass requires a flawless run. All three, no misses.",
              }
            : {
                at: "banner",
                win: false,
                head: "Try that one again",
                sub: "Progress kept. Or walk away with the whole afternoon.",
              },
        );
        backToReady(1500);
      },
    });
  }

  const label =
    pass.kind === "office" ? "Office keys" : pass.kind === "work" ? "Work permit" : "Day pass";

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Ranger station">
      <div className="station">
        <div className="station-header">
          <div>
            <p className="station-kicker">
              Ranger station · {label}
              {pass.kind === "office" ? "" : ` · ${pass.domain}`}
            </p>
            <h2 className="slab">
              {phase.at === "issued"
                ? pass.kind === "office"
                  ? "Office open"
                  : "Pass issued"
                : `Challenge ${g.step + 1} of ${TOTAL} — ${GAME_NAMES[key]}`}
            </h2>
          </div>
          <button className="quit" onClick={onQuit}>
            {phase.at === "issued" ? "Close" : "Walk away"}
          </button>
        </div>
        {phase.at !== "issued" && <p className="station-intro">{GAME_HOWTO[key]}</p>}

        <div className="station-body">
          <div ref={arenaRef} />

          {phase.at === "ready" && (
            <button className="start" onClick={start} autoFocus>
              Start
            </button>
          )}
          {phase.at === "banner" && (
            <div className={`result ${phase.win ? "win" : "lose"}`}>
              {phase.head}
              <span className="sub">{phase.sub}</span>
            </div>
          )}
          {phase.at === "issued" && pass.kind === "office" && (
            <div className="result win">
              The office is open
              <span className="sub">
                Make your changes and save — the gates lock again behind you.
              </span>
              <button
                className="cta cta-pine inline-block mt-5"
                type="button"
                onClick={onQuit}
              >
                Step inside
              </button>
            </div>
          )}
          {phase.at === "issued" && pass.kind !== "office" && (
            <div className="result win">
              Pass issued
              <span className="sub">
                {pass.domain} only, {pass.minutes} min. Everything else stays closed.
              </span>
              {radio.state === "honorary" && (
                <span className="sub">
                  Honor-system pass — wire the ranger radio to NextDNS in the park office
                  and wins will genuinely reopen the trail.
                </span>
              )}
              {radio.state === "calling" && (
                <span className="sub">Radioing NextDNS — reopening the trail…</span>
              )}
              {radio.state === "open" && (
                <span className="sub">
                  Trail open ✓ — relocks at{" "}
                  {new Date(radio.until).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  . Your phone remembers the closed gate for a few minutes (DNS
                  cache) — if the trail still looks shut, wait a beat and reload.
                </span>
              )}
              {radio.state === "failed" && (
                <span className="sub">
                  Radio trouble ({radio.why}) — the trail stayed closed. Check the
                  ranger radio connection in the park office and try another pass.
                </span>
              )}
              <a
                className="cta cta-pine no-underline inline-block mt-5"
                href={`https://${pass.domain === "linkedin.com" ? "www.linkedin.com" : pass.domain}`}
                target="_blank"
                rel="noreferrer"
              >
                Walk to {pass.domain}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
