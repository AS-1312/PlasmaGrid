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
  const { connect, connectors, isPending, error } = useConnect()
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

  // Debug logging
  useEffect(() => {
  }, [address, isConnected, isConnecting, isPending, connectors])

  const handleConnect = async (connector: any) => {
    try {
      await connect({ connector })
    } catch (err) {
      // Connect error handled
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
    } catch (err) {
      // Disconnect error handled
    }
  }

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
                <Button variant="ghost" size="sm" onClick={handleDisconnect}>
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
              {error && (
                <div className="text-red-500 text-sm mb-2">
                  Error: {error.message}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {connectors && connectors.length > 0 ? (
                connectors.map((connector) => (
                  <Button
                    key={connector.uid}
                    onClick={() => handleConnect(connector)}
                    disabled={isPending || isConnecting}
                    variant="outline"
                    className="w-full"
                  >
                    {isPending ? "Connecting..." : connector.name}
                  </Button>
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  No wallet connectors available
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
