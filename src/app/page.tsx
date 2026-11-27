import Link from "next/link";
import Coin from "@/components/Coin";
import CopyAddress from "@/components/CopyAddress";
import { isLaunched, site } from "@/config/site";
import GamePreview from "@/game/GamePreview";
import { fredoka } from "@/lib/fonts";

function XIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FollowButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={site.xUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`sticker-btn bg-snow text-ink ${className}`}
    >
      <XIcon /> Follow @{site.xHandle}
    </a>
  );
}

const gutter = "mx-auto w-full max-w-6xl px-[max(16px,env(safe-area-inset-left,0px))] sm:px-8";

export default function Home() {
  return (
    <main className="flex-1 overflow-x-clip">
      <Hero />
      <Marquee />
      <GameSection />
      <HowToBuy />
      <FollowCta />
      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <section className="dots relative bg-candy">
      <div className={`${gutter} pb-20 pt-6 sm:pb-28`}>
        <nav className="flex items-center justify-between gap-4">
          <Link href="/" className="focus-ring flex items-center gap-2">
            <Coin className="h-11 w-11" />
            <span className="font-display text-xl tracking-wide text-snow [text-shadow:2px_2px_0_var(--ink)]">
              {site.coinName}
            </span>
          </Link>
          <a
            href={site.xUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${site.coinName} on X`}
            className="sticker-btn bg-snow px-4 py-2.5 text-base text-ink"
          >
            <XIcon className="h-4 w-4" />
            <span className="hidden sm:inline">@{site.xHandle}</span>
          </a>
        </nav>

        <div className="mt-12 grid items-center gap-12 md:mt-16 md:grid-cols-[1.15fr_0.85fr]">
          <div className="min-w-0">
            <p
              className="sticker anim-wiggle inline-block rounded-full bg-gold px-5 pb-2 pt-2.5 font-display text-lg tracking-wide text-ink"
              style={{ ["--tilt" as string]: "-4deg" }}
            >
              {isLaunched ? `Live on ${site.launchpad}` : `Launching soon on ${site.launchpad}`}
            </p>
            <h1 className="shout mt-6 text-[clamp(4.2rem,15vw,9.5rem)]">
              Santa
              <br />
              Coin
            </h1>
            <p className="mt-7 max-w-xl text-xl font-medium leading-snug text-snow">
              The Christmas memecoin with its own game. Drop gifts down every chimney, chase a high score, and
              follow @{site.xHandle} so you catch the launch.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/play" className="sticker-btn bg-holly text-snow">
                Play the game
              </Link>
              <FollowButton />
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[420px]">
            <Coin className="anim-bob w-full drop-shadow-[8px_10px_0_rgba(29,15,15,0.35)]" />
            <span
              className="sticker anim-wiggle absolute -left-2 top-6 rounded-2xl bg-holly px-4 pb-1.5 pt-2.5 font-display text-xl text-snow sm:-left-8"
              style={{ ["--tilt" as string]: "-10deg" }}
            >
              Ho ho ho
            </span>
            <span
              className="sticker anim-wiggle absolute -right-1 bottom-10 rounded-2xl bg-snow px-4 pb-1.5 pt-2.5 font-display text-lg text-candy sm:-right-6"
              style={{ ["--tilt" as string]: "8deg", animationDelay: "-1.2s" }}
            >
              Nice list only
            </span>
          </div>
        </div>
      </div>
      <div className="candy-stripe h-5 border-y-[3px] border-ink" />
    </section>
  );
}

function Marquee() {
  const items = [
    site.coinName,
    isLaunched ? `Live on ${site.launchpad}` : `Launching on ${site.launchpad}`,
    `Play ${site.gameName}`,
    `Follow @${site.xHandle}`,
  ];
  const run = [...items, ...items, ...items];
  return (
    <div className="overflow-hidden border-b-[3px] border-ink bg-holly py-3" aria-hidden="true">
      <div className="anim-marquee flex w-max">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0">
            {run.map((text, i) => (
              <span key={i} className="flex items-center font-display text-2xl tracking-wide text-snow">
                <span className="px-6">{text}</span>
                <span className="text-gold">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function GameSection() {
  return (
    <section id="game" className="relative bg-night text-snow">
      <div className={`${gutter} grid items-center gap-12 py-20 md:grid-cols-[0.8fr_1.2fr] sm:py-28`}>
        <Link
          href="/play"
          aria-label={`Play ${site.gameName}`}
          className="focus-ring group relative mx-auto block w-full max-w-[320px] md:order-none"
        >
          <div className="overflow-hidden rounded-[2.2rem] border-[6px] border-ink bg-ink shadow-[10px_10px_0_var(--candy)] transition-transform group-hover:-rotate-1 group-hover:scale-[1.02]">
            <GamePreview fontFamily={fredoka.style.fontFamily} />
          </div>
          <span
            className="sticker anim-wiggle absolute -bottom-5 -right-4 rounded-2xl bg-gold px-4 pb-1.5 pt-2.5 font-display text-xl text-ink"
            style={{ ["--tilt" as string]: "9deg" }}
          >
            Tap to play
          </span>
        </Link>

        <div className="min-w-0">
          <p className="font-display text-lg tracking-widest text-gold">The game</p>
          <h2 className="shout mt-3 break-words text-[clamp(1.9rem,9vw,3.8rem)]">{site.gameName}</h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-snow/85">
            Santa&apos;s sleigh only speeds up. Tap to drop a gift and land it down the chimney. Hit dead centre
            for a PERFECT, chain deliveries for up to x5 points, and don&apos;t run out of hearts.
          </p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ["One button", "Tap, click or press Space"],
              ["Three hearts", "Miss a throw or skip a house: lose one"],
              ["Gets harder", "Faster sleigh, narrower chimneys"],
            ].map(([title, body]) => (
              <li key={title} className="rounded-2xl border-[3px] border-snow/20 bg-white/5 px-4 py-3">
                <p className="font-display text-lg tracking-wide text-gold">{title}</p>
                <p className="mt-1 text-sm leading-snug text-snow/75">{body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/play" className="sticker-btn bg-candy text-snow">
              Play {site.gameName}
            </Link>
            <span className="rounded-full border-[3px] border-dashed border-gold/70 px-4 py-2 text-sm font-semibold text-gold">
              Solana wallet leaderboard coming soon
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    title: "Get a Solana wallet",
    body: "Install a Solana wallet such as Phantom, Solflare or Backpack, and keep your recovery phrase offline.",
  },
  {
    title: "Load it with SOL",
    body: "Buy SOL on an exchange you trust and send it to your wallet address.",
  },
  {
    title: `Open ${site.coinName} on ${site.launchpad}`,
    body: isLaunched
      ? "Use the button below. It goes straight to the official page."
      : `The official link goes up here and on @${site.xHandle} at launch.`,
  },
  {
    title: "Swap SOL for Santa Coin",
    body: "Connect your wallet on the page, pick an amount and approve the swap in your wallet.",
  },
];

function HowToBuy() {
  return (
    <section id="buy" className="bg-snow">
      <div className={`${gutter} py-20 sm:py-28`}>
        <h2 className="shout text-[clamp(2.8rem,8vw,5.5rem)]">
          <span className="text-candy">How to get</span> <span className="text-holly">Santa Coin</span>
        </h2>
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="sticker flex flex-col rounded-3xl bg-white p-6">
              <span className="sticker grid h-12 w-12 place-items-center rounded-full bg-gold pt-1 font-display text-2xl text-ink">
                {i + 1}
              </span>
              <h3 className="mt-5 font-display text-2xl leading-tight tracking-wide text-ink">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-ink/75">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="sticker mt-10 rounded-3xl bg-candy p-6 text-snow sm:p-8">
          <p className="font-display text-xl tracking-widest text-gold">Contract address</p>
          {isLaunched && site.contractAddress ? (
            <div className="mt-4 flex flex-col gap-4">
              <CopyAddress address={site.contractAddress} />
              <a
                href={site.pumpFunUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="sticker-btn self-start bg-holly text-snow"
              >
                Buy on {site.launchpad}
              </a>
            </div>
          ) : (
            <p className="mt-3 font-display text-4xl leading-none tracking-wide sm:text-5xl">Drops at launch</p>
          )}
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-snow/90">
            Only trust the address shown on this site and posted by @{site.xHandle} on X. Nobody from the team will
            DM you an address, ask for your recovery phrase or ask you to send funds.
          </p>
        </div>
      </div>
    </section>
  );
}

function FollowCta() {
  return (
    <section className="dots border-y-[3px] border-ink bg-holly">
      <div className={`${gutter} flex flex-col items-center gap-8 py-20 text-center sm:py-24`}>
        <Coin className="anim-bob h-28 w-28" />
        <h2 className="shout text-[clamp(2.8rem,9vw,6rem)]">Don&apos;t miss the drop</h2>
        <p className="max-w-lg text-lg font-medium text-snow">
          Launch time, the contract address and leaderboard news land on X first.
        </p>
        <FollowButton className="text-xl" />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-ink text-snow">
      <div className={`${gutter} flex flex-col gap-8 py-12`}>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Coin className="h-10 w-10" />
            <span className="font-display text-xl tracking-wide">{site.coinName}</span>
          </div>
          <nav className="flex flex-wrap gap-6 text-snow/80">
            <Link href="/play" className="focus-ring hover:text-gold">
              Play {site.gameName}
            </Link>
            <a href="#buy" className="focus-ring hover:text-gold">
              How to buy
            </a>
            <a href={site.xUrl} target="_blank" rel="noopener noreferrer" className="focus-ring hover:text-gold">
              X / Twitter
            </a>
          </nav>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-snow/55">
          {site.coinName} is a memecoin made for fun. It has no intrinsic value, no promised utility and no expectation
          of financial return. Nothing on this site is financial advice. Crypto prices are volatile, so only spend
          what you can afford to lose. {site.coinName} is not affiliated with {site.launchpad}.
        </p>
      </div>
    </footer>
  );
}
