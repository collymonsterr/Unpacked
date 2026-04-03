import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rate-limit'

const SYSTEM_PROMPT = `You are a query improvement assistant for a publishing platform. Users type research questions and you rewrite them to be more specific, more useful, and more likely to produce a great article. Always return exactly 3 alternatives. Each alternative should take a different angle or interpret the user's intent differently — not just add words to the original. Return JSON only: { "alternatives": [string, string, string] }`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = body?.query?.trim()

    if (!query || query.length < 20) {
      return NextResponse.json({ error: 'Query must be at least 20 characters' }, { status: 400 })
    }

    // Rate limit: 10 per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rateLimitKey = `improve-prompt:${ip}`
    const { allowed } = await checkRateLimit(rateLimitKey, 10, 60000)
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Improve this query into 3 more specific alternatives: ${query}` }
      ],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed.alternatives) || parsed.alternatives.length !== 3) {
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 })
    }

    return NextResponse.json({ alternatives: parsed.alternatives })
  } catch (error) {
    console.error('[improve-prompt] Error:', error)
    return NextResponse.json({ error: 'Failed to improve prompt' }, { status: 500 })
  }
}
