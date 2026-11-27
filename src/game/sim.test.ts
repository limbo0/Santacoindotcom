import { describe, expect, it } from "vitest";
import {
  createGame,
  GIFT_SIZE,
  GIFT_START_Y,
  GRAVITY,
  simulate,
  SLEIGH_X,
  step,
  TICK_RATE,
  type GameState,
} from "./sim";

/** Ticks for a fresh gift to fall `dist` px (matches the sim's integration). */
function fallTicks(dist: number): number {
  let y = 0;
  let vy = 1.5;
  let k = 0;
  while (y < dist) {
    vy += GRAVITY;
    y += vy;
    k++;
  }
  return k;
}

/**
 * A bot that aims at the next open chimney with a per-house timing error of
 * up to ±jitter ticks — a rough stand-in for human reaction accuracy.
 */
function playBot(seed: number, jitter: number, maxTicks = TICK_RATE * 60 * 10): GameState {
  const s = createGame(seed);
  let noise = seed ^ 0x9e3779b9;
  const nextNoise = () => {
    noise = (Math.imul(noise, 1664525) + 1013904223) | 0;
    return ((noise >>> 0) / 4294967296) * 2 - 1;
  };
  const aimed = new Set<number>();
  const errors = new Map<number, number>();
  while (!s.over && s.tick < maxTicks) {
    let drop = false;
    const v = s.speed;
    for (const h of s.houses) {
      if (h.state !== "open" || aimed.has(h.id)) continue;
      const centre = h.x + h.chimneyOffset + h.chimneyWidth / 2;
      if (centre < SLEIGH_X) continue;
      if (!errors.has(h.id)) errors.set(h.id, Math.round(nextNoise() * jitter));
      const n = fallTicks(h.chimneyTop - (GIFT_START_Y + GIFT_SIZE / 2));
      const lead = (n + errors.get(h.id)!) * v;
      if (centre - lead <= SLEIGH_X + v / 2) {
        drop = true;
        aimed.add(h.id);
      }
      break;
    }
    step(s, drop);
  }
  return s;
}

describe("simulation", () => {
  it("is deterministic for a seed", () => {
    const a = playBot(42, 3);
    const b = playBot(42, 3);
    expect(a.score).toBe(b.score);
    expect(a.tick).toBe(b.tick);
    expect(a.drops).toEqual(b.drops);
  });

  it("replays a live game from seed + drops to the identical result", () => {
    for (const seed of [1, 7, 1234, 99999, 0xdeadbeef]) {
      const live = playBot(seed, 4);
      const replay = simulate(seed, live.drops);
      expect(replay.score).toBe(live.score);
      expect(replay.tick).toBe(live.tick);
      expect(replay.deliveries).toBe(live.deliveries);
      expect(replay.lives).toBe(live.lives);
    }
  });

  it("rejects a forged input log (different drops give a different game)", () => {
    const live = playBot(5, 2);
    const forged = simulate(5, live.drops.map((t) => t + 3));
    expect(forged.score).not.toBe(live.score);
  });

  it("ends with no input once enough houses pass", () => {
    const s = simulate(3, []);
    expect(s.over).toBe(true);
    expect(s.score).toBe(0);
    expect(s.tick).toBeLessThan(TICK_RATE * 20);
  });

  it("spamming the drop button loses quickly", () => {
    const s = createGame(11);
    while (!s.over && s.tick < TICK_RATE * 60) step(s, true);
    expect(s.over).toBe(true);
  });

  it("a precise player can survive a long time", () => {
    const s = playBot(8, 0, TICK_RATE * 60 * 4);
    expect(s.tick).toBeGreaterThan(TICK_RATE * 60 * 3);
  });
});

describe.skipIf(!process.env.TUNE)("difficulty report (TUNE=1)", () => {
  it("prints survival by timing accuracy", () => {
    const rows: string[] = [];
    for (const jitter of [0, 1, 2, 3, 4, 6]) {
      const runs = Array.from({ length: 40 }, (_, i) => playBot(1000 + i, jitter));
      const secs = runs.map((r) => r.tick / TICK_RATE).sort((a, b) => a - b);
      const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      rows.push(
        `±${jitter} ticks: median ${secs[20].toFixed(0)}s, avg score ${avg(runs.map((r) => r.score)).toFixed(0)}, avg deliveries ${avg(runs.map((r) => r.deliveries)).toFixed(0)}`,
      );
    }
    console.log(rows.join("\n"));
  });
});
