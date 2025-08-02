"use client"

import { createConfig, http } from "wagmi"
import { mainnet, polygon, arbitrum, base } from "wagmi/chains"
import { injected, coinbaseWallet } from "wagmi/connectors"

export const wagmiConfig = createConfig({
  chains: [mainnet, polygon, arbitrum, base],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "1inch Range Trading Bot",
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
  },
  ssr: true,
})
