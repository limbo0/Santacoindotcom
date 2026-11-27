import type { Metadata } from "next";
import { site } from "@/config/site";
import Game from "@/game/Game";
import { fredoka } from "@/lib/fonts";

export const metadata: Metadata = {
  title: `Play ${site.gameName}`,
};

export default function PlayPage() {
  return (
    <main className="h-dvh w-full">
      <Game fontFamily={fredoka.style.fontFamily} homeHref="/" />
    </main>
  );
}
