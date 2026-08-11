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
import { pullConfig } from "@/lib/sync";
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
  const [cfgVersion, setCfgVersion] = useState(0);
  const cfg = useMemo(
    () => (hydrated ? loadConfig() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cfgVersion re-reads storage after a sync pull
    [hydrated, cfgVersion],
  );
  const [cam, setCam] = useState<{ src: string; caption: string } | null>(null);
  const [gate, setGate] = useState<GatePass | null>(null);
  const [shared, setShared] = useState(false);

  // Shares the park's front gate only — pass codes (config) live in the
  // park office, and NextDNS keys never leave the device.
  const sharePark = async () => {
    const url = window.location.origin;
    if (navigator.share) {
      await navigator.share({ title: "Touch Grass National Park", url }).catch(() => {});
      return;
    }
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      // Clipboard API blocked (embedded browsers, old Safari) — textarea fallback.
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      copied = document.execCommand("copy");
      ta.remove();
    }
    if (copied) {
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  // Relock safety net: if the n8n ranger missed a scheduled relock (offline,
  // webhook down), re-close any expired passes on every park visit.
  useEffect(() => {
    if (!hydrated) return;
    const creds = loadCreds();
    if (creds) void reactivateExpired(creds).catch(() => {});
  }, [hydrated]);

  // Park sync: adopt settings saved on other linked devices.
  useEffect(() => {
    if (!hydrated) return;
    void pullConfig().then((applied) => {
      if (applied) setCfgVersion((v) => v + 1);
    });
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
                  <span className="font-bold text-[15px] break-all">{site}</span>
                  <span className="flex flex-wrap justify-end gap-2">
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
            <div className="flex justify-center gap-4 mt-3">
              <Link href="/settings" className="permit-link">
                park office — rules, themes &amp; sync
              </Link>
              <button type="button" className="permit-link" onClick={sharePark}>
                {shared ? "link copied ✓" : "share the park"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 mb-6">
            <p className="text-center text-[14px]" style={{ color: "var(--faded)" }}>
              Close your feeds for restoration. Getting back in costs three ranger
              games in a row — win and one trail opens for a few minutes, then
              relocks itself. Works phone-wide, no account, free forever.
            </p>
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
