"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, Send, MessageSquare } from "lucide-react"

export function TelegramPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [tradeAlerts, setTradeAlerts] = useState(true)
  const [statusUpdates, setStatusUpdates] = useState(true)
  const [errorAlerts, setErrorAlerts] = useState(true)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Telegram Integration</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Telegram Configuration */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bot-token">Bot Token</Label>
                <Input id="bot-token" type="password" placeholder="Enter Telegram bot token" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chat-id">Chat ID</Label>
                <Input id="chat-id" placeholder="Enter chat/channel ID" />
              </div>

              <Button variant="outline" className="w-full bg-transparent">
                <Send className="h-4 w-4 mr-2" />
                Send Test Message
              </Button>
            </div>

            <Separator />

            {/* Notification Settings */}
            <div className="space-y-4">
              <h4 className="font-medium">Notification Settings</h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="trade-alerts">Trade Alerts</Label>
                  <Switch id="trade-alerts" checked={tradeAlerts} onCheckedChange={setTradeAlerts} />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="status-updates">Status Updates</Label>
                  <Switch id="status-updates" checked={statusUpdates} onCheckedChange={setStatusUpdates} />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="error-alerts">Error Alerts</Label>
                  <Switch id="error-alerts" checked={errorAlerts} onCheckedChange={setErrorAlerts} />
                </div>

                <div className="space-y-2">
                  <Label>P&L Reports</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Message Templates */}
            <div className="space-y-4">
              <h4 className="font-medium">Message Templates</h4>

              <div className="space-y-2">
                <Label htmlFor="trade-template">Trade Execution Template</Label>
                <Textarea
                  id="trade-template"
                  placeholder="🔄 Trade Executed: {type} {amount} {base} at ${price}"
                  className="h-20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-template">Status Update Template</Label>
                <Textarea
                  id="status-template"
                  placeholder="📊 Bot Status: {status} | P&L: ${pnl} | Orders: {orders}"
                  className="h-20"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                Available variables: {"{type}"}, {"{amount}"}, {"{price}"}, {"{pnl}"}, {"{status}"}, {"{orders}"}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
