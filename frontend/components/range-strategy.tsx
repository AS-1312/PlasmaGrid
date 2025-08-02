"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

interface RangeStrategyProps {
  minPrice: string
  setMinPrice: (price: string) => void
  maxPrice: string
  setMaxPrice: (price: string) => void
  gridLevels: number[]
  setGridLevels: (levels: number[]) => void
  currentPrice: number | null
  priceLoading: boolean
  priceError: string | null
  baseAsset: string
  getSuggestedTrades: () => void
  suggestionsLoading: boolean
  suggestionsError: string | null
  lastSuggestions: any
  createLimitOrdersFromSuggestions: () => void
  limitOrdersLoading: boolean
  limitOrdersError: string | null
  limitOrders: any[]
  signAndSubmitOrders: (chainId: number, walletAddress: string) => void
  signingOrders: boolean
  submittingOrders: boolean
  chainId: number
  walletAddress: string | null
}

export function RangeStrategy({
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  gridLevels,
  setGridLevels,
  currentPrice,
  priceLoading,
  priceError,
  baseAsset,
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
  chainId,
  walletAddress
}: RangeStrategyProps) {
  return (
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
                              onClick={() => walletAddress && signAndSubmitOrders(chainId, walletAddress)}
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
                <Button key={percent} size="sm" className="flex-1">
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
  )
}
