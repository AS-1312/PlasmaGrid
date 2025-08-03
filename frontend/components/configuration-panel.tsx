"use client"

import { useState, useEffect } from "react"
import { useChainId, useAccount } from "wagmi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Network } from "lucide-react"
import { useTradingStore } from "@/lib/trading-store"
// import { TelegramPanel } from "./telegram-panel"
import { WalletConnection } from "./wallet-connection"
import { HotWalletPanel } from "./hot-wallet-panel"
import { TokenSelect } from "@/components/ui/token-select"
import { SUPPORTED_CHAINS, SupportedChain } from "@/lib/oneinch-api"

export function ConfigurationPanel() {
  const chainId = useChainId()
  const { address: walletAddress } = useAccount()
  const [gridLevels, setGridLevels] = useState([20])
  const [minPrice, setMinPrice] = useState<string>("")
  const [maxPrice, setMaxPrice] = useState<string>("")

  const { 
    currentPrice, 
    baseAsset, 
    quoteAsset, 
    priceLoading,
    priceError,
    tokens,
    tokensLoading,
    gridOrders,
    gridOrdersLoading,
    hotWallet,
    setBaseAsset, 
    setQuoteAsset,
    tryFetchPrice,
    loadTokens,
    getSuggestedTrades,
    createLimitOrdersFromSuggestions,
    signAndSubmitOrders,
    fetchGridOrders
  } = useTradingStore()

  // Custom handlers that trigger price fetching with current chainId
  const handleBaseAssetChange = (asset: string) => {
    setBaseAsset(asset)
    if (quoteAsset && asset !== quoteAsset) {
      console.log(`Fetching price for ${asset}/${quoteAsset} on chain ${currentChainId}`)
      tryFetchPrice(currentChainId)
    }
  }

  const handleQuoteAssetChange = (asset: string) => {
    setQuoteAsset(asset)
    if (baseAsset && asset !== baseAsset) {
      console.log(`Fetching price for ${asset}/${quoteAsset} on chain ${currentChainId}`)

      tryFetchPrice(currentChainId)
    }
  }

  // Map chainId to SupportedChain
  const getNetworkFromChainId = (chainId: number): SupportedChain => {
    const chainEntry = Object.entries(SUPPORTED_CHAINS).find(([_, id]) => id === chainId)
    
    if (chainEntry) {
      return chainEntry[0] as SupportedChain
    }
    
    // If chainId is not in SUPPORTED_CHAINS, log it and try to use a fallback
    console.warn(`Chain ID ${chainId} not found in SUPPORTED_CHAINS, available chains:`, SUPPORTED_CHAINS)
    
    // Return a fallback based on common chainIds
    switch (chainId) {
      case 137: return "polygon"
      case 1: return "ethereum"
      case 56: return "bsc"
      case 42161: return "arbitrum"
      case 10: return "optimism"
      case 43114: return "avalanche"
      case 8453: return "base"
      default: 
        console.error(`Unsupported chain ID: ${chainId}, falling back to ethereum`)
        return "ethereum"
    }
  }

  const currentNetwork = getNetworkFromChainId(chainId)
  // Use the actual chainId from wagmi instead of mapping back through SUPPORTED_CHAINS
  const currentChainId = chainId

  // Debug logging
  console.log('Configuration Panel Debug:', {
    walletChainId: chainId,
    mappedNetwork: currentNetwork,
    finalChainId: currentChainId,
    availableChains: SUPPORTED_CHAINS
  })

  // Load tokens when component mounts or chain changes
  useEffect(() => {
    loadTokens(currentChainId)
  }, [currentChainId, loadTokens])

  // Reset assets and set defaults when chain changes and tokens are loaded
  useEffect(() => {
    if (tokens.length > 0) {
      // Check if current assets exist in new token list
      const baseExists = tokens.find(t => t.symbol.toLowerCase() === baseAsset.toLowerCase())
      const quoteExists = tokens.find(t => t.symbol.toLowerCase() === quoteAsset.toLowerCase())
      
      // If current assets don't exist on this chain, set defaults
      if (!baseExists || !quoteExists) {
        // Set default assets based on available tokens
        const wethToken = tokens.find(t => t.symbol.toLowerCase() === 'weth' || t.symbol.toLowerCase() === 'eth')
        const usdtToken = tokens.find(t => t.symbol.toLowerCase() === 'usdt')
        const usdcToken = tokens.find(t => t.symbol.toLowerCase() === 'usdc')
        const wpolToken = tokens.find(t => t.symbol.toLowerCase() === 'wpol' || t.symbol.toLowerCase() === 'pol')
        const wmaticToken = tokens.find(t => t.symbol.toLowerCase() === 'wmatic' || t.symbol.toLowerCase() === 'matic')
        
        // Choose appropriate defaults based on available tokens and chain
        let newBaseAsset = ""
        let newQuoteAsset = ""
        
        if (currentChainId === 137) { // Polygon
          newBaseAsset = wpolToken?.symbol || wmaticToken?.symbol || wethToken?.symbol || tokens[0]?.symbol || ""
        } else {
          newBaseAsset = wethToken?.symbol || tokens[0]?.symbol || ""
        }
        
        newQuoteAsset = usdtToken?.symbol || usdcToken?.symbol || tokens[1]?.symbol || ""
        
        if (newBaseAsset && newQuoteAsset && newBaseAsset !== newQuoteAsset) {
          console.log(`Switching to chain ${currentChainId}, setting assets: ${newBaseAsset}/${newQuoteAsset}`)
          setBaseAsset(newBaseAsset)
          setQuoteAsset(newQuoteAsset)
        }
      }
    }
  }, [tokens, currentChainId, baseAsset, quoteAsset, setBaseAsset, setQuoteAsset])

  // Fetch real price when assets change or chain changes
  useEffect(() => {
    if (baseAsset && quoteAsset && baseAsset !== quoteAsset && tokens.length > 0) {
      // Ensure the assets exist on the current chain before fetching price
      const baseExists = tokens.find(t => t.symbol.toLowerCase() === baseAsset.toLowerCase())
      const quoteExists = tokens.find(t => t.symbol.toLowerCase() === quoteAsset.toLowerCase())
      
      if (baseExists && quoteExists) {
        tryFetchPrice(currentChainId)
      }
    }
  }, [baseAsset, quoteAsset, currentChainId, tokens, tryFetchPrice])

  // Update min/max prices based on current price (±5% range)
  useEffect(() => {
    if (currentPrice && !priceLoading && !priceError) {
      const minPriceValue = (currentPrice * 0.95).toFixed(2)
      const maxPriceValue = (currentPrice * 1.05).toFixed(2)
      setMinPrice(minPriceValue)
      setMaxPrice(maxPriceValue)
    }
  }, [currentPrice, priceLoading, priceError])

  // Fetch grid orders when hot wallet is available and chain/assets change
  useEffect(() => {
    if (hotWallet && currentChainId && baseAsset && quoteAsset) {
      console.log(`Auto-fetching grid orders for ${baseAsset}/${quoteAsset} on chain ${currentChainId}`)
      fetchGridOrders(currentChainId)
    }
  }, [hotWallet, currentChainId, baseAsset, quoteAsset, fetchGridOrders])

  return (
    <div className="space-y-6">
      {/* Wallet & API Settings */}
      <WalletConnection />

      {/* Hot Wallet Panel */}
      <HotWalletPanel />

      {/* Trading Pair Configuration */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span>Trading Pair Configuration</span>
            <Badge variant="outline" className="flex items-center space-x-1 text-sm">
              <Network className="h-3 w-3" />
              <span>{currentNetwork.charAt(0).toUpperCase() + currentNetwork.slice(1)}</span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="flex-1 min-w-0 flex flex-col space-y-2">
              <Label>Base Asset</Label>
              <div className="w-full overflow-hidden">
                <TokenSelect 
                  value={baseAsset} 
                  onValueChange={handleBaseAssetChange}
                  chainId={currentChainId}
                  placeholder="Select base token..."
                  className="w-full min-w-0 truncate"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col space-y-2">
              <Label>Quote Asset</Label>
              <div className="w-full overflow-hidden">
                <TokenSelect 
                  value={quoteAsset} 
                  onValueChange={handleQuoteAssetChange}
                  chainId={currentChainId}
                  placeholder="Select quote token..."
                  className="w-full min-w-0 truncate"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted/50 border rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                {baseAsset}/{quoteAsset}
              </span>
              
            </div>
            <div className="text-2xl font-bold">
              {priceLoading || tokensLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : priceError ? (
                <span className="text-red-500">Error loading price</span>
              ) : (
                `$${currentPrice.toLocaleString()}`
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {tokensLoading ? (
                <span className="text-blue-500">Loading token data...</span>
              ) : priceError ? (
                <span className="text-red-500">{priceError}</span>
              ) : (
                <div className="flex items-center justify-between">
                  <span>Real-time price from 1inch</span>
                  {hotWallet && (
                    <span className="text-xs">
                      {gridOrdersLoading ? (
                        <span className="text-blue-500">Loading orders...</span>
                      ) : (
                        <span className="text-green-600">
                          {gridOrders.length} active orders
                        </span>
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telegram Integration */}
      {/* <TelegramPanel /> */}
    </div>
  )
}
