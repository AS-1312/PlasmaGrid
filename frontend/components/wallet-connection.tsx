"use client"

import { useAccount, useChainId, useBalance, useConnect, useDisconnect } from "wagmi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Wallet, Network, AlertCircle, LogOut } from "lucide-react"
import { useEffect, useState } from "react"
import { mainnet, polygon, arbitrum, base } from "wagmi/chains"

export function WalletConnection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Wallet Connection</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-sm text-muted-foreground mb-4">Loading wallet connection...</div>
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return <WalletConnectionContent />
}

function WalletConnectionContent() {
  const { address, isConnected, isConnecting } = useAccount()
  const chainId = useChainId()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const {
    data: balance,
    isLoading: balanceLoading,
    error: balanceError,
  } = useBalance({
    address: address,
  })

  // Get chain info from chainId
  const getChainInfo = (chainId: number) => {
    const chains = [mainnet, polygon, arbitrum, base]
    return chains.find((chain) => chain.id === chainId)
  }

  const currentChain = getChainInfo(chainId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wallet className="h-5 w-5" />
          <span>Wallet Connection</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && address ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Connected Address</div>
              <div className="font-mono text-sm bg-muted p-2 rounded flex items-center justify-between">
                <span>
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <Button variant="ghost" size="sm" onClick={() => disconnect()}>
                  <LogOut className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {currentChain && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Network</div>
                <Badge variant="outline" className="flex items-center space-x-2 w-fit">
                  <Network className="h-3 w-3" />
                  <span>{currentChain.name}</span>
                </Badge>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Balance</div>
              {balanceLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : balanceError ? (
                <div className="flex items-center space-x-2 text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Error loading balance</span>
                </div>
              ) : balance ? (
                <div className="font-mono">
                  {Number.parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No balance data</div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-sm text-muted-foreground mb-4">
                {isConnecting || isPending ? "Connecting..." : "Connect your wallet to start trading"}
              </div>
            </div>

            <div className="space-y-2">
              {connectors.map((connector) => (
                <Button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  disabled={isPending}
                  variant="outline"
                  className="w-full"
                >
                  {connector.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
