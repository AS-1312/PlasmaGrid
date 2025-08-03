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
 
// const privKey =
//         ''
// const authKey = process.env.ONEINCH_API_KEY;
// const maker = new Wallet(privKey);

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
    }

    // Validate addresses before creating order
    if (!makerAddress || makerAddress === '0x' || makerAddress.length !== 42) {
      throw new Error(`Invalid maker address: ${makerAddress}`)
    }
    if (!makerAsset || makerAsset === '0x' || makerAsset.length !== 42) {
      throw new Error(`Invalid maker asset address: ${makerAsset}`)
    }
    if (!takerAsset || takerAsset === '0x' || takerAsset.length !== 42) {
      throw new Error(`Invalid taker asset address: ${takerAsset}`)
    }

    // Create the limit order
    const orderParams = {
      salt: randBigInt(UINT_40_MAX),
      maker: new Address(makerAddress),
      receiver: new Address(makerAddress), // Use maker address as receiver (funds go back to maker)
      makerAsset: new Address(trade.type === 'sell' ? makerAsset : takerAsset),
      takerAsset: new Address(trade.type === 'sell' ? takerAsset : makerAsset),
      makingAmount,
      takingAmount
    }

    const order = new LimitOrder(orderParams, makerTraits)
    
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
        // Keep important error for debugging order creation issues
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
      // Build API URL with current price for better mock data
      const priceParam = currentPrice ? `&currentPrice=${currentPrice}` : ''
      const apiUrl = `/api/orders?maker=${makerAddress}&chainId=${chainId}${priceParam}`
      
      // Call our API route which handles the 1inch API call server-side
      const response = await fetch(apiUrl)
      
      const data = await response.json()
      
      return data.orders
      
    } catch (error) {
      return [];
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
      // Error calculating order price, using fallback
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
   * Serialize order data for JSON transmission (convert BigInt to string)
   */
  private serializeOrderForTransmission(order: LimitOrder) {
    const orderData = order.build()
    
    // Convert Address objects to hex strings manually
    const makerStr = orderData.maker?.toString() || '0x'
    const receiverStr = orderData.receiver?.toString() || '0x'  
    const makerAssetStr = orderData.makerAsset?.toString() || '0x'
    const takerAssetStr = orderData.takerAsset?.toString() || '0x'
    
    // Convert BigInt values to strings for JSON serialization
    const serialized = {
      salt: orderData.salt.toString(),
      maker: makerStr,
      receiver: receiverStr === '0x0000000000000000000000000000000000000000' ? makerStr : receiverStr, // Use maker if receiver is zero
      makerAsset: makerAssetStr,
      takerAsset: takerAssetStr,
      makingAmount: orderData.makingAmount.toString(),
      takingAmount: orderData.takingAmount.toString(),
      makerTraits: orderData.makerTraits.toString()
    }

    // Validate addresses before sending
    if (!serialized.maker || serialized.maker === '0x' || serialized.maker.length < 42) {
      throw new Error(`Invalid maker address: ${serialized.maker}`)
    }
    if (!serialized.receiver || serialized.receiver === '0x' || serialized.receiver.length < 42) {
      throw new Error(`Invalid receiver address: ${serialized.receiver}`)
    }
    if (!serialized.makerAsset || serialized.makerAsset === '0x' || serialized.makerAsset.length < 42) {
      throw new Error(`Invalid makerAsset address: ${serialized.makerAsset}`)
    }
    if (!serialized.takerAsset || serialized.takerAsset === '0x' || serialized.takerAsset.length < 42) {
      throw new Error(`Invalid takerAsset address: ${serialized.takerAsset}`)
    }
    
    return serialized
  }

  /**
   * Submit limit order to 1inch API via server-side route
   */
  async submitLimitOrder(order: LimitOrder, signature: string, chainId: number): Promise<void> {
    try {
      // Call our server-side API route
      const response = await fetch('/api/submit-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: this.serializeOrderForTransmission(order),
          signature,
          chainId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

    } catch (error) {
      // For demo purposes, don't fail completely - just warn
      if (error instanceof Error && error.message.includes('fetch')) {
        return // Don't throw, just warn
      }
      
      throw error // Re-throw other errors
    }
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
