"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { TrendingUp, Activity, DollarSign } from "lucide-react"

export function PerformanceMetrics() {
  // Mock performance data
  const todayStats = {
    totalTrades: 24,
    totalVolume: 12450.3,
    pnl: 156.78,
    successRate: 87.5,
  }

  const performanceData = [
    { time: "00:00", pnl: 0 },
    { time: "04:00", pnl: 45.2 },
    { time: "08:00", pnl: 78.5 },
    { time: "12:00", pnl: 123.4 },
    { time: "16:00", pnl: 98.7 },
    { time: "20:00", pnl: 156.78 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Performance Metrics</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Trades Today</div>
            <div className="text-lg font-bold">{todayStats.totalTrades}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Volume</div>
            <div className="text-lg font-bold">${todayStats.totalVolume.toLocaleString()}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Today's P&L</div>
            <div className="text-lg font-bold text-green-600">+${todayStats.pnl.toFixed(2)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Success Rate</div>
            <div className="text-lg font-bold">{todayStats.successRate}%</div>
          </div>
        </div>

        {/* Mini Performance Chart */}
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Line type="monotone" dataKey="pnl" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-green-100 text-green-800">
            <TrendingUp className="h-3 w-3 mr-1" />
            Profitable
          </Badge>
          <Badge className="bg-blue-100 text-blue-800">
            <Activity className="h-3 w-3 mr-1" />
            Active
          </Badge>
          <Badge className="bg-purple-100 text-purple-800">
            <DollarSign className="h-3 w-3 mr-1" />
            High Volume
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
