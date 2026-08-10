// Proxy route: allowlist + key forwarding. Handlers are plain functions
// over Web Request/Response, so we call them directly with a mocked fetch.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH, POST } from "../../app/api/nextdns/[...path]/route";
import { KEY_HEADER } from "../nextdns";
import { reactivateExpired } from "../passes";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function ctx(...path: string[]) {
  return { params: Promise.resolve({ path }) };
}

function req(method: string, body?: unknown, key = "k1") {
  return new Request("http://localhost/api/nextdns/x", {
    method,
    headers: {
      ...(key ? { [KEY_HEADER]: key } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe("nextdns proxy", () => {
  it("forwards a denylist GET with X-Api-Key", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    const res = await GET(req("GET"), ctx("profiles", "ab12cd", "denylist"));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.nextdns.io/profiles/ab12cd/denylist");
    expect(init.headers["X-Api-Key"]).toBe("k1");
  });

  it("forwards PATCH body but strips unknown fields", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const res = await PATCH(
      req("PATCH", { active: true, evil: "payload" }),
      ctx("profiles", "ab12cd", "denylist", "facebook.com"),
    );
    expect(res.status).toBe(204);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ active: true });
  });

  it("401s without a key", async () => {
    const res = await GET(req("GET", undefined, ""), ctx("profiles", "ab12cd", "denylist"));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [["profiles", "ab12cd", "settings"]], // not denylist
    [["profiles", "ab12cd"]], // too short
    [["analytics"]], // different resource
    [["profiles", "ab12cd", "denylist", "..", "settings"]], // traversal
    [["profiles", "AB!!", "denylist"]], // bad profile id
  ])("404s disallowed path %j", async (path) => {
    const res = await GET(req("GET"), ctx(...(path as string[])));
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([[".."], ["."], ["...."], [".com"], ["evil-"]])(
    "404s a PATCH with dot/edge segment %j (would escape denylist via URL normalization)",
    async (segment) => {
      const res = await PATCH(
        req("PATCH", { active: true }),
        ctx("profiles", "ab12cd", "denylist", segment),
      );
      expect(res.status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("404s a POST aimed at a single entry (only PATCH may target one)", async () => {
    const res = await POST(
      req("POST", { id: "a.com" }),
      ctx("profiles", "ab12cd", "denylist", "a.com"),
    );
    expect(res.status).toBe(404);
  });

  it("502s when NextDNS is unreachable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("down"));
    const res = await GET(req("GET"), ctx("profiles", "ab12cd", "denylist"));
    expect(res.status).toBe(502);
  });
});

describe("reactivateExpired (reopen fallback)", () => {
  const CREDS = { apiKey: "k1", profileId: "ab12cd" };

  function stubStorage(initial: Record<string, string>) {
    const store = new Map(Object.entries(initial));
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    });
    return store;
  }

  it("relocks expired passes, keeps live ones, retries failures next visit", async () => {
    const now = 1_000_000;
    const store = stubStorage({
      "tg-passes-v1": JSON.stringify([
        { domain: "expired.com", issuedAt: 0, relockAt: now - 1 },
        { domain: "fails.com", issuedAt: 0, relockAt: now - 1 },
        { domain: "live.com", issuedAt: 0, relockAt: now + 60_000 },
      ]),
    });
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 })) // expired.com
      .mockResolvedValueOnce(new Response(null, { status: 500 })); // fails.com

    const relocked = await reactivateExpired(CREDS, now);
    expect(relocked).toEqual(["expired.com"]);
    const left = JSON.parse(store.get("tg-passes-v1")!);
    expect(left.map((e: { domain: string }) => e.domain).sort()).toEqual([
      "fails.com",
      "live.com",
    ]);
  });

  it("no-ops with an empty ledger", async () => {
    stubStorage({});
    expect(await reactivateExpired(CREDS, 5)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
