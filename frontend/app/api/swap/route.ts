import { NextRequest, NextResponse } from 'next/server'

const ONEINCH_BASE_URL = 'https://api.1inch.dev'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const chainId = searchParams.get('chainId')
  const src = searchParams.get('src')
  const dst = searchParams.get('dst')
  const amount = searchParams.get('amount')

  if (!chainId || !src || !dst || !amount) {
    return NextResponse.json(
      { error: 'chainId, src, dst, and amount are required' },
      { status: 400 }
    )
  }

  const apiKey = process.env.ONEINCH_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    )
  }

  try {
    // Build query parameters
    const queryParams = new URLSearchParams({
      src,
      dst,
      amount,
    })

    // Add optional parameters
    const optionalParams = ['from', 'slippage', 'protocols', 'fee', 'gasPrice', 'complexityLevel', 'connectorTokens', 'allowPartialFill', 'disableEstimate', 'gasLimit', 'mainRouteParts', 'parts']
    
    optionalParams.forEach(param => {
      const value = searchParams.get(param)
      if (value) {
        queryParams.append(param, value)
      }
    })

    const response = await fetch(`${ONEINCH_BASE_URL}/swap/v6.0/${chainId}/swap?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`1inch API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch swap data' },
      { status: 500 }
    )
  }
}
