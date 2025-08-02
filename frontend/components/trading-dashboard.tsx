"use client"

import { ConfigurationPanel } from "./configuration-panel"
import { TradingChart } from "./trading-chart"
import { StatusPanel } from "./status-panel"
import { RangeStrategyPanel } from "./range-strategy-panel"
import { Header } from "./header"
import { useEffect, useState } from "react"

export function TradingDashboard() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3">
              <div className="h-96 bg-muted animate-pulse rounded-lg" />
            </div>
            <div className="lg:col-span-6">
              <div className="h-96 bg-muted animate-pulse rounded-lg" />
            </div>
            <div className="lg:col-span-3">
              <div className="h-96 bg-muted animate-pulse rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-3">
            <ConfigurationPanel />
          </div>

          {/* Range Strategy Settings */}
          <div className="lg:col-span-6">
            <RangeStrategyPanel />
          </div>

          {/* Status Panel */}
          <div className="lg:col-span-3">
            <StatusPanel />
          </div>
        </div>

        {/* Trading Chart - Full Width */}
        <div className="mt-6">
          <TradingChart />
        </div>
      </div>
    </div>
  )
}
