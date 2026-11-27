import type { Metadata, Viewport } from "next";
import { fredoka } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chimney Drop — a Christmas Eve challenge",
  description: "Drop gifts down every chimney before the sleigh outruns you.",
};

export const viewport: Viewport = {
  themeColor: "#070b1f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
