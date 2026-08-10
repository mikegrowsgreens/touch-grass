"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Poster from "@/components/Poster";
import { MESSAGES, SUBMESSAGES, CAM_CAPTIONS, CRITTERS } from "@/lib/messages";
import { recordVisit, streakDays, type ParkStats } from "@/lib/stats";
import { loadConfig } from "@/lib/config";
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
  const stats = hydrated ? getVisitStats() : null;
  const cfg = useMemo(() => (hydrated ? loadConfig() : null), [hydrated]);
  const [cam, setCam] = useState<{ src: string; caption: string } | null>(null);

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
                <div key={site} className="closure-row">
                  <span className="font-bold text-[15px]">{site}</span>
                  <span className="caps-label">
                    {site === cfg.workPermit.domain
                      ? `closed · permit ${cfg.workPermit.min} min`
                      : `closed · pass ${cfg.dayPassMin} min`}
                  </span>
                </div>
              ))}
            </div>
            <p className="caps-label text-center mt-4">
              pass gate opens with the games — next upgrade
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
    </main>
  );
}
