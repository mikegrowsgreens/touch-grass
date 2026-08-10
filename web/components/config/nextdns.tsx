"use client";

// Ranger radio — the NextDNS connection card, shared by /setup (step 4)
// and /settings. Owns its own state: creds live in tg-nextdns-v1, never in
// ParkConfig, so pass codes can't leak them.

import { useState } from "react";
import {
  buildDenylist,
  clearCreds,
  loadCreds,
  normalizeProfileId,
  saveCreds,
  testConnection,
  type NextDnsCreds,
} from "@/lib/nextdns";
import { useHydrated } from "@/lib/useHydrated";

type Status = { ok: boolean; text: string } | null;

export function RangerRadio({ sites }: { sites: string[] }) {
  const hydrated = useHydrated();
  const [saved, setSaved] = useState<NextDnsCreds | null | "unread">("unread");
  const creds = saved === "unread" ? (hydrated ? loadCreds() : null) : saved;
  const [keyDraft, setKeyDraft] = useState("");
  const [idDraft, setIdDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const connect = async () => {
    const candidate = { apiKey: keyDraft.trim(), profileId: normalizeProfileId(idDraft) };
    if (!candidate.apiKey || !candidate.profileId) {
      setStatus({
        ok: false,
        text: "Need both — the API key and the 6-character profile ID (e.g. ab12cd).",
      });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const list = await testConnection(candidate);
      saveCreds(candidate);
      setSaved(candidate);
      setKeyDraft("");
      setIdDraft("");
      setStatus({
        ok: true,
        text: `Radio check ✓ — profile ${candidate.profileId}, ${list.length} closure${list.length === 1 ? "" : "s"} on its denylist.`,
      });
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : "connection failed" });
    } finally {
      setBusy(false);
    }
  };

  const build = async () => {
    if (!creds) return;
    setBusy(true);
    setStatus(null);
    try {
      const { added, existing } = await buildDenylist(creds, sites);
      setStatus({
        ok: true,
        text:
          added.length === 0
            ? `Denylist already covers all ${existing.length} closures.`
            : `Added ${added.length} closure${added.length === 1 ? "" : "s"} (${existing.length} already there).`,
      });
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : "denylist build failed" });
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => {
    clearCreds();
    setSaved(null);
    setStatus({ ok: true, text: "Radio returned. Passes go back to honor-system." });
  };

  return (
    <section>
      <span className="field-label">Ranger radio — NextDNS</span>
      {!creds ? (
        <>
          <p className="text-[13px] mb-3" style={{ color: "var(--faded)" }}>
            NextDNS blocks your closures on the whole phone; winning here genuinely
            reopens one for the pass window, then it relocks. Free at{" "}
            <a
              className="permit-link"
              href="https://my.nextdns.io/signup"
              target="_blank"
              rel="noreferrer"
            >
              my.nextdns.io
            </a>{" "}
            — grab your <strong>API key</strong> (Account page, bottom) and{" "}
            <strong>profile ID</strong> (6 characters, top of the dashboard). Both stay on
            this device; during a pass they&apos;re radioed to the park&apos;s relock
            timer just long enough to re-close the trail.
          </p>
          <div className="flex flex-col gap-2">
            <input
              className="field"
              type="password"
              placeholder="NextDNS API key"
              value={keyDraft}
              autoComplete="off"
              onChange={(e) => setKeyDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <input
                className="field"
                style={{ maxWidth: 140 }}
                placeholder="profile ID"
                value={idDraft}
                autoComplete="off"
                onChange={(e) => setIdDraft(e.target.value)}
              />
              <button type="button" className="chip" onClick={connect} disabled={busy}>
                {busy ? "radioing…" : "connect & test"}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="text-[13px] mb-3" style={{ color: "var(--faded)" }}>
            Connected to profile <strong>{creds.profileId}</strong>. &ldquo;Build my
            denylist&rdquo; adds any of your {sites.length} closures the profile is
            missing — it never removes or re-locks anything by itself.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip" onClick={build} disabled={busy}>
              {busy ? "radioing…" : "build my denylist"}
            </button>
            <button type="button" className="chip" onClick={disconnect} disabled={busy}>
              disconnect
            </button>
          </div>
        </>
      )}
      {status && (
        <p
          className="mt-2 text-[13px]"
          style={{ color: status.ok ? "var(--pine)" : "var(--rust)" }}
        >
          {status.text}
        </p>
      )}
    </section>
  );
}
