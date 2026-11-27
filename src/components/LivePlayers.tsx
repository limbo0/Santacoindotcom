"use client";

import { usePlayingCount } from "@/lib/usePresence";

/** "● 12 playing now" badge. Renders nothing until there is at least one player. */
export default function LivePlayers({ className = "" }: { className?: string }) {
  const count = usePlayingCount();
  if (!count) return null;
  return <PlayingBadge count={count} className={className} />;
}

export function PlayingBadge({ count, className = "" }: { count: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 tabular-nums ${className}`} aria-live="polite">
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </span>
      {count.toLocaleString("en-US")} playing now
    </span>
  );
}
