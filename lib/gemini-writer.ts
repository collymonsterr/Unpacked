/**
 * Gemini Flash writing pipeline.
 * Takes pre-researched data from Brave and generates structured article JSON.
 */

import type { ArticleContent, ArticlePlan } from '@/types/article'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

// Concurrency control
let activeGenerations = 0
const MAX_CONCURRENT = parseInt(process.env.GEMINI_MAX_CONCURRENT ?? '3', 10)
const queue: Array<{ resolve: () => void }> = []

async function acquireSlot(): Promise<void> {
  if (activeGenerations < MAX_CONCURRENT) {
    activeGenerations++
    return
  }
  return new Promise((resolve) => {
    queue.push({ resolve })
  })
}

function releaseSlot(): void {
  activeGenerations--
  const next = queue.shift()
  if (next) {
    activeGenerations++
    next.resolve()
  }
}

/**
 * Trimmed writing system prompt — under 2,500 tokens.
 * Imperative, no repetition, JSON schema included.
 */
function getWritingPrompt(currentDate: string, currentYear: number): string {
  return `You are a senior editorial writer for ArticleAI. Write decisive, well-researched, visually rich articles.

DATE: ${currentDate}. Year: ${currentYear}. Use current-year data only.

VOICE:
- Take clear positions. Declare winners. No hedging.
- Call out overpriced/overhyped products.
- Write like a trusted expert, not a search summariser.
- Short paragraphs (3-4 sentences max). Use bullets for lists of facts.

BANNED PHRASES: "it depends on your preference", "both are excellent choices", "you can't go wrong", "at the end of the day", "in today's market"

STRUCTURE:
1. Quick Verdict + Executive Summary (always first)
2. "What You Need to Know" — mandatory context section. What separates good from bad? What mistakes do beginners make? Be specific.
3. Community Insights — early, before products. What does Reddit/Twitter say?
4. Product Cards (buyer guides) or content sections (explainers)
5. Charts, comparison tables — interspersed where they add value
6. Warning Box, Who This Is For
7. Further Reading (4-6 curated external links with one-line descriptions)
8. Sources

PRICING RULES:
- Use ONLY prices from the provided research. If research says "price varies — check retailer", use that exact phrase.
- If research provides a price range, show the range.
- NEVER guess or invent prices. Never state an unverified price as exact.
- Include recency: "Around $299 as of early ${currentYear}."

VISUAL REQUIREMENTS:
- buyer_guide: product_cards + comparison_table + bar_chart + stat_cards
- comparison: product_cards + comparison_table (min 8 rows) + comparison_matrix
- explainer: 2+ charts (line_chart, bar_chart, stat_cards)
- tutorial: 1-2 charts where data helps
- trend_analysis: 3-5 charts
- All types: minimum 2 visualisations

FORBIDDEN COMPONENTS: Check the plan's forbidden_components array. Do NOT generate any listed section type.

CALCULATOR: For finance/cost topics, include an interactive_calculator. Use ONLY named types: compound_interest, mortgage, mortgage_payoff, roi_comparison, budget, commute_cost, subscription_audit, cooking_comparison, gym_comparison, smoking_cost, house_affordability, freelance_comparison, dog_ownership, cost_of_living_comparison, rental_comparison, college_savings, car_budget, salary_calculator, baby_cost, engagement_ring_budget.

IMAGES BY ARTICLE TYPE — follow these rules strictly:
- buyer_guide, comparison, decision_guide: MANDATORY 4-5 images per product card (set image_count: 5 in each product_card). Hero image always required. Include 1-2 image_section entries between major text sections for articles over 800 words.
- explainer: 1-3 contextual editorial images only if subject is concrete and photographable. No product images unless specific products discussed.
- news, trend_analysis: Hero image required. 1-2 editorial image_section entries if relevant. No product images unless specific products discussed.
- tutorial: Step illustration images where they genuinely clarify a step. Not mandatory but encouraged.
- For image_section entries: search_query must describe a specific photographable subject. Never "technology background" or "abstract concept". Only include if you're confident a search will return a relevant photo.

NO CITATION MARKUP: No <cite> tags. Clean prose only.

OUTPUT: Return ONLY valid JSON matching this schema:

{
  "title": "string",
  "article_type": "buyer_guide|comparison|decision_guide|explainer|news|planning|trend_analysis|tutorial",
  "quick_verdict": { "bullets": ["string (3-4 short punchy points, <15 words each)"], "one_liner": "string" },
  "executive_summary": { "short_answer": "string", "key_takeaways": ["string"], "watch_out_for": ["string"] },
  "sections": [
    { "type": "content_section", "heading": "string", "content": "string" },
    { "type": "product_card", "heading": "string", "entity_name": "string", "product_type": "physical|software|service|place", "price": "string", "key_specs": {}, "opinion": "string", "verdict": "string", "links": [{"label":"string","url":"string"}] },
    { "type": "comparison_table", "heading": "string", "columns": ["string"], "rows": [["string"]] },
    { "type": "warning_box", "heading": "string", "items": [{"name":"string","reason":"string"}] },
    { "type": "community_insights", "heading": "string", "consensus": "strong|mixed|divided", "consensus_summary": "string", "insights": [{"source":"string","summary":"string","sentiment":"positive|negative|mixed"}] },
    { "type": "who_this_is_for", "heading": "string", "profiles": [{"user_type":"string","recommendation":"string"}] },
    { "type": "further_reading", "items": [{"title":"string","url":"string","description":"string"}] },
    { "type": "sources", "items": [{"title":"string","url":"string"}] },
    { "type": "bar_chart", "heading": "string", "data": [{"label":"string","value":"number","highlight":"boolean"}], "source": "string" },
    { "type": "comparison_matrix", "heading": "string", "items": ["string"], "metrics": [{"name":"string","scores":["number"],"max":"number"}] },
    { "type": "pie_chart", "heading": "string", "data": [{"label":"string","value":"number"}], "source": "string" },
    { "type": "line_chart", "heading": "string", "series": [{"name":"string","data":[{"x":"string","y":"number"}]}], "source": "string" },
    { "type": "stat_cards", "heading": "string", "cards": [{"value":"string","label":"string"}], "source": "string" },
    { "type": "timeline", "heading": "string", "events": [{"year":"string","title":"string","description":"string"}] },
    { "type": "image_section", "heading": "string", "images": [{"search_query":"string","caption":"string"}], "layout": "single|gallery" },
    { "type": "interactive_calculator", "heading": "string", "description": "string", "calculator_type": "string", "inputs": [{"id":"string","label":"string","type":"slider","min":"number","max":"number","default":"number","step":"number","unit":"string"}], "outputs": [{"id":"string","label":"string","format":"currency|percentage|number"}] }
  ]
}`
}

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1) return text.slice(start, end + 1)
  return text.trim()
}

