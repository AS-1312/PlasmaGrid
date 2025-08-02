import { NextRequest, NextResponse } from 'next/server'

const ONEINCH_BASE_URL = 'https://api.1inch.dev'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const chainId = searchParams.get('chainId')

  if (!chainId) {
    return NextResponse.json(
      { error: 'Chain ID is required' },
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
    const response = await fetch(`${ONEINCH_BASE_URL}/token/v1.2/${chainId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`1inch API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching tokens from 1inch:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}
