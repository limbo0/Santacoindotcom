/**
 * Santacoindotcom — deterministic game simulation.
 *
 * All game rules live here, separate from rendering, so the exact same code can
 * re-run a game on the server from (seed, drop ticks) and recompute the score.
 * That is what will make the wallet leaderboard trustworthy: clients submit
 * inputs, never scores.
 *
 * Keep this file deterministic:
 *  - only + - * /, Math.floor/round/abs/min/max/imul and the seeded RNG below
 *  - no Math.random, Date, performance.now, Math.sin/cos/pow, or frame-rate
 *    dependent logic (the sim always advances in fixed ticks)
 */

export const TICK_RATE = 60; // ticks per second
export const WIDTH = 480; // logical playfield size (portrait)
export const HEIGHT = 800;
export const GROUND_Y = 730;

export const SLEIGH_X = 100; // gifts fall straight down from here (screen space)
export const SLEIGH_Y = 230;
export const GIFT_SIZE = 22;
export const GIFT_START_Y = SLEIGH_Y + 26; // gift centre when released
const GIFT_START_VY = 1.5;
export const GRAVITY = 0.42;

export const DROP_COOLDOWN = 10; // ticks between drops
export const START_LIVES = 3;
export const LIFE_EVERY = 20; // regain a life every N deliveries (up to START_LIVES)
export const MAX_TICKS = TICK_RATE * 60 * 30; // hard cap: 30 minutes

const MIN_SPEED = 2.4;
const MAX_SPEED = 6.6;
const SPEED_RAMP = 0.0007; // px/tick gained per tick
const CHIMNEY_START = 60;
const CHIMNEY_MIN = 32;
const CHIMNEY_SHRINK = 0.004; // px per tick

export type HouseState = "open" | "delivered" | "failed";

export interface House {
  id: number;
  x: number; // left edge of the wall, screen space
  width: number;
  wallTop: number; // y where the wall meets the eaves
  peak: number; // roof height above wallTop at the ridge
  chimneyOffset: number; // chimney left edge relative to x
  chimneyWidth: number;
  chimneyTop: number; // absolute y of the chimney opening
  state: HouseState;
  style: number; // cosmetic variant for the renderer
}

export interface Gift {
  id: number;
  y: number; // centre; x is always SLEIGH_X
  vy: number;
  target: number; // house the player was aiming at when dropped (-1 if none)
  style: number;
}

export type MissReason = "roof" | "chimney" | "ground";

export type GameEvent =
  | { type: "drop"; giftId: number }
  | {
      type: "hit";
      x: number;
      y: number;
      points: number;
      perfect: boolean;
      multiplier: number;
      houseId: number;
    }
  | { type: "extra"; x: number; y: number } // gift into an already-handled chimney
  | { type: "miss"; x: number; y: number; reason: MissReason }
  | { type: "passed"; x: number; y: number; houseId: number }
  | { type: "life"; lives: number; delta: number }
  | { type: "over" };

export interface GameState {
  seed: number;
  rng: number;
  tick: number;
  speed: number;
  distance: number;
  houses: House[];
  gifts: Gift[];
  nextId: number;
  lastDropTick: number;
  lives: number;
  score: number;
  streak: number;
  bestStreak: number;
  deliveries: number;
  perfects: number;
  over: boolean;
  /** Ticks on which a drop was accepted. Together with `seed` this fully reproduces the game. */
  drops: number[];
  /** Events produced by the most recent step (for effects/sound). */
  events: GameEvent[];
}

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32)

function rand(s: GameState): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function range(s: GameState, min: number, max: number): number {
  return min + (max - min) * rand(s);
}

// ---------------------------------------------------------------------------
// Difficulty curve

export function speedAt(tick: number): number {
  return Math.min(MAX_SPEED, MIN_SPEED + tick * SPEED_RAMP);
}

function chimneyWidthAt(s: GameState): number {
  const base = Math.max(CHIMNEY_MIN, CHIMNEY_START - s.tick * CHIMNEY_SHRINK);
  return Math.round(Math.max(CHIMNEY_MIN, base + range(s, -4, 4)));
}

export function multiplierFor(streak: number): number {
  return Math.min(5, 1 + Math.floor(Math.max(0, streak - 1) / 5));
}

// ---------------------------------------------------------------------------
// Geometry

