import { NextRequest, NextResponse } from 'next/server'

interface OpenRouterRequest {
  currentPrice: number
  baseAsset: string
  quoteAsset: string
}

interface GridTrade {
  type: 'buy' | 'sell'
  price: number
  amount: number
  reason: string
}

interface OpenRouterResponse {
  gridTrades: GridTrade[]
  marketSentiment: string
  reasoning: string
}

export async function POST(request: NextRequest) {
  try {
    const body: OpenRouterRequest = await request.json()
    const { currentPrice, baseAsset, quoteAsset } = body

    if (!currentPrice || !baseAsset || !quoteAsset) {
      return NextResponse.json(
        { error: 'Missing required parameters: currentPrice, baseAsset, quoteAsset' },
        { status: 400 }
      )
    }

    const openRouterApiKey = process.env.OPENROUTERKEY
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    const prompt = `Current price for ${baseAsset} is $${currentPrice}. Return as JSON the grid trades based on current market sentiment. I want to create 5 orders for ${baseAsset}/${quoteAsset} trading pair.

Please analyze the current market conditions and provide:
1. 5 strategic grid trading orders (mix of buy and sell orders)
2. Market sentiment analysis
3. Reasoning for the suggested trades

Return the response in this exact JSON format:
{
  "gridTrades": [
    {
      "type": "buy",
      "price": 0.95,
      "amount": 100,
      "reason": "Support level buy order"
    }
  ],
  "marketSentiment": "bullish/bearish/neutral",
  "reasoning": "Explanation of market analysis"
}`

    console.log('Sending request to OpenRouter...')
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
        'X-Title': 'Plasma Grid Trading Bot'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'You are a professional crypto trading AI assistant. Analyze market conditions and provide strategic grid trading recommendations. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter API error:', response.status, errorText)
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('OpenRouter response:', data)

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        { error: 'Invalid response format from OpenRouter' },
        { status: 500 }
      )
    }

    const aiResponse = data.choices[0].message.content
    
    try {
      // Parse the AI response as JSON
      const suggestedTrades: OpenRouterResponse = JSON.parse(aiResponse)
      
      // Validate the response structure
      if (!suggestedTrades.gridTrades || !Array.isArray(suggestedTrades.gridTrades)) {
        throw new Error('Invalid gridTrades format')
      }

      return NextResponse.json(suggestedTrades)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('AI Response:', aiResponse)
      
      return NextResponse.json(
        { 
          error: 'Failed to parse AI response', 
          rawResponse: aiResponse,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in suggest API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
