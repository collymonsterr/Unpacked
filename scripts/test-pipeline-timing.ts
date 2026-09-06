/**
 * Direct pipeline timing test — bypasses HTTP and auth.
 * Usage: npx tsx scripts/test-pipeline-timing.ts "best robot vacuum 2026"
 */

// Must come before the lib imports below — they read env vars at module load.
import './load-env'

import { planArticle } from '../lib/claude'
import { executeResearch } from '../lib/research-orchestrator'
import { generateBlueprint } from '../lib/blueprint'
import { writeWithGemini } from '../lib/gemini-writer'
import { buildOptionsPrompt } from '../lib/claude'
import { runEditorialPass } from '../lib/editorial-pass'
import type { ResearchSynthesis } from '../types/article'

const query = process.argv[2] || 'best robot vacuum 2026'
const options = { length: 'standard' as const, tone: 'opinionated' as const, visual: 'standard' as const }

async function run() {
  const t: Record<string, number> = {}
  const totalStart = Date.now()

  // ── Planning ──
  console.log(`\n=== Testing: "${query}" ===\n`)
  let t0 = Date.now()
  const plan = await planArticle(query, options, 'timing-test')
  t.planning = Date.now() - t0
  console.log(`[timing] Planning:    ${(t.planning / 1000).toFixed(1)}s  (type: ${plan.article_type}, ${plan.entities.length} entities)`)

  // ── Research ──
  t0 = Date.now()
  const manifest = plan.research_manifest ?? {
    brave_queries: [{ query, purpose: 'core_facts' as const }],
    reddit_queries: [{ query, subreddits: [] }],
    image_queries: { hero: { query, style: 'editorial_photo' as const }, products: [] },
  }
  const research = await executeResearch(manifest, plan, 'standard')
  t.research = Date.now() - t0
  console.log(`[timing] Research:    ${(t.research / 1000).toFixed(1)}s  (${research.searchCount} searches, ${research.entityCards.length} entities, ${research.liveData.length} live data)`)

  // ── Blueprint ──
  t0 = Date.now()
  const synthesis: ResearchSynthesis = research.synthesis ?? {
    thesis_direction: '', comparison_axes: [], strongest_arguments: {},
    likely_winner: null, caveats: [], community_sentiment_summary: '',
    key_data_points: [], source_quality: '', gaps: [],
  }
  const blueprint = await generateBlueprint(query, plan, research.entityCards, synthesis, research.summary, options)
  t.blueprint = Date.now() - t0
  console.log(`[timing] Blueprint:   ${(t.blueprint / 1000).toFixed(1)}s  (${blueprint.sections.length} sections, ${blueprint.target_word_count} words target)`)

  // ── Prose writing (Gemini Flash) ──
  t0 = Date.now()
  const optsPrompt = buildOptionsPrompt(options)
  const article = await writeWithGemini(query, plan, research.summary, optsPrompt, undefined, research.entityCards, synthesis, blueprint, research.liveData)
  t.writing = Date.now() - t0
  console.log(`[timing] Writing:     ${(t.writing / 1000).toFixed(1)}s  (${article.sections.length} sections, "${article.title}")`)

  // ── Editorial pass ──
  t0 = Date.now()
  const editorial = await runEditorialPass(article, blueprint, research.entityCards)
  t.editorial = Date.now() - t0
  console.log(`[timing] Editorial:   ${(t.editorial / 1000).toFixed(1)}s  (score: ${editorial.score}/100, ${Object.keys(editorial.rewrites).length} rewrites)`)

  // ── Summary ──
  const total = Date.now() - totalStart
  t.total = total
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`[TOTAL]  ${(total / 1000).toFixed(1)}s`)
  console.log(`${'═'.repeat(60)}`)
  console.log(`  Planning:    ${(t.planning / 1000).toFixed(1)}s`)
  console.log(`  Research:    ${(t.research / 1000).toFixed(1)}s`)
  console.log(`  Blueprint:   ${(t.blueprint / 1000).toFixed(1)}s`)
  console.log(`  Writing:     ${(t.writing / 1000).toFixed(1)}s`)
  console.log(`  Editorial:   ${(t.editorial / 1000).toFixed(1)}s`)
  console.log(`  Images:      0.0s (would run parallel with writing)`)
  console.log(`${'═'.repeat(60)}\n`)
}

run().catch(err => {
  console.error('Pipeline failed:', err)
  process.exit(1)
})
