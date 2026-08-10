"use client";

// Ranger station — 4-step onboarding. Phone setup guides (Private DNS,
// Add to Home Screen) join this wizard in slice 5.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  type ParkConfig,
} from "@/lib/config";
import { useHydrated } from "@/lib/useHydrated";
import { PassRules, SitesPicker, ThemePicker } from "@/components/config/sections";
import { RangerRadio } from "@/components/config/nextdns";

const STEPS = ["Closures", "Trail cam", "Passes", "Radio"] as const;

export default function Setup() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ParkConfig | null>(null);

  // Draft starts from stored config once hydrated; no setState-in-effect.
  const cfg = draft ?? (hydrated ? loadConfig() ?? DEFAULT_CONFIG : DEFAULT_CONFIG);
  const patch = (p: Partial<ParkConfig>) => setDraft({ ...cfg, ...p });

  const finish = () => {
    saveConfig(cfg);
    router.push("/");
  };

  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-8">
      <div className="sign">
        <h1 className="park-name">Ranger Station</h1>
        <p className="park-sub">
          Park setup · step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>

        <div className="flex justify-center gap-2 mt-4 mb-6">
          {STEPS.map((label, i) => (
            <span key={label} className="step-dot" data-active={i <= step} />
          ))}
        </div>

        {step === 0 && (
          <>
            <p className="notice mb-5">Which trails are closed for restoration?</p>
            <SitesPicker sites={cfg.sites} onChange={(sites) => patch({ sites })} />
          </>
        )}

        {step === 1 && (
          <>
            <p className="notice mb-5">What should the trail cam catch?</p>
            <ThemePicker theme={cfg.theme} onChange={(theme) => patch({ theme })} />
          </>
        )}

        {step === 2 && (
          <>
            <p className="notice mb-5">How do passes get issued?</p>
            <PassRules cfg={cfg} onChange={patch} />
          </>
        )}

        {step === 3 && (
          <>
            <p className="notice mb-5">Wire the radio to NextDNS? (optional)</p>
            <RangerRadio sites={cfg.sites} />
            <p className="caps-label mt-4">
              skip this and passes stay honor-system — connect any time in the park office
            </p>
          </>
        )}

        <div className="dashed-rule mt-7 pt-4 flex items-center justify-between">
          {step > 0 ? (
            <button type="button" className="permit-link" onClick={() => setStep(step - 1)}>
              ← back
            </button>
          ) : (
            <Link href="/" className="permit-link">
              ← the park
            </Link>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="cta"
              disabled={cfg.sites.length === 0}
              style={cfg.sites.length === 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={() => setStep(step + 1)}
            >
              Next
            </button>
          ) : (
            <button type="button" className="cta cta-pine" onClick={finish}>
              Open my park
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
