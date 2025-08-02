"use client"

import { create } from "zustand"
import { getCurrentPrice, fetchWhitelistedTokens, OneInchToken, SUPPORTED_CHAINS, getPriceQuote } from "./oneinch-api"
import { limitOrderService, GridTrade } from "./limit-order-service"
import { hotWalletManager, HotWallet } from "./hot-wallet"

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

  // Hot Wallet
  hotWallet: HotWallet | null
  hotWalletBalances: Record<string, string>
  balancesLoading: boolean
  fundingInProgress: boolean
  fundingError: string | null

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

  // AI Suggestions
  suggestionsLoading: boolean
  suggestionsError: string | null
  lastSuggestions: any | null

  // Limit Orders
  limitOrders: GridTrade[]
  limitOrdersLoading: boolean
  limitOrdersError: string | null
  signingOrders: boolean
  submittingOrders: boolean

  // Orders & Performance
  orders: Order[]
  totalOrders: number
  filledOrders: number
  pendingOrders: number
  totalPnL: number
  
  // Grid Orders (from 1inch)
  gridOrders: any[]
  gridOrdersLoading: boolean
  gridOrdersError: string | null

  // Actions
  setBotStatus: (status: "running" | "paused" | "stopped") => void
  setBaseAsset: (asset: string) => void
  setQuoteAsset: (asset: string) => void
  updatePrice: (price: number) => void
  fetchRealPrice: (chainId: number) => Promise<void>
  loadTokens: (chainId: number) => Promise<void>
  tryFetchPrice: (chainId: number) => Promise<void>
  getSuggestedTrades: (orderSize?: number) => Promise<void>
  
  // Hot Wallet Actions
  initializeHotWallet: () => void
  fundHotWallet: (tokenAddress: string, amount: string, userSigner: any) => Promise<void>
  refreshHotWalletBalances: (chainId: number) => Promise<void>
  getHotWalletBalance: (tokenAddress: string) => string
  createLimitOrdersFromSuggestions: () => void
  signAndSubmitOrders: (chainId: number, walletAddress?: string) => Promise<void>
  
  // Grid Orders Actions
  fetchGridOrders: (chainId: number) => Promise<void>
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
    { symbol: "WETH", name: "Wrapped Ethereum", address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 },
  ],
  137: [ // Polygon
    { symbol: "WPOL", name: "Polygon", address: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", decimals: 18 },
    { symbol: "USDT", name: "Tether USD", address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", decimals: 6 },
    { symbol: "USDC", name: "USD Coin", address: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", decimals: 6 },
  ],
}

export const useTradingStore = create<TradingStore>((set, get) => ({
  // Initial state
  botStatus: "stopped",
  uptime: "02:34:12",
  
  // Hot Wallet
  hotWallet: null,
  hotWalletBalances: {},
  balancesLoading: false,
  fundingInProgress: false,
  fundingError: null,
  
  baseAsset: "ETH",
  quoteAsset: "USDT",
  currentPrice: 3340.5,
  priceLoading: false,
  priceError: null,
  baseTokenData: null,
  quoteTokenData: null,
  tokens: [],
  tokensLoading: false,
  suggestionsLoading: false,
  suggestionsError: null,
  lastSuggestions: null,
  limitOrders: [],
  limitOrdersLoading: false,
  limitOrdersError: null,
  signingOrders: false,
  submittingOrders: false,
  orders: mockOrders,
  totalOrders: mockOrders.length,
  filledOrders: mockOrders.filter((o) => o.status === "filled").length,
  pendingOrders: mockOrders.filter((o) => o.status === "pending").length,
  totalPnL: 234.56,
  
  // Grid Orders (from 1inch)
  gridOrders: [],
  gridOrdersLoading: false,
  gridOrdersError: null,

  // Actions
  setBotStatus: (status) => set({ botStatus: status }),
  setBaseAsset: (asset) => {
    set({ baseAsset: asset })
  },
  setQuoteAsset: (asset) => {
    set({ quoteAsset: asset })
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
  },

  getSuggestedTrades: async (orderSize?: number) => {
    const state = get()
    const { currentPrice, baseAsset, quoteAsset } = state

    if (!currentPrice || !baseAsset || !quoteAsset) {
      set({ suggestionsError: 'Missing price or trading pair data' })
      return
    }

    set({ suggestionsLoading: true, suggestionsError: null })

    try {
      console.log(`Getting AI suggestions for ${baseAsset}/${quoteAsset} at $${currentPrice}`)
      
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPrice,
          baseAsset,
          quoteAsset,
          orderSize: orderSize || 100 // Default to 100 if not provided
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const suggestions = await response.json()
      set({ 
        lastSuggestions: suggestions,
        suggestionsLoading: false 
      })

      console.log('AI suggestions received:', suggestions)
    } catch (error) {
      console.error('Failed to get AI suggestions:', error)
      set({ 
        suggestionsLoading: false,
        suggestionsError: error instanceof Error ? error.message : 'Failed to get suggestions'
      })
    }
  },

  createLimitOrdersFromSuggestions: () => {
    const state = get()
    const { lastSuggestions, baseAsset, quoteAsset } = state

    if (!lastSuggestions || !lastSuggestions.gridTrades || !baseAsset || !quoteAsset) {
      set({ limitOrdersError: 'No suggestions available to create limit orders' })
      return
    }

    try {
      set({ limitOrdersLoading: true, limitOrdersError: null })
      
      // Convert AI suggestions to GridTrade format
      const gridTrades: GridTrade[] = lastSuggestions.gridTrades.map((trade: any, index: number) => ({
        id: `trade-${index}-${Date.now()}`,
        type: trade.type,
        price: trade.price,
        amount: trade.amount,
        baseToken: baseAsset,
        status: 'ready' as const,
        reason: trade.reason
      }))

      console.log('Created grid trades for limit orders:', gridTrades)

      set({ 
        limitOrders: gridTrades,
        limitOrdersLoading: false 
      })
    } catch (error) {
      console.error('Failed to create limit orders:', error)
      set({ 
        limitOrdersLoading: false,
        limitOrdersError: error instanceof Error ? error.message : 'Failed to create limit orders'
      })
    }
  },

  signAndSubmitOrders: async (chainId: number, walletAddress?: string) => {
    const state = get()
    const { limitOrders, baseTokenData, quoteTokenData } = state

    if (!limitOrders.length) {
      set({ limitOrdersError: 'No limit orders to sign and submit' })
      return
    }

    if (!walletAddress) {
      set({ limitOrdersError: 'Wallet not connected' })
      return
    }

    if (!baseTokenData || !quoteTokenData) {
      set({ limitOrdersError: 'Token data not available' })
      return
    }

    try {
      set({ signingOrders: true, limitOrdersError: null })

      // Step 1: Create 1inch limit orders from grid trades
      const ordersWithLimitOrders = await limitOrderService.createLimitOrdersFromTrades(
        limitOrders,
        baseTokenData.address,
        quoteTokenData.address,
        walletAddress,
        chainId,
        60 // 1 hour expiration
      )

      set({ 
        limitOrders: ordersWithLimitOrders,
        signingOrders: false,
        submittingOrders: true 
      })

      // Step 2: For now, we'll simulate signing and submission
      // In a real implementation, you would:
      // 1. Get the signer from wagmi
      // 2. Sign each order with the user's wallet
      // 3. Submit to 1inch API
      
      console.log('1inch Limit orders created:', ordersWithLimitOrders)
      console.log('Note: Real signing and submission requires user wallet interaction')

      // Simulate submission delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update status to submitted (simulated)
      const submittedOrders = ordersWithLimitOrders.map(order => ({
        ...order,
        status: 'submitted' as const
      }))

      set({ 
        limitOrders: submittedOrders,
        submittingOrders: false 
      })

      console.log(`Successfully prepared ${submittedOrders.length} limit orders for 1inch`)

    } catch (error) {
      console.error('Failed to sign and submit orders:', error)
      set({ 
        signingOrders: false,
        submittingOrders: false,
        limitOrdersError: error instanceof Error ? error.message : 'Failed to sign and submit orders'
      })
    }
  },

  // Hot Wallet Actions
  initializeHotWallet: () => {
    try {
      let wallet = hotWalletManager.getWallet()
      if (!wallet) {
        wallet = hotWalletManager.generateWallet()
      }
      set({ hotWallet: wallet })
    } catch (error) {
      console.error('Failed to initialize hot wallet:', error)
    }
  },

  fundHotWallet: async (tokenAddress: string, amount: string, userSigner: any) => {
    try {
      set({ fundingInProgress: true, fundingError: null })
      
      const state = get()
      if (!state.hotWallet) {
        throw new Error('Hot wallet not initialized')
      }

      const txHash = await hotWalletManager.fundFromUserWallet(
        tokenAddress,
        amount,
        userSigner.address,
        userSigner
      )

      console.log('Funding transaction hash:', txHash)
      
      // Refresh balances after funding
      const { tokens } = state
      const chainId = 137 // Default to Polygon, should be passed as parameter
      await get().refreshHotWalletBalances(chainId)
      
      set({ fundingInProgress: false })
    } catch (error) {
      console.error('Failed to fund hot wallet:', error)
      set({ 
        fundingInProgress: false,
        fundingError: error instanceof Error ? error.message : 'Failed to fund hot wallet'
      })
    }
  },

  refreshHotWalletBalances: async (chainId: number) => {
    try {
      set({ balancesLoading: true })
      
      const state = get()
      const { hotWallet, baseTokenData, quoteTokenData } = state
      
      if (!hotWallet) {
        set({ balancesLoading: false })
        return
      }

      const balances: Record<string, string> = {}
      
      // Fetch fresh tokens for the current chain
      let currentChainTokens: OneInchToken[] = []
      try {
        currentChainTokens = await fetchWhitelistedTokens(chainId)
      } catch (error) {
        console.error('Failed to fetch tokens for current chain:', error)
        set({ balancesLoading: false })
        return
      }

      // If we have selected tokens, find their equivalents on the current chain
      const tokensToCheck: OneInchToken[] = []
      
      if (baseTokenData) {
        // Find token with same symbol on current chain
        const baseToken = currentChainTokens.find(t => 
          t.symbol.toLowerCase() === baseTokenData.symbol.toLowerCase()
        )
        if (baseToken) {
          tokensToCheck.push(baseToken)
        }
      }
      
      if (quoteTokenData) {
        // Find token with same symbol on current chain
        const quoteToken = currentChainTokens.find(t => 
          t.symbol.toLowerCase() === quoteTokenData.symbol.toLowerCase()
        )
        if (quoteToken && !tokensToCheck.find(t => t.address === quoteToken.address)) {
          tokensToCheck.push(quoteToken)
        }
      }

      // If no specific tokens selected, check a few popular ones
      if (tokensToCheck.length === 0) {
        const popularTokens = currentChainTokens
          .filter(t => ['WETH', 'USDT', 'USDC', 'DAI', 'WMATIC', 'WBNB'].includes(t.symbol))
          .slice(0, 5)
        tokensToCheck.push(...popularTokens)
      }
      
      // Get balance for each token
      for (const token of tokensToCheck) {
        try {
          const balance = await hotWalletManager.getTokenBalance(token.address, chainId)
          balances[token.address] = balance
          console.log(`Balance for ${token.symbol} (${token.address}): ${balance}`)
        } catch (error) {
          console.error(`Failed to get balance for ${token.symbol}:`, error)
          balances[token.address] = '0'
        }
      }

      set({ 
        hotWalletBalances: balances,
        balancesLoading: false 
      })
    } catch (error) {
      console.error('Failed to refresh hot wallet balances:', error)
      set({ balancesLoading: false })
    }
  },

  getHotWalletBalance: (tokenAddress: string) => {
    const state = get()
    return state.hotWalletBalances[tokenAddress] || '0'
  },

  // Fetch grid orders from 1inch by hot wallet maker address
  fetchGridOrders: async (chainId: number) => {
    const state = get()
    if (!state.hotWallet) {
      console.log('No hot wallet available, cannot fetch grid orders')
      return
    }

    set({ gridOrdersLoading: true, gridOrdersError: null })

    try {
      console.log(`Fetching grid orders for hot wallet ${state.hotWallet.address} on chain ${chainId}`)
      
      const orders = await limitOrderService.fetchOrdersByMaker(
        state.hotWallet.address, 
        chainId, 
        state.currentPrice // Pass current price for better mock data
      )
      
      console.log(`Fetched ${orders.length} grid orders`)
      
      set({ 
        gridOrders: orders,
        gridOrdersLoading: false,
        gridOrdersError: null
      })
      
    } catch (error) {
      console.error('Error fetching grid orders:', error)
      set({ 
        gridOrdersLoading: false,
        gridOrdersError: error instanceof Error ? error.message : 'Failed to fetch grid orders'
      })
    }
  }
}))

// Note: Real-time price updates are now handled via fetchRealPrice() function
// which uses the 1inch API to get current market prices
