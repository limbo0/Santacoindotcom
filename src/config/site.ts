/**
 * Everything brand- and launch-specific lives here.
 *
 * At launch: paste the token's contract address and its pump.fun page URL
 * below and redeploy. The "How to buy" section switches from "launching soon"
 * to showing the address (with a copy button) and a buy button.
 */
export const site = {
  /** Official domain. Used for share links/images and the vercel.app redirect. */
  url: "https://santacoindotcom.com",
  coinName: "Santa Coin",
  gameName: "Santacoindotcom",
  xHandle: "Santacoindotcom",
  xUrl: "https://x.com/Santacoindotcom",
  launchpad: "pump.fun",
  contractAddress: null as string | null,
  pumpFunUrl: null as string | null,
};

export const isLaunched = Boolean(site.contractAddress && site.pumpFunUrl);
