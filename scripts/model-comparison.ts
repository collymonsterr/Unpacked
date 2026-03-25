/**
 * Model Comparison Test Script
 *
 * Compares: Claude Sonnet (with web search) vs Gemini 2.5 Flash (with Brave pre-research)
 *
 * Usage: npx tsx scripts/model-comparison.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// Load env vars
const envFile = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8')
const env: Record<string, string> = {}
envFile.split('\n').forEach(l => {
  const i = l.indexOf('=')
  if (i > 0 && !l.startsWith('#')) env[l.slice(0, i)] = l.slice(i + 1)
})

const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY
const BRAVE_KEY = env.BRAVE_SEARCH_API_KEY
const GEMINI_KEY = env.GOOGLE_GEMINI_API_KEY

const CURRENT_DATE = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
const CURRENT_YEAR = new Date().getFullYear()

// Simplified writing prompt (same core instructions, without the full section type catalog to keep it manageable)
const SYSTEM_PROMPT = `You are a senior editorial writer with 15 years of experience. You write for ArticleAI, a publication known for decisive, well-researched, visually rich articles.

IMPORTANT: Today's date is ${CURRENT_DATE}. The current year is ${CURRENT_YEAR}. All content must reflect the current year.

MANDATORY: Use ONLY the research data provided to you. Do NOT rely on training data for any factual claims — prices, specs, rankings, or market positions. If the research doesn't cover something, say so rather than guessing.

CORE RULES:
- You ALWAYS take a clear position. Every article has a definitive answer or recommendation.
- Never hedge with "it depends on your needs." Pick a winner and explain why.
- Write short paragraphs (3-4 sentences max). No walls of text.
- Use data to support opinions — numbers, prices, specs, not vague claims.
- Include sources for factual claims.

OUTPUT FORMAT:
Respond with valid JSON matching this structure:
{
  "title": "string",
  "article_type": "buyer_guide | comparison | decision_guide | explainer | trend_analysis | tutorial",
  "thumbnail_url": null,
  "quick_verdict": {
    "bullets": ["string", "string", "string"],
    "one_liner": "string"
  },
  "executive_summary": {
    "short_answer": "string",
    "key_takeaways": ["string", "string", "string"],
    "watch_out_for": ["string", "string"]
  },
  "sections": [
    { "type": "content_section", "heading": "string", "content": "string" }
  ]
}

Keep sections to content_section type only for this comparison test. Focus on quality of analysis, accuracy of facts, and strength of opinion.`

// ═══════════════════════════════════════════════════
// Pipeline 1: Claude Sonnet with built-in web search
// ═══════════════════════════════════════════════════

async function runSonnet(query: string): Promise<{ result: unknown; inputTokens: number; outputTokens: number; durationMs: number }> {
  console.log('  [Sonnet] Starting with web search (using SDK)...')
  const start = Date.now()

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY, timeout: 5 * 60 * 1000 })

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 12000,
    system: SYSTEM_PROMPT,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search', max_uses: 6 }],
    messages: [{ role: 'user', content: `Write a complete article about: "${query}"` }],
  })

  const message = await stream.finalMessage()
  const duration = Date.now() - start

  // Extract the last text block (after tool use)
  const textBlocks = message.content?.filter((b) => b.type === 'text') ?? []
  const text = textBlocks[textBlocks.length - 1]?.type === 'text' ? (textBlocks[textBlocks.length - 1] as { type: 'text'; text: string }).text : ''

  // Parse JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  let parsed = null
  if (jsonMatch) {
    try { parsed = JSON.parse(jsonMatch[0]) } catch { parsed = { raw_text: text.slice(0, 2000) } }
  } else {
    parsed = { raw_text: text.slice(0, 2000) }
  }

  return {
    result: parsed,
    inputTokens: message.usage?.input_tokens ?? 0,
    outputTokens: message.usage?.output_tokens ?? 0,
    durationMs: duration,
  }
}

// ═══════════════════════════════════════════════════
// Pipeline 2: Brave Search + Gemini 2.5 Flash
// ═══════════════════════════════════════════════════

async function braveSearch(query: string): Promise<string> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': BRAVE_KEY },
  })
  if (!res.ok) return ''
  const data = await res.json()

  // Extract titles and descriptions — condensed research
  const results = (data.web?.results ?? []).slice(0, 5)
  return results.map((r: { title?: string; description?: string; url?: string }, i: number) =>
    `[${i + 1}] ${r.title ?? ''}\n${r.description ?? ''}\nSource: ${r.url ?? ''}`
  ).join('\n\n')
}

async function gatherBraveResearch(query: string): Promise<string> {
  // Generate 6 search queries from the topic
  const baseQuery = query.replace(/['"]/g, '')
  const searches = [
    baseQuery,
    `${baseQuery} 2026`,
    `${baseQuery} reddit`,
    `${baseQuery} expert review`,
    `${baseQuery} comparison data`,
    `${baseQuery} latest news`,
  ]

  console.log('  [Brave] Running 6 searches...')
  const results: string[] = []
  for (const sq of searches) {
    const r = await braveSearch(sq)
    if (r) results.push(`=== Search: "${sq}" ===\n${r}`)
  }

  const combined = results.join('\n\n---\n\n')
  const tokenEstimate = Math.round(combined.length / 3.8)
  console.log(`  [Brave] Research gathered: ${combined.length} chars (~${tokenEstimate} tokens)`)

  // Trim to ~3000 tokens if too long
  if (tokenEstimate > 4000) {
    const trimmed = combined.slice(0, 15000) // ~3900 tokens
    console.log(`  [Brave] Trimmed to ~3900 tokens`)
    return trimmed
  }

  return combined
}

async function runGemini(query: string, research: string): Promise<{ result: unknown; durationMs: number }> {
  console.log('  [Gemini] Starting with pre-gathered research...')
  const start = Date.now()

  const prompt = `${SYSTEM_PROMPT}

Here is the research data gathered from the web. Use ONLY this data for factual claims:

${research}

---

Write a complete article about: "${query}"`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error: ${res.status} ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const duration = Date.now() - start

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  // Parse JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  let parsed = null
  if (jsonMatch) {
    try { parsed = JSON.parse(jsonMatch[0]) } catch { parsed = { raw_text: text.slice(0, 2000) } }
  } else {
    parsed = { raw_text: text.slice(0, 2000) }
  }

  // Gemini doesn't report tokens the same way, estimate from prompt length
  const inputTokenEstimate = Math.round(prompt.length / 3.8)

  return {
    result: parsed,
    durationMs: duration,
  }
}

// ═══════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════

const QUERIES = [
  'Dubai Housing Market 2026: War Impact Analysis and Correction Risk Assessment',
  'Are robot vacuums worth it for large apartments and houses?',
  'The New Wave of Chinese EVs: Your Complete Guide to the Global Market Leaders',
]

async function runComparison(query: string, index: number) {
  const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`Query ${index + 1}: ${query.slice(0, 60)}...`)
  console.log('═'.repeat(60))

  // Run Sonnet
  let sonnetResult
  try {
    sonnetResult = await runSonnet(query)
    console.log(`  [Sonnet] Done in ${(sonnetResult.durationMs / 1000).toFixed(1)}s | Input: ${sonnetResult.inputTokens} | Output: ${sonnetResult.outputTokens}`)

    // Calculate cost
    const sonnetCost = (sonnetResult.inputTokens * 3 / 1_000_000) + (sonnetResult.outputTokens * 15 / 1_000_000)
    console.log(`  [Sonnet] Estimated cost: $${sonnetCost.toFixed(4)}`)
  } catch (err) {
    console.error(`  [Sonnet] FAILED:`, (err as Error).message)
    sonnetResult = { result: { error: (err as Error).message }, inputTokens: 0, outputTokens: 0, durationMs: 0 }
  }

  // Run Gemini with Brave research
  let geminiResult
  try {
    const research = await gatherBraveResearch(query)
    geminiResult = await runGemini(query, research)
    console.log(`  [Gemini] Done in ${(geminiResult.durationMs / 1000).toFixed(1)}s`)

    // Gemini Flash pricing: $0.15/$0.60 per million tokens (much cheaper)
    // Plus Brave Search: free tier or minimal cost
    console.log(`  [Gemini] Estimated cost: ~$0.01-0.02 (Flash pricing + free Brave)`)
  } catch (err) {
    console.error(`  [Gemini] FAILED:`, (err as Error).message)
    geminiResult = { result: { error: (err as Error).message }, durationMs: 0 }
  }

  // Save results
  const outputDir = path.resolve(__dirname, '../test-outputs')

  fs.writeFileSync(
    path.join(outputDir, `${slug}-sonnet.json`),
    JSON.stringify({
      query,
      model: 'claude-sonnet-4-20250514',
      method: 'Built-in web search (6 queries)',
      inputTokens: sonnetResult.inputTokens,
      outputTokens: sonnetResult.outputTokens,
      durationMs: sonnetResult.durationMs,
      estimatedCost: `$${((sonnetResult.inputTokens * 3 / 1_000_000) + (sonnetResult.outputTokens * 15 / 1_000_000)).toFixed(4)}`,
      article: sonnetResult.result,
    }, null, 2)
  )

  fs.writeFileSync(
    path.join(outputDir, `${slug}-gemini.json`),
    JSON.stringify({
      query,
      model: 'gemini-2.5-flash',
      method: 'Brave Search (6 queries) + Gemini Flash',
      durationMs: geminiResult.durationMs,
      estimatedCost: '~$0.01-0.02',
      article: geminiResult.result,
    }, null, 2)
  )

  console.log(`  Saved to test-outputs/${slug}-sonnet.json and ${slug}-gemini.json`)
}

async function main() {
  console.log('Model Comparison Test')
  console.log(`Date: ${CURRENT_DATE}`)
  console.log(`Queries: ${QUERIES.length}`)
  console.log('')

  for (let i = 0; i < QUERIES.length; i++) {
    await runComparison(QUERIES[i], i)
  }

  console.log('\n' + '═'.repeat(60))
  console.log('DONE — Compare the JSON files in test-outputs/')
  console.log('═'.repeat(60))
}

main().catch(console.error)
