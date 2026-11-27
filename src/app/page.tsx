import Link from "next/link";

// Placeholder landing page. Copy and branding are stand-ins until the
// business details are decided.
export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-[#070b1f] via-[#142250] to-[#2b3f7d]">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10 sm:py-16">
        <header className="flex items-center justify-between">
          <span className="text-lg font-bold tracking-wide text-white">🎁 Chimney Drop</span>
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300">
            Leaderboard coming soon
          </span>
        </header>

        <section className="flex flex-1 flex-col items-start justify-center py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-200/80">
            Christmas Eve challenge
          </p>
          <h1 className="mt-4 max-w-2xl text-5xl font-bold leading-[1.05] text-white sm:text-7xl">
            Every chimney. One sleigh. No second chances.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-300">
            One button, three hearts, and a sleigh that keeps getting faster. How many homes can you reach
            before Christmas morning?
          </p>
          <Link
            href="/play"
            className="mt-10 rounded-full bg-red-600 px-10 py-4 text-lg font-bold text-white shadow-xl shadow-red-950/50 transition hover:bg-red-500"
          >
            Play now
          </Link>
        </section>

        <section className="grid gap-4 pb-6 sm:grid-cols-3">
          {[
            ["Tap to drop", "Time each gift so it falls straight down the chimney."],
            ["Chain your streak", "Consecutive deliveries raise your multiplier up to x5."],
            ["Climb the board", "Wallet-verified leaderboard arriving soon."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <p className="mt-2 text-slate-300">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
