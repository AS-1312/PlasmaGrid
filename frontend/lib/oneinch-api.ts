// 1inch API service for fetching whitelisted tokens via Next.js API routes
export interface OneInchToken {
  symbol: string
  name: string
  address: string
  decimals: number
  logoURI?: string
  tags?: string[]
}

export interface OneInchTokensResponse {
  tokens: Record<string, OneInchToken>
}

export interface OneInchQuoteResponse {
  dstAmount: string
  protocols: any[][]
  gas: number
}

export interface OneInchSwapResponse {
  dstAmount: string
  tx: {
    from: string
    to: string
    data: string
    value: string
    gasPrice: string
    gas: number
  }
  protocols: any[][]
}

// Chain IDs supported by 1inch
export const SUPPORTED_CHAINS = {
  ethereum: 1,
  polygon: 137,
  bsc: 56,
  arbitrum: 42161,
  optimism: 10,
  avalanche: 43114,
  gnosis: 100,
  fantom: 250,
  klaytn: 8217,
  aurora: 1313161554,
  base: 8453,
} as const

export type SupportedChain = keyof typeof SUPPORTED_CHAINS

/**
 * Fetch whitelisted tokens from 1inch API via Next.js API route
 */
export async function fetchWhitelistedTokens(chainId: number): Promise<OneInchToken[]> {
  try {
    console.log(`Fetching tokens for chainId: ${chainId}`)
    const response = await fetch(`/api/tokens?chainId=${chainId}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Failed to fetch tokens: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    console.log('API response data:', data)
    
    // Check if data is directly the tokens object (not wrapped in a tokens property)
    let tokensObject: Record<string, OneInchToken>
    
    if (data.tokens && typeof data.tokens === 'object') {
      // Standard format: { tokens: { address: tokenData } }
      tokensObject = data.tokens
    } else if (typeof data === 'object' && data !== null) {
      // Direct format: { address: tokenData }
      tokensObject = data
    } else {
      console.error('Invalid API response structure:', data)
      throw new Error(`No tokens found in API response. Got: ${JSON.stringify(data)}`)
    }
    
    // Convert the tokens object to an array
    const tokenArray = Object.entries(tokensObject).map(([address, token]) => ({
      ...token,
      address,
    }))
    
    console.log(`Successfully fetched ${tokenArray.length} tokens for chain ${chainId}`)
    return tokenArray
  } catch (error) {
    console.error('Error fetching 1inch tokens:', error)
    throw error
  }
}

/**
 * Search tokens by symbol or name
 */
export function searchTokens(tokens: OneInchToken[], query: string): OneInchToken[] {
  if (!query.trim()) return tokens
  
  const searchTerm = query.toLowerCase().trim()
  
  return tokens.filter(token => 
    token.symbol.toLowerCase().includes(searchTerm) ||
    token.name.toLowerCase().includes(searchTerm)
  ).sort((a, b) => {
    // Prioritize exact symbol matches
    const aSymbolMatch = a.symbol.toLowerCase() === searchTerm
    const bSymbolMatch = b.symbol.toLowerCase() === searchTerm
    
    if (aSymbolMatch && !bSymbolMatch) return -1
    if (!aSymbolMatch && bSymbolMatch) return 1
    
    // Prioritize symbol starts with query
    const aSymbolStarts = a.symbol.toLowerCase().startsWith(searchTerm)
    const bSymbolStarts = b.symbol.toLowerCase().startsWith(searchTerm)
    
    if (aSymbolStarts && !bSymbolStarts) return -1
    if (!aSymbolStarts && bSymbolStarts) return 1
    
    // Finally sort alphabetically
    return a.symbol.localeCompare(b.symbol)
  })
}

/**
 * Get popular tokens (commonly traded ones)
 */
export function getPopularTokens(tokens: OneInchToken[]): OneInchToken[] {
  const popularSymbols = [
    'ETH', 'WETH', 'USDT', 'USDC', 'DAI', 'WBTC', 'BTC',
    '1INCH', 'UNI', 'LINK', 'AAVE', 'COMP', 'MKR', 'SNX',
    'WPOL', 'BNB', 'AVAX', 'FTM', 'CRV', 'SUSHI'
  ]
  
  const popularTokens = tokens.filter(token => 
    popularSymbols.includes(token.symbol.toUpperCase())
  )
  
  // Sort by the order in popularSymbols
  return popularTokens.sort((a, b) => {
    const aIndex = popularSymbols.indexOf(a.symbol.toUpperCase())
    const bIndex = popularSymbols.indexOf(b.symbol.toUpperCase())
    return aIndex - bIndex
  })
}

/**
 * Get a quote for a token swap via Next.js API route
 */
export async function getSwapQuote(
  chainId: number,
  src: string,
  dst: string,
  amount: string,
  options?: {
    fee?: string
    protocols?: string
    gasPrice?: string
    complexityLevel?: string
    connectorTokens?: string
    mainRouteParts?: string
    parts?: string
  }
): Promise<OneInchQuoteResponse> {
  try {
    const queryParams = new URLSearchParams({
      chainId: chainId.toString(),
      src,
      dst,
      amount,
    })

    // Add optional parameters
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value)
        }
      })
    }

    const response = await fetch(`/api/quote?${queryParams}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch quote: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching swap quote:', error)
    throw error
  }
}

/**
 * Get swap transaction data via Next.js API route
 */
export async function getSwapTransaction(
  chainId: number,
  src: string,
  dst: string,
  amount: string,
  from: string,
  options?: {
    slippage?: string
    protocols?: string
    fee?: string
    gasPrice?: string
    complexityLevel?: string
    connectorTokens?: string
    allowPartialFill?: string
    disableEstimate?: string
    gasLimit?: string
    mainRouteParts?: string
    parts?: string
  }
): Promise<OneInchSwapResponse> {
  try {
    const queryParams = new URLSearchParams({
      chainId: chainId.toString(),
      src,
      dst,
      amount,
      from,
    })

    // Add optional parameters
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value)
        }
      })
    }

    const response = await fetch(`/api/swap?${queryParams}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch swap transaction: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching swap transaction:', error)
    throw error
  }
}

/**
 * Get current price for a token pair using 1inch quote API
 * Returns the price of 1 unit of src token in terms of dst token
 */
export async function getCurrentPrice(
  chainId: number,
  srcToken: string,
  dstToken: string,
  srcDecimals: number = 18,
  dstDecimals: number = 18
): Promise<number> {
  try {
    // Use 1 unit of the source token
    const amount = (10 ** srcDecimals).toString()
    
    const quote = await getSwapQuote(chainId, srcToken, dstToken, amount)
    
    // Convert the destination amount to a readable number
    const dstAmount = parseInt(quote.dstAmount) / (10 ** dstDecimals)
    
    return dstAmount
  } catch (error) {
    console.error('Error fetching current price:', error)
    throw error
  }
}

/**
 * Get a price quote with better error handling and fallbacks
 */
export async function getPriceQuote(
  chainId: number,
  srcTokenAddress: string,
  dstTokenAddress: string,
  srcDecimals: number = 18,
  dstDecimals: number = 18,
  amount: string = "1"
): Promise<{ price: number; quote: OneInchQuoteResponse }> {
  try {
    // Convert amount to wei format
    const amountInWei = (parseFloat(amount) * (10 ** srcDecimals)).toString()
    
    const quote = await getSwapQuote(chainId, srcTokenAddress, dstTokenAddress, amountInWei)
    
    // Calculate price per unit
    const dstAmount = parseInt(quote.dstAmount) / (10 ** dstDecimals)
    const srcAmount = parseFloat(amount)
    const price = dstAmount / srcAmount
    
    return { price, quote }
  } catch (error) {
    console.error('Error getting price quote:', error)
    throw error
  }
}
