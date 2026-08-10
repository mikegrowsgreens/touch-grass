"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Poster from "@/components/Poster";
import { MESSAGES, SUBMESSAGES, CAM_CAPTIONS, CRITTERS } from "@/lib/messages";
import Gauntlet, { type GatePass } from "@/components/Gauntlet";
import { recordPass, recordVisit, streakDays, type ParkStats } from "@/lib/stats";
import { loadConfig } from "@/lib/config";
import { loadCreds } from "@/lib/nextdns";
import { reactivateExpired } from "@/lib/passes";
import { useHydrated } from "@/lib/useHydrated";
import { resolveCamUrl } from "@/lib/trailcam";

// One ledger entry per page load — module-level so StrictMode's double
// effect pass (and re-renders) can't double-count a visit.
let visitStats: ParkStats | null = null;
function getVisitStats(): ParkStats {
  if (!visitStats) visitStats = recordVisit();
  return visitStats;
}

export default function Park() {
  const hydrated = useHydrated();
  const [freshStats, setFreshStats] = useState<ParkStats | null>(null);
  const stats = freshStats ?? (hydrated ? getVisitStats() : null);
  const cfg = useMemo(() => (hydrated ? loadConfig() : null), [hydrated]);
  const [cam, setCam] = useState<{ src: string; caption: string } | null>(null);
  const [gate, setGate] = useState<GatePass | null>(null);

  // Relock safety net: if the n8n ranger missed a scheduled relock (offline,
  // webhook down), re-close any expired passes on every park visit.
  useEffect(() => {
    if (!hydrated) return;
    const creds = loadCreds();
    if (creds) void reactivateExpired(creds).catch(() => {});
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    resolveCamUrl(cfg?.theme ?? { preset: "cats" }).then((url) => {
      if (cancelled) return;
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        setCam({
          src: url,
          caption: CAM_CAPTIONS[Math.floor(Math.random() * CAM_CAPTIONS.length)],
        });
      };
      img.src = url;
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, cfg]);

  const msgIdx = stats ? (stats.msgIndex - 1) % MESSAGES.length : 0;
  const critter = stats ? CRITTERS[stats.dodges % CRITTERS.length] : CRITTERS[0];
  const caption = cam
    ? cam.caption
    : `scenic overlook nº ${stats ? ((stats.dodges - 1) % 12) + 1 : 1}`;

  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-8">
      <div className="sign">
        <h1 className="park-name">Touch Grass</h1>
        <p className="park-sub">National Park · est. today</p>

        <div className="mt-6">
          <Poster critter={critter} gifSrc={cam?.src} />
          <p className="caps-label text-center mt-2">{caption}</p>
        </div>

        <h2 className="notice mt-7 mb-2">{MESSAGES[msgIdx]}</h2>
        <p className="text-center text-[15px] mb-7" style={{ color: "var(--faded)" }}>
          {SUBMESSAGES[msgIdx % SUBMESSAGES.length]}
        </p>

        {cfg ? (
          <div className="mb-6">
            <span className="field-label">Trail closures in effect</span>
            <div>
              {cfg.sites.map((site) => (
                <div key={site} className="pass-row">
                  <span className="font-bold text-[15px]">{site}</span>
                  <span className="flex gap-2">
                    <button
                      className="pass-btn"
                      onClick={() =>
                        setGate({
                          domain: site,
                          minutes: cfg.dayPassMin,
                          strict: cfg.strict.dayPass,
                          kind: "day",
                        })
                      }
                    >
                      day pass · {cfg.dayPassMin}m
                    </button>
                    {site === cfg.workPermit.domain && (
                      <button
                        className="pass-btn pass-btn-pine"
                        onClick={() =>
                          setGate({
                            domain: site,
                            minutes: cfg.workPermit.min,
                            strict: cfg.strict.workPermit,
                            kind: "work",
                          })
                        }
                      >
                        permit · {cfg.workPermit.min}m
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <p className="caps-label text-center mt-4">
              day pass = beat all 3 games{cfg.strict.dayPass ? ", no misses" : " (retries ok)"} ·
              permit = {cfg.strict.workPermit ? "flawless run" : "beat all 3"}
            </p>
            <div className="flex justify-center mt-3">
              <Link href="/settings" className="permit-link">
                park office — rules, themes &amp; pass codes
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 mb-6">
            <Link href="/setup" className="cta no-underline">
              Set up my park
            </Link>
            <p className="caps-label text-center">
              passes · streaks · your own closures — 5 minutes
            </p>
          </div>
        )}

        <footer className="dashed-rule pt-3 flex justify-between">
          <span className="caps-label">
            Feeds dodged: {stats ? stats.dodges : "—"}
          </span>
          <span className="caps-label">
            Clean streak: {stats ? `${streakDays(stats)}d` : "—"}
          </span>
        </footer>
      </div>

      {gate && (
        <Gauntlet
          pass={gate}
          onQuit={() => setGate(null)}
          onIssued={() => setFreshStats(recordPass())}
        />
      )}
    </main>
  );
}