interface ValidateResult {
  valid: boolean
  errors: string[]
}

function validateArticleSchema(article: Record<string, unknown>): ValidateResult {
  const errors: string[] = []

  if (!article.title || typeof article.title !== 'string') errors.push('missing title')
  if (!article.article_type || typeof article.article_type !== 'string') errors.push('missing article_type')
  if (!article.quick_verdict) errors.push('missing quick_verdict')
  if (!article.executive_summary) errors.push('missing executive_summary')
  if (!Array.isArray(article.sections)) errors.push('missing sections array')
  else if (article.sections.length < 3) errors.push(`only ${article.sections.length} sections (min 3)`)

  const validTypes = new Set([
    'content_section', 'product_card', 'comparison_table', 'warning_box',
    'price_tier_breakdown', 'community_insights', 'who_this_is_for',
    'further_reading', 'sources', 'bar_chart', 'comparison_matrix',
    'pie_chart', 'line_chart', 'stat_cards', 'treemap', 'timeline',
    'image_section', 'interactive_calculator', 'head_to_head',
  ])

  if (Array.isArray(article.sections)) {
    for (const s of article.sections as Record<string, unknown>[]) {
      if (!s.type || !validTypes.has(s.type as string)) {
        errors.push(`invalid section type: ${s.type}`)
      }
      if (s.type === 'product_card') {
        if (!s.entity_name) errors.push('product_card missing entity_name')
      }
      if (s.type === 'comparison_table') {
        if (!Array.isArray(s.columns) || !Array.isArray(s.rows)) errors.push('comparison_table missing columns/rows')
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

export async function writeWithGemini(
  query: string,
  plan: ArticlePlan,
  research: string,
  optionsPrompt: string,
  articleId?: string,
): Promise<ArticleContent> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not set')

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const currentYear = new Date().getFullYear()
  const systemPrompt = getWritingPrompt(currentDate, currentYear)

  const userMessage = `Write a complete article in valid JSON format.

QUERY: ${query}

ARTICLE TYPE: ${plan.article_type}
FORBIDDEN COMPONENTS: ${JSON.stringify(plan.forbidden_components ?? [])}

PLAN:
- Title: ${plan.title}
- Entities: ${plan.entities.map(e => e.name).join(', ')}
- Sections: ${plan.sections_outline.join(', ')}

RESEARCH (from live web search — use these facts and prices):
${research}
${optionsPrompt}`

  await acquireSlot()

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      console.log(`[gemini-writer] Attempt ${attempt + 1}/3 for "${query.slice(0, 40)}..."`)

      try {
        const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + '\n\n' + userMessage }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
            },
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          console.error(`[gemini-writer] API error ${res.status}:`, errText.slice(0, 200))
          if (res.status >= 500) continue // Retry on server errors
          throw new Error(`Gemini API error: ${res.status}`)
        }

        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) {
          console.error('[gemini-writer] No text in response')
          continue
        }

        const jsonStr = extractJSON(text)
        let article: Record<string, unknown>

        try {
          article = JSON.parse(jsonStr)
        } catch (parseErr) {
          console.error(`[gemini-writer] JSON parse failed (attempt ${attempt + 1}):`, (parseErr as Error).message)
          continue
        }

        // Validate schema
        const validation = validateArticleSchema(article)
        if (!validation.valid) {
          console.error(`[gemini-writer] Schema validation failed (attempt ${attempt + 1}):`, validation.errors.join(', '))
          continue
        }

        // Log usage
        try {
          const { getSupabaseAdmin } = await import('@/lib/supabase')
          const db = getSupabaseAdmin()
          await db.from('api_usage_log').insert({
            call_type: 'write',
            model: 'gemini-2.5-flash',
            input_tokens: Math.round((systemPrompt.length + userMessage.length) / 3.8),
            output_tokens: Math.round(text.length / 3.8),
            article_id: articleId ?? null,
          })
        } catch {
          // Non-critical
        }

        console.log(`[gemini-writer] Success: ${(article.sections as unknown[])?.length ?? 0} sections, ${Math.round(text.length / 3.8)} output tokens`)

        return article as unknown as ArticleContent

      } catch (err) {
        if (attempt < 2) {
          console.log(`[gemini-writer] Retrying after error: ${(err as Error).message}`)
          continue
        }
        throw err
      }
    }

    throw new Error('Gemini failed after 3 attempts')
  } finally {
    releaseSlot()
  }
}

