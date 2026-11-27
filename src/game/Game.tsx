"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Scene } from "./render";
import { createGame, HEIGHT, simulate, step, TICK_RATE, WIDTH, type GameState } from "./sim";

type Phase = "ready" | "playing" | "over";

interface Result {
  score: number;
  deliveries: number;
  perfects: number;
  bestStreak: number;
  seconds: number;
  newBest: boolean;
  verified: boolean;
  seed: number;
  drops: number;
}

// --- personal best (per browser; the real leaderboard comes with wallets) ---
const BEST_KEY = "santacoindotcom:best";
const bestListeners = new Set<() => void>();
function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}
function writeBest(n: number) {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* storage unavailable — best just won't persist */
  }
  bestListeners.forEach((l) => l());
}
function subscribeBest(l: () => void) {
  bestListeners.add(l);
  return () => bestListeners.delete(l);
}

function randomSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

export interface GameProps {
  /** CSS font-family used for canvas text (pass next/font's family). */
  fontFamily?: string;
  /** Optional link shown on the menus (e.g. back to the landing page). */
  homeHref?: string;
}

export default function Game({ fontFamily = "system-ui, sans-serif", homeHref }: GameProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const phaseRef = useRef<Phase>("ready");
  const dropRef = useRef(false);
  const overAtRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("ready");
  const [result, setResult] = useState<Result | null>(null);
  const best = useSyncExternalStore(subscribeBest, readBest, () => 0);

  const start = useCallback(() => {
    gameRef.current = createGame(randomSeed());
    sceneRef.current?.reset();
    dropRef.current = false;
    phaseRef.current = "playing";
    setPhase("playing");
    setResult(null);
  }, []);

  const finish = useCallback((s: GameState) => {
    // Re-run the game from its seed + inputs, exactly as a server will.
    const replay = simulate(s.seed, s.drops);
    const verified = replay.score === s.score && replay.tick === s.tick;
    const prev = readBest();
    if (s.score > prev) writeBest(s.score);
    setResult({
      score: s.score,
      deliveries: s.deliveries,
      perfects: s.perfects,
      bestStreak: s.bestStreak,
      seconds: Math.round(s.tick / TICK_RATE),
      newBest: s.score > prev && s.score > 0,
      verified,
      seed: s.seed,
      drops: s.drops.length,
    });
    overAtRef.current = performance.now();
    phaseRef.current = "over";
    setPhase("over");
  }, []);

  // Main loop: fixed-tick simulation, render every animation frame.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    if (!gameRef.current) gameRef.current = createGame(randomSeed());
    if (!sceneRef.current) sceneRef.current = new Scene(fontFamily);

    let scale = 1;
    let dpr = 1;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      scale = Math.min(r.width / WIDTH, r.height / HEIGHT);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = `${WIDTH * scale}px`;
      canvas.style.height = `${HEIGHT * scale}px`;
      canvas.width = Math.round(WIDTH * scale * dpr);
      canvas.height = Math.round(HEIGHT * scale * dpr);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const stepDt = 1 / TICK_RATE;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); // clamp after tab switches
      last = now;
      const s = gameRef.current!;
      const scene = sceneRef.current!;
      if (phaseRef.current === "playing") {
        acc += dt;
        while (acc >= stepDt) {
          acc -= stepDt;
          const drop = dropRef.current;
          dropRef.current = false;
          step(s, drop);
          scene.handle(s.events);
          if (s.over) {
            acc = 0;
            finish(s);
            break;
          }
        }
      } else {
        acc = 0;
      }
      scene.update(dt);
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      scene.draw(ctx, s, now / 1000, phaseRef.current);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [finish, fontFamily]);

  const press = useCallback(
    (fromKeyboard: boolean) => {
      const p = phaseRef.current;
      if (p === "playing") dropRef.current = true;
      else if (p === "ready") start();
      else if (fromKeyboard && performance.now() - overAtRef.current > 900) start();
    },
    [start],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Space" || e.code === "ArrowDown" || e.code === "Enter" || e.code === "KeyS") {
        e.preventDefault();
        press(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  return (
    <div
      ref={wrapRef}
      onPointerDown={(e) => {
        if (e.button === 0) press(false);
      }}
      className="game-stage relative flex h-full w-full touch-none select-none justify-center overflow-hidden"
      style={{ fontFamily }}
    >
      <canvas ref={canvasRef} className="block" aria-label="Santacoindotcom game" />

      {phase === "ready" && (
        <Overlay>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-200/80">
            A Christmas Eve challenge
          </p>
          <h1 className="mt-3 font-display text-[clamp(1.9rem,8.6vw,2.6rem)] leading-none tracking-wide text-white">
            Santacoindotcom
          </h1>
          <ul className="mt-6 space-y-2 text-left text-[15px] leading-snug text-slate-200">
            <li>🎁 Tap, click or press Space to drop a gift.</li>
            <li>🏠 Every chimney needs one — the sleigh keeps speeding up.</li>
            <li>❄️ Miss a throw or skip a house and you lose a heart.</li>
            <li>✨ Dead-centre drops score PERFECT. Streaks multiply points.</li>
          </ul>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={start}
            className="mt-7 w-full rounded-full bg-red-600 px-8 py-3.5 text-lg font-bold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-500 active:scale-[0.98]"
          >
            Start
          </button>
          {best > 0 && <p className="mt-3 text-sm text-slate-300">Your best: {best}</p>}
          {homeHref && <HomeLink href={homeHref} />}
        </Overlay>
      )}

      {phase === "over" && result && (
        <Overlay>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-200/80">
            {result.newBest ? "New personal best!" : "Out of hearts"}
          </p>
          <p className="mt-2 text-6xl font-bold leading-none text-white tabular-nums">{result.score}</p>
          <dl className="mt-6 grid grid-cols-2 gap-3 text-left">
            <Stat label="Chimneys" value={result.deliveries} />
            <Stat label="Perfects" value={result.perfects} />
            <Stat label="Best streak" value={result.bestStreak} />
            <Stat label="Time" value={`${result.seconds}s`} />
          </dl>
          <button
            type="button"
            autoFocus
            onPointerDown={(e) => e.stopPropagation()}
            onClick={start}
            className="mt-7 w-full rounded-full bg-red-600 px-8 py-3.5 text-lg font-bold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-500 active:scale-[0.98]"
          >
            Play again
          </button>
          <p className="mt-3 text-sm text-slate-300">Best: {Math.max(best, result.score)}</p>
          <p className="mt-4 text-xs text-slate-400">
            {result.verified ? "✓ Score re-verified from replay" : "⚠ Replay mismatch"} · seed {result.seed} ·{" "}
            {result.drops} drops
          </p>
          {homeHref && <HomeLink href={homeHref} />}
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
      <div className="pointer-events-auto w-full max-w-sm rounded-3xl border border-white/10 bg-[#0b1230]/85 p-7 text-center shadow-2xl backdrop-blur-md">
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-2xl font-bold text-white tabular-nums">{value}</dd>
    </div>
  );
}

function HomeLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      onPointerDown={(e) => e.stopPropagation()}
      className="mt-4 inline-block text-sm text-slate-300 underline-offset-4 hover:underline"
    >
      ← Back to Santa Coin
    </a>
  );
}
