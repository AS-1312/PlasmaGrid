"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useTradingStore } from "@/lib/trading-store"
import { TelegramPanel } from "./telegram-panel"
import { WalletConnection } from "./wallet-connection"

export function ConfigurationPanel() {
  const [selectedNetwork, setSelectedNetwork] = useState("ethereum")
  const [gridLevels, setGridLevels] = useState([20])
  const [stopLoss, setStopLoss] = useState(false)
  const [takeProfit, setTakeProfit] = useState(false)

  const { currentPrice, baseAsset, quoteAsset, setBaseAsset, setQuoteAsset } = useTradingStore()

  const networks = [
    { value: "ethereum", label: "Ethereum" },
    { value: "polygon", label: "Polygon" },
    { value: "bsc", label: "BSC" },
    { value: "arbitrum", label: "Arbitrum" },
  ]

  const popularTokens = [
    { symbol: "ETH", name: "Ethereum", price: 2340.5 },
    { symbol: "USDT", name: "Tether", price: 1.0 },
    { symbol: "1INCH", name: "1inch", price: 0.45 },
    { symbol: "BTC", name: "Bitcoin", price: 43250.0 },
  ]

  return (
    <div className="space-y-6">
      {/* Wallet & API Settings */}
      <WalletConnection />

      {/* Trading Pair Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Pair Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Base Asset</Label>
              <Select value={baseAsset} onValueChange={setBaseAsset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {popularTokens.map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      <div className="flex items-center space-x-2">
                        <span>{token.symbol}</span>
                        <span className="text-sm text-muted-foreground">{token.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quote Asset</Label>
              <Select value={quoteAsset} onValueChange={setQuoteAsset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {popularTokens.map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      <div className="flex items-center space-x-2">
                        <span>{token.symbol}</span>
                        <span className="text-sm text-muted-foreground">{token.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                {baseAsset}/{quoteAsset}
              </span>
              <Badge variant="outline" className="text-green-600">
                +2.34%
              </Badge>
            </div>
            <div className="text-2xl font-bold">${currentPrice.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">24h Volume: $1.2B</div>
          </div>
        </CardContent>
      </Card>

      {/* Range Strategy Settings */}
      <Card>
        <CardHeader>
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

            <div className="p-3 bg-muted rounded-lg text-center">
              <div className="text-sm text-muted-foreground">Current Price</div>
              <div className="text-lg font-bold">${currentPrice.toLocaleString()}</div>
            </div>

            <div className="space-y-2">
              <Label>Grid Levels: {gridLevels[0]}</Label>
              <Slider value={gridLevels} onValueChange={setGridLevels} max={50} min={5} step={1} className="w-full" />
            </div>

            <div className="space-y-2">
              <Label>Order Size</Label>
              <Input type="number" placeholder="100" />
              <div className="flex space-x-2">
                {[25, 50, 75, 100].map((percent) => (
                  <Button key={percent} variant="outline" size="sm" className="flex-1 bg-transparent">
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
      <Card>
        <CardHeader>
          <CardTitle>Risk Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="stop-loss">Stop Loss</Label>
            <Switch id="stop-loss" checked={stopLoss} onCheckedChange={setStopLoss} />
          </div>
          {stopLoss && <Input type="number" placeholder="5" suffix="%" />}

          <Separator />

          <div className="flex items-center justify-between">
            <Label htmlFor="take-profit">Take Profit</Label>
            <Switch id="take-profit" checked={takeProfit} onCheckedChange={setTakeProfit} />
          </div>
          {takeProfit && <Input type="number" placeholder="10" suffix="%" />}

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
