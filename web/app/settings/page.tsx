"use client";

// Park office — edit everything, move config between devices via
// park-pass codes. Codes carry config only, never NextDNS keys.

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
import { decodePass, encodePass } from "@/lib/parkpass";
import { PassRules, SitesPicker, ThemePicker } from "@/components/config/sections";
import { RangerRadio } from "@/components/config/nextdns";

export default function Settings() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [draft, setDraft] = useState<ParkConfig | null>(null);
  const [importDraft, setImportDraft] = useState("");
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Draft starts from stored config once hydrated; no setState-in-effect.
  const cfg = draft ?? (hydrated ? loadConfig() ?? DEFAULT_CONFIG : DEFAULT_CONFIG);
  const patch = (p: Partial<ParkConfig>) => setDraft({ ...cfg, ...p });
  const passCode = hydrated ? encodePass(cfg) : "";

  const save = () => {
    saveConfig(cfg);
    router.push("/");
  };

  const copyPass = async () => {
    try {
      await navigator.clipboard.writeText(passCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the code is selectable below */
    }
  };

  const applyImport = () => {
    const decoded = decodePass(importDraft);
    if (!decoded) {
      setImportMsg({
        ok: false,
        text: "That's not a valid park pass — check you copied the whole code.",
      });
      return;
    }
    const clean = saveConfig(decoded);
    setDraft(clean);
    setImportDraft("");
    setImportMsg({
      ok: true,
      text: `Pass accepted — ${clean.sites.length} closure${clean.sites.length === 1 ? "" : "s"}, ${clean.theme.preset} trail cam.`,
    });
  };

  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-8">
      <div className="sign">
        <h1 className="park-name">Park Office</h1>
        <p className="park-sub">Rules · themes · park passes</p>

        <div className="flex flex-col gap-7 mt-7">
          <SitesPicker sites={cfg.sites} onChange={(sites) => patch({ sites })} />
          <ThemePicker theme={cfg.theme} onChange={(theme) => patch({ theme })} />
          <PassRules cfg={cfg} onChange={patch} />

          <div className="dashed-rule pt-5">
            <RangerRadio sites={cfg.sites} />
          </div>

          <section className="dashed-rule pt-5">
            <span className="field-label">Share your park — pass code</span>
            <p className="text-[13px] mb-2" style={{ color: "var(--faded)" }}>
              Carries your closures, theme, and pass rules to another device or a
              friend. Never contains keys or personal data. Unsaved edits count —
              save to make them stick on this device.
            </p>
            <div className="field pass-code mb-2" style={{ background: "var(--cream-dark)" }}>
              {passCode || "…"}
            </div>
            <button type="button" className="chip" onClick={copyPass}>
              {copied ? "copied ✓" : "copy code"}
            </button>
          </section>

          <section>
            <span className="field-label">Redeem a pass code</span>
            <textarea
              className="field pass-code"
              rows={3}
              placeholder="TGP1.…"
              value={importDraft}
              onChange={(e) => {
                setImportDraft(e.target.value);
                setImportMsg(null);
              }}
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                className="chip"
                onClick={applyImport}
                disabled={!importDraft.trim()}
              >
                redeem
              </button>
              {importMsg && (
                <p
                  className="text-[13px]"
                  style={{ color: importMsg.ok ? "var(--pine)" : "var(--rust)" }}
                >
                  {importMsg.text}
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="dashed-rule mt-7 pt-4 flex items-center justify-between">
          <Link href="/" className="permit-link">
            ← the park
          </Link>
          <button
            type="button"
            className="cta cta-pine"
            disabled={cfg.sites.length === 0}
            style={cfg.sites.length === 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            onClick={save}
          >
            Save
          </button>
        </div>
      </div>
    </main>
  );
}
