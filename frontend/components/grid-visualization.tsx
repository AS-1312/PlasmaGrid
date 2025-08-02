"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTradingStore } from "@/lib/trading-store"

export function GridVisualization() {
  const { currentPrice } = useTradingStore()

  // Mock grid data for visualization
  const gridData = Array.from({ length: 20 }, (_, i) => {
    const price = 2280 + i * 6
    const isCurrent = Math.abs(price - currentPrice) < 10
    const isBuyZone = price < currentPrice
    const hasBuyOrder = isBuyZone && Math.random() > 0.6
    const hasSellOrder = !isBuyZone && Math.random() > 0.6
    const isFilled = Math.random() > 0.7

    return {
      price,
      isCurrent,
      isBuyZone,
      hasBuyOrder,
      hasSellOrder,
      isFilled,
      amount: 0.1,
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visual Grid Representation</CardTitle>
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
                        level.isFilled ? "bg-green-500" : "bg-green-300 border-2 border-green-500"
                      }`}
                    />
                  </div>
                )}

                {/* Sell orders (red dots) */}
                {level.hasSellOrder && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        level.isFilled ? "bg-red-500" : "bg-red-300 border-2 border-red-500"
                      }`}
                    />
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
                {level.hasBuyOrder || level.hasSellOrder ? `${level.amount}` : ""}
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
      </CardContent>
    </Card>
  )
}
