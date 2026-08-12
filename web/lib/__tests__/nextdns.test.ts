import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  KEY_HEADER,
  buildDenylist,
  getDenylist,
  normalizeProfileId,
  reconcileDenylist,
  sanitizeCreds,
  setActive,
  unlockDomain,
  type NextDnsCreds,
} from "../nextdns";
import { buildRelockJob, scheduleRelock, RELOCK_WEBHOOK } from "../relock";
import { sanitizeLedger, splitExpired, type PassEntry } from "../passes";

const CREDS: NextDnsCreds = { apiKey: "test-key-123", profileId: "ab12cd" };

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), { status });
}

describe("normalizeProfileId", () => {
  it.each([
    ["ab12cd", "ab12cd"],
    ["  AB12CD ", "ab12cd"],
    ["abcd", "abcd"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeProfileId(input)).toBe(expected);
  });

  it.each(["", "ab", "has space", "toolongprofileid1", "ab-12", "ab12cd/denylist"])(
    "rejects %j",
    (input) => {
      expect(normalizeProfileId(input)).toBe("");
    },
  );
});

describe("sanitizeCreds", () => {
  it("accepts a valid pair and trims", () => {
    expect(sanitizeCreds({ apiKey: " k1 ", profileId: " AB12CD " })).toEqual({
      apiKey: "k1",
      profileId: "ab12cd",
    });
  });

  it.each([
    [null],
    [{}],
    [{ apiKey: "", profileId: "ab12cd" }],
    [{ apiKey: "k", profileId: "no" }],
    [{ apiKey: "x".repeat(201), profileId: "ab12cd" }],
  ])("rejects %j", (raw) => {
    expect(sanitizeCreds(raw)).toBeNull();
  });
});

describe("getDenylist", () => {
  it("hits the proxy with the key header and parses entries", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: [{ id: "facebook.com", active: true }, { id: "x.com", active: false }] }),
    );
    const list = await getDenylist(CREDS);
    expect(list).toEqual([
      { id: "facebook.com", active: true },
      { id: "x.com", active: false },
    ]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/nextdns/profiles/ab12cd/denylist");
    expect(init.method).toBe("GET");
    expect(init.headers[KEY_HEADER]).toBe("test-key-123");
  });

  it("surfaces a friendly auth error", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "forbidden" }, 403));
    await expect(getDenylist(CREDS)).rejects.toThrow(/rejected the API key/);
  });

  it("tolerates junk rows", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [null, { id: "" }, { id: "a.com" }] }));
    expect(await getDenylist(CREDS)).toEqual([{ id: "a.com", active: true }]);
  });
});

describe("buildDenylist", () => {
  it("adds only missing sites, keeps existing untouched", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: "facebook.com", active: false }] }))
      .mockResolvedValue(jsonResponse(null, 204));
    const r = await buildDenylist(CREDS, ["facebook.com", "instagram.com", "strava.com"]);
    expect(r).toEqual({ added: ["instagram.com", "strava.com"], existing: ["facebook.com"] });
    // 1 GET + 2 POSTs; facebook.com (mid-pass, active:false) never touched.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const posts = fetchMock.mock.calls.slice(1);
    expect(posts.map(([, init]) => JSON.parse(init.body))).toEqual([
      { id: "instagram.com", active: true },
      { id: "strava.com", active: true },
    ]);
  });
});

describe("setActive", () => {
  it("PATCHes the entry by domain", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, 204));
    await setActive(CREDS, "instagram.com", false);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/nextdns/profiles/ab12cd/denylist/instagram.com");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ active: false });
  });
});

describe("unlockDomain", () => {
  it("PATCHes when the entry exists", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, 204));
    await unlockDomain(CREDS, "instagram.com");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("self-heals a missing entry by creating it unlocked", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "nope" }, 404))
      .mockResolvedValueOnce(jsonResponse(null, 204));
    await unlockDomain(CREDS, "news.google.com");
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/nextdns/profiles/ab12cd/denylist");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ id: "news.google.com", active: false });
  });

  it("rethrows non-404 failures", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "denied" }, 403));
    await expect(unlockDomain(CREDS, "instagram.com")).rejects.toThrow("rejected the API key");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("reconcileDenylist", () => {
  it("adds missing sites and removes unconfigured entries, keeps live passes", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            { id: "facebook.com", active: false }, // mid-pass — must stay untouched
            { id: "oldsite.com", active: true }, // dropped from config — must go
          ],
        }),
      )
      .mockResolvedValue(jsonResponse(null, 204));
    const r = await reconcileDenylist(CREDS, ["facebook.com", "news.google.com"]);
    expect(r).toEqual({ added: ["news.google.com"], removed: ["oldsite.com"] });
    // 1 GET + 1 POST + 1 DELETE
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [postUrl, postInit] = fetchMock.mock.calls[1];
    expect(postUrl).toBe("/api/nextdns/profiles/ab12cd/denylist");
    expect(JSON.parse(postInit.body)).toEqual({ id: "news.google.com", active: true });
    const [delUrl, delInit] = fetchMock.mock.calls[2];
    expect(delUrl).toBe("/api/nextdns/profiles/ab12cd/denylist/oldsite.com");
    expect(delInit.method).toBe("DELETE");
  });

  it("no-ops when denylist already matches", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: [{ id: "facebook.com", active: true }] }),
    );
    const r = await reconcileDenylist(CREDS, ["facebook.com"]);
    expect(r).toEqual({ added: [], removed: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("relock job", () => {
  it("builds the n8n payload with ISO relockAt", () => {
    expect(buildRelockJob(CREDS, "strava.com", Date.UTC(2026, 7, 10, 12, 0, 0))).toEqual({
      profileId: "ab12cd",
      apiKey: "test-key-123",
      entryId: "strava.com",
      relockAt: "2026-08-10T12:00:00.000Z",
    });
  });

  it("posts to the webhook and reports ok", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 200));
    expect(await scheduleRelock(CREDS, "strava.com", Date.now() + 60000)).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe(RELOCK_WEBHOOK);
  });

  it("returns false on network failure (fallback covers)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(await scheduleRelock(CREDS, "strava.com", Date.now())).toBe(false);
  });
});

describe("pass ledger", () => {
  const entry = (domain: string, relockAt: number): PassEntry => ({
    domain,
    issuedAt: relockAt - 120_000,
    relockAt,
  });

  it("sanitizeLedger drops junk and unbounded entries", () => {
    expect(
      sanitizeLedger([
        null,
        "nope",
        { domain: "", relockAt: 5 },
        { domain: "a.com", issuedAt: 1, relockAt: 2 },
        { domain: "b.com", issuedAt: "x", relockAt: Infinity },
      ]),
    ).toEqual([{ domain: "a.com", issuedAt: 1, relockAt: 2 }]);
  });

  it("splitExpired partitions on relockAt", () => {
    const now = 1_000_000;
    const past = entry("expired.com", now - 1);
    const exact = entry("exact.com", now);
    const future = entry("live.com", now + 1);
    expect(splitExpired([past, exact, future], now)).toEqual({
      expired: [past, exact],
      live: [future],
    });
  });
});
