/**
 * Gemini Flash writing pipeline.
 * Takes pre-researched data from Brave and generates structured article JSON.
 */

import type { ArticleContent, ArticlePlan } from '@/types/article'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

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
/**
 * Log a Gemini fallback event to api_usage_log for persistent tracking.
 */
async function logGeminiFallback(callType: string, errorMessage: string, rawResponse: string, articleId?: string) {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const db = getSupabaseAdmin()
    await db.from('api_usage_log').insert({
      call_type: `gemini_fallback_${callType}`,
      model: 'gemini-2.5-flash',
      input_tokens: 0,
      output_tokens: 0,
      article_id: articleId ?? null,
      error_message: `${errorMessage} | Raw: ${rawResponse.slice(0, 300)}`,
    })
  } catch {
    // If error_message column doesn't exist yet, this will fail silently
    console.warn('[gemini-fallback] Could not log fallback to database')
  }
}

function getWritingPrompt(currentDate: string, currentYear: number): string {
  return `You are a senior editorial writer for Unpacked. Write decisive, well-researched, visually rich articles.

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

CALCULATOR: For finance/cost topics, include an interactive_calculator. Use ONLY named types with EXACTLY these input and output IDs. Using any other IDs will break the calculator.
- compound_interest: inputs: starting_age, monthly_savings, annual_return, retirement_age. outputs: total_saved, total_contributed, interest_earned.
- mortgage: inputs: home_price, down_payment, interest_rate, loan_term. outputs: monthly_payment, total_paid, total_interest.
- mortgage_payoff: inputs: mortgage_balance, mortgage_rate, extra_payment, investment_return. outputs: interest_saved, time_saved, effective_return.
- roi_comparison: inputs: initial_investment, rate_a, rate_b, years. outputs: option_a_total, option_b_total, difference.
- budget: inputs: monthly_income, housing, transport, food, utilities, entertainment. outputs: total_expenses, remaining, savings_rate.
- commute_cost: inputs: miles_one_way, work_days, hourly_wage, commute_time. outputs: annual_vehicle_cost, annual_time_cost, total_annual_cost.
- subscription_audit: inputs: streaming_count, avg_streaming_cost, software_count, avg_software_cost. outputs: monthly_total, annual_total, vs_average.
- cooking_comparison: inputs: restaurant_meals_week, avg_meal_cost, home_cooking_cost, household_size. outputs: annual_savings, cost_difference.
- gym_comparison: inputs: monthly_gym_cost, home_gym_cost, visits_per_month, annual_fees, travel_costs. outputs: gym_total_5yr, home_gym_total_5yr, savings.
- smoking_cost: inputs: packs_per_day, pack_price, years_smoking, investment_return. outputs: direct_cost, opportunity_cost, total_cost.
- house_affordability: inputs: annual_income, monthly_debts, down_payment, mortgage_rate. outputs: max_house_price, monthly_payment, front_end_ratio.
- freelance_comparison: inputs: salary, hourly_rate, billable_hours, health_insurance. outputs: employee_takehome, freelance_takehome, difference.
- dog_ownership: inputs: annual_cost, region_multiplier, lifespan. outputs: lifetime_cost, monthly_budget.
- cost_of_living_comparison: inputs: monthly_salary, rent_preference, lifestyle_spending. outputs: london_disposable, lisbon_disposable, savings_difference.
- rental_comparison: inputs: nightly_rate, monthly_rent, occupancy_rate, property_value. outputs: str_monthly, ltr_net, annual_difference.
- college_savings: inputs: child_age, college_type, target_coverage, annual_return. outputs: monthly_savings, total_saved, projected_cost.
- car_budget: inputs: gross_income, take_home_percentage, insurance_monthly, fuel_monthly. outputs: monthly_take_home, max_transportation_budget, available_for_payment.
- salary_calculator: inputs: family_size, children, area_preference, lifestyle. outputs: monthly_salary, housing_budget, school_costs.
- baby_cost: inputs: location, childcare, feeding, income_loss. outputs: total_first_year, monthly_average.
- engagement_ring_budget: inputs: annual_income, monthly_rent_mortgage, monthly_debt_payments, monthly_other_expenses, monthly_savings_goal, current_ring_savings. outputs: monthly_disposable_income, conservative_budget, comfortable_budget, total_available_budget.
CRITICAL: Do NOT invent new input or output IDs. Use EXACTLY the IDs listed above for the calculator type you choose. If no type fits, use roi_comparison as the closest match.

IMAGES BY ARTICLE TYPE — follow these rules strictly:
- buyer_guide, comparison, decision_guide: MANDATORY 4-5 images per product card (set image_count: 5 in each product_card). Hero image always required. Include 1-2 image_section entries between major text sections for articles over 800 words.
- explainer: 1-3 contextual editorial images only if subject is concrete and photographable. No product images unless specific products discussed.
- news, trend_analysis: Hero image required. 1-2 editorial image_section entries if relevant. No product images unless specific products discussed.
- tutorial: Step illustration images where they genuinely clarify a step. Not mandatory but encouraged.
- For image_section entries: search_query must describe a specific photographable subject. Never "technology background" or "abstract concept". Only include if you're confident a search will return a relevant photo.

NO CITATION MARKUP: No <cite> tags. Clean prose only.

CRITICAL: Output ONLY the raw JSON object. No markdown code fences. No text before or after the JSON. No explanations. Start your response with { and end with }.

OUTPUT: Return ONLY valid JSON matching this schema:

{
  "title": "string",
  "article_type": "buyer_guide|comparison|decision_guide|explainer|news|planning|trend_analysis|tutorial",
  "quick_verdict": { "bullets": ["string (3-4 short punchy points, <15 words each)"], "one_liner": "string" },
  "executive_summary": { "short_answer": "string", "key_takeaways": ["string"], "watch_out_for": ["string"] },
  "sections": [
    { "type": "content_section", "heading": "string", "content": "string" },
    { "type": "product_card", "heading": "string", "entity_name": "string", "product_type": "physical|software|service|place", "price": "string", "key_specs": {"use category-appropriate specs — see rules below": "value"}, "opinion": "string (3 paragraphs separated by \\n\\n: P1 what stands out and who its for, P2 real-world performance vs competitors, P3 honest caveats. 3-4 sentences each.)", "verdict": "string", "links": [{"label":"string","url":"string — use ONLY real URLs from ENTITY LINKS below"}] },
    { "type": "comparison_table", "heading": "string", "columns": ["string"], "rows": [["string"]] },
    { "type": "warning_box", "heading": "string", "items": [{"name":"string","reason":"string"}] },
    { "type": "community_insights", "heading": "string", "consensus": "strong|mixed|divided", "consensus_summary": "string", "insights": [{"source":"string","summary":"string","sentiment":"positive|negative|mixed"}], "reddit_threads": [{"title":"string","url":"string","subreddit":"string"}], "quotes": [{"text":"string","source":"string"}] },
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
}

SPEC FIELDS BY CATEGORY (use product_category from plan):
over-ear/on-ear headphones: ANC Performance, Sound Signature, Battery Life, Comfort/Weight, Microphone Quality, Connectivity, App Support, Codec Support
true wireless earbuds: ANC Performance, Sound Signature, Battery Life (per charge), Total Battery (with case), Fit/Stability, Call Quality, Water Resistance, Codec Support
mirrorless camera/DSLR: Sensor, Autofocus, Video, Burst Rate, Battery Life, Stabilisation, Weather Sealing, Weight
laptop: Processor, RAM, Storage, Display, Battery Life, Weight, GPU, Ports
electric vehicle/car: Range, 0-60mph, Charging Speed, Boot Space, Seating, Price Range, Warranty, Colours
smartphone: Display, Processor, RAM, Storage, Camera System, Battery Life, Charging Speed, OS
For unlisted categories: use 6-8 relevant specs a knowledgeable reviewer would include.

COMMUNITY INSIGHTS WITH REDDIT THREADS:
If REDDIT THREADS data is provided in the research, include it in the community_insights section as a reddit_threads array with title, url, and subreddit fields. These are real URLs — include them exactly as provided.
If notable direct quotes appear in the community sentiment research, include up to 2 as a quotes array in community_insights, each with text and source fields. Only include quotes that are genuinely insightful — not generic opinions.`
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

  let lastError = ''
  let lastRawResponse = ''
  // Delay before next attempt — overridden to 8s for rate limits
  let nextDelay = 0

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      // Progressive delay between attempts: 2s → 5s (or 8s after a 429)
      if (attempt > 0) {
        console.log(`[gemini-writer] Waiting ${nextDelay}ms before attempt ${attempt + 1}...`)
        await sleep(nextDelay)
      }
      // Default delay for next attempt — may be overridden by 429 handling below
      nextDelay = attempt === 0 ? 2000 : 5000

      console.log(`[gemini-writer] Attempt ${attempt + 1}/3 for "${query.slice(0, 40)}..."`)

      // Per-attempt 90-second timeout — catches silent hangs
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 90_000)

      try {
        const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + '\n\n' + userMessage }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 65536,
            },
          }),
        })
        clearTimeout(timeoutId)

        if (!res.ok) {
          const errText = await res.text()
          lastError = `API error ${res.status}: ${errText.slice(0, 200)}`
          lastRawResponse = errText.slice(0, 500)
          console.error(`[gemini-writer] Attempt ${attempt + 1} FAILED — API error ${res.status}:`, errText.slice(0, 200))
          if (res.status === 429) {
            // Rate limit — retryable with longer delay
            nextDelay = 8000
            continue
          }
          if (res.status >= 500) continue // Server error — retryable
          throw new Error(`Gemini API error: ${res.status}`) // 4xx (not 429) — not retryable
        }

        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) {
          lastError = 'Empty response — no text in candidates'
          lastRawResponse = JSON.stringify(data).slice(0, 500)
          console.error(`[gemini-writer] Attempt ${attempt + 1} FAILED — empty response, no text in candidates`)
          continue
        }

        lastRawResponse = text.slice(0, 500)
        const jsonStr = extractJSON(text)
        let article: Record<string, unknown>

        try {
          article = JSON.parse(jsonStr)
        } catch (parseErr) {
          lastError = `JSON parse failed: ${(parseErr as Error).message}`
          console.error(`[gemini-writer] Attempt ${attempt + 1} FAILED — JSON parse: ${(parseErr as Error).message}. First 300 chars: ${text.slice(0, 300)}`)
          continue
        }

        // Validate schema
        const validation = validateArticleSchema(article)
        if (!validation.valid) {
          lastError = `Schema validation: ${validation.errors.join(', ')}`
          console.error(`[gemini-writer] Attempt ${attempt + 1} FAILED — schema: ${validation.errors.join(', ')}`)
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
        clearTimeout(timeoutId)
        lastError = (err as Error).message
        const isTimeout = (err as Error).name === 'AbortError'
        if (isTimeout) {
          lastError = 'Request timed out after 90 seconds'
          console.error(`[gemini-writer] Attempt ${attempt + 1} TIMED OUT after 90s`)
        }
        if (attempt < 2) {
          console.log(`[gemini-writer] Attempt ${attempt + 1} threw — retrying: ${lastError}`)
          continue
        }
        // Final attempt — log fallback before throwing
        console.error(`[gemini-writer] ALL 3 ATTEMPTS FAILED. Last error: ${lastError}. Raw response (first 500 chars): ${lastRawResponse}`)
        await logGeminiFallback('write', lastError, lastRawResponse, articleId)
        throw new Error(lastError)
      }
    }

    // All 3 attempts failed via continue (not throw)
    console.error(`[gemini-writer] ALL 3 ATTEMPTS FAILED (continue path). Last error: ${lastError}. Raw response (first 500 chars): ${lastRawResponse}`)
    await logGeminiFallback('write', lastError, lastRawResponse, articleId)
    throw new Error(`Gemini failed after 3 attempts: ${lastError}`)
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

