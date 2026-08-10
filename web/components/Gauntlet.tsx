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

export interface GatePass {
  domain: string;
  minutes: number;
  strict: boolean;
  kind: "day" | "work";
}

type Phase =
  | { at: "ready" }
  | { at: "playing" }
  | { at: "banner"; win: boolean; head: string; sub: string }
  | { at: "issued" };

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

  const label = pass.kind === "work" ? "Work permit" : "Day pass";

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Ranger station">
      <div className="station">
        <div className="station-header">
          <div>
            <p className="station-kicker">
              Ranger station · {label} · {pass.domain}
            </p>
            <h2 className="slab">
              {phase.at === "issued"
                ? "Pass issued"
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
          {phase.at === "issued" && (
            <div className="result win">
              Pass issued
              <span className="sub">
                {pass.domain} only, {pass.minutes} min. Everything else stays closed.
              </span>
              <span className="sub">
                The ranger&apos;s radio to NextDNS arrives in the next upgrade — for now this
                pass is honorary, but your streak resets all the same.
              </span>
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
