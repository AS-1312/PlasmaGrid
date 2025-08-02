"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Play, Pause, Square, RotateCcw, AlertTriangle } from "lucide-react"
import { useTradingStore } from "@/lib/trading-store"
import { PerformanceMetrics } from "./performance-metrics"
import { OrdersTable } from "./orders-table"

export function StatusPanel() {
  const { botStatus, setBotStatus, totalPnL, totalOrders, filledOrders, pendingOrders, uptime } = useTradingStore()

  const handleStartBot = () => setBotStatus("running")
  const handlePauseBot = () => setBotStatus("paused")
  const handleStopBot = () => setBotStatus("stopped")
  const handleResetGrid = () => {
    setBotStatus("stopped")
    // Reset logic would go here
  }

  const getStatusColor = () => {
    switch (botStatus) {
      case "running":
        return "bg-green-500"
      case "paused":
        return "bg-yellow-500"
      case "stopped":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="space-y-6">
      {/* Bot Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bot Status</span>
            <Badge variant="outline" className="capitalize">
              <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor()}`} />
              {botStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Uptime</div>
              <div className="font-mono">{uptime}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Orders</div>
              <div className="font-mono">{totalOrders}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Filled</div>
              <div className="font-mono text-green-600">{filledOrders}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Pending</div>
              <div className="font-mono text-yellow-600">{pendingOrders}</div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Portfolio Balance</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>ETH</span>
                <span className="font-mono">2.45</span>
              </div>
              <div className="flex justify-between">
                <span>USDT</span>
                <span className="font-mono">5,420.30</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total P&L</div>
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
            </div>
            <div className={`text-sm ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalPnL >= 0 ? "+" : ""}2.34%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <PerformanceMetrics />

      {/* Control Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleStartBot}
              disabled={botStatus === "running"}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
            <Button
              onClick={handlePauseBot}
              disabled={botStatus !== "running"}
              variant="outline"
              className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 bg-transparent"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          </div>

          <Button
            onClick={handleStopBot}
            disabled={botStatus === "stopped"}
            variant="outline"
            className="w-full border-red-500 text-red-600 hover:bg-red-50 bg-transparent"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop Bot
          </Button>

          <Button onClick={handleResetGrid} variant="outline" className="w-full bg-transparent">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Grid
          </Button>

          <Button variant="destructive" className="w-full">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Emergency Stop
          </Button>
        </CardContent>
      </Card>

      {/* Active Orders */}
      <OrdersTable />
    </div>
  )
}
