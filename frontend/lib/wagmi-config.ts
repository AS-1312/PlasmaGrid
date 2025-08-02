"use client"

import { createConfig, http } from "wagmi"
import { mainnet, polygon, arbitrum, base } from "wagmi/chains"
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors"

export const wagmiConfig = createConfig({
  chains: [mainnet, polygon, arbitrum, base],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id",
    }),
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
})
