"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Link> & {
  /** Custom event name sent to Vercel Web Analytics on click. */
  event: string;
  /** Where on the page the link sits, e.g. "hero". */
  location: string;
};

/** A link that also records a click event (internal or external). */
export default function TrackedLink({ event, location, onClick, ...rest }: Props) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        track(event, { location });
        onClick?.(e);
      }}
    />
  );
}
