"use client"

import { createConfig, http } from "wagmi"
import { mainnet, polygon, arbitrum, base } from "wagmi/chains"
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors"

// Ensure environment variables are available
const projectId = typeof window !== 'undefined' 
  ? process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id"
  : "demo-project-id"

export const wagmiConfig = createConfig({
  chains: [mainnet, polygon, arbitrum, base],
  connectors: [
    injected(),
    walletConnect({
      projectId,
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
