"use client"

import { CardContent } from "@/components/ui/card"
import { CardTitle } from "@/components/ui/card"
import { CardHeader } from "@/components/ui/card"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { GridVisualization } from "./grid-visualization"
import { useTradingStore } from "@/lib/trading-store" // Updated import path

export function TradingChart() {
  const { currentPrice, baseAsset, quoteAsset, orders } = useTradingStore()

  // Mock grid levels
  const gridLevels = [
    { price: 2400, type: "sell", status: "pending", amount: 0.1, pnl: 0 },
    { price: 2380, type: "sell", status: "filled", amount: 0.1, pnl: 15.2 },
    { price: 2360, type: "sell", status: "none", amount: 0.1, pnl: 0 },
    { price: 2340, type: "current", status: "current", amount: 0, pnl: 0 },
    { price: 2320, type: "buy", status: "pending", amount: 0.1, pnl: 0 },
    { price: 2300, type: "buy", status: "filled", amount: 0.1, pnl: -8.5 },
    { price: 2280, type: "buy", status: "none", amount: 0.1, pnl: 0 },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "filled":
        return "text-green-600"
      case "pending":
        return "text-yellow-600"
      case "current":
        return "text-blue-600"
      default:
        return "text-muted-foreground"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "filled":
        return <Badge className="bg-green-100 text-green-800">Filled</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "current":
        return <Badge className="bg-blue-100 text-blue-800">Current</Badge>
      default:
        return <Badge variant="outline">None</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Grid Visualization and Status */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="grid">Grid Status</TabsTrigger>
          <TabsTrigger value="visual">Visual Grid</TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          <Card>
            <CardHeader>
              <CardTitle>Grid Levels Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Price Level</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gridLevels.map((level, index) => (
                    <TableRow key={index} className={level.type === "current" ? "bg-muted/50" : ""}>
                      <TableCell className="font-mono">${level.price}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            level.type === "buy" ? "default" : level.type === "sell" ? "destructive" : "secondary"
                          }
                        >
                          {level.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(level.status)}</TableCell>
                      <TableCell>
                        {level.amount} {baseAsset}
                      </TableCell>
                      <TableCell
                        className={`text-right ${level.pnl > 0 ? "text-green-600" : level.pnl < 0 ? "text-red-600" : ""}`}
                      >
                        {level.pnl !== 0 ? `$${level.pnl}` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visual">
          <GridVisualization />
        </TabsContent>
      </Tabs>
    </div>
  )
}
