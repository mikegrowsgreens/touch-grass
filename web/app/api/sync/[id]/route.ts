// Park sync relay — devices sharing a sync code push their park-pass code
// here on every save and pull on open; latest save wins. The stored payload
// IS a park-pass code, so it can never carry NextDNS/Giphy keys (the codec
// strips everything but config). Sync ids are unguessable client-generated
// random strings; knowing one is the only "auth", same trust model as a
// pass code shared by hand.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { decodePass } from "@/lib/parkpass";

// Outside the app dir in prod (TG_SYNC_DIR via PM2) so deploys don't wipe it.
const DIR = process.env.TG_SYNC_DIR || path.join(process.cwd(), ".tg-sync");

const ID = /^[a-z0-9]{20,40}$/;
const MAX_CODE_LEN = 4096;
const NO_STORE = { "Cache-Control": "no-store" } as const;

function fileFor(id: string): string {
  return path.join(DIR, `${id}.json`);
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  if (!ID.test(id)) {
    return Response.json({ error: "bad sync id" }, { status: 400, headers: NO_STORE });
  }
  try {
    const raw = await readFile(fileFor(id), "utf8");
    const { code, version } = JSON.parse(raw) as { code: string; version: number };
    return Response.json({ code, version }, { headers: NO_STORE });
  } catch {
    return Response.json({ error: "no park on this frequency" }, { status: 404, headers: NO_STORE });
  }
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  if (!ID.test(id)) {
    return Response.json({ error: "bad sync id" }, { status: 400, headers: NO_STORE });
  }

  let code: unknown;
  try {
    ({ code } = (await request.json()) as { code?: unknown });
  } catch {
    return Response.json({ error: "bad body" }, { status: 400, headers: NO_STORE });
  }
  if (typeof code !== "string" || code.length > MAX_CODE_LEN || !decodePass(code)) {
    return Response.json({ error: "not a valid park pass" }, { status: 400, headers: NO_STORE });
  }

  const version = Date.now();
  await mkdir(DIR, { recursive: true });
  await writeFile(fileFor(id), JSON.stringify({ code, version }), "utf8");
  return Response.json({ version }, { headers: NO_STORE });
}
