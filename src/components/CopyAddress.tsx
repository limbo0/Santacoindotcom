"use client";

import { useState } from "react";

export default function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <code className="min-w-0 flex-1 break-all rounded-xl border-[3px] border-ink bg-snow px-4 py-3 font-mono text-sm text-ink">
        {address}
      </code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            setCopied(false);
          }
        }}
        className="sticker-btn bg-gold text-ink"
      >
        {copied ? "Copied!" : "Copy address"}
      </button>
    </div>
  );
}
