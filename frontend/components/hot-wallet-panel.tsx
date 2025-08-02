"use client"

import { useState, useEffect } from "react"
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, useSendTransaction } from "wagmi"
import { parseUnits, formatUnits, isAddress } from "viem"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Copy, Wallet, RefreshCw, Send } from "lucide-react"
import { useTradingStore } from "@/lib/trading-store"
import { fetchWhitelistedTokens, OneInchToken } from "@/lib/oneinch-api"
import { hotWalletManager } from "@/lib/hot-wallet"

export function HotWalletPanel() {
  const [fundAmount, setFundAmount] = useState("")
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [currentChainTokens, setCurrentChainTokens] = useState<any[]>([])
  const [nativeTokenBalance, setNativeTokenBalance] = useState<string>("0")

  const { address: userAddress, isConnected } = useAccount()
  const chainId = useChainId()
  
  // Hook for writing to contracts (ERC20 transfers)
  const { writeContract, isPending: isWritePending, error: writeError, data: writeTxHash } = useWriteContract()
  
  // Hook for native token transfers
  const { sendTransaction, isPending: isSendPending, error: sendError, data: sendTxHash } = useSendTransaction()
  
  // Hook to wait for transaction confirmation
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: (txHash || sendTxHash || writeTxHash) as `0x${string}` | undefined,
  })

  const {
    hotWallet,
    hotWalletBalances,
    balancesLoading,
    fundingInProgress,
    fundingError,
    baseTokenData,
    quoteTokenData,
    tokens,
    initializeHotWallet,
    refreshHotWalletBalances,
    getHotWalletBalance
  } = useTradingStore()

  // Define native tokens for each chain
  const getNativeTokenInfo = (chainId: number) => {
    const nativeTokens: Record<number, { symbol: string; name: string; decimals: number }> = {
      1: { symbol: "ETH", name: "Ethereum", decimals: 18 },
      137: { symbol: "POL", name: "Polygon", decimals: 18 },
      56: { symbol: "BNB", name: "BNB Smart Chain", decimals: 18 },
      42161: { symbol: "ETH", name: "Arbitrum", decimals: 18 },
      10: { symbol: "ETH", name: "Optimism", decimals: 18 },
      43114: { symbol: "AVAX", name: "Avalanche", decimals: 18 },
      250: { symbol: "FTM", name: "Fantom", decimals: 18 },
      8453: { symbol: "ETH", name: "Base", decimals: 18 }
    }
    return nativeTokens[chainId] || { symbol: "ETH", name: "Native Token", decimals: 18 }
  }

  // Get native token balance
  const fetchNativeTokenBalance = async () => {
    if (!hotWallet || !chainId) return
    
    try {
      // Use the native token address (0x0) or the special native address
      const nativeAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
      const balance = await hotWalletManager.getTokenBalance(nativeAddress, chainId)
      setNativeTokenBalance(balance)
    } catch (error) {
      console.error("Failed to fetch native token balance:", error)
      setNativeTokenBalance("0")
    }
  }

  // Initialize hot wallet on component mount
  useEffect(() => {
    if (!hotWallet) {
      initializeHotWallet()
    }
  }, [hotWallet, initializeHotWallet])

  // Fetch tokens for current chain
  useEffect(() => {
    if (chainId) {
      fetchWhitelistedTokens(chainId)
        .then(tokens => {
          setCurrentChainTokens(tokens)
        })
        .catch(error => {
          console.error('Failed to fetch tokens for current chain:', error)
          setCurrentChainTokens([])
        })
    }
  }, [chainId])

  // Refresh balances when hot wallet is initialized
  useEffect(() => {
    if (hotWallet && tokens.length > 0 && chainId) {
      refreshHotWalletBalances(chainId)
    }
  }, [hotWallet, tokens, chainId, refreshHotWalletBalances])

  // Fetch native token balance when wallet or chain changes
  useEffect(() => {
    if (hotWallet && chainId) {
      fetchNativeTokenBalance()
    }
  }, [hotWallet, chainId])

  // Handle successful transaction
  useEffect(() => {
    if (isTxSuccess && (txHash || sendTxHash || writeTxHash)) {
      const actualTxHash = txHash || sendTxHash || writeTxHash
      console.log("Transaction successful:", actualTxHash)
      setFundAmount("")
      setTxHash(null)
      // Refresh balances after successful funding using current chain
      if (hotWallet && tokens.length > 0 && chainId) {
        setTimeout(() => {
          refreshHotWalletBalances(chainId)
          fetchNativeTokenBalance() // Also refresh native token balance
        }, 2000) // Wait 2 seconds for block confirmation
      }
    }
  }, [isTxSuccess, txHash, sendTxHash, writeTxHash, hotWallet, tokens, chainId, refreshHotWalletBalances])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    console.log(`${label} copied to clipboard`)
  }

  // Helper function to get current chain's token address by symbol
  const getCurrentChainTokenAddress = (symbol: string): string | null => {
    const token = currentChainTokens.find(t => 
      t.symbol.toLowerCase() === symbol.toLowerCase()
    )
    return token?.address || null
  }

  // Helper function to get balance for current chain token
  const getCurrentChainTokenBalance = (symbol: string): string => {
    const address = getCurrentChainTokenAddress(symbol)
    return address ? getHotWalletBalance(address) : '0'
  }

  const handleFundWalletNative = async () => {
    if (!fundAmount || !hotWallet || !userAddress || !isConnected) {
      console.error("Missing required data for native token transfer")
      return
    }

    try {
      // For native tokens (ETH, MATIC, etc.), use sendTransaction
      const amountWei = parseUnits(fundAmount, 18)
      
      sendTransaction({
        to: hotWallet.address as `0x${string}`,
        value: amountWei,
      })

      console.log("Native token transfer initiated")
      
    } catch (error) {
      console.error("Failed to fund hot wallet with native token:", error)
    }
  }

  const handleFundWalletERC20 = async () => {
    if (!fundAmount || !baseTokenData || !hotWallet || !userAddress || !isConnected) {
      console.error("Missing required data for ERC20 transfer")
      return
    }

    try {
      const amountWei = parseUnits(fundAmount, baseTokenData.decimals)
      
      // ERC20 transfer function call
      writeContract({
        address: baseTokenData.address as `0x${string}`,
        abi: [
          {
            name: 'transfer',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }]
          }
        ],
        functionName: 'transfer',
        args: [hotWallet.address as `0x${string}`, amountWei],
      })

      console.log("ERC20 transfer initiated")
      
    } catch (error) {
      console.error("Failed to fund hot wallet with ERC20:", error)
    }
  }

  const handleFundWallet = async () => {
    if (!fundAmount || !baseTokenData || !hotWallet) {
      console.error("Please enter an amount and select base asset")
      return
    }

    if (!isConnected) {
      console.error("Please connect your wallet first")
      return
    }

    // Check if it's a native token (common native token addresses)
    const isNativeToken = baseTokenData.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ||
                         baseTokenData.address.toLowerCase() === '0x0000000000000000000000000000000000000000'

    if (isNativeToken) {
      await handleFundWalletNative()
    } else {
      await handleFundWalletERC20()
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance)
    if (num === 0) return "0"
    if (num < 0.0001) return "< 0.0001"
    return num.toFixed(4)
  }

  if (!hotWallet) {
    return (
      <Card className="shadow-sm border">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Hot Wallet</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">Initializing hot wallet...</p>
            <Button onClick={initializeHotWallet}>
              Initialize Hot Wallet
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Hot Wallet</span>
          </div>
          <Badge className="text-xs">
            Trading Wallet
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Address */}
        <div className="space-y-2">
          <Label>Hot Wallet Address</Label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 p-2 bg-muted rounded-md font-mono text-sm">
              {formatAddress(hotWallet.address)}
            </div>
            <Button
              onClick={() => copyToClipboard(hotWallet.address, "Address")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Private Key (Hidden by default) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Private Key</Label>
            <Button
              onClick={() => setShowPrivateKey(!showPrivateKey)}
            >
              {showPrivateKey ? "Hide" : "Show"}
            </Button>
          </div>
          {showPrivateKey && (
            <div className="flex items-center space-x-2">
              <div className="flex-1 p-2 bg-muted rounded-md font-mono text-xs break-all">
                {hotWallet.privateKey}
              </div>
              <Button
                onClick={() => copyToClipboard(hotWallet.privateKey, "Private Key")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Fund Hot Wallet */}
        <div className="space-y-3">
          <Label>Fund Hot Wallet</Label>
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Amount"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                disabled={isWritePending || isTxLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Fund with {baseTokenData?.symbol || "base asset"}
              </p>
            </div>
            <Button
              onClick={handleFundWallet}
              disabled={(isWritePending || isSendPending || isTxLoading) || !fundAmount || !isConnected}
            >
              {(isWritePending || isSendPending || isTxLoading) ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isWritePending || isSendPending ? "Signing..." : isTxLoading ? "Confirming..." : "Fund"}
            </Button>
          </div>
          
          {/* Connection Status */}
          {!isConnected && (
            <p className="text-sm text-orange-500">⚠️ Please connect your wallet to fund the hot wallet</p>
          )}
          
          {/* Transaction Status */}
          {(writeError || sendError) && (
            <p className="text-sm text-red-500">
              Transaction failed: {(writeError?.message || sendError?.message)}
            </p>
          )}
          
          {(txHash || sendTxHash || writeTxHash) && (
            <p className="text-sm text-green-500">
              Transaction submitted: {(txHash || sendTxHash || writeTxHash)?.slice(0, 10)}...{(txHash || sendTxHash || writeTxHash)?.slice(-8)}
            </p>
          )}
          
          {isTxSuccess && (
            <p className="text-sm text-green-600">✅ Hot wallet funded successfully!</p>
          )}
        </div>

        <Separator />

        {/* Balances */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Hot Wallet Balances</Label>
            <Button
              onClick={() => {
                if (chainId) {
                  refreshHotWalletBalances(chainId)
                  fetchNativeTokenBalance()
                }
              }}
              disabled={balancesLoading}
            >
              {balancesLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="space-y-2">
            {/* Native Token Balance */}
            {chainId && (
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                <div className="flex items-center space-x-2">
                  <div className="font-medium text-sm">{getNativeTokenInfo(chainId).symbol}</div>
                  <Badge className="text-xs">Native</Badge>
                </div>
                <div className="text-sm font-mono">
                  {formatBalance(nativeTokenBalance)}
                </div>
              </div>
            )}

            {baseTokenData && (
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                <div className="flex items-center space-x-2">
                  <div className="font-medium text-sm">{baseTokenData.symbol}</div>
                  <Badge className="text-xs">Base</Badge>
                </div>
                <div className="text-sm font-mono">
                  {formatBalance(getCurrentChainTokenBalance(baseTokenData.symbol))}
                </div>
              </div>
            )}

            {quoteTokenData && (
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                <div className="flex items-center space-x-2">
                  <div className="font-medium text-sm">{quoteTokenData.symbol}</div>
                  <Badge className="text-xs">Quote</Badge>
                </div>
                <div className="text-sm font-mono">
                  {formatBalance(getCurrentChainTokenBalance(quoteTokenData.symbol))}
                </div>
              </div>
            )}

            {Object.keys(hotWalletBalances).length === 0 && !balancesLoading && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No balances available
              </p>
            )}
          </div>
        </div>

        {/* Security Warning */}
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            ⚠️ <strong>Security Note:</strong> This hot wallet is stored locally in your browser. 
            Only fund it with amounts you're comfortable trading with. For better security, 
            consider using a hardware wallet for larger amounts.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
