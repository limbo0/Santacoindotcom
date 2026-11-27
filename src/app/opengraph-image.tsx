import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { COIN_SVG } from "@/components/coinSvg";
import { site } from "@/config/site";

export const alt = `${site.coinName}: the Christmas memecoin launching on ${site.launchpad}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const display = await readFile(join(process.cwd(), "assets/fonts/luckiest-guy-latin-400-normal.woff"));

export default async function Image() {
  const coin = `data:image/svg+xml;base64,${Buffer.from(COIN_SVG).toString("base64")}`;
  const shadow = "6px 6px 0 #1d0f0f";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#e8222e",
          fontFamily: "Luckiest Guy",
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 80px", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                background: "#ffc531",
                color: "#1d0f0f",
                border: "5px solid #1d0f0f",
                borderRadius: 999,
                padding: "14px 28px 6px",
                fontSize: 32,
                whiteSpace: "nowrap",
                transform: "rotate(-3deg)",
              }}
            >
              Launching soon on {site.launchpad}
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 24, fontSize: 168, lineHeight: 0.9, color: "#fff6e6", textShadow: shadow }}>
              <span>Santa</span>
              <span>Coin</span>
            </div>
            <div style={{ display: "flex", marginTop: 26, fontSize: 40, color: "#fff6e6", textShadow: "3px 3px 0 #1d0f0f" }}>
              Follow @{site.xHandle}
            </div>
          </div>
          <img src={coin} width={380} height={380} alt="" />
        </div>
        <div style={{ height: 36, display: "flex", overflow: "hidden", borderTop: "5px solid #1d0f0f" }}>
          {Array.from({ length: 34 }, (_, i) => (
            <div
              key={i}
              style={{
                width: 40,
                flexShrink: 0,
                background: i % 2 ? "#fff6e6" : "#e8222e",
                transform: "skewX(-35deg) scaleX(1.02)",
              }}
            />
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Luckiest Guy", data: display, style: "normal", weight: 400 }],
    },
  );
}
