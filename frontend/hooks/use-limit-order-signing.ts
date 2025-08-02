"use client"

import { useState } from "react"
import { useAccount, useSignTypedData } from "wagmi"
import { limitOrderService, GridTrade } from "@/lib/limit-order-service"
import { LimitOrder } from "@1inch/limit-order-sdk"

export interface SignedOrder {
  trade: GridTrade
  order: LimitOrder
  signature: string
  orderHash: string
}

export function useLimitOrderSigning() {
  const [isSigningOrders, setIsSigningOrders] = useState(false)
  const [signingError, setSigningError] = useState<string | null>(null)
  const [signedOrders, setSignedOrders] = useState<SignedOrder[]>([])
  
  const { address } = useAccount()
  const { signTypedDataAsync } = useSignTypedData()

  const signLimitOrders = async (
    trades: GridTrade[],
    makerAsset: string,
    takerAsset: string,
    chainId: number,
    hotWalletAddress?: string // Add hot wallet address parameter
  ): Promise<SignedOrder[]> => {
    if (!address) {
      throw new Error("Wallet not connected")
    }

    // Use hot wallet address as maker if provided, otherwise use connected address
    const makerAddress = hotWalletAddress || address
    
    console.log('Signing limit orders:', {
      tradesCount: trades.length,
      makerAddress,
      hotWalletAddress,
      makerAsset,
      takerAsset,
      chainId
    })

    setIsSigningOrders(true)
    setSigningError(null)
    
    try {
      const signedOrdersResults: SignedOrder[] = []

      for (const trade of trades) {
        if (!trade.order) {
          // Create the limit order if it doesn't exist
          const order = await limitOrderService.createLimitOrder({
            trade,
            makerAsset,
            takerAsset,
            makerAddress, // Use the determined maker address (hot wallet or user wallet)
            chainId,
            expirationMinutes: 60
          })
          trade.order = order
        }

        // Get typed data for signing
        const typedData = limitOrderService.getTypedDataForSigning(trade.order, chainId)
        
        // Sign the order with the user's wallet (user signs on behalf of hot wallet)
        const signature = await signTypedDataAsync({
          domain: typedData.domain,
          types: { Order: typedData.types.Order },
          primaryType: 'Order',
          message: typedData.message
        })

        // Get order hash
        const orderHash = limitOrderService.getOrderHash(trade.order, chainId)

        signedOrdersResults.push({
          trade: {
            ...trade,
            status: 'created',
            signature
          },
          order: trade.order,
          signature,
          orderHash
        })
      }

      setSignedOrders(signedOrdersResults)
      return signedOrdersResults

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign orders'
      setSigningError(errorMessage)
      throw error
    } finally {
      setIsSigningOrders(false)
    }
  }

  const submitSignedOrders = async (signedOrders: SignedOrder[], chainId: number): Promise<void> => {
    try {
      // Submit each signed order to 1inch
      for (const signedOrder of signedOrders) {
        await limitOrderService.submitLimitOrder(
          signedOrder.order,
          signedOrder.signature,
          chainId
        )
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit orders'
      setSigningError(errorMessage)
      throw error
    }
  }

  const resetSigning = () => {
    setIsSigningOrders(false)
    setSigningError(null)
    setSignedOrders([])
  }

  return {
    isSigningOrders,
    signingError,
    signedOrders,
    signLimitOrders,
    submitSignedOrders,
    resetSigning
  }
}
