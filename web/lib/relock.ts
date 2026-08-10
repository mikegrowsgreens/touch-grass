// Scheduled relock — hands the pass to the n8n ranger on automation.*:
// webhook → Wait until relockAt → PATCH active:true. The API key rides along
// and is held by n8n only for the pass duration (disclosed in the privacy
// note). If this call fails, the reopen fallback in lib/passes.ts still
// relocks on the next park visit.

import type { NextDnsCreds } from "./nextdns";

export const RELOCK_WEBHOOK = "https://automation.mikegrowsgreens.com/webhook/touch-grass-relock";

export interface RelockJob {
  profileId: string;
  apiKey: string;
  entryId: string; // the domain — NextDNS denylist entry id
  relockAt: string; // ISO timestamp
}

export function buildRelockJob(
  creds: NextDnsCreds,
  domain: string,
  relockAtMs: number,
): RelockJob {
  return {
    profileId: creds.profileId,
    apiKey: creds.apiKey,
    entryId: domain,
    relockAt: new Date(relockAtMs).toISOString(),
  };
}

/** Fire the relock job at n8n. Returns false on any failure (fallback covers). */
export async function scheduleRelock(
  creds: NextDnsCreds,
  domain: string,
  relockAtMs: number,
): Promise<boolean> {
  try {
    const res = await fetch(RELOCK_WEBHOOK, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildRelockJob(creds, domain, relockAtMs)),
    });
    return res.ok;
  } catch {
    return false;
  }
}
