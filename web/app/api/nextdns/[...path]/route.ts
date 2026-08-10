// NextDNS proxy — api.nextdns.io sends no CORS headers, so the browser
// can't call it directly. This route forwards denylist calls with the
// user's key from a request header; the key is never stored server-side.
// Path allowlist keeps this from being an open proxy into the NextDNS API.

import { KEY_HEADER } from "@/lib/nextdns";

const API = "https://api.nextdns.io";
// profiles/:id/denylist or profiles/:id/denylist/:domain — nothing else.
// Domain segment must start/end alphanumeric so dot-only segments ("..", ".")
// can't URL-normalize the upstream fetch outside the denylist.
const DOMAIN = "[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?";
const ALLOWED = new RegExp(`^profiles\\/[a-z0-9]{4,12}\\/denylist(\\/${DOMAIN})?$`);

const METHOD_FOR_PATH = {
  GET: /denylist$/, // list
  POST: /denylist$/, // add entry
  PATCH: new RegExp(`denylist\\/${DOMAIN}$`), // toggle entry
} as const;

async function proxy(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
  method: keyof typeof METHOD_FOR_PATH,
): Promise<Response> {
  const { path: segments } = await ctx.params;
  const path = segments.map((s) => decodeURIComponent(s)).join("/").toLowerCase();
  if (!ALLOWED.test(path) || !METHOD_FOR_PATH[method].test(path)) {
    return Response.json({ error: "path not allowed" }, { status: 404 });
  }

  const apiKey = request.headers.get(KEY_HEADER)?.trim();
  if (!apiKey || apiKey.length > 200) {
    return Response.json({ error: "missing NextDNS API key" }, { status: 401 });
  }

  let body: string | undefined;
  if (method !== "GET") {
    try {
      const json = await request.json();
      // Only the two write shapes NextDNS needs ever pass through.
      body = JSON.stringify({
        ...(typeof json?.id === "string" ? { id: json.id } : {}),
        ...(typeof json?.active === "boolean" ? { active: json.active } : {}),
      });
    } catch {
      return Response.json({ error: "invalid JSON body" }, { status: 400 });
    }
  }

  try {
    const upstream = await fetch(`${API}/${path}`, {
      method,
      headers: {
        "X-Api-Key": apiKey,
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body } : {}),
      cache: "no-store",
    });
    const text = await upstream.text();
    return new Response(text || null, {
      status: upstream.status,
      headers: text ? { "content-type": "application/json" } : undefined,
    });
  } catch {
    return Response.json({ error: "NextDNS unreachable" }, { status: 502 });
  }
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx, "GET");
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx, "POST");
}

export async function PATCH(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, ctx, "PATCH");
}
