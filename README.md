# Santa Coin

Landing page for Santa Coin plus **Santacoindotcom**, a one-button Christmas game. Next.js (App Router) on Vercel.

- `/`: landing page
- `/play`: the game

## Launch day

Edit `src/config/site.ts`: set `contractAddress` and `pumpFunUrl`, then push. The hero, ticker and "How to get Santa Coin" section switch from "launching soon" to showing the address (with a copy button) and a "Buy on pump.fun" button.

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
