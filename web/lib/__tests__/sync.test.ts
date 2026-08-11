import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DEFAULT_CONFIG } from "../config";
import { encodePass } from "../parkpass";
import {
  createSync,
  joinSync,
  loadSyncState,
  newSyncId,
  pullConfig,
  pushConfig,
} from "../sync";

// node env has no localStorage/crypto DOM globals — stub a minimal store.
const store = new Map<string, string>();
const fetchMock = vi.fn();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("newSyncId", () => {
  it("is 26 chars of [a-z0-9] and unique", () => {
    const a = newSyncId();
    const b = newSyncId();
    expect(a).toMatch(/^[a-z0-9]{26}$/);
    expect(a).not.toBe(b);
  });
});

describe("push/pull", () => {
  it("push is a no-op with no sync state", async () => {
    await pushConfig(DEFAULT_CONFIG);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("push posts the pass code and records the returned version", async () => {
    const id = await seedState();
    fetchMock.mockResolvedValueOnce(jsonResponse({ version: 42 }));
    await pushConfig(DEFAULT_CONFIG);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/sync/${id}`,
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.code).toBe(encodePass(DEFAULT_CONFIG));
    expect(loadSyncState()?.lastVersion).toBe(42);
  });

  it("pull adopts a newer remote config and bumps lastVersion", async () => {
    await seedState(5);
    const remote = { ...DEFAULT_CONFIG, dayPassMin: 10 };
    fetchMock.mockResolvedValueOnce(jsonResponse({ code: encodePass(remote), version: 9 }));
    const applied = await pullConfig();
    expect(applied?.dayPassMin).toBe(10);
    expect(loadSyncState()?.lastVersion).toBe(9);
  });

  it("pull ignores stale and equal versions", async () => {
    await seedState(9);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: encodePass(DEFAULT_CONFIG), version: 9 }),
    );
    expect(await pullConfig()).toBeNull();
  });

  it("pull ignores garbage codes", async () => {
    await seedState(0);
    fetchMock.mockResolvedValueOnce(jsonResponse({ code: "TGP1.garbage!", version: 99 }));
    expect(await pullConfig()).toBeNull();
    expect(loadSyncState()?.lastVersion).toBe(0);
  });

  it("push survives network failure silently", async () => {
    await seedState(3);
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(pushConfig(DEFAULT_CONFIG)).resolves.toBeUndefined();
    expect(loadSyncState()?.lastVersion).toBe(3);
  });
});

describe("createSync / joinSync", () => {
  it("createSync stores a fresh id and pushes", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ version: 1 }));
    const id = await createSync(DEFAULT_CONFIG);
    expect(id).toMatch(/^[a-z0-9]{26}$/);
    expect(loadSyncState()?.id).toBe(id);
  });

  it("joinSync adopts the remote config when the relay has one", async () => {
    const remote = { ...DEFAULT_CONFIG, dayPassMin: 5 };
    fetchMock.mockResolvedValueOnce(jsonResponse({ code: encodePass(remote), version: 7 }));
    const id = newSyncId();
    const applied = await joinSync(id, DEFAULT_CONFIG);
    expect(applied?.dayPassMin).toBe(5);
    expect(loadSyncState()).toEqual({ id, lastVersion: 7 });
  });

  it("joinSync claims an empty id by pushing local config", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "nope" }, 404))
      .mockResolvedValueOnce(jsonResponse({ version: 2 }));
    const applied = await joinSync(newSyncId(), DEFAULT_CONFIG);
    expect(applied).toEqual(DEFAULT_CONFIG);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("joinSync rejects malformed ids", async () => {
    expect(await joinSync("short", DEFAULT_CONFIG)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("relay route", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "tg-sync-"));
    process.env.TG_SYNC_DIR = dir;
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.TG_SYNC_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  async function handlers() {
    // route reads TG_SYNC_DIR at import time — fresh import per test dir
    return import("../../app/api/sync/[id]/route");
  }

  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const post = (body: unknown) =>
    new Request("http://localhost/api/sync/x", {
      method: "POST",
      body: JSON.stringify(body),
    });

  it("roundtrips a pass code with a version stamp", async () => {
    const { GET, POST } = await handlers();
    const id = newSyncId();
    const code = encodePass(DEFAULT_CONFIG);

    const posted = await POST(post({ code }), ctx(id));
    expect(posted.status).toBe(200);
    const { version } = await posted.json();
    expect(typeof version).toBe("number");

    const got = await GET(new Request("http://localhost"), ctx(id));
    expect(got.status).toBe(200);
    await expect(got.json()).resolves.toEqual({ code, version });
  });

  it("404s unknown ids and 400s bad ids/codes", async () => {
    const { GET, POST } = await handlers();
    expect((await GET(new Request("http://localhost"), ctx(newSyncId()))).status).toBe(404);
    expect((await GET(new Request("http://localhost"), ctx("../etc/passwd"))).status).toBe(400);
    expect((await POST(post({ code: "TGP1.nope!" }), ctx(newSyncId()))).status).toBe(400);
    expect((await POST(post({}), ctx(newSyncId()))).status).toBe(400);
  });
});

async function seedState(lastVersion = 0): Promise<string> {
  const id = newSyncId();
  store.set("tg-sync-v1", JSON.stringify({ id, lastVersion }));
  return id;
}
