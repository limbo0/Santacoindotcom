"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { COUNT_POLL_MS, HEARTBEAT_MS } from "./presenceConfig";

const ENDPOINT = "/api/presence";

function newTabId(): string {
  const c = globalThis.crypto;
  // randomUUID is missing on older browsers and on plain-http pages.
  if (typeof c.randomUUID === "function") return c.randomUUID();
  return Array.from(c.getRandomValues(new Uint8Array(16)), (n) => n.toString(16).padStart(2, "0")).join("");
}

const asCount = (v: unknown) => (typeof v === "number" && v >= 0 ? v : null);

/**
 * Keeps this tab counted as "playing" while it is visible, and returns the
 * live player count (null if the counter isn't available).
 */
export function usePresenceHeartbeat(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const id = newTabId();
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const beat = async () => {
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (alive) setCount(asCount(data.count));
      } catch {
        if (alive) setCount(null);
      }
    };
    const leave = () => {
      const body = JSON.stringify({ id, leave: true });
      if (!navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }))) {
        fetch(ENDPOINT, { method: "POST", body, keepalive: true }).catch(() => {});
      }
    };
    const start = () => {
      if (timer) return;
      void beat();
      timer = setInterval(beat, HEARTBEAT_MS);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = undefined;
      leave();
    };
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", stop);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", stop);
      stop();
    };
  }, []);

  return count;
}

// --- read-only count, one shared poller per page ------------------------------

let current: number | null = null;
const listeners = new Set<() => void>();
let pollTimer: ReturnType<typeof setInterval> | undefined;

async function poll() {
  if (document.visibilityState !== "visible") return;
  try {
    const res = await fetch(ENDPOINT);
    current = asCount((await res.json()).count);
  } catch {
    current = null;
  }
  listeners.forEach((l) => l());
}

function onVisible() {
  if (document.visibilityState === "visible") void poll();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    void poll();
    pollTimer = setInterval(poll, COUNT_POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}

/** Live "playing now" count for pages that only display it. */
export function usePlayingCount(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
