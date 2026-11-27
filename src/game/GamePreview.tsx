"use client";

import { useEffect, useRef } from "react";
import { createBot } from "./bot";
import { Scene } from "./render";
import { createGame, HEIGHT, step, TICK_RATE, WIDTH, type GameState } from "./sim";

/**
 * Attract-mode preview: a bot plays the real game in a non-interactive canvas.
 * Pauses when scrolled off screen; shows a still frame for reduced motion.
 */
export default function GamePreview({ fontFamily = "system-ui, sans-serif" }: { fontFamily?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = boxRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new Scene(fontFamily);

    let game: GameState;
    let bot: (s: GameState) => boolean;
    let overFor = 0;
    const newGame = () => {
      game = createGame((Math.random() * 2 ** 32) >>> 0);
      bot = createBot(3, game.seed);
      scene.reset();
      // Skip the quiet opening so the preview starts mid-action.
      for (let i = 0; i < 420 && !game.over; i++) {
        step(game, bot(game));
        scene.handle(game.events);
        scene.update(1 / TICK_RATE);
      }
      overFor = 0;
    };
    newGame();

    let scale = 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const draw = (t: number) => {
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      scene.draw(ctx, game, t, "playing");
    };
    const resize = () => {
      scale = box.clientWidth / WIDTH;
      canvas.width = Math.round(WIDTH * scale * dpr);
      canvas.height = Math.round(HEIGHT * scale * dpr);
      draw(performance.now() / 1000);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();
    if (reduce) return () => ro.disconnect();

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(box);

    const stepDt = 1 / TICK_RATE;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!visible) return;
      if (game.over) {
        overFor += dt;
        if (overFor > 1.2) newGame();
      } else {
        acc += dt;
        while (acc >= stepDt && !game.over) {
          acc -= stepDt;
          step(game, bot(game));
          scene.handle(game.events);
        }
      }
      scene.update(dt);
      draw(now / 1000);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [fontFamily]);

  return (
    <div ref={boxRef} className="relative aspect-[3/5] w-full">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
    </div>
  );
}
