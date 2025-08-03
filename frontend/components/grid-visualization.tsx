"use client"

import { useEffect } from "react"
import { useChainId } from "wagmi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Loader2 } from "lucide-react"
import { useTradingStore } from "@/lib/trading-store"

export function GridVisualization() {
  const chainId = useChainId()
  const { 
    currentPrice, 
    gridOrders, 
    gridOrdersLoading, 
    gridOrdersError,
    hotWallet,
    fetchGridOrders 
  } = useTradingStore()

  // Auto-fetch orders when component mounts and hot wallet is available
  useEffect(() => {
    if (hotWallet && chainId) {
      fetchGridOrders(chainId)
    }
  }, [hotWallet, chainId, fetchGridOrders])

  // Create grid levels from real orders or generate default levels
  const createGridData = () => {
    const basePrice = currentPrice || 2340 // Use real current price or fallback
    const priceRange = 200 // ±$100 from current price
    const levels = 20
    const priceStep = priceRange / levels
    
    return Array.from({ length: levels }, (_, i) => {
      const price = Math.round((basePrice - (priceRange / 2)) + (i * priceStep))
      const isCurrent = Math.abs(price - basePrice) < priceStep / 2
      
      // Find real orders at this price level
      const ordersAtLevel = gridOrders.filter(order => {
        const orderPrice = order.price || 0
        const matches = Math.abs(orderPrice - price) < priceStep / 2
        return matches
      })
      
      const buyOrders = ordersAtLevel.filter(o => o.type === 'buy')
      const sellOrders = ordersAtLevel.filter(o => o.type === 'sell')
      
      return {
        price,
        isCurrent,
        isBuyZone: price < basePrice,
        hasBuyOrder: buyOrders.length > 0,
        hasSellOrder: sellOrders.length > 0,
        buyOrderFilled: buyOrders.some(o => o.status === 'filled'),
        sellOrderFilled: sellOrders.some(o => o.status === 'filled'),
        buyOrdersPending: buyOrders.filter(o => o.status === 'pending').length,
        sellOrdersPending: sellOrders.filter(o => o.status === 'pending').length,
        amount: ordersAtLevel.reduce((sum, o) => sum + (o.amount || 0), 0),
      }
    }).reverse() // Show highest prices at top
  }

  const gridData = createGridData()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Grid Orders Status</span>
          <div className="flex items-center space-x-2">
            {hotWallet && (
              <Badge variant="outline" className="text-xs">
                Hot Wallet: {hotWallet.address.slice(0, 6)}...{hotWallet.address.slice(-4)}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => chainId && fetchGridOrders(chainId)}
              disabled={gridOrdersLoading || !hotWallet}
              className="h-8"
            >
              {gridOrdersLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-1 hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardTitle>
        {gridOrdersError && (
          <div className="text-sm text-red-500 mt-2">
            Error: {gridOrdersError}
          </div>
        )}
        {gridOrders.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {gridOrders.length} active orders
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative h-96 bg-muted/20 rounded-lg p-4 overflow-hidden">
          {/* Price levels */}
          {gridData.map((level, index) => (
            <div
              key={index}
              className="absolute left-0 right-0 flex items-center justify-between border-b border-muted-foreground/20"
              style={{
                top: `${(index / gridData.length) * 100}%`,
                height: `${100 / gridData.length}%`,
              }}
            >
              {/* Price label */}
              <div className="text-xs font-mono text-muted-foreground">${level.price}</div>

              {/* Grid line */}
              <div className="flex-1 mx-4 relative">
                {level.isCurrent && <div className="absolute inset-0 bg-blue-500/20 rounded" />}

                {/* Buy orders (green dots) */}
                {level.hasBuyOrder && (
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        level.buyOrderFilled ? "bg-green-500" : "bg-green-300 border-2 border-green-500"
                      }`}
                    />
                    {level.buyOrdersPending > 0 && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full text-xs flex items-center justify-center text-black font-bold">
                        {level.buyOrdersPending}
                      </div>
                    )}
                  </div>
                )}

                {/* Sell orders (red dots) */}
                {level.hasSellOrder && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        level.sellOrderFilled ? "bg-red-500" : "bg-red-300 border-2 border-red-500"
                      }`}
                    />
                    {level.sellOrdersPending > 0 && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full text-xs flex items-center justify-center text-black font-bold">
                        {level.sellOrdersPending}
                      </div>
                    )}
                  </div>
                )}

                {/* Current price indicator */}
                {level.isCurrent && (
                  <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
                  </div>
                )}
              </div>

              {/* Order amount */}
              <div className="text-xs text-muted-foreground">
                {level.amount > 0 ? `${level.amount.toFixed(3)}` : ""}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 space-y-2">
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>Buy Orders (Filled)</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-3 h-3 bg-green-300 border-2 border-green-500 rounded-full" />
              <span>Buy Orders (Pending)</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span>Sell Orders (Filled)</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-3 h-3 bg-red-300 border-2 border-red-500 rounded-full" />
              <span>Sell Orders (Pending)</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-4 h-4 bg-blue-500 rounded-full" />
              <span>Current Price</span>
            </div>
          </div>
        </div>
        
        {/* Debug: Orders List */}
        {gridOrders.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Active Orders ({gridOrders.length})</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {gridOrders.slice(0, 10).map((order, index) => (
                <div key={index} className="text-xs flex justify-between items-center py-1 px-2 bg-background rounded">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.type === 'buy' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {order.type?.toUpperCase() || 'N/A'}
                  </span>
                  <span className="font-mono">${order.price?.toFixed(0) || 'N/A'}</span>
                  <span className="font-mono">{order.amount?.toFixed(4) || 'N/A'}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.status === 'filled' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                    order.status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {order.status || 'unknown'}
                  </span>
                </div>
              ))}
              {gridOrders.length > 10 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  ... and {gridOrders.length - 10} more orders
                </div>
              )}
            </div>
          </div>
        )}
        
        {gridOrders.length === 0 && !gridOrdersLoading && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
            No active orders found for this wallet
          </div>
        )}
      </CardContent>
    </Card>
  )
}
