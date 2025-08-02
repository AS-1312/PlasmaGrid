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
    console.error('1inch API key not configured')
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
    const optionalParams = ['fee', 'protocols', 'gasPrice', 'complexityLevel', 'connectorTokens', 'mainRouteParts', 'parts']
    
    optionalParams.forEach(param => {
      const value = searchParams.get(param)
      if (value) {
        queryParams.append(param, value)
      }
    })
    console.log(`Fetching quote from 1inch: ${ONEINCH_BASE_URL}/swap/v6.1/${chainId}/quote?${queryParams}`)
    const response = await fetch(`${ONEINCH_BASE_URL}/swap/v6.1/${chainId}/quote?${queryParams}`, {
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
    console.error('Error fetching quote from 1inch:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quote data' },
      { status: 500 }
    )
  }
}
