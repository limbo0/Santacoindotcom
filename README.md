# Santa Coin

Landing page for Santa Coin plus **Santacoindotcom**, a one-button Christmas game. Next.js (App Router) on Vercel.

- `/`: landing page
- `/play`: the game

## Launch day

Edit `src/config/site.ts`: set `contractAddress` and `pumpFunUrl`, then push. The hero, ticker and "How to get Santa Coin" section switch from "launching soon" to showing the address (with a copy button) and a "Buy on pump.fun" button.

## "Playing now" counter

Open game tabs send a heartbeat to `/api/presence` every 25 s while visible; the count is the number of tabs seen in the last 70 s, stored in Upstash Redis.

Setup on Vercel: **Storage → Create Database → Upstash (Redis)** and connect it to this project. That adds `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`); redeploy afterwards. Without them the counter hides itself in production. Locally it uses an in-memory store (`next dev`, or `PRESENCE_MEMORY=1 next start`).

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # game simulation tests (TUNE=1 npm test prints a difficulty report)
npm run lint
npm run build
```

## Game architecture

- `src/game/sim.ts`: deterministic rules (seeded RNG, fixed 60 Hz ticks). A game is fully reproduced from `seed` + recorded drop ticks, so a server can recompute scores for the future wallet leaderboard instead of trusting submitted numbers.
- `src/game/render.ts`: canvas drawing and effects (cosmetic only).
- `src/game/Game.tsx`: the playable React component.
- `src/game/GamePreview.tsx` + `bot.ts`: the self-playing preview on the landing page.

Fonts: Fredoka and Luckiest Guy (Google Fonts). The Luckiest Guy file in `assets/fonts` is used for the share image and is licensed under Apache 2.0 (see `assets/fonts/LICENSE-luckiest-guy.txt`).
