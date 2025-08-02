"use client"

import { create } from "zustand"
import { getCurrentPrice, fetchWhitelistedTokens, OneInchToken, SUPPORTED_CHAINS, getPriceQuote } from "./oneinch-api"

interface Order {
  id: string
  type: "buy" | "sell"
  price: number
  amount: number
  status: "pending" | "filled" | "cancelled"
  timestamp: Date
}

interface TradingStore {
  // Connection & Status
  botStatus: "running" | "paused" | "stopped"
  uptime: string

  // Trading Pair
  baseAsset: string
  quoteAsset: string
  currentPrice: number
  priceLoading: boolean
  priceError: string | null

  // Token data
  baseTokenData: OneInchToken | null
  quoteTokenData: OneInchToken | null
  tokens: OneInchToken[]
  tokensLoading: boolean

  // Orders & Performance
  orders: Order[]
  totalOrders: number
  filledOrders: number
  pendingOrders: number
  totalPnL: number

  // Actions
  setBotStatus: (status: "running" | "paused" | "stopped") => void
  setBaseAsset: (asset: string) => void
  setQuoteAsset: (asset: string) => void
  updatePrice: (price: number) => void
  fetchRealPrice: (chainId: number) => Promise<void>
  loadTokens: (chainId: number) => Promise<void>
  tryFetchPrice: (chainId: number) => Promise<void>
}

// Mock orders data
const mockOrders: Order[] = [
  {
    id: "1",
    type: "buy",
    price: 2320,
    amount: 0.1,
    status: "pending",
    timestamp: new Date(),
  },
  {
    id: "2",
    type: "sell",
    price: 2380,
    amount: 0.1,
    status: "filled",
    timestamp: new Date(),
  },
  {
    id: "3",
    type: "buy",
    price: 2300,
    amount: 0.1,
    status: "filled",
    timestamp: new Date(),
  },
  {
    id: "4",
    type: "sell",
    price: 2400,
    amount: 0.1,
    status: "pending",
    timestamp: new Date(),
  },
  {
    id: "5",
    type: "buy",
    price: 2280,
    amount: 0.1,
    status: "cancelled",
    timestamp: new Date(),
  },
]

// Fallback tokens when API fails - same as TokenSelect component
const FALLBACK_TOKENS: Record<number, OneInchToken[]> = {
  1: [ // Ethereum
    { symbol: "ETH", name: "Ethereum", address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", decimals: 18 },
    { symbol: "USDT", name: "Tether USD", address: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6 },
    { symbol: "USDC", name: "USD Coin", address: "0xa0b86a33e6ba5f69b37c9fcb6e1d6b1f3d3a3e3d", decimals: 6 },
    { symbol: "WETH", name: "Wrapped Ethereum", address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", decimals: 18 },
  ],
  137: [ // Polygon
    { symbol: "MATIC", name: "Polygon", address: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", decimals: 18 },
    { symbol: "USDT", name: "Tether USD", address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", decimals: 6 },
    { symbol: "USDC", name: "USD Coin", address: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", decimals: 6 },
  ],
}

export const useTradingStore = create<TradingStore>((set, get) => ({
  // Initial state
  botStatus: "stopped",
  uptime: "02:34:12",
  baseAsset: "ETH",
  quoteAsset: "USDT",
  currentPrice: 2340.5,
  priceLoading: false,
  priceError: null,
  baseTokenData: null,
  quoteTokenData: null,
  tokens: [],
  tokensLoading: false,
  orders: mockOrders,
  totalOrders: mockOrders.length,
  filledOrders: mockOrders.filter((o) => o.status === "filled").length,
  pendingOrders: mockOrders.filter((o) => o.status === "pending").length,
  totalPnL: 234.56,

  // Actions
  setBotStatus: (status) => set({ botStatus: status }),
  setBaseAsset: (asset) => {
    set({ baseAsset: asset })
    // Note: Price fetching will be triggered from the component with the current chainId
  },
  setQuoteAsset: (asset) => {
    set({ quoteAsset: asset })
    // Note: Price fetching will be triggered from the component with the current chainId
  },
  updatePrice: (price) => set({ currentPrice: price }),

  tryFetchPrice: async (chainId: number) => {
    const state = get()
    const { tokens, tokensLoading } = state

    // If tokens are still loading, wait for them
    if (tokensLoading) {
      return
    }

    // If tokens are not loaded, load them first then fetch price
    if (tokens.length === 0) {
      await state.loadTokens(chainId)
      // After loading tokens, try to fetch price again
      await state.fetchRealPrice(chainId)
    } else {
      await state.fetchRealPrice(chainId)
    }
  },
  
  fetchRealPrice: async (chainId: number) => {
    const state = get()
    const { baseAsset, quoteAsset, tokens } = state

    if (!baseAsset || !quoteAsset || baseAsset === quoteAsset) {
      return
    }

    set({ priceLoading: true, priceError: null })

    try {
      // Find token data for base and quote assets
      // Try different matching strategies
      let baseToken = tokens.find(t => t.symbol.toLowerCase() === baseAsset.toLowerCase())
      let quoteToken = tokens.find(t => t.symbol.toLowerCase() === quoteAsset.toLowerCase())

      // If ETH token not found, try WETH as fallback
      if (!baseToken && baseAsset.toLowerCase() === 'eth') {
        baseToken = tokens.find(t => t.symbol.toLowerCase() === 'weth')
      }
      if (!quoteToken && quoteAsset.toLowerCase() === 'eth') {
        quoteToken = tokens.find(t => t.symbol.toLowerCase() === 'weth')
      }

      if (!baseToken || !quoteToken) {
        const availableSymbols = tokens.map(t => t.symbol).join(', ')
        throw new Error(`Token data not found for ${baseAsset}/${quoteAsset}. Available tokens: ${availableSymbols}`)
      }

      console.log(`Fetching price for ${baseToken.symbol} (${baseToken.address}) -> ${quoteToken.symbol} (${quoteToken.address})`)

      // Use the improved price quote function
      const { price } = await getPriceQuote(
        chainId,
        baseToken.address,
        quoteToken.address,
        baseToken.decimals,
        quoteToken.decimals,
        "1"
      )

      set({ 
        currentPrice: price, 
        priceLoading: false,
        baseTokenData: baseToken,
        quoteTokenData: quoteToken
      })

      console.log(`Successfully fetched price: ${price} ${quoteToken.symbol} per ${baseToken.symbol}`)
    } catch (error) {
      console.error('Failed to fetch real price:', error)
      set({ 
        priceLoading: false, 
        priceError: error instanceof Error ? error.message : 'Failed to fetch price'
      })
    }
  },

  loadTokens: async (chainId: number) => {
    set({ tokensLoading: true })
    try {
      const tokens = await fetchWhitelistedTokens(chainId)
      set({ tokens, tokensLoading: false })
      console.log(`Loaded ${tokens.length} tokens for chain ${chainId}`)
    } catch (error) {
      console.error('Failed to load tokens from API, using fallback:', error)
      // Use fallback tokens when API fails
      const fallbackTokens = FALLBACK_TOKENS[chainId] || FALLBACK_TOKENS[1] || []
      set({ tokens: fallbackTokens, tokensLoading: false })
      console.log(`Using ${fallbackTokens.length} fallback tokens for chain ${chainId}`)
    }
  }
}))

// Note: Real-time price updates are now handled via fetchRealPrice() function
// which uses the 1inch API to get current market prices
