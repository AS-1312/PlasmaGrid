import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const makerAddress = searchParams.get('maker')
    const chainId = searchParams.get('chainId')
    const currentPrice = parseFloat(searchParams.get('currentPrice') || '2340')
    
    if (!makerAddress || !chainId) {
      return NextResponse.json(
        { error: 'Missing required parameters: maker and chainId' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ONEINCH_API_KEY
    
    if (!apiKey) {
      console.warn('ONEINCH_API_KEY not found, returning mock data')
      return NextResponse.json({
        success: true,
        orders: getMockOrders(makerAddress, currentPrice),
        source: 'mock'
      })
    }

    // Make real 1inch API call
    console.log(`Fetching orders for maker ${makerAddress} on chain ${chainId}`)
    
    const apiUrl = `https://api.1inch.dev/orderbook/v4.0/${chainId}/orders?maker=${makerAddress}&page=1&limit=50`
    console.log('🔗 Full API URL:', apiUrl)
    
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    )

    console.log(`1inch API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`1inch API error: ${response.status} ${response.statusText}`)
      console.error('1inch API error response:', errorText)
      
      // For testing purposes, still return mock data but log the real API error
      return NextResponse.json({
        success: true,
        orders: getMockOrders(makerAddress, currentPrice),
        source: 'mock-fallback',
        error: `1inch API error: ${response.status} - ${errorText}`,
        apiKey: apiKey ? 'present' : 'missing'
      })
    }

    const data = await response.json()
    console.log(`1inch API raw response:`, JSON.stringify(data, null, 2))

    // Transform 1inch orders to our format
    const orders = data.orders?.map((order: any, index: number) => {
      try {
        const makingAmount = BigInt(order.data.makingAmount)
        const takingAmount = BigInt(order.data.takingAmount)
        
        // Determine if this is a buy or sell based on token addresses
        const isSellingBase = isBaseToken(order.data.makerAsset, parseInt(chainId))
        
        const transformedOrder = {
          orderHash: order.orderHash,
          signature: order.signature,
          data: order.data,
          status: mapOrderStatus(order.status),
          createdAt: order.createDateTime,
          price: calculateOrderPrice(makingAmount, takingAmount, isSellingBase, parseInt(chainId)),
          amount: calculateOrderAmount(makingAmount, takingAmount, isSellingBase, parseInt(chainId)),
          type: isSellingBase ? 'sell' : 'buy'
        }
        
        console.log(`Transformed order ${index + 1}:`, transformedOrder)
        return transformedOrder
        
      } catch (error) {
        console.error(`Error transforming order ${index + 1}:`, error, order)
        return null
      }
    }).filter(Boolean) || []

    console.log(`Successfully transformed ${orders.length} orders from 1inch API`)

    return NextResponse.json({
      success: true,
      orders,
      source: '1inch-api',
      totalOrders: data.orders?.length || 0,
      apiResponse: {
        status: response.status,
        ordersFound: data.orders?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in orders API:', error)
    
    const url = new URL(request.url)
    const makerAddress = url.searchParams.get('maker') || 'unknown'
    const currentPrice = parseFloat(url.searchParams.get('currentPrice') || '2340')
    
    return NextResponse.json({
      success: true,
      orders: getMockOrders(makerAddress, currentPrice),
      source: 'mock-error-fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Helper functions
function getMockOrders(makerAddress: string, basePrice: number = 2340): any[] {
  // Generate orders around a base price with some variation
  const priceVariation = 100 // ±$50 around base price
  
  const orders = []
  
  // Generate 3-5 random orders around the current price range
  const numOrders = Math.floor(Math.random() * 3) + 3
  
  for (let i = 0; i < numOrders; i++) {
    const isSellingOrder = Math.random() > 0.5
    const priceOffset = (Math.random() - 0.5) * priceVariation
    const orderPrice = Math.round(basePrice + priceOffset)
    const orderAmount = 0.05 + Math.random() * 0.1 // 0.05 to 0.15 tokens
    
    orders.push({
      orderHash: '0x' + Math.random().toString(16).substr(2, 40),
      signature: '0x' + Math.random().toString(16).substr(2, 130),
      data: {
        maker: makerAddress,
        makerAsset: isSellingOrder ? '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270' : '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
        takerAsset: isSellingOrder ? '0xc2132d05d31c914a87c6611c10748aeb04b58e8f' : '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
        makingAmount: isSellingOrder 
          ? (BigInt(Math.floor(orderAmount * 10**18))).toString() // Base token amount
          : (BigInt(Math.floor(orderPrice * orderAmount * 10**6))).toString(), // Quote token amount
        takingAmount: isSellingOrder
          ? (BigInt(Math.floor(orderPrice * orderAmount * 10**6))).toString() // Quote token amount  
          : (BigInt(Math.floor(orderAmount * 10**18))).toString(), // Base token amount
        salt: (BigInt(Math.floor(Math.random() * 1000000))).toString(),
      },
      status: Math.random() > 0.3 ? 'pending' : 'filled', // 70% pending, 30% filled
      createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      price: orderPrice,
      amount: orderAmount,
      type: isSellingOrder ? 'sell' as const : 'buy' as const
    })
  }
  
  return orders
}

function mapOrderStatus(status: string): string {
  switch (status?.toLowerCase()) {
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

function isBaseToken(tokenAddress: string, chainId: number): boolean {
  const baseTokens: Record<number, string[]> = {
    1: [
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
      '0xa0b86a33e6ba52ae5c93bb87cd4b8e0f00000000' // ETH (example)
    ],
    137: [
      '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // WPOL/WMATIC on Polygon
      '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', // MATIC
      '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'  // USDC (also common base)
    ],
    56: [
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', // WBNB on BSC
      '0x0000000000000000000000000000000000000000'  // BNB
    ],
  }
  
  const tokenLower = tokenAddress.toLowerCase()
  const chainTokens = baseTokens[chainId] || []
  
  return chainTokens.some(addr => addr.toLowerCase() === tokenLower)
}

function calculateOrderPrice(makingAmount: bigint, takingAmount: bigint, isSellingBase: boolean, chainId: number): number {
  try {
    if (isSellingBase) {
      // Selling base for quote: price = takingAmount / makingAmount
      const making = Number(makingAmount) / (10 ** 18) // Base token usually 18 decimals
      const taking = Number(takingAmount) / (10 ** 6)   // Quote token usually 6 decimals (USDT/USDC)
      return taking / making
    } else {
      // Buying base with quote: price = makingAmount / takingAmount  
      const making = Number(makingAmount) / (10 ** 6)   // Quote token usually 6 decimals
      const taking = Number(takingAmount) / (10 ** 18)  // Base token usually 18 decimals
      return making / taking
    }
  } catch (error) {
    console.warn('Error calculating order price:', error)
    return 0
  }
}

function calculateOrderAmount(makingAmount: bigint, takingAmount: bigint, isSellingBase: boolean, chainId: number): number {
  try {
    if (isSellingBase) {
      // Amount is the base token being sold
      return Number(makingAmount) / (10 ** 18)
    } else {
      // Amount is the base token being bought
      return Number(takingAmount) / (10 ** 18)
    }
  } catch (error) {
    console.warn('Error calculating order amount:', error)
    return 0
  }
}
