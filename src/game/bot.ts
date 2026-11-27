import { GIFT_SIZE, GIFT_START_Y, GRAVITY, SLEIGH_X, type GameState } from "./sim";

/** Ticks for a freshly released gift to fall `dist` px (mirrors the sim's integration). */
export function fallTicks(dist: number): number {
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
 * A simple autoplayer that aims at the next open chimney with a per-house
 * timing error of up to ±jitter ticks. Used for the attract-mode preview on
 * the landing page and for difficulty tests.
 */
export function createBot(jitter: number, seed: number) {
  let noise = seed ^ 0x9e3779b9;
  const nextNoise = () => {
    noise = (Math.imul(noise, 1664525) + 1013904223) | 0;
    return ((noise >>> 0) / 4294967296) * 2 - 1;
  };
  const aimed = new Set<number>();
  const errors = new Map<number, number>();

  return (s: GameState): boolean => {
    const v = s.speed;
    for (const h of s.houses) {
      if (h.state !== "open" || aimed.has(h.id)) continue;
      const centre = h.x + h.chimneyOffset + h.chimneyWidth / 2;
      if (centre < SLEIGH_X) continue;
      if (!errors.has(h.id)) errors.set(h.id, Math.round(nextNoise() * jitter));
      const n = fallTicks(h.chimneyTop - (GIFT_START_Y + GIFT_SIZE / 2));
      const lead = (n + errors.get(h.id)!) * v;
      if (centre - lead <= SLEIGH_X + v / 2) {
        aimed.add(h.id);
        errors.delete(h.id);
        return true;
      }
      return false;
    }
    return false;
  };
}