Apply the refinement and return the full updated article JSON. Also include a "suggestion_chips" key at the top level with new contextually relevant suggestions. IMPORTANT: The current year is ${currentYear} — if any suggestion includes a year, use ${currentYear}, never 2024 or 2025.
{
  ...article fields...,
  "suggestion_chips": {
    "refinements": ["string", "string", "string"],
    "related": ["string", "string", "string"]
  }
}`

  await acquireSlot()

  let lastError = ''
  let lastRawResponse = ''
  // Delay before next attempt — overridden to 8s for rate limits
  let nextDelay = 0

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      // Progressive delay between attempts: 2s → 5s (or 8s after a 429)
      if (attempt > 0) {
        console.log(`[gemini-refine] Waiting ${nextDelay}ms before attempt ${attempt + 1}...`)
        await sleep(nextDelay)
      }
      // Default delay for next attempt — may be overridden by 429 handling below
      nextDelay = attempt === 0 ? 2000 : 5000

      console.log(`[gemini-refine] Attempt ${attempt + 1}/3 for "${instruction.slice(0, 40)}..."`)

      // Per-attempt 90-second timeout — catches silent hangs
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 90_000)

      try {
        const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + '\n\n' + userMessage }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 65536,
            },
          }),
        })
        clearTimeout(timeoutId)

        if (!res.ok) {
          const errText = await res.text()
          lastError = `API error ${res.status}: ${errText.slice(0, 200)}`
          lastRawResponse = errText.slice(0, 500)
          console.error(`[gemini-refine] Attempt ${attempt + 1} FAILED — API error ${res.status}:`, errText.slice(0, 200))
          if (res.status === 429) {
            // Rate limit — retryable with longer delay
            nextDelay = 8000
            continue
          }
          if (res.status >= 500) continue // Server error — retryable
          throw new Error(`Gemini API error: ${res.status}`) // 4xx (not 429) — not retryable
        }

        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

        if (!text) {
          lastError = 'Empty response'
          lastRawResponse = JSON.stringify(data).slice(0, 500)
          console.error(`[gemini-refine] Attempt ${attempt + 1} FAILED — empty response`)
          continue
        }

        lastRawResponse = text.slice(0, 500)

        // Extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          lastError = 'No JSON found in response'
          console.error(`[gemini-refine] Attempt ${attempt + 1} FAILED — no JSON. First 300 chars: ${text.slice(0, 300)}`)
          continue
        }

        let parsed: Record<string, unknown>
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch (parseErr) {
          lastError = `JSON parse failed: ${(parseErr as Error).message}`
          console.error(`[gemini-refine] Attempt ${attempt + 1} FAILED — JSON parse: ${(parseErr as Error).message}`)
          continue
        }

        // Extract suggestion_chips and article
        const { suggestion_chips, ...articleData } = parsed

        // Basic validation — must have title and sections
        if (!articleData.title || !Array.isArray(articleData.sections) || articleData.sections.length < 2) {
          lastError = `Invalid structure: title=${!!articleData.title}, sections=${Array.isArray(articleData.sections) ? (articleData.sections as unknown[]).length : 'not array'}`
          console.error(`[gemini-refine] Attempt ${attempt + 1} FAILED — ${lastError}`)
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
        clearTimeout(timeoutId)
        lastError = (err as Error).message
        const isTimeout = (err as Error).name === 'AbortError'
        if (isTimeout) {
          lastError = 'Request timed out after 90 seconds'
          console.error(`[gemini-refine] Attempt ${attempt + 1} TIMED OUT after 90s`)
        }
        if (attempt < 2) {
          console.log(`[gemini-refine] Attempt ${attempt + 1} threw — retrying: ${lastError}`)
          continue
        }
        // Final attempt — log fallback before throwing
        console.error(`[gemini-refine] ALL 3 ATTEMPTS FAILED. Last error: ${lastError}. Raw: ${lastRawResponse.slice(0, 300)}`)
        await logGeminiFallback('refine', lastError, lastRawResponse, articleId)
        throw new Error(lastError)
      }
    }

    console.error(`[gemini-refine] ALL 3 ATTEMPTS FAILED (continue path). Last error: ${lastError}. Raw: ${lastRawResponse.slice(0, 300)}`)
    await logGeminiFallback('refine', lastError, lastRawResponse, articleId)
    throw new Error(`Gemini refine failed after 3 attempts: ${lastError}`)
  } finally {
    releaseSlot()
  }
}
