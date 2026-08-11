"use client";

// Park office — edit everything, move config between devices via
// park-pass codes. Codes carry config only, never NextDNS keys.

import { useEffect, useState } from "react";
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
import {
  clearSyncState,
  createSync,
  joinSync,
  loadSyncState,
  pullConfig,
  pushConfig,
} from "@/lib/sync";

export default function Settings() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [draft, setDraft] = useState<ParkConfig | null>(null);

  // null = untouched this session (read storage); "" = explicitly unlinked.
  const [syncOverride, setSyncOverride] = useState<string | null>(null);
  const [syncDraft, setSyncDraft] = useState("");
  const [syncMsg, setSyncMsg] = useState("");
  const [syncCopied, setSyncCopied] = useState(false);

  // Draft starts from stored config once hydrated; no setState-in-effect.
  const cfg = draft ?? (hydrated ? loadConfig() ?? DEFAULT_CONFIG : DEFAULT_CONFIG);
  const patch = (p: Partial<ParkConfig>) => setDraft({ ...cfg, ...p });

  const syncId = syncOverride !== null ? syncOverride || null : hydrated ? (loadSyncState()?.id ?? null) : null;

  // Adopt a newer remote config on open (only before local edits exist).
  useEffect(() => {
    if (!hydrated) return;
    void pullConfig().then((applied) => {
      if (applied) setDraft((d) => d ?? applied);
    });
  }, [hydrated]);

  const save = () => {
    const clean = saveConfig(cfg);
    void pushConfig(clean);
    router.push("/");
  };

  const startSync = async () => {
    const id = await createSync(saveConfig(cfg));
    setSyncOverride(id);
    setSyncMsg("Sync is on — add this code on your other devices.");
  };

  const joinExisting = async () => {
    const applied = await joinSync(syncDraft, cfg);
    if (!applied) {
      setSyncMsg("That doesn't look like a sync code (26 letters/numbers).");
      return;
    }
    setDraft(applied);
    setSyncOverride(loadSyncState()?.id ?? "");
    setSyncDraft("");
    setSyncMsg("Linked — this park now follows the shared settings.");
  };

  const stopSync = () => {
    clearSyncState();
    setSyncOverride("");
    setSyncMsg("Unlinked — this device keeps its settings to itself now.");
  };

  const copySyncId = async () => {
    if (!syncId) return;
    try {
      await navigator.clipboard.writeText(syncId);
      setSyncCopied(true);
      setTimeout(() => setSyncCopied(false), 2000);
    } catch {
      /* selectable below */
    }
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
            <span className="field-label">Park sync — one park, every device</span>
            {syncId ? (
              <>
                <p className="text-[13px] mb-2" style={{ color: "var(--faded)" }}>
                  Settings saved here push to your other linked devices, and this
                  device picks up their changes on open. Keys never sync — only
                  closures, theme, and pass rules.
                </p>
                <div className="field pass-code mb-2" style={{ background: "var(--cream-dark)" }}>
                  {syncId}
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" className="chip" onClick={copySyncId}>
                    {syncCopied ? "copied ✓" : "copy sync code"}
                  </button>
                  <button type="button" className="chip" onClick={stopSync}>
                    unlink this device
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] mb-2" style={{ color: "var(--faded)" }}>
                  Turn on sync here, then paste the sync code once on each other
                  device (and the extension) — every save follows automatically
                  after that. Keys never sync.
                </p>
                <button type="button" className="chip mb-3" onClick={startSync}>
                  turn on sync
                </button>
                <div className="flex gap-2">
                  <input
                    className="field"
                    placeholder="have a sync code? paste it here"
                    value={syncDraft}
                    onChange={(e) => setSyncDraft(e.target.value)}
                  />
                  <button
                    type="button"
                    className="chip"
                    onClick={joinExisting}
                    disabled={!syncDraft.trim()}
                  >
                    link
                  </button>
                </div>
              </>
            )}
            {syncMsg && (
              <p className="text-[13px] mt-2" style={{ color: "var(--pine)" }}>
                {syncMsg}
              </p>
            )}
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
