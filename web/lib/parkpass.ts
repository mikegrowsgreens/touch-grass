// Park-pass codes — base64url JSON of ParkConfig, the only way config moves
// between devices/friends. No secrets ever ride along (see config.ts note).

import { type ParkConfig, sanitizeConfig } from "./config";

const PREFIX = "TGP1.";

export function encodePass(cfg: ParkConfig): string {
  const bytes = new TextEncoder().encode(JSON.stringify(sanitizeConfig(cfg)));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return PREFIX + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** null = not a valid pass (bad encoding, not JSON, or wrong version). */
export function decodePass(code: string): ParkConfig | null {
  const trimmed = code.trim();
  const body = trimmed.startsWith(PREFIX) ? trimmed.slice(PREFIX.length) : trimmed;
  if (!body || !/^[A-Za-z0-9_-]+$/.test(body)) return null;
  try {
    const b64 =
      body.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (body.length % 4)) % 4);
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object") return null;
    if ((parsed as { v?: unknown }).v !== 1) return null;
    return sanitizeConfig(parsed);
  } catch {
    return null;
  }
}