/** Roof surface y at a local x (0..width) — a symmetric gable. */
export function roofYAt(h: House, localX: number): number {
  const half = h.width / 2;
  return h.wallTop - h.peak * (1 - Math.abs(localX - half) / half);
}

function chimneyLeft(h: House): number {
  return h.x + h.chimneyOffset;
}

function spawnHouse(s: GameState, x: number): House {
  const width = Math.round(range(s, 110, 180));
  const wallTop = Math.round(range(s, 470, 620));
  const peak = Math.round(range(s, 40, 72));
  const chimneyWidth = chimneyWidthAt(s);
  const leftSide = rand(s) < 0.5;
  const centre = leftSide ? range(s, 0.26, 0.36) : range(s, 0.64, 0.74);
  let offset = Math.round(width * centre - chimneyWidth / 2);
  offset = Math.max(8, Math.min(width - chimneyWidth - 8, offset));
  const chimneyHeight = Math.round(range(s, 22, 40));

  const h: House = {
    id: s.nextId++,
    x,
    width,
    wallTop,
    peak,
    chimneyOffset: offset,
    chimneyWidth,
    chimneyTop: 0,
    state: "open",
    style: Math.floor(rand(s) * 1_000_000),
  };
  // Chimney top sits above the highest roof point under the chimney.
  const half = width / 2;
  const highest =
    offset <= half && offset + chimneyWidth >= half
      ? wallTop - peak
      : Math.min(roofYAt(h, offset), roofYAt(h, offset + chimneyWidth));
  h.chimneyTop = Math.round(highest - chimneyHeight);
  return h;
}

function nextGap(s: GameState): number {
  return Math.round(range(s, 30, 110) + s.speed * 10);
}

// ---------------------------------------------------------------------------
// Game lifecycle

export function createGame(seed: number): GameState {
  const s: GameState = {
    seed: seed >>> 0,
    rng: seed | 0,
    tick: 0,
    speed: speedAt(0),
    distance: 0,
    houses: [],
    gifts: [],
    nextId: 1,
    lastDropTick: -DROP_COOLDOWN,
    lives: START_LIVES,
    score: 0,
    streak: 0,
    bestStreak: 0,
    deliveries: 0,
    perfects: 0,
    over: false,
    drops: [],
    events: [],
  };
  // Pre-fill the street. Houses already behind (or just ahead of) the sleigh
  // count as delivered so the player gets a moment to read the first chimney.
  let x = -40;
  while (x < WIDTH + 160) {
    const h = spawnHouse(s, x);
    if (chimneyLeft(h) + h.chimneyWidth / 2 < SLEIGH_X + 300) h.state = "delivered";
    s.houses.push(h);
    x += h.width + nextGap(s);
  }
  return s;
}

function loseLife(s: GameState): void {
  s.lives -= 1;
  s.streak = 0;
  s.events.push({ type: "life", lives: s.lives, delta: -1 });
  if (s.lives <= 0 && !s.over) {
    s.over = true;
    s.events.push({ type: "over" });
  }
}

function findTarget(s: GameState): number {
  for (const h of s.houses) {
    if (h.state !== "open") continue;
    if (chimneyLeft(h) + h.chimneyWidth >= SLEIGH_X - GIFT_SIZE / 2) return h.id;
  }
  return -1;
}

/**
 * Advance one tick. `drop` = the player pressed drop since the last tick.
 * Returns true if a gift was released.
 */
