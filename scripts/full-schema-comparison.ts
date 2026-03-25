/**
 * Full Schema Model Comparison
 * Tests whether Gemini Flash can produce the FULL article JSON with all visual elements.
 *
 * Usage: npx tsx scripts/full-schema-comparison.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import Anthropic from '@anthropic-ai/sdk'

// Load env
const envFile = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8')
const env: Record<string, string> = {}
envFile.split('\n').forEach(l => {
  const i = l.indexOf('=')
  if (i > 0 && !l.startsWith('#')) env[l.slice(0, i)] = l.slice(i + 1)
})

const BRAVE_KEY = env.BRAVE_SEARCH_API_KEY
const GEMINI_KEY = env.GOOGLE_GEMINI_API_KEY

// Load the full production writing prompt
const WRITING_PROMPT = fs.readFileSync(path.resolve(__dirname, '../test-outputs/full-writing-prompt.txt'), 'utf8')

const QUERY = 'Best robot vacuums for pet hair'

// A realistic plan (what the planning step would produce)
const PLAN = {
  title: 'Best Robot Vacuums for Pet Hair in 2026',
  article_type: 'buyer_guide',
  visual_strategy: {
    image_density: 'high',
    use_product_cards: true,
    use_image_gallery: false,
    use_comparison_table: true,
    use_charts: true,
    use_timelines: false,
    use_stat_cards: true,
    use_worked_examples: false,
    use_callout_boxes: false,
    use_quote_blocks: false,
  },
  forbidden_components: ['timeline', 'worked_example'],
  entities: [
    { name: 'iRobot Roomba j9+', search_query: 'iRobot Roomba j9+ pet hair review' },
    { name: 'Roborock S8 MaxV Ultra', search_query: 'Roborock S8 MaxV Ultra pet hair' },
    { name: 'Ecovacs Deebot X2 Omni', search_query: 'Ecovacs Deebot X2 Omni pet review' },
    { name: 'Shark AI Ultra 2-in-1', search_query: 'Shark AI Ultra robot vacuum pet hair' },
    { name: 'Eufy X10 Pro Omni', search_query: 'Eufy X10 Pro Omni pet hair review' },
  ],
  sections_outline: [
    'Quick Verdict',
    'Executive Summary',
    'What You Need to Know About Pet Hair Vacuums',
    'iRobot Roomba j9+',
    'Roborock S8 MaxV Ultra',
    'Ecovacs Deebot X2 Omni',
    'Shark AI Ultra 2-in-1',
    'Eufy X10 Pro Omni',
    'Comparison Table',
    'Value Score Chart',
    'Key Stats',
    'What Reddit Says',
    'What to Avoid',
    'Sources',
  ],
  quick_verdict_preview: 'The Roborock S8 MaxV Ultra is the best overall for pet owners.',
}

const USER_MESSAGE = `Generate a full article for: "${QUERY}"

Article type: ${PLAN.article_type}

Visual strategy (FOLLOW THIS — it controls which section types you may use):
${JSON.stringify(PLAN.visual_strategy, null, 2)}

FORBIDDEN COMPONENTS — DO NOT USE THESE SECTION TYPES:
${PLAN.forbidden_components.map(c => `- ${c}`).join('\n')}
This is a hard constraint. If a section type is listed above, do NOT include it in the output.

Full article plan:
${JSON.stringify(PLAN, null, 2)}`

// ═══════════════════════════════════════════════════
// Sonnet with web search
// ═══════════════════════════════════════════════════
async function runSonnet(): Promise<{ article: unknown; inputTokens: number; outputTokens: number; durationMs: number }> {
  console.log('[Sonnet] Starting full-schema generation with web search...')
  const start = Date.now()

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 5 * 60 * 1000 })

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    system: WRITING_PROMPT,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search', max_uses: 6 }],
    messages: [{ role: 'user', content: USER_MESSAGE }],
  })

  const message = await stream.finalMessage()
  const duration = Date.now() - start

  const textBlocks = message.content.filter(b => b.type === 'text')
  const text = textBlocks[textBlocks.length - 1]?.type === 'text'
    ? (textBlocks[textBlocks.length - 1] as { type: 'text'; text: string }).text
    : ''

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  let parsed = null
  if (jsonMatch) {
    try { parsed = JSON.parse(jsonMatch[0]) } catch (e) {
      console.log('[Sonnet] JSON parse error:', (e as Error).message)
      parsed = { _raw: text.slice(0, 500), _parseError: true }
    }
  } else {
    parsed = { _raw: text.slice(0, 500), _noJson: true }
  }

  console.log(`[Sonnet] Done in ${(duration / 1000).toFixed(1)}s | Input: ${message.usage?.input_tokens} | Output: ${message.usage?.output_tokens}`)
  const cost = ((message.usage?.input_tokens ?? 0) * 3 / 1_000_000) + ((message.usage?.output_tokens ?? 0) * 15 / 1_000_000)
  console.log(`[Sonnet] Cost: $${cost.toFixed(4)}`)

  return { article: parsed, inputTokens: message.usage?.input_tokens ?? 0, outputTokens: message.usage?.output_tokens ?? 0, durationMs: duration }
}

// ═══════════════════════════════════════════════════
// Brave research + Gemini Flash
// ═══════════════════════════════════════════════════
async function braveWebSearch(query: string): Promise<string> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`
  const res = await fetch(url, { headers: { Accept: 'application/json', 'X-Subscription-Token': BRAVE_KEY } })
  if (!res.ok) return ''
  const data = await res.json()
  return (data.web?.results ?? []).slice(0, 5)
    .map((r: { title?: string; description?: string; url?: string }, i: number) =>
      `[${i + 1}] ${r.title ?? ''}\n${r.description ?? ''}\nSource: ${r.url ?? ''}`)
    .join('\n\n')
}

async function gatherResearch(): Promise<string> {
  const searches = [
    'best robot vacuums for pet hair 2026',
    'Roborock S8 MaxV Ultra pet hair review',
    'iRobot Roomba j9+ pet hair performance',
    'Ecovacs Deebot X2 Omni vs Roborock pet hair',
    'best robot vacuum pet hair reddit 2026',
    'robot vacuum pet hair comparison prices 2026',
  ]

  console.log('[Brave] Running 6 searches...')
  const results: string[] = []
  for (const sq of searches) {
    const r = await braveWebSearch(sq)
    if (r) results.push(`=== Search: "${sq}" ===\n${r}`)
  }

  const combined = results.join('\n\n---\n\n')
  console.log(`[Brave] Research: ${combined.length} chars (~${Math.round(combined.length / 3.8)} tokens)`)

  // Cap at ~5000 tokens
  return combined.length > 19000 ? combined.slice(0, 19000) : combined
}

async function runGemini(research: string): Promise<{ article: unknown; durationMs: number }> {
  console.log('[Gemini] Starting full-schema generation...')
  const start = Date.now()

  // Gemini gets the same system prompt + plan + research data
  const prompt = `${WRITING_PROMPT}

═══════════════════════════════════════════════════
RESEARCH DATA — Use ONLY this data for factual claims, prices, specs:
═══════════════════════════════════════════════════

${research}

═══════════════════════════════════════════════════
GENERATE THE ARTICLE:
═══════════════════════════════════════════════════

${USER_MESSAGE}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 16000 },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error: ${res.status} ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const duration = Date.now() - start
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '')

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  let parsed = null
  if (jsonMatch) {
    try { parsed = JSON.parse(jsonMatch[0]) } catch (e) {
      console.log('[Gemini] JSON parse error:', (e as Error).message)
      // Try to fix common issues
      try {
        const fixed = jsonMatch[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')
        parsed = JSON.parse(fixed)
        console.log('[Gemini] Fixed JSON parsed successfully')
      } catch {
        parsed = { _raw: text.slice(0, 500), _parseError: true }
      }
    }
  } else {
    parsed = { _raw: text.slice(0, 500), _noJson: true }
  }

  console.log(`[Gemini] Done in ${(duration / 1000).toFixed(1)}s`)

  return { article: parsed, durationMs: duration }
}

// ═══════════════════════════════════════════════════
// Analysis
// ═══════════════════════════════════════════════════
function analyzeArticle(label: string, article: Record<string, unknown>) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`ANALYSIS: ${label}`)
  console.log('─'.repeat(60))

  if (article._parseError || article._noJson) {
    console.log('❌ FAILED TO PRODUCE VALID JSON')
    console.log('Raw preview:', (article._raw as string)?.slice(0, 200))
    return
  }

  console.log('✅ Valid JSON: Yes')

  const sections = (article.sections as Array<Record<string, unknown>>) ?? []
  console.log(`📄 Sections: ${sections.length}`)

  // Section types
  const types = sections.map(s => s.type as string)
  const typeCounts: Record<string, number> = {}
  types.forEach(t => { typeCounts[t] = (typeCounts[t] || 0) + 1 })
  console.log('📊 Section types:')
  Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([t, c]) =>
    console.log(`   ${t}: ${c}`))

  // Product cards
  const productCards = sections.filter(s => s.type === 'product_card')
  console.log(`\n🛍️  Product cards: ${productCards.length}`)
  productCards.forEach((pc, i) => {
    const name = pc.entity_name ?? pc.heading ?? '?'
    const price = pc.price ?? '(no price)'
    const specs = pc.key_specs ? Object.keys(pc.key_specs as object).length : 0
    console.log(`   ${i + 1}. ${name} — ${price} — ${specs} specs`)
  })

  // Charts
  const charts = sections.filter(s =>
    ['bar_chart', 'line_chart', 'pie_chart', 'treemap', 'comparison_matrix'].includes(s.type as string))
  console.log(`\n📈 Charts: ${charts.length}`)
  charts.forEach(c => {
    const data = c.data ?? c.items ?? c.metrics ?? []
    console.log(`   ${c.type}: "${c.heading ?? '?'}" — ${Array.isArray(data) ? data.length : '?'} data points`)
  })

  // Comparison table
  const tables = sections.filter(s => s.type === 'comparison_table')
  console.log(`\n📋 Comparison tables: ${tables.length}`)
  tables.forEach(t => {
    const cols = (t.columns as string[])?.length ?? 0
    const rows = (t.rows as unknown[])?.length ?? 0
    console.log(`   ${cols} columns × ${rows} rows`)
  })

  // Stat cards
  const stats = sections.filter(s => s.type === 'stat_cards')
  console.log(`\n🔢 Stat cards: ${stats.length}`)
  stats.forEach(s => {
    const cards = (s.stats ?? s.cards ?? []) as Array<Record<string, unknown>>
    console.log(`   ${cards.length} stats: ${cards.map(c => c.label ?? c.heading ?? '?').join(', ')}`)
  })

  // Community insights
  const community = sections.filter(s => s.type === 'community_insights')
  console.log(`\n💬 Community insights: ${community.length}`)

  // Warning box
  const warnings = sections.filter(s => s.type === 'warning_box')
  console.log(`⚠️  Warning boxes: ${warnings.length}`)

  // Sources
  const sources = sections.filter(s => s.type === 'sources')
  console.log(`📎 Sources: ${sources.length}`)

  // Verdict
  const verdict = article.quick_verdict as Record<string, unknown> | undefined
  console.log(`\n🏆 Verdict:`)
  if (verdict?.bullets) console.log(`   Bullets: ${(verdict.bullets as string[]).length}`)
  if (verdict?.one_liner) console.log(`   One-liner: ${(verdict.one_liner as string).slice(0, 80)}...`)
}

// ═══════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════
async function main() {
  console.log('Full Schema Model Comparison')
  console.log(`Query: ${QUERY}`)
  console.log(`Plan: ${PLAN.sections_outline.length} sections outlined`)
  console.log('')

  // Run Sonnet
  let sonnetResult
  try {
    sonnetResult = await runSonnet()
  } catch (err) {
    console.log('[Sonnet] FAILED:', (err as Error).message)
    sonnetResult = { article: { _raw: (err as Error).message, _parseError: true }, inputTokens: 0, outputTokens: 0, durationMs: 0 }
  }

  // Run Gemini
  let geminiResult
  try {
    const research = await gatherResearch()
    geminiResult = await runGemini(research)
  } catch (err) {
    console.log('[Gemini] FAILED:', (err as Error).message)
    geminiResult = { article: { _raw: (err as Error).message, _parseError: true }, durationMs: 0 }
  }

  // Analyze both
  analyzeArticle('SONNET + Web Search', sonnetResult.article as Record<string, unknown>)
  analyzeArticle('GEMINI FLASH + Brave', geminiResult.article as Record<string, unknown>)

  // Save for insertion
  fs.writeFileSync('test-outputs/pet-hair-sonnet-full.json', JSON.stringify(sonnetResult.article, null, 2))
  fs.writeFileSync('test-outputs/pet-hair-gemini-full.json', JSON.stringify(geminiResult.article, null, 2))

  console.log('\n\nSaved to test-outputs/pet-hair-sonnet-full.json and pet-hair-gemini-full.json')
}

main().catch(console.error)
