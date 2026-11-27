import { describe, expect, it } from "vitest";
import { createMemoryStore, isValidTabId, RATE_LIMIT_PER_MIN, visitorKey } from "./presence";
import { PRESENCE_WINDOW_MS } from "./presenceConfig";

describe("presence (memory store)", () => {
  it("counts each tab once and refreshes on heartbeat", async () => {
    const s = createMemoryStore();
    await s.beat("tab-aaaaaaaa", "v1", 1000);
    await s.beat("tab-bbbbbbbb", "v2", 1000);
    const again = await s.beat("tab-aaaaaaaa", "v1", 5000);
    expect(again.count).toBe(2);
  });

  it("drops tabs that stop sending heartbeats", async () => {
    const s = createMemoryStore();
    await s.beat("tab-aaaaaaaa", "v1", 0);
    await s.beat("tab-bbbbbbbb", "v1", 30_000);
    expect(await s.count(PRESENCE_WINDOW_MS + 1)).toBe(1);
    expect(await s.count(30_000 + PRESENCE_WINDOW_MS + 1)).toBe(0);
  });

  it("removes a tab immediately when it leaves", async () => {
    const s = createMemoryStore();
    await s.beat("tab-aaaaaaaa", "v1", 0);
    await s.leave("tab-aaaaaaaa");
    expect(await s.count(1)).toBe(0);
  });

  it("rate-limits one visitor flooding fake tabs", async () => {
    const s = createMemoryStore();
    let last = { count: 0, limited: false };
    for (let i = 0; i < RATE_LIMIT_PER_MIN + 25; i++) last = await s.beat(`fake-${String(i).padStart(8, "0")}`, "spammer", 1000);
    expect(last.limited).toBe(true);
    expect(await s.count(1000)).toBe(RATE_LIMIT_PER_MIN);
  });

  it("validates tab ids and hashes visitor IPs", () => {
    expect(isValidTabId("3f1c2b9a-1d2e-4c5b-8a7f-0e9d8c7b6a5f")).toBe(true);
    expect(isValidTabId("short")).toBe(false);
    expect(isValidTabId("bad id with spaces")).toBe(false);
    expect(isValidTabId(42)).toBe(false);
    expect(visitorKey("203.0.113.7")).not.toContain("203");
    expect(visitorKey("203.0.113.7")).toHaveLength(24);
  });
});
