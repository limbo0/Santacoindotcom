import type { Metadata, Viewport } from "next";
import { site } from "@/config/site";
import { fredoka, luckiest } from "@/lib/fonts";
import "./globals.css";

const description = `${site.coinName} is a Christmas memecoin launching soon on ${site.launchpad}. Play ${site.gameName}, drop gifts down chimneys, and follow @${site.xHandle} for the launch.`;

export const metadata: Metadata = {
  title: {
    default: `${site.coinName} | Launching soon on ${site.launchpad}`,
    template: `%s | ${site.coinName}`,
  },
  description,
  openGraph: {
    title: site.coinName,
    description,
    siteName: site.coinName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: `@${site.xHandle}`,
    title: site.coinName,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#e8222e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fredoka.variable} ${luckiest.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
