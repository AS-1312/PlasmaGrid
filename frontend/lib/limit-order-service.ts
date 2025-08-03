import { LimitOrder, MakerTraits, Address, Api, randBigInt } from "@1inch/limit-order-sdk"

import { ethers, Wallet } from "ethers"
import { FetchProviderConnector } from './FetchProvider'

export interface GridTrade {
  id: string
  type: 'buy' | 'sell'
  price: number
  amount: number
  baseToken: string
  status: 'ready' | 'created' | 'submitted' | 'failed'
  reason: string
  order?: LimitOrder
  signature?: string
}

export interface LimitOrderCreationParams {
  trade: GridTrade
  makerAsset: string
  takerAsset: string
  makerAddress: string
  chainId: number
  expirationMinutes?: number
}
 const privKey =
        ''
    const authKey = process.env.ONEINCH_API_KEY;
    const maker = new Wallet(privKey)

export class LimitOrderService {
  private static instance: LimitOrderService
  
  static getInstance(): LimitOrderService {
    if (!LimitOrderService.instance) {
      LimitOrderService.instance = new LimitOrderService()
    }
    return LimitOrderService.instance
  }

  /**
   * Create a 1inch limit order from a suggested trade
   */
  async createLimitOrder(params: LimitOrderCreationParams): Promise<LimitOrder> {
    const { trade, makerAsset, takerAsset, makerAddress, chainId, expirationMinutes = 60 } = params

    // Calculate expiration timestamp
    const expiresIn = BigInt(expirationMinutes * 60) // Convert minutes to seconds
    const expiration = BigInt(Math.floor(Date.now() / 1000)) + expiresIn

    // Generate random nonce (up to uint40 max)
    const UINT_40_MAX = BigInt((2 ** 40) - 1)
    const nonce = randBigInt(UINT_40_MAX)
   
    // Create maker traits with expiration and nonce
    const makerTraits = MakerTraits.default()
      .withExpiration(expiration)
      .withNonce(nonce)
      .allowPartialFills() // Allow partial fills for better liquidity
      .allowMultipleFills() // Allow multiple fills

    let makingAmount: bigint
    let takingAmount: bigint

    if (trade.type === 'sell') {
      // Selling base asset for quote asset
      // makingAmount = amount of base token to sell (in smallest units)
      // takingAmount = minimum amount of quote token to receive (in smallest units)
      const baseDecimals = this.getTokenDecimals(trade.baseToken)
      const quoteDecimals = this.getTokenDecimals('USDT') // Assuming quote is stablecoin
      
      // Fix decimal precision by rounding to appropriate decimal places
      const sellAmount = this.fixDecimalPrecision(trade.amount, baseDecimals)
      const receiveAmount = this.fixDecimalPrecision(trade.amount * trade.price, quoteDecimals)
      
      makingAmount = ethers.parseUnits(sellAmount, baseDecimals)
      takingAmount = ethers.parseUnits(receiveAmount, quoteDecimals)
      
      console.log(`SELL Order - ${trade.baseToken}: selling ${sellAmount} for ${receiveAmount} quote tokens`)
    } else {
      // Buying base asset with quote asset  
      // makingAmount = amount of quote token to spend (in smallest units)
      // takingAmount = minimum amount of base token to receive (in smallest units)
      const baseDecimals = this.getTokenDecimals(trade.baseToken)
      const quoteDecimals = this.getTokenDecimals('USDT') // Assuming quote is stablecoin
      
      // Fix decimal precision by rounding to appropriate decimal places
      const spendAmount = this.fixDecimalPrecision(trade.amount * trade.price, quoteDecimals)
      const receiveAmount = this.fixDecimalPrecision(trade.amount, baseDecimals)
      
      makingAmount = ethers.parseUnits(spendAmount, quoteDecimals)
      takingAmount = ethers.parseUnits(receiveAmount, baseDecimals)
      
      console.log(`BUY Order - ${trade.baseToken}: spending ${spendAmount} quote tokens for ${receiveAmount} base tokens`)
    }

    console.log(`Creating 1inch limit order for ${makerAddress}:`, {
      type: trade.type,
      price: trade.price,
      amount: trade.amount,
      makingAmount: makingAmount.toString(),
      takingAmount: takingAmount.toString(),
      makerTraits: makerTraits,
      chainId: chainId
    })

    // Create the limit order
    const order = new LimitOrder({
      salt: randBigInt(UINT_40_MAX),
      maker: new Address(makerAddress),
      receiver: new Address(makerAddress), // Funds go back to maker
      makerAsset: new Address(trade.type === 'sell' ? makerAsset : takerAsset),
      takerAsset: new Address(trade.type === 'sell' ? takerAsset : makerAsset),
      makingAmount,
      takingAmount
    }, makerTraits)
    
    return order
  }

  /**
   * Get typed data for signing a limit order
   */
  getTypedDataForSigning(order: LimitOrder, chainId: number) {
    return order.getTypedData(chainId)
  }

  /**
   * Get order hash
   */
  getOrderHash(order: LimitOrder, chainId: number): string {
    return order.getOrderHash(chainId)
  }

  /**
   * Convert grid trades to limit orders
   */
  async createLimitOrdersFromTrades(
    trades: GridTrade[],
    makerAsset: string,
    takerAsset: string,
    makerAddress: string,
    chainId: number,
    expirationMinutes?: number
  ): Promise<GridTrade[]> {
    const updatedTrades: GridTrade[] = []

    for (const trade of trades) {
      try {
        const order = await this.createLimitOrder({
          trade,
          makerAsset,
          takerAsset,
          makerAddress,
          chainId,
          expirationMinutes
        })

        updatedTrades.push({
          ...trade,
          status: 'created',
          order
        })
      } catch (error) {
        console.error(`Failed to create limit order for trade ${trade.id}:`, error)
        updatedTrades.push({
          ...trade,
          status: 'failed'
        })
      }
    }

    return updatedTrades
  }

