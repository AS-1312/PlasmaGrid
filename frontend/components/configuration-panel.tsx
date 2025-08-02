"use client"

import { useState, useEffect } from "react"
import { useChainId } from "wagmi"
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
import { TelegramPanel } from "./telegram-panel"
import { WalletConnection } from "./wallet-connection"
import { TokenSelect } from "@/components/ui/token-select"
import { SUPPORTED_CHAINS, SupportedChain } from "@/lib/oneinch-api"

export function ConfigurationPanel() {
  const chainId = useChainId()
  const [gridLevels, setGridLevels] = useState([20])
  const [stopLoss, setStopLoss] = useState(false)
  const [takeProfit, setTakeProfit] = useState(false)
  const [minPrice, setMinPrice] = useState<string>("")
  const [maxPrice, setMaxPrice] = useState<string>("")

  const { 
    currentPrice, 
    baseAsset, 
    quoteAsset, 
    priceLoading,
    priceError,
    tokensLoading,
    setBaseAsset, 
    setQuoteAsset,
    tryFetchPrice,
    loadTokens
  } = useTradingStore()

  // Custom handlers that trigger price fetching with current chainId
  const handleBaseAssetChange = (asset: string) => {
    setBaseAsset(asset)
    if (quoteAsset && asset !== quoteAsset) {
      tryFetchPrice(currentChainId)
    }
  }

  const handleQuoteAssetChange = (asset: string) => {
    setQuoteAsset(asset)
    if (baseAsset && asset !== baseAsset) {
      tryFetchPrice(currentChainId)
    }
  }

  // Map chainId to SupportedChain
  const getNetworkFromChainId = (chainId: number): SupportedChain => {
    const chainEntry = Object.entries(SUPPORTED_CHAINS).find(([_, id]) => id === chainId)
    return (chainEntry?.[0] as SupportedChain) || "ethereum"
  }

  const currentNetwork = getNetworkFromChainId(chainId)
  const currentChainId = SUPPORTED_CHAINS[currentNetwork]

  // Load tokens when component mounts or chain changes
  useEffect(() => {
    loadTokens(currentChainId)
  }, [currentChainId, loadTokens])

  // Fetch real price when assets change or chain changes
  useEffect(() => {
    if (baseAsset && quoteAsset && baseAsset !== quoteAsset) {
      tryFetchPrice(currentChainId)
    }
  }, [baseAsset, quoteAsset, currentChainId, tryFetchPrice])

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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Base Asset</Label>
              <TokenSelect 
                value={baseAsset} 
                onValueChange={handleBaseAssetChange}
                chainId={currentChainId}
                placeholder="Select base token..."
              />
            </div>

            <div className="space-y-2">
              <Label>Quote Asset</Label>
              <TokenSelect 
                value={quoteAsset} 
                onValueChange={handleQuoteAssetChange}
                chainId={currentChainId}
                placeholder="Select quote token..."
              />
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
                <Input type="number" placeholder="2200" />
              </div>
              <div className="space-y-2">
                <Label>Max Price ($)</Label>
                <Input type="number" placeholder="2500" />
              </div>
            </div>

         

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

      {/* Risk Management */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-4">
          <CardTitle>Risk Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="stop-loss">Stop Loss</Label>
            <Switch id="stop-loss" checked={stopLoss} onCheckedChange={setStopLoss} />
          </div>
          {stopLoss && (
            <div className="pl-4 pt-2 flex items-center space-x-2">
              <Input type="number" placeholder="5" className="flex-1" />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <Label htmlFor="take-profit">Take Profit</Label>
            <Switch id="take-profit" checked={takeProfit} onCheckedChange={setTakeProfit} />
          </div>
          {takeProfit && (
            <div className="pl-4 pt-2 flex items-center space-x-2">
              <Input type="number" placeholder="10" className="flex-1" />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label>Max Concurrent Orders</Label>
            <Input type="number" placeholder="20" />
          </div>
        </CardContent>
      </Card>

      {/* Telegram Integration */}
      <TelegramPanel />
    </div>
  )
}
