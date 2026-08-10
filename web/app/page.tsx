"use client";

import { useEffect, useState } from "react";
import Poster from "@/components/Poster";
import {
  MESSAGES,
  SUBMESSAGES,
  CAM_CAPTIONS,
  CRITTERS,
} from "@/lib/messages";
import { recordVisit, streakDays, type ParkStats } from "@/lib/stats";

export default function Park() {
  const [stats, setStats] = useState<ParkStats | null>(null);
  const [critter, setCritter] = useState<string>("🦆");
  const [gifSrc, setGifSrc] = useState<string | undefined>(undefined);
  const [caption, setCaption] = useState("scenic overlook nº 1");

  useEffect(() => {
    const s = recordVisit();
    setStats(s);
    setCritter(CRITTERS[Math.floor(Math.random() * CRITTERS.length)]);
    setCaption(`scenic overlook nº ${((s.dodges - 1) % 12) + 1}`);

    // trail cam — cats by default (keyless); themes arrive with setup
    const img = new Image();
    const url = "https://cataas.com/cat/gif?width=640&ts=" + Date.now();
    img.onload = () => {
      setGifSrc(url);
      setCaption(CAM_CAPTIONS[Math.floor(Math.random() * CAM_CAPTIONS.length)]);
    };
    img.src = url;
  }, []);

  const msgIdx = stats ? (stats.msgIndex - 1) % MESSAGES.length : 0;

  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-8">
      <div className="sign">
        <h1 className="park-name">Touch Grass</h1>
        <p className="park-sub">National Park · est. today</p>

        <div className="mt-6">
          <Poster critter={critter} gifSrc={gifSrc} />
          <p className="caps-label text-center mt-2">{caption}</p>
        </div>

        <h2 className="notice mt-7 mb-2">{MESSAGES[msgIdx]}</h2>
        <p className="text-center text-[15px] mb-7" style={{ color: "var(--faded)" }}>
          {SUBMESSAGES[msgIdx % SUBMESSAGES.length]}
        </p>

        <div className="flex flex-col items-center gap-3 mb-6">
          <a href="/setup" className="cta no-underline">
            Set up my park
          </a>
          <p className="caps-label text-center">
            passes · streaks · your own closures — 5 minutes
          </p>
        </div>

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