  /**
   * Sign a limit order
   */
  async signLimitOrder(
    order: LimitOrder,
    chainId: number,
    signer: ethers.Signer
  ): Promise<string> {
    const typedData = this.getTypedDataForSigning(order, chainId)
    
    const signature = await signer.signTypedData(
      typedData.domain,
      { Order: typedData.types.Order },
      typedData.message
    )

    return signature
  }

  /**
   * Fetch limit orders by maker address from 1inch API
   */
  async fetchOrdersByMaker(makerAddress: string, chainId: number, currentPrice?: number): Promise<any[]> {
    try {
      console.log(`Fetching orders for maker ${makerAddress} on chain ${chainId}`)
      
      // Build API URL with current price for better mock data
      const priceParam = currentPrice ? `&currentPrice=${currentPrice}` : ''
      const apiUrl = `/api/orders?maker=${makerAddress}&chainId=${chainId}${priceParam}`
      
      // Call our API route which handles the 1inch API call server-side
      const response = await fetch(apiUrl)
      
      
      const data = await response.json()
      
      console.log(`Fetched ${data.orders.length} orders (source: ${data.source})`)
      return data.orders
      
    } catch (error) {
      console.error('Error fetching orders via API:', error)
      return this.getMockOrders(makerAddress)
    }
  }


  /**
   * Map 1inch order status to our format
   */
  private mapOrderStatus(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
      case 'open':
        return 'pending'
      case 'filled':
      case 'executed':
        return 'filled'
      case 'cancelled':
      case 'canceled':
        return 'cancelled'
      default:
        return 'pending'
    }
  }

  /**
   * Check if token address is a base token (simplified for now)
   */
  private isBaseToken(tokenAddress: string, chainId: number): boolean {
    const baseTokens: Record<number, string[]> = {
      1: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'], // WETH on Ethereum
      137: ['0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'], // WPOL on Polygon
      56: ['0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'], // WBNB on BSC
    }
    
    return baseTokens[chainId]?.includes(tokenAddress.toLowerCase()) || false
  }

  /**
   * Calculate order price from amounts
   */
  private calculateOrderPrice(makingAmount: bigint, takingAmount: bigint, isSellingBase: boolean, chainId: number): number {
    try {
      if (isSellingBase) {
        // Selling base for quote: price = takingAmount / makingAmount
        const making = ethers.formatUnits(makingAmount, 18) // Base token usually 18 decimals
        const taking = ethers.formatUnits(takingAmount, 6)   // Quote token usually 6 decimals (USDT/USDC)
        return parseFloat(taking) / parseFloat(making)
      } else {
        // Buying base with quote: price = makingAmount / takingAmount  
        const making = ethers.formatUnits(makingAmount, 6)   // Quote token usually 6 decimals
        const taking = ethers.formatUnits(takingAmount, 18)  // Base token usually 18 decimals
        return parseFloat(making) / parseFloat(taking)
      }
    } catch (error) {
      console.warn('Error calculating order price:', error)
      return 0
    }
  }

  /**
   * Calculate order amount from amounts
   */
  private calculateOrderAmount(makingAmount: bigint, takingAmount: bigint, isSellingBase: boolean, chainId: number): number {
    try {
      if (isSellingBase) {
        // Amount is the base token being sold
        return parseFloat(ethers.formatUnits(makingAmount, 18))
      } else {
        // Amount is the base token being bought
        return parseFloat(ethers.formatUnits(takingAmount, 18))
      }
    } catch (error) {
      console.warn('Error calculating order amount:', error)
      return 0
    }
  }

  /**
   * Submit limit order to 1inch API (placeholder - needs API key and implementation)
   */
  async submitLimitOrder(order: LimitOrder, signature: string, chainId: number): Promise<void> {
    // This would require 1inch API integration
    // For now, we'll just log the order details
    console.log('Submitting limit order to 1inch:', {
      orderHash: this.getOrderHash(order, chainId),
      signature,
      order: order.build(),
      chainId
    })



    // Example implementation would look like:
    const api = new Api({
      networkId: chainId,
      authKey: 'your-1inch-api-key',
      httpConnector: new FetchProviderConnector()
    })
    // await api.submitOrder(order, signature)
    
    // Simulated submission delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // For demo purposes, randomly succeed or fail
    if (Math.random() < 0.1) { // 10% chance of failure for demo
      throw new Error('Simulated 1inch API error - order submission failed')
    }
    
    console.log('✅ Order successfully submitted to 1inch (simulated)')
  }

  /**
   * Get token decimals from common tokens (fallback)
   */
  private getTokenDecimals(tokenSymbol: string): number {
    const commonDecimals: Record<string, number> = {
      'USDT': 6,
      'USDC': 6,
      'DAI': 18,
      'WETH': 18,
      'WBTC': 8,
      'ETH': 18,
      'WMATIC': 18,
      'POL': 18,
      'WPOL': 18,
      'BNB': 18,
      'WBNB': 18
    }
    
    return commonDecimals[tokenSymbol.toUpperCase()] || 18
  }

  /**
   * Fix floating point precision issues by rounding to appropriate decimal places
   */
  private fixDecimalPrecision(value: number, decimals: number): string {
    // Round to decimal places and remove scientific notation
    const rounded = Number(value.toFixed(decimals))
    return rounded.toString()
  }
}

export const limitOrderService = LimitOrderService.getInstance()