export function step(s: GameState, drop: boolean): boolean {
  s.events = [];
  if (s.over) return false;

  s.tick += 1;
  s.speed = speedAt(s.tick);
  s.distance += s.speed;

  // 1. Scroll the street.
  for (const h of s.houses) h.x -= s.speed;
  let last = s.houses[s.houses.length - 1];
  while (last.x + last.width < WIDTH + 160) {
    const h = spawnHouse(s, last.x + last.width + nextGap(s));
    s.houses.push(h);
    last = h;
  }

  // 2. Release a gift.
  let released = false;
  if (drop && s.tick - s.lastDropTick >= DROP_COOLDOWN) {
    const g: Gift = {
      id: s.nextId++,
      y: GIFT_START_Y,
      vy: GIFT_START_VY,
      target: findTarget(s),
      style: Math.floor(rand(s) * 5),
    };
    s.gifts.push(g);
    s.lastDropTick = s.tick;
    s.drops.push(s.tick);
    s.events.push({ type: "drop", giftId: g.id });
    released = true;
  }

  // 3. Gift physics and collisions.
  const half = GIFT_SIZE / 2;
  const gl = SLEIGH_X - half;
  const gr = SLEIGH_X + half;
  const remaining: Gift[] = [];
  for (const g of s.gifts) {
    const prevBottom = g.y + half;
    g.vy += GRAVITY;
    g.y += g.vy;
    const bottom = g.y + half;
    let resolved = false;

    for (const h of s.houses) {
      if (gr <= h.x || gl >= h.x + h.width) continue;
      const cl = chimneyLeft(h);
      const cr = cl + h.chimneyWidth;
      const overChimney = gr > cl && gl < cr;

      if (overChimney && bottom >= h.chimneyTop) {
        const dx = SLEIGH_X - (cl + cr) / 2;
        const clean = prevBottom < h.chimneyTop && Math.abs(dx) <= h.chimneyWidth / 2 - 4;
        if (clean && h.state === "open") {
          const perfect = Math.abs(dx) <= Math.max(4, h.chimneyWidth * 0.16);
          h.state = "delivered";
          s.streak += 1;
          s.bestStreak = Math.max(s.bestStreak, s.streak);
          s.deliveries += 1;
          if (perfect) s.perfects += 1;
          const multiplier = multiplierFor(s.streak);
          const points = (perfect ? 25 : 10) * multiplier;
          s.score += points;
          s.events.push({
            type: "hit",
            x: SLEIGH_X,
            y: h.chimneyTop,
            points,
            perfect,
            multiplier,
            houseId: h.id,
          });
          if (s.deliveries % LIFE_EVERY === 0 && s.lives < START_LIVES) {
            s.lives += 1;
            s.events.push({ type: "life", lives: s.lives, delta: 1 });
          }
        } else if (clean) {
          s.events.push({ type: "extra", x: SLEIGH_X, y: h.chimneyTop });
        } else {
          missGift(s, g, h.chimneyTop, "chimney");
        }
        resolved = true;
        break;
      }

      const localX = SLEIGH_X - h.x;
      if (localX >= 0 && localX <= h.width && bottom >= roofYAt(h, localX)) {
        missGift(s, g, roofYAt(h, localX), "roof");
        resolved = true;
        break;
      }
    }

    if (!resolved && bottom >= GROUND_Y) {
      missGift(s, g, GROUND_Y, "ground");
      resolved = true;
    }
    if (!resolved) remaining.push(g);
    if (s.over) break;
  }
  s.gifts = s.over ? [] : remaining;

  // 4. Chimneys that slipped past without a gift.
  if (!s.over) {
    for (const h of s.houses) {
      if (h.state !== "open") continue;
      if (chimneyLeft(h) + h.chimneyWidth < SLEIGH_X - half) {
        h.state = "failed";
        s.events.push({
          type: "passed",
          x: chimneyLeft(h) + h.chimneyWidth / 2,
          y: h.chimneyTop,
          houseId: h.id,
        });
        loseLife(s);
        if (s.over) break;
      }
    }
  }

  // 5. Cull houses that have scrolled off.
  while (s.houses.length && s.houses[0].x + s.houses[0].width < -60) s.houses.shift();

  if (!s.over && s.tick >= MAX_TICKS) {
    s.over = true;
    s.events.push({ type: "over" });
  }
  return released;
}

function missGift(s: GameState, g: Gift, y: number, reason: MissReason): void {
  s.events.push({ type: "miss", x: SLEIGH_X, y, reason });
  // A missed throw counts against the house you were aiming at, so one
  // mistake never costs two lives (throw missed + house passed).
  const target = s.houses.find((h) => h.id === g.target);
  if (target && target.state === "open") target.state = "failed";
  loseLife(s);
}

/** Re-run a whole game from its seed and recorded drop ticks. */
export function simulate(seed: number, drops: readonly number[], maxTicks = MAX_TICKS): GameState {
  const s = createGame(seed);
  let i = 0;
  while (!s.over && s.tick < maxTicks) {
    const t = s.tick + 1;
    let drop = false;
    while (i < drops.length && drops[i] <= t) {
      if (drops[i] === t) drop = true;
      i++;
    }
    step(s, drop);
  }
  return s;
}
