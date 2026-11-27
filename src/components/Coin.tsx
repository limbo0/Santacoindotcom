import { COIN_SVG } from "./coinSvg";

export default function Coin({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={className} dangerouslySetInnerHTML={{ __html: COIN_SVG }} />;
}
