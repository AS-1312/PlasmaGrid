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
    suggestionsLoading,
    suggestionsError,
    lastSuggestions,
    limitOrders,
    limitOrdersLoading,
    limitOrdersError,
    signingOrders,
    submittingOrders,
    setBaseAsset, 
    setQuoteAsset,
    tryFetchPrice,
    loadTokens,
    getSuggestedTrades,
    createLimitOrdersFromSuggestions,
    signAndSubmitOrders
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
                "Real-time price from 1inch"
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Range Strategy Settings */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-4">
          <CardTitle>Range Strategy Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Price ($)</Label>
                <Input 
                  type="number" 
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder={currentPrice ? (currentPrice * 0.95).toFixed(2) : "2200"} 
                />
                <p className="text-xs text-muted-foreground">Auto-set to -5% of current price</p>
              </div>
              <div className="space-y-2">
                <Label>Max Price ($)</Label>
                <Input 
                  type="number" 
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder={currentPrice ? (currentPrice * 1.05).toFixed(2) : "2500"} 
                />
                <p className="text-xs text-muted-foreground">Auto-set to +5% of current price</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 h-10"
                onClick={() => {
                  if (currentPrice && !priceLoading && !priceError) {
                    setMinPrice((currentPrice * 0.95).toFixed(2))
                    setMaxPrice((currentPrice * 1.05).toFixed(2))
                  }
                }}
                disabled={!currentPrice || priceLoading || !!priceError}
              >
                Reset Price ±5%
              </Button>
              <Button 
                variant="default" 
                size="sm"
                className="flex-1 h-10"
                onClick={getSuggestedTrades}
                disabled={!currentPrice || priceLoading || !!priceError || suggestionsLoading}
              >
                {suggestionsLoading ? "Getting AI Suggestions..." : "AI Suggest Trades"}
              </Button>
            </div>

            {/* AI Suggestions Display */}
            {(suggestionsError || lastSuggestions) && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium mb-3">AI Trading Suggestions</h4>
                
                {suggestionsError && (
                  <div className="text-red-500 text-sm mb-2">
                    Error: {suggestionsError}
                  </div>
                )}
                
                {lastSuggestions && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Market Sentiment:</span>
                      <span className={`text-sm px-2 py-1 rounded ${
                        lastSuggestions.marketSentiment === 'bullish' ? 'bg-green-100 text-green-700' :
                        lastSuggestions.marketSentiment === 'bearish' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {lastSuggestions.marketSentiment?.toUpperCase()}
                      </span>
                    </div>
                    
                    {lastSuggestions.reasoning && (
                      <p className="text-xs text-muted-foreground">
                        {lastSuggestions.reasoning}
                      </p>
                    )}
                    
                    {lastSuggestions.gridTrades && lastSuggestions.gridTrades.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium">Suggested Orders:</h5>
                        <div className="grid gap-2">
                          {lastSuggestions.gridTrades.map((trade: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-xs p-2 bg-background rounded border">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  trade.type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {trade.type?.toUpperCase()}
                                </span>
                                <span>${trade.price}</span>
                                <span>{trade.amount} {baseAsset}</span>
                              </div>
                              <span className="text-muted-foreground">{trade.reason}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex justify-end mt-3">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={createLimitOrdersFromSuggestions}
                            disabled={limitOrdersLoading}
                          >
                            {limitOrdersLoading ? "Creating Orders..." : "Create Limit Orders"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Limit Orders Display */}
                    {(limitOrdersError || limitOrders.length > 0) && (
                      <div className="mt-4 p-4 border rounded-lg bg-blue-50/50">
                        <h5 className="text-sm font-medium mb-3">Limit Orders</h5>
                        
                        {limitOrdersError && (
                          <div className="text-red-500 text-sm mb-2">
                            Error: {limitOrdersError}
                          </div>
                        )}
                        
                        {limitOrders.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs text-blue-600 mb-2">
                              {limitOrders.length} orders ready for execution
                            </div>
                            <div className="flex justify-end mb-2">
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => signAndSubmitOrders(chainId, walletAddress)}
                                disabled={signingOrders || submittingOrders || !walletAddress}
                              >
                                {signingOrders ? "Signing..." : submittingOrders ? "Submitting..." : "Sign & Submit Orders"}
                              </Button>
                            </div>
                            <div className="grid gap-2">
                              {limitOrders.map((order, index) => (
                                <div key={order.id} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-blue-200">
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      order.type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                      {order.type.toUpperCase()}
                                    </span>
                                    <span>${order.price}</span>
                                    <span>{order.amount} {order.baseToken}</span>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      order.status === 'ready' ? 'bg-blue-100 text-blue-700' : 
                                      order.status === 'created' ? 'bg-purple-100 text-purple-700' :
                                      order.status === 'submitted' ? 'bg-green-100 text-green-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {order.status.toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-muted-foreground">{order.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

         

            <div className="space-y-3 p-3 border rounded-lg bg-muted/30 slider-container">
              <Label className="text-sm font-medium">Grid Levels: {gridLevels[0]}</Label>
              <div className="px-2">
                <Slider 
                  value={gridLevels} 
                  onValueChange={setGridLevels} 
                  max={50} 
                  min={5} 
                  step={1} 
                  className="w-full" 
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground px-2">
                <span>Min: 5</span>
                <span>Max: 50</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Order Size</Label>
              <Input type="number" placeholder="100" />
              <div className="flex space-x-2">
                {[25, 50, 75, 100].map((percent) => (
                  <Button key={percent} variant="outline" size="sm" className="flex-1">
                    {percent}%
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Order Expiration</Label>
              <Select defaultValue="1h">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">15 minutes</SelectItem>
                  <SelectItem value="30m">30 minutes</SelectItem>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="2h">2 hours</SelectItem>
                  <SelectItem value="4h">4 hours</SelectItem>
                  <SelectItem value="24h">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telegram Integration */}
      {/* <TelegramPanel /> */}
    </div>
  )
}
