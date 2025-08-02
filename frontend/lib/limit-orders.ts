"use client"

import { parseUnits, formatUnits } from 'viem'

// Note: 1inch SDK integration will be added when we have proper wallet connection
// For now, we'll prepare the orders and show the user what needs to be signed

export interface Order {
  id: string
  price: number
  amount: number
  side: 'buy' | 'sell'
  status: string
  makerAsset: string
  takerAsset: string
  maker: string
  createdAt?: string
}

export interface GridTrade {
  type: 'buy' | 'sell'
  price: number
  amount: number
  reason: string
}

export interface LimitOrder {
  id: string
  type: 'buy' | 'sell'
  price: number
  amount: number
  baseToken: string
  quoteToken: string
  status: 'pending' | 'ready' | 'created' | 'submitted' | 'filled' | 'cancelled'
  reason: string
  timestamp: Date
  orderData?: any
  orderHash?: string
  signature?: string
}

/**
 * Convert AI grid trading suggestions to limit orders
 */
export function convertGridTradesToLimitOrders(
  gridTrades: GridTrade[],
  baseToken: string,
  quoteToken: string
): LimitOrder[] {
  return gridTrades.map((trade, index) => ({
    id: `limit_${Date.now()}_${index}`,
    type: trade.type,
    price: trade.price,
    amount: trade.amount,
    baseToken,
    quoteToken,
    status: 'ready' as const,
    reason: trade.reason,
    timestamp: new Date(),
  }))
}

/**
 * Calculate the total value needed for all buy orders
 */
export function calculateTotalBuyValue(orders: LimitOrder[]): number {
  return orders
    .filter(order => order.type === 'buy')
    .reduce((total, order) => total + (order.price * order.amount), 0)
}

/**
 * Calculate the total amount needed for all sell orders
 */
export function calculateTotalSellAmount(orders: LimitOrder[]): number {
  return orders
    .filter(order => order.type === 'sell')
    .reduce((total, order) => total + order.amount, 0)
}

/**
 * Validate if user has sufficient balance for the orders
 */
export function validateOrderBalance(
  orders: LimitOrder[],
  baseBalance: number,
  quoteBalance: number
): { valid: boolean; message?: string } {
  const totalBuyValue = calculateTotalBuyValue(orders)
  const totalSellAmount = calculateTotalSellAmount(orders)

  if (totalBuyValue > quoteBalance) {
    return {
      valid: false,
      message: `Insufficient quote token balance. Need ${totalBuyValue.toFixed(4)} but have ${quoteBalance.toFixed(4)}`
    }
  }

  if (totalSellAmount > baseBalance) {
    return {
      valid: false,
      message: `Insufficient base token balance. Need ${totalSellAmount.toFixed(4)} but have ${baseBalance.toFixed(4)}`
    }
  }

  return { valid: true }
}

/**
 * Fetch orders by maker address from 1inch API
 */
export async function fetchOrdersByMaker(makerAddress: string, currentPrice?: number): Promise<Order[]> {
  try {
    console.log('🔍 Fetching orders for maker:', makerAddress, 'currentPrice:', currentPrice)
    
    const params = new URLSearchParams({
      maker: makerAddress,
      limit: '50', // Increased limit for more orders
      statuses: '1', // Only active orders
    })
    
    if (currentPrice) {
      params.append('currentPrice', currentPrice.toString())
    }
    
    const response = await fetch(`/api/orders?${params.toString()}`)
    
    if (!response.ok) {
      console.error('❌ API response not ok:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('❌ Error response body:', errorText)
      throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('✅ Orders API response:', {
      status: data.status,
      ordersCount: data.orders?.length || 0,
      hasErrors: !!data.error,
      source: data.source || 'unknown'
    })
    
    if (data.error) {
      console.error('❌ API returned error:', data.error)
      throw new Error(data.error)
    }
    
    if (!data.orders || !Array.isArray(data.orders)) {
      console.warn('⚠️ No orders in response or invalid format')
      return []
    }
    
    console.log('✅ Successfully fetched', data.orders.length, 'orders from', data.source || '1inch API')
    
    // Log first few orders for debugging
    if (data.orders.length > 0) {
      console.log('📋 Sample orders:', data.orders.slice(0, 2).map((order: any) => ({
        id: order.id,
        price: order.price,
        amount: order.amount,
        side: order.side,
        status: order.status
      })))
    }
    
    return data.orders
    
  } catch (error) {
    console.error('❌ Error in fetchOrdersByMaker:', error)
    throw error // Re-throw to let the caller handle it
  }
}

/**
 * Format order for display
 */
export function formatOrderDisplay(order: LimitOrder): string {
  const action = order.type.toUpperCase()
  const amount = order.amount.toFixed(4)
  const price = order.price.toFixed(4)
  return `${action} ${amount} ${order.baseToken} at $${price}`
}

/**
 * 1inch Limit Order API Manager (Simplified for wallet integration)
 */
export class OneInchOrderManager {
  private networkId: number
  private authKey?: string

  constructor(networkId: number, authKey?: string) {
    this.networkId = networkId
    this.authKey = authKey
  }

  /**
   * Prepare order data for wallet signing
   * This would be used with wagmi/viem to sign the order
   */
  prepareOrderForSigning(order: LimitOrder): {
    orderData: any;
    message: string;
    requiresSignature: boolean;
  } {
    return {
      orderData: {
        maker: '0x', // Will be filled by wallet address
        makerAsset: order.type === 'buy' ? order.quoteToken : order.baseToken,
        takerAsset: order.type === 'buy' ? order.baseToken : order.quoteToken,
        makerAmount: order.type === 'buy' ? 
          (order.amount * order.price).toString() : 
          order.amount.toString(),
        takerAmount: order.type === 'buy' ? 
          order.amount.toString() : 
          (order.amount * order.price).toString(),
        salt: Date.now().toString(),
      },
      message: `Sign ${order.type.toUpperCase()} order for ${order.amount} ${order.baseToken} at $${order.price}`,
      requiresSignature: true
    }
  }

  /**
   * Submit order to 1inch API (placeholder for actual implementation)
   */
  async submitOrderToOneInch(orderData: any, signature: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    // This would integrate with the actual 1inch API
    // For now, we'll simulate the process
    console.log('Would submit order to 1inch:', { orderData, signature })
    
    return {
      success: true,
      hash: `0x${Date.now().toString(16)}`, // Mock hash
    }
  }
}

/**
 * Submit multiple limit orders to 1inch
 */
export async function submitLimitOrdersToOneInch(
  orders: LimitOrder[],
  networkId: number,
  authKey?: string
): Promise<{ submitted: LimitOrder[]; failed: { order: LimitOrder; error: string }[] }> {
  const manager = new OneInchOrderManager(networkId, authKey)
  const submitted: LimitOrder[] = []
  const failed: { order: LimitOrder; error: string }[] = []

  for (const order of orders) {
    try {
      if (!order.signature || !order.orderData) {
        failed.push({ order, error: 'Order not signed or missing order data' })
        continue
      }

      const result = await manager.submitOrderToOneInch(order.orderData, order.signature)
      
      if (result.success) {
        const submittedOrder = {
          ...order,
          status: 'submitted' as const,
          orderHash: result.hash
        }
        submitted.push(submittedOrder)
      } else {
        failed.push({ order, error: result.error || 'Submission failed' })
      }
    } catch (error) {
      failed.push({ 
        order, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  return { submitted, failed }
}
