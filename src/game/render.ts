/**
 * Canvas renderer + cosmetic effects for the Santacoindotcom game.
 * Nothing here affects game rules, so it is free to use Math.random, time, etc.
 */
import {
  GIFT_SIZE,
  GROUND_Y,
  HEIGHT,
  multiplierFor,
  SLEIGH_X,
  SLEIGH_Y,
  WIDTH,
  type GameEvent,
  type GameState,
  type House,
} from "./sim";

type Phase = "ready" | "playing" | "over";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  max: number;
}

interface Flake {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
}

const WALLS = ["#8c3b2f", "#4d5f86", "#7a5a3c", "#3d6a58", "#7d5f93", "#a0674b"];
const ROOFS = ["#3a2626", "#2b2f45", "#3d2f24", "#283b33", "#35283f"];
const GIFTS = ["#e63946", "#2a9d8f", "#f4a261", "#8e7dbe", "#4cc9f0"];
const RIBBONS = ["#ffd166", "#ffffff", "#e63946", "#ffd166", "#ffffff"];
const BULBS = ["#ff4d6d", "#ffd166", "#06d6a0", "#4cc9f0", "#f72585"];

function hash(n: number): number {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export class Scene {
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private flakes: Flake[] = [];
  private stars: { x: number; y: number; r: number; p: number }[] = [];
  private shake = 0;
  private lastMultiplier = 1;

  constructor(private font: string) {
    for (let i = 0; i < 90; i++) {
      this.flakes.push({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        r: 0.8 + Math.random() * 2.2,
        speed: 18 + Math.random() * 40,
        drift: Math.random() * Math.PI * 2,
      });
    }
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: hash(i * 3 + 1) * WIDTH,
        y: hash(i * 3 + 2) * 420,
        r: 0.5 + hash(i * 3 + 3) * 1.4,
        p: hash(i * 7) * Math.PI * 2,
      });
    }
  }

  reset(): void {
    this.particles = [];
    this.popups = [];
    this.shake = 0;
    this.lastMultiplier = 1;
  }

  handle(events: GameEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case "hit": {
          const label = e.perfect ? `PERFECT +${e.points}` : `+${e.points}`;
          this.popup(e.x, e.y - 24, label, e.perfect ? "#ffd166" : "#ffffff", e.perfect ? 24 : 22);
          this.burst(e.x, e.y, e.perfect ? 26 : 14, ["#ffd166", "#fff3b0", "#ffffff"], 160);
          if (e.multiplier > this.lastMultiplier) {
            this.popup(WIDTH / 2, 330, `x${e.multiplier} COMBO!`, "#06d6a0", 34);
          }
          this.lastMultiplier = e.multiplier;
          break;
        }
        case "extra":
          this.burst(e.x, e.y, 6, ["#ffffff"], 80);
          break;
        case "miss":
          this.popup(e.x, e.y - 20, "MISS", "#ff8fa3", 22);
          this.burst(e.x, e.y, 16, ["#ffffff", "#dbe7ff"], 120);
          this.lastMultiplier = 1;
          break;
        case "passed":
          this.popup(Math.max(60, e.x), e.y - 20, "No gift!", "#ff8fa3", 22);
          this.lastMultiplier = 1;
          break;
        case "life":
          if (e.delta < 0) this.shake = 12;
          else this.popup(WIDTH - 70, 80, "+1 ♥", "#ff4d6d", 24);
          break;
      }
    }
  }

  private popup(x: number, y: number, text: string, color: string, size: number) {
    this.popups.push({ x, y, text, color, size, life: 0, max: 1.1 });
  }

  private burst(x: number, y: number, n: number, colors: string[], power: number) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const sp = power * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        max: 0.6 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 2.5,
        color: colors[i % colors.length],
        gravity: 380,
      });
    }
  }

  update(dt: number): void {
    for (const f of this.flakes) {
      f.y += f.speed * dt;
      f.drift += dt;
      f.x += Math.sin(f.drift) * 12 * dt - 10 * dt;
      if (f.y > HEIGHT + 4) {
        f.y = -4;
        f.x = Math.random() * WIDTH;
      }
      if (f.x < -4) f.x = WIDTH + 4;
    }
    for (const p of this.particles) {
      p.life += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    for (const p of this.popups) {
      p.life += dt;
      p.y -= 40 * dt;
    }
    this.popups = this.popups.filter((p) => p.life < p.max);
    this.shake = Math.max(0, this.shake - 40 * dt);
  }

  draw(ctx: CanvasRenderingContext2D, s: GameState, t: number, phase: Phase): void {
    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    this.drawSky(ctx, t);
    this.drawBackdrop(ctx, s.distance);
    for (const h of s.houses) {
      if (h.x > WIDTH + 20 || h.x + h.width < -20) continue;
      this.drawHouse(ctx, h, t);
    }
    this.drawGround(ctx);
    if (phase === "playing") this.drawGuide(ctx);
    for (const g of s.gifts) this.drawGift(ctx, SLEIGH_X, g.y, g.style, g.vy * 0.03);
    this.drawSleigh(ctx, SLEIGH_X, SLEIGH_Y + Math.sin(t * 2.6) * 4, t);
    this.drawParticles(ctx);
    this.drawSnow(ctx);
    ctx.restore();
    if (phase !== "ready") this.drawHud(ctx, s, t);
    this.drawPopups(ctx);
  }

  // -- background ----------------------------------------------------------

  private drawSky(ctx: CanvasRenderingContext2D, t: number) {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, "#070b1f");
    g.addColorStop(0.55, "#142250");
    g.addColorStop(1, "#2b3f7d");
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, WIDTH + 40, HEIGHT + 40);

    for (const st of this.stars) {
      ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.3 + st.p));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(st.x, st.y, st.r, st.r);
    }
    ctx.globalAlpha = 1;

    // moon
    const mx = 380;
    const my = 120;
    const glow = ctx.createRadialGradient(mx, my, 20, mx, my, 110);
    glow.addColorStop(0, "rgba(255,246,214,0.35)");
    glow.addColorStop(1, "rgba(255,246,214,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(mx - 110, my - 110, 220, 220);
    ctx.fillStyle = "#fdf3d2";
    ctx.beginPath();
    ctx.arc(mx, my, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(200,190,160,0.35)";
    ctx.beginPath();
    ctx.arc(mx - 10, my - 6, 6, 0, Math.PI * 2);
    ctx.arc(mx + 12, my + 10, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBackdrop(ctx: CanvasRenderingContext2D, distance: number) {
    // far hills
    const off = distance * 0.12;
    ctx.fillStyle = "#1d2b57";
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= WIDTH + 20; x += 16) {
      const wx = x + off;
      ctx.lineTo(x, 560 + 38 * Math.sin(wx * 0.006) + 18 * Math.sin(wx * 0.019));
    }
    ctx.lineTo(WIDTH, GROUND_Y);
    ctx.fill();

    // mid pines
    const spacing = 46;
    const off2 = distance * 0.3;
    const first = Math.floor(off2 / spacing) - 1;
    ctx.fillStyle = "#15204a";
    for (let i = first; i < first + WIDTH / spacing + 3; i++) {
      const x = i * spacing - off2 + hash(i) * 20;
      const h = 50 + hash(i + 999) * 70;
      const base = 680;
      ctx.beginPath();
      ctx.moveTo(x, base - h);
      ctx.lineTo(x - h * 0.28, base);
      ctx.lineTo(x + h * 0.28, base);
      ctx.fill();
    }
    ctx.fillRect(0, 676, WIDTH, GROUND_Y - 676);
  }

  private drawGround(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#dfe8f6";
    ctx.fillRect(-20, GROUND_Y, WIDTH + 40, HEIGHT - GROUND_Y + 20);
    ctx.fillStyle = "#c3d1ea";
    ctx.fillRect(-20, GROUND_Y + 22, WIDTH + 40, 3);
  }

  private drawGuide(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.13)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.moveTo(SLEIGH_X, SLEIGH_Y + 30);
    ctx.lineTo(SLEIGH_X, GROUND_Y);
    ctx.stroke();
    ctx.restore();
  }

  // -- houses --------------------------------------------------------------

  private drawHouse(ctx: CanvasRenderingContext2D, h: House, t: number) {
    const { x, width: w, wallTop: top, peak, style } = h;
    const cl = x + h.chimneyOffset;
    const cw = h.chimneyWidth;
    const lit = h.state === "delivered";

    // chimney (drawn first so the roof covers its base)
    ctx.fillStyle = "#9b3d2c";
    ctx.fillRect(cl, h.chimneyTop, cw, top - h.chimneyTop);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for (let y = h.chimneyTop + 9; y < top; y += 9) ctx.fillRect(cl, y, cw, 1.5);

    // smoke from delivered chimneys
    if (lit) {
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.6 + i / 3 + (style % 100) / 100) % 1;
        ctx.fillStyle = `rgba(220,228,245,${0.35 * (1 - ph)})`;
        ctx.beginPath();
        ctx.arc(cl + cw / 2 + Math.sin(ph * 6 + i) * 6, h.chimneyTop - 10 - ph * 50, 5 + ph * 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // wall
    ctx.fillStyle = WALLS[style % WALLS.length];
    ctx.fillRect(x, top, w, GROUND_Y - top + 2);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(x + w - 10, top, 10, GROUND_Y - top + 2);

    // windows
    const cols = w > 150 ? 3 : 2;
    const rows = GROUND_Y - top > 190 ? 2 : 1;
    const ww = 22;
    const wh = 26;
    const gapX = (w - cols * ww) / (cols + 1);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = x + gapX + c * (ww + gapX);
        const wy = top + 26 + r * 62;
        if (lit) {
          ctx.fillStyle = "rgba(255,209,102,0.22)";
          ctx.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
          ctx.fillStyle = "#ffd56b";
        } else {
          ctx.fillStyle = h.state === "failed" ? "#2a2238" : "#26335c";
        }
        ctx.fillRect(wx, wy, ww, wh);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
        ctx.fillRect(wx, wy + wh / 2 - 1, ww, 2);
      }
    }

    // door
    const dw = 26;
    const dh = 42;
    const dx = x + w / 2 - dw / 2;
    ctx.fillStyle = "#2b1a14";
    ctx.fillRect(dx, GROUND_Y - dh, dw, dh);
    if (lit) {
      ctx.strokeStyle = "#2f9e44";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(dx + dw / 2, GROUND_Y - dh + 14, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#e63946";
      ctx.fillRect(dx + dw / 2 - 2, GROUND_Y - dh + 19, 4, 4);
    }

    // roof (eaves extend along the same slope used for collisions)
    const eave = 8;
    const eaveDrop = (eave * peak) / (w / 2);
    ctx.fillStyle = ROOFS[style % ROOFS.length];
    ctx.beginPath();
    ctx.moveTo(x - eave, top + eaveDrop);
    ctx.lineTo(x + w / 2, top - peak);
    ctx.lineTo(x + w + eave, top + eaveDrop);
    ctx.closePath();
    ctx.fill();

    // snow on roof
    ctx.strokeStyle = "#f1f6ff";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x - eave, top + eaveDrop - 2);
    ctx.lineTo(x + w / 2, top - peak - 2);
    ctx.lineTo(x + w + eave, top + eaveDrop - 2);
    ctx.stroke();

    // string lights on delivered houses
    if (lit) {
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const f = i / n;
        const lx = x - eave + f * (w + eave * 2);
        const ly = f < 0.5 ? top + eaveDrop + 4 - (f / 0.5) * (peak + eaveDrop) : top + eaveDrop + 4 - ((1 - f) / 0.5) * (peak + eaveDrop);
        const on = Math.sin(t * 4 + i * 1.7) > -0.3;
        ctx.fillStyle = on ? BULBS[(i + style) % BULBS.length] : "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.arc(lx, ly + 3, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // chimney cap + opening
    ctx.fillStyle = "#7d2e21";
    ctx.fillRect(cl - 3, h.chimneyTop - 1, cw + 6, 7);
    ctx.fillStyle = "#f1f6ff";
    ctx.beginPath();
    ctx.roundRect(cl - 4, h.chimneyTop - 6, cw + 8, 7, 3);
    ctx.fill();
    ctx.fillStyle = h.state === "open" ? "#120a08" : "#3a2620";
    ctx.fillRect(cl + 5, h.chimneyTop - 4, cw - 10, 3);
  }

  // -- sleigh & gifts ------------------------------------------------------

  private drawSleigh(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
    // reindeer + reins
    const deer = [
      { x: x + 76, y: y - 18 + Math.sin(t * 7) * 2 },
      { x: x + 128, y: y - 26 + Math.sin(t * 7 + 1.4) * 2 },
    ];
    ctx.strokeStyle = "#d4a72c";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 24, y - 10);
    ctx.lineTo(deer[0].x - 6, deer[0].y);
    ctx.moveTo(deer[0].x + 12, deer[0].y - 2);
    ctx.lineTo(deer[1].x - 6, deer[1].y);
    ctx.stroke();
    deer.forEach((d, i) => this.drawReindeer(ctx, d.x, d.y, t + i, i === 1));

    // sack
    ctx.fillStyle = "#7a5230";
    ctx.beginPath();
    ctx.arc(x - 26, y - 22, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = GIFTS[0];
    ctx.fillRect(x - 33, y - 40, 10, 10);
    ctx.fillStyle = GIFTS[1];
    ctx.fillRect(x - 24, y - 37, 9, 9);

    // santa
    ctx.fillStyle = "#c1121f";
    ctx.beginPath();
    ctx.arc(x - 6, y - 20, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f1c9a5";
    ctx.beginPath();
    ctx.arc(x - 2, y - 36, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x + 1, y - 30, 7, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "#c1121f";
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 40);
    ctx.lineTo(x + 6, y - 40);
    ctx.quadraticCurveTo(x - 2, y - 54, x - 14, y - 52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 11, y - 43, 18, 4);
    ctx.beginPath();
    ctx.arc(x - 14, y - 52, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // sleigh body
    ctx.fillStyle = "#b5121b";
    ctx.beginPath();
    ctx.moveTo(x - 40, y - 26);
    ctx.quadraticCurveTo(x - 44, y + 6, x - 26, y + 8);
    ctx.lineTo(x + 16, y + 8);
    ctx.quadraticCurveTo(x + 32, y + 6, x + 32, y - 10);
    ctx.quadraticCurveTo(x + 32, y - 18, x + 24, y - 16);
    ctx.lineTo(x - 22, y - 12);
    ctx.quadraticCurveTo(x - 30, y - 14, x - 32, y - 26);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // runners
    ctx.strokeStyle = "#e0b23a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 36, y + 17);
    ctx.lineTo(x + 24, y + 17);
    ctx.quadraticCurveTo(x + 40, y + 17, x + 38, y + 4);
    ctx.moveTo(x - 20, y + 8);
    ctx.lineTo(x - 20, y + 17);
    ctx.moveTo(x + 8, y + 8);
    ctx.lineTo(x + 8, y + 17);
    ctx.stroke();
  }

  private drawReindeer(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, lead: boolean) {
    ctx.strokeStyle = "#6b4423";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const lx = x - 9 + i * 6;
      const sw = Math.sin(t * 9 + i * 1.6) * 5;
      ctx.moveTo(lx, y + 4);
      ctx.lineTo(lx + sw, y + 15);
    }
    ctx.stroke();
    ctx.fillStyle = "#8b5a2b";
    ctx.beginPath();
    ctx.ellipse(x, y, 15, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 10, y - 3);
    ctx.lineTo(x + 16, y - 12);
    ctx.lineTo(x + 20, y - 9);
    ctx.lineTo(x + 15, y + 1);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 21, y - 12, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c9a26b";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x + 18, y - 15);
    ctx.lineTo(x + 15, y - 24);
    ctx.moveTo(x + 16, y - 20);
    ctx.lineTo(x + 11, y - 22);
    ctx.moveTo(x + 21, y - 16);
    ctx.lineTo(x + 22, y - 25);
    ctx.stroke();
    if (lead) {
      const glow = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.fillStyle = `rgba(255,59,59,${0.25 + glow * 0.25})`;
      ctx.beginPath();
      ctx.arc(x + 27, y - 12, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff3b3b";
    } else {
      ctx.fillStyle = "#2b1a14";
    }
    ctx.beginPath();
    ctx.arc(x + 27, y - 12, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGift(ctx: CanvasRenderingContext2D, x: number, y: number, style: number, tilt: number) {
    const s = GIFT_SIZE;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.min(0.25, tilt));
    ctx.fillStyle = GIFTS[style % GIFTS.length];
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.fillStyle = RIBBONS[style % RIBBONS.length];
    ctx.fillRect(-2.5, -s / 2, 5, s);
    ctx.fillRect(-s / 2, -2.5, s, 5);
    ctx.beginPath();
    ctx.ellipse(-5, -s / 2 - 3, 5, 3.5, -0.5, 0, Math.PI * 2);
    ctx.ellipse(5, -s / 2 - 3, 5, 3.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // -- overlays ------------------------------------------------------------

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawSnow(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (const f of this.flakes) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPopups(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const p of this.popups) {
      const k = p.life / p.max;
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      ctx.font = `700 ${p.size}px ${this.font}`;
      const half = ctx.measureText(p.text).width / 2 + 10;
      const x = Math.min(WIDTH - half, Math.max(half, p.x)); // keep popups inside the frame
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(7,11,31,0.85)";
      ctx.strokeText(p.text, x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  private drawHud(ctx: CanvasRenderingContext2D, s: GameState, t: number) {
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `600 13px ${this.font}`;
    ctx.fillText("SCORE", 20, 34);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 34px ${this.font}`;
    ctx.fillText(String(s.score), 20, 68);

    const mult = multiplierFor(s.streak);
    if (s.streak > 0) {
      const label = mult > 1 ? `x${mult}  ·  ${s.streak} streak` : `${s.streak} streak`;
      ctx.font = `600 14px ${this.font}`;
      const w = ctx.measureText(label).width + 20;
      ctx.fillStyle = mult > 1 ? "rgba(6,214,160,0.9)" : "rgba(255,255,255,0.16)";
      ctx.beginPath();
      ctx.roundRect(20, 80, w, 24, 12);
      ctx.fill();
      ctx.fillStyle = mult > 1 ? "#05291f" : "#ffffff";
      ctx.fillText(label, 30, 97);
    }

    for (let i = 0; i < 3; i++) {
      const full = i < s.lives;
      const pulse = full && s.lives === 1 ? 1 + Math.sin(t * 8) * 0.08 : 1;
      this.drawHeart(ctx, WIDTH - 32 - i * 32, 44, 12 * pulse, full);
    }
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, full: boolean) {
    ctx.beginPath();
    ctx.moveTo(x, y + r);
    ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.9, y - r * 1.4, x, y - r * 0.5);
    ctx.bezierCurveTo(x + r * 0.9, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r);
    ctx.closePath();
    if (full) {
      ctx.fillStyle = "#ff4d6d";
      ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}
