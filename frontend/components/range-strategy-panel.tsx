"use client"

import { useState, useEffect } from "react"
import { useChainId, useAccount } from "wagmi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { useTradingStore } from "@/lib/trading-store"
import { useLimitOrderSigning } from "@/hooks/use-limit-order-signing"
import { useToast } from "@/hooks/use-toast"

export function RangeStrategyPanel() {
  const chainId = useChainId()
  const { address: walletAddress } = useAccount()
  const { toast } = useToast()
  const [gridLevels, setGridLevels] = useState([20])
  const [minPrice, setMinPrice] = useState<string>("")
  const [maxPrice, setMaxPrice] = useState<string>("")
  const [orderSize, setOrderSize] = useState<string>("100")
  const [orderSizePercentage, setOrderSizePercentage] = useState<number>(100)

  const {
    isSigningOrders,
    signingError,
    signLimitOrders,
    submitSignedOrders,
    resetSigning
  } = useLimitOrderSigning()

  const { 
    currentPrice, 
    baseAsset, 
    quoteAsset,
    priceLoading,
    priceError,
    getSuggestedTrades,
    suggestionsLoading,
    suggestionsError,
    lastSuggestions,
    createLimitOrdersFromSuggestions,
    limitOrdersLoading,
    limitOrdersError,
    limitOrders,
    signAndSubmitOrders,
    signingOrders,
    submittingOrders,
    baseTokenData,
    quoteTokenData,
    getHotWalletBalance,
    hotWallet,
    loadTokens,
    tryFetchPrice
  } = useTradingStore()

  // Get base token balance from hot wallet
  const getBaseTokenBalance = (): number => {
    if (!baseTokenData || !hotWallet) return 0
    const balance = getHotWalletBalance(baseTokenData.address)
    return parseFloat(balance) || 0
  }

  // Calculate order size based on percentage of available balance
  const calculateOrderSizeFromPercentage = (percentage: number): string => {
    const balance = getBaseTokenBalance()
    const amount = (balance * percentage) / 100
    return amount.toFixed(6)
  }

  // Handle percentage button clicks
  const handlePercentageClick = (percentage: number) => {
    const balance = getBaseTokenBalance()
    if (balance === 0) {
      // Show a warning if no balance available
      return
    }
    setOrderSizePercentage(percentage)
    const calculatedSize = calculateOrderSizeFromPercentage(percentage)
    setOrderSize(calculatedSize)
  }

  // Handle manual order size input
  const handleOrderSizeChange = (value: string) => {
    setOrderSize(value)
    const balance = getBaseTokenBalance()
    if (balance > 0) {
      const percentage = (parseFloat(value) / balance) * 100
      setOrderSizePercentage(Math.min(percentage, 100))
    }
  }

  // Auto-load tokens when component mounts or chainId/assets change
  useEffect(() => {
    if (chainId && baseAsset && quoteAsset) {
      loadTokens(chainId).then(() => {
        // Try to fetch price after tokens are loaded
        tryFetchPrice(chainId)
      }).catch(err => {
        // Failed to load tokens
      })
    }
  }, [chainId, baseAsset, quoteAsset, loadTokens, tryFetchPrice])

  // Check if there's sufficient balance for the suggested trades
  const hasSufficientBalance = (): boolean => {
    if (!lastSuggestions?.gridTrades || !baseTokenData) return false
    
    const totalRequiredAmount = lastSuggestions.gridTrades.reduce((sum: number, trade: any) => {
      return sum + (trade.amount || 0)
    }, 0)
    
    const availableBalance = getBaseTokenBalance()
    return availableBalance >= totalRequiredAmount && totalRequiredAmount > 0
  }

  // Get insufficient balance message
  const getInsufficientBalanceMessage = (): string => {
    if (!lastSuggestions?.gridTrades || !baseTokenData) return ""
    
    const totalRequiredAmount = lastSuggestions.gridTrades.reduce((sum: number, trade: any) => {
      return sum + (trade.amount || 0)
    }, 0)
    
    const availableBalance = getBaseTokenBalance()
    
    if (availableBalance === 0) {
      return `No ${baseTokenData.symbol} balance in hot wallet`
    }
    
    if (totalRequiredAmount > availableBalance) {
      return `Insufficient balance: need ${totalRequiredAmount.toFixed(6)} ${baseTokenData.symbol}, have ${availableBalance.toFixed(6)} ${baseTokenData.symbol}`
    }
    
    return ""
  }

  // Handle signing and submitting orders with 1inch SDK
  const handleSignAndSubmitOrders = async () => {
    if (!chainId) {
      return
    }
    if (!walletAddress) {
      return
    }
    if (!baseTokenData) {
      return
    }
    if (!quoteTokenData) {
      return
    }
    if (!hotWallet) {
      return
    }
    if (limitOrders.length === 0) {
      return
    }

    try {
      resetSigning()
      
      // Step 1: Sign the limit orders using hot wallet address AND private key
      const signedOrders = await signLimitOrders(
        limitOrders,
        baseTokenData.address,
        quoteTokenData.address,
        chainId,
        hotWallet.address, // Use hot wallet address as maker
        hotWallet.privateKey // Use hot wallet private key for signing
      )

      // Step 2: Submit the signed orders to 1inch
      await submitSignedOrders(signedOrders, chainId)

      // Step 3: Update the orders in the store
      const updatedOrders = signedOrders.map(so => ({
        ...so.trade,
        status: 'submitted' as const
      }))
      
      // Show success notification
      toast({
        title: "🎉 Orders Submitted Successfully!",
        description: `${updatedOrders.length} limit orders have been signed and submitted to 1inch. Your grid trading strategy is now active.`,
        variant: "default",
      })

    } catch (error) {
      // Show error notification
      toast({
        title: "❌ Order Submission Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred while submitting orders.",
        variant: "destructive",
      })
    }
  }

  // Initialize order size when base token data or hot wallet balance changes
  useEffect(() => {
    if (baseTokenData && hotWallet && orderSize === "100") {
      // Only update if still at default value
      const calculatedSize = calculateOrderSizeFromPercentage(100)
      if (calculatedSize !== "0.000000") {
        setOrderSize(calculatedSize)
      }
    }
  }, [baseTokenData, hotWallet])

  return (
    <div>
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
                onClick={() => getSuggestedTrades(parseFloat(orderSize))}
                disabled={!currentPrice || priceLoading || !!priceError || suggestionsLoading || getBaseTokenBalance() === 0}
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
                        <div className="flex items-center justify-between text-xs">
                          <h5 className="font-medium">Suggested Orders:</h5>
                          <div className="text-muted-foreground">
                            Total: {lastSuggestions.gridTrades.reduce((sum: number, trade: any) => sum + (trade.amount || 0), 0).toFixed(4)} {baseAsset}
                            <span className="ml-2">({((lastSuggestions.gridTrades.reduce((sum: number, trade: any) => sum + (trade.amount || 0), 0) / parseFloat(orderSize)) * 100).toFixed(1)}% of order size)</span>
                          </div>
                        </div>
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
                        
                        <div className="flex flex-col items-end mt-3 space-y-2">
                          {!hasSufficientBalance() && lastSuggestions?.gridTrades && (
                            <p className="text-xs text-red-500 dark:text-red-400">
                              {getInsufficientBalanceMessage()}
                            </p>
                          )}
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={createLimitOrdersFromSuggestions}
                            disabled={limitOrdersLoading || !hasSufficientBalance()}
                          >
                            {limitOrdersLoading ? "Creating Orders..." : "Create Limit Orders"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Limit Orders Display */}
                    {(limitOrdersError || limitOrders.length > 0) && (
                      <div className="mt-4 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/50 dark:border-blue-800">
                        <h5 className="text-sm font-medium mb-3 text-foreground">Limit Orders</h5>
                        
                        {limitOrdersError && (
                          <div className="text-red-500 dark:text-red-400 text-sm mb-2">
                            Error: {limitOrdersError}
                          </div>
                        )}
                        
                        {signingError && (
                          <div className="text-red-500 dark:text-red-400 text-sm mb-2">
                            Signing Error: {signingError}
                          </div>
                        )}
                        
                        {/* Debug: Show button visibility condition */}
                        <div className="text-xs text-gray-500 mb-2">
                          Debug: limitOrders.length = {limitOrders.length}, walletAddress = {walletAddress ? 'connected' : 'not connected'}
                        </div>
                        
                        {limitOrders.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                              {limitOrders.length} orders ready for execution
                            </div>
                            <div className="text-xs text-orange-600 dark:text-orange-400 mb-2 p-2 bg-orange-50 dark:bg-orange-950/50 rounded border">
                              🔧 <strong>Development Note:</strong> 1inch SDK integration is active. Orders will be created using the hot wallet address, signed by your connected wallet, but submission is simulated (requires 1inch API key for production).
                            </div>
                            <div className="flex justify-end mb-2">
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await handleSignAndSubmitOrders()
                                  } catch (error) {
                                    alert('Error: ' + (error instanceof Error ? error.message : String(error)))
                                  }
                                }}
                                disabled={isSigningOrders || signingOrders || submittingOrders || !walletAddress}
                              >
                                {isSigningOrders ? "Signing..." : signingOrders ? "Signing..." : submittingOrders ? "Submitting..." : "Sign & Submit Orders"}
                              </Button>
                            </div>
                            <div className="grid gap-2">
                              {limitOrders.map((order, index) => (
                                <div key={order.id} className="flex items-center justify-between text-xs p-2 bg-background border rounded border-border">
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      order.type === 'buy' 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                    }`}>
                                      {order.type.toUpperCase()}
                                    </span>
                                    <span className="text-foreground">${order.price}</span>
                                    <span className="text-foreground">{order.amount} {order.baseToken}</span>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      order.status === 'ready' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 
                                      order.status === 'created' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' :
                                      order.status === 'submitted' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
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
              <Input 
                type="number" 
                placeholder="100" 
                value={orderSize}
                onChange={(e) => handleOrderSizeChange(e.target.value)}
              />
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Available: {getBaseTokenBalance().toFixed(6)} {baseTokenData?.symbol || baseAsset}</span>
                <span>{orderSizePercentage.toFixed(1)}% of balance</span>
              </div>
              {getBaseTokenBalance() === 0 && (
                <div className="text-xs text-orange-500 dark:text-orange-400 p-2 bg-orange-50 dark:bg-orange-950/50 rounded border">
                  ⚠️ No {baseTokenData?.symbol || baseAsset} balance in hot wallet. Please fund the hot wallet to create orders.
                </div>
              )}
              <div className="flex space-x-2">
                {[25, 50, 75, 100].map((percent) => (
                  <Button 
                    key={percent} 
                    size="sm" 
                    className="flex-1"
                    variant={orderSizePercentage === percent ? "default" : "outline"}
                    onClick={() => handlePercentageClick(percent)}
                    disabled={getBaseTokenBalance() === 0}
                  >
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
    </div>
  )
}
