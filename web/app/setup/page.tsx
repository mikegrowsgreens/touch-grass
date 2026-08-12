"use client";

// Ranger station — 6-step onboarding, ending with the phone guides
// (Private DNS + Add to Home Screen) so the park lands installed and armed.

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
import { pushConfig } from "@/lib/sync";
import { PassRules, SitesPicker, ThemePicker } from "@/components/config/sections";
import { RangerRadio } from "@/components/config/nextdns";
import { HomeScreenGuide, PrivateDnsGuide } from "@/components/config/phone";

const STEPS = ["Closures", "Trail cam", "Passes", "Radio", "Phone", "Home screen"] as const;

export default function Setup() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ParkConfig | null>(null);

  // Draft starts from stored config once hydrated; no setState-in-effect.
  const cfg = draft ?? (hydrated ? loadConfig() ?? DEFAULT_CONFIG : DEFAULT_CONFIG);
  const patch = (p: Partial<ParkConfig>) => setDraft({ ...cfg, ...p });

  // Locked gates: setup would be a back door around the office gauntlet.
  if (hydrated && loadConfig()?.locked) {
    return (
      <main className="min-h-screen flex items-start justify-center px-4 py-8">
        <div className="sign">
          <h1 className="park-name">Ranger Station</h1>
          <p className="park-sub">Setup closed — gates locked</p>
          <p className="notice mt-7 mb-3">This park is already established.</p>
          <p className="text-center text-[15px] mb-6" style={{ color: "var(--faded)" }}>
            The gates are locked, so changes go through the park office — and the
            office only opens after a gauntlet win.
          </p>
          <div className="flex justify-center">
            <Link href="/settings" className="cta no-underline">
              To the park office
            </Link>
          </div>
          <div className="dashed-rule mt-7 pt-4">
            <Link href="/" className="permit-link">
              ← the park
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const finish = () => {
    void pushConfig(saveConfig(cfg));
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

        {step === 4 && (
          <>
            <p className="notice mb-5">Close the trails on the phone itself</p>
            <PrivateDnsGuide />
          </>
        )}

        {step === 5 && (
          <>
            <p className="notice mb-5">Make the park one tap away</p>
            <HomeScreenGuide />
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
