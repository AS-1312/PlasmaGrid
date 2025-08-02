"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Wifi, WifiOff } from "lucide-react"
import { useTradingStore } from "@/lib/trading-store"
import { useTheme } from "next-themes"
import { useAccount } from "wagmi"
import { useEffect, useState } from "react"

export function Header() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">1inch Range Trading Bot</h1>
              <div className="flex items-center space-x-2">
                <WifiOff className="h-4 w-4 text-gray-500" />
                <Badge variant="outline" className="capitalize">
                  <div className="w-2 h-2 rounded-full mr-2 bg-gray-500" />
                  Loading
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" disabled>
                <Sun className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>
    )
  }

  return <HeaderContent />
}

function HeaderContent() {
  const { isConnected } = useAccount()
  const { botStatus } = useTradingStore()
  const { theme, setTheme } = useTheme()

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
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">1inch Range Trading Bot</h1>
            <div className="flex items-center space-x-2">
              {isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
              <Badge variant="outline" className="capitalize">
                <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor()}`} />
                {botStatus}
              </Badge>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
