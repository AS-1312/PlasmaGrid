"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

export function RiskManagement() {
  const [stopLoss, setStopLoss] = useState(false)
  const [takeProfit, setTakeProfit] = useState(false)

  return (
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
  )
}