/**
 * Refine an existing article using Gemini Flash.
 * Same retry/validation pattern as writeWithGemini.
 */
export async function refineWithGemini(
  query: string,
  currentArticle: ArticleContent,
  instruction: string,
  optionsPrompt: string,
  articleId?: string,
): Promise<{ article: ArticleContent; suggestion_chips: { refinements: string[]; related: string[] } }> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not set')

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const currentYear = new Date().getFullYear()
  const systemPrompt = getWritingPrompt(currentDate, currentYear)

  const userMessage = `Refine this article. Apply the instruction below and return the FULL updated article as valid JSON.

QUERY: ${query}
REFINEMENT INSTRUCTION: "${instruction}"
${optionsPrompt}

CURRENT ARTICLE:
${JSON.stringify(currentArticle)}

Apply the refinement and return the full updated article JSON. Also include a "suggestion_chips" key at the top level with new contextually relevant suggestions:
{
  ...article fields...,
  "suggestion_chips": {
    "refinements": ["string", "string", "string"],
    "related": ["string", "string", "string"]
  }
}`

  await acquireSlot()

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      console.log(`[gemini-refine] Attempt ${attempt + 1}/3 for "${instruction.slice(0, 40)}..."`)

      try {
        const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + '\n\n' + userMessage }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
            },
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          console.error(`[gemini-refine] API error ${res.status}:`, errText.slice(0, 200))
          if (res.status >= 500) continue
          throw new Error(`Gemini API error: ${res.status}`)
        }

        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

        if (!text) {
          console.error('[gemini-refine] Empty response')
          continue
        }

        // Extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          console.error('[gemini-refine] No JSON found in response')
          continue
        }

        let parsed: Record<string, unknown>
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          console.error(`[gemini-refine] JSON parse failed (attempt ${attempt + 1})`)
          continue
        }

        // Extract suggestion_chips and article
        const { suggestion_chips, ...articleData } = parsed

        // Basic validation — must have title and sections
        if (!articleData.title || !Array.isArray(articleData.sections) || articleData.sections.length < 2) {
          console.error('[gemini-refine] Invalid article structure')
          continue
        }

        // Log usage
        try {
          const { getSupabaseAdmin } = await import('@/lib/supabase')
          const db = getSupabaseAdmin()
          await db.from('api_usage_log').insert({
            call_type: 'refine',
            model: 'gemini-2.5-flash',
            input_tokens: Math.round(userMessage.length / 3.8),
            output_tokens: Math.round(text.length / 3.8),
            article_id: articleId ?? null,
          })
        } catch {
          // Non-critical
        }

        console.log(`[gemini-refine] Success: ${(articleData.sections as unknown[]).length} sections`)

        return {
          article: articleData as unknown as ArticleContent,
          suggestion_chips: (suggestion_chips as { refinements: string[]; related: string[] }) ?? { refinements: [], related: [] },
        }

      } catch (err) {
        if (attempt < 2) {
          console.log(`[gemini-refine] Retrying after error: ${(err as Error).message}`)
          continue
        }
        throw err
      }
    }

    throw new Error('Gemini refine failed after 3 attempts')
  } finally {
    releaseSlot()
  }
}
