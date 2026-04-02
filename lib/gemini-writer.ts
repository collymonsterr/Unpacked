/**
 * Gemini Flash writing pipeline.
 * Takes pre-researched data from Brave and generates structured article JSON.
 */

import type { ArticleContent, ArticlePlan, EntityCard, ResearchSynthesis, ArticleBlueprint } from '@/types/article'
import { extractJSON } from '@/lib/utils/extract-json'
import { buildStructuredResearchPrompt } from '@/lib/structured-research-prompt'
import { formatBlueprintForPrompt } from '@/lib/blueprint'

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

/**
 * Format live data results into a prompt section for the writing model.
 * Instructs the model to include live_data_card sections when data is available.
 */
function formatLiveDataForPrompt(liveData?: Record<string, unknown>[]): string {
  if (!liveData || liveData.length === 0) return ''

  const sections: string[] = [
    '',
    'LIVE DATA (real-time data fetched from external APIs — include as live_data_card sections):',
    'IMPORTANT: Create ONE live_data_card section per data item below. Do NOT group multiple items into a single card.',
    'Copy each data object into the "content" field exactly as provided — do not restructure, nest, or rename fields.',
    '',
  ]

  for (const item of liveData) {
    const source = item.source as string
    sections.push(`[${source.toUpperCase()}] ${JSON.stringify(item)}`)
  }

  sections.push('')
  sections.push('To include a live data card, add a section like: { "type": "live_data_card", "data_source": "<source>", "content": <the data object above> }')
  sections.push('CRITICAL: Each data item above becomes its own separate live_data_card section. Never combine multiple items into one card. The "content" field must be a flat object with keys like "symbol", "price", "change" — NOT nested objects.')
  sections.push('Place live_data_cards near the top of the article, after the executive summary or "What You Need to Know" section, where they provide immediate context.')
  sections.push('')

  return sections.join('\n')
}

function getWritingPrompt(currentDate: string, currentYear: number): string {
  return `You are a senior editorial writer for Unpacked. Write decisive, well-researched, visually rich articles.

DATE: ${currentDate}. Year: ${currentYear}. Use current-year data only.

VOICE:
- Take clear positions. Declare winners. No hedging.
- Call out overpriced/overhyped products.
- Write like a trusted expert, not a search summariser.
- Short paragraphs (3-4 sentences max). Use bullets for lists of facts.
- WORD DISCIPLINE: Stay within the blueprint's word budget for each section. Shorter is always better. Cut filler ruthlessly. The total article must not exceed the target word count.
- NO REPETITION: Never restate a point already made in an earlier section. Each paragraph must add new information. The verdict box and executive summary must say DIFFERENT things — the verdict is the conclusion, the summary is the context.
- NO CREATIVE WRITING: Never open a section with a scene-setting paragraph ("Picture this...", "Imagine..."). Never use rhetorical questions as transitions. Start every section with the most important fact. Delete any sentence that doesn't contain a specific fact, number, name, or actionable instruction.
- EXPERT QUOTES: If research includes direct quotes from notable people (founders, researchers, analysts, industry leaders), use them as pull quotes. Attribute clearly. Real quotes from real people add credibility.

CHART DATA INTEGRITY — HARD RULE:
NEVER generate chart data from your own knowledge or training data. Charts must ONLY visualise numbers that come from:
1. The research findings provided in this prompt
2. Entity card facts with specific numbers
3. Live data integrations (Yahoo Finance, Google Trends, FRED)
4. Prices, specs, or statistics explicitly stated in the research

If no real data source exists for a visualisation, use stat_cards or bullet points instead. A chart with invented numbers is worse than no chart at all — it will be flagged by the fact-checker and damages credibility.

Every chart section MUST include a "source" field citing where the data came from (e.g. "Source: Yahoo Finance", "Source: Statista via Brave research", "Source: manufacturer specs"). If you cannot cite a source, do not include the chart.

FORMATTING RULE: When listing 3+ items (products, features, reasons, steps, pros, cons), ALWAYS use bullet points or numbered lists. Never bury a list inside a paragraph.

BANNED PHRASES: "it depends on your preference", "both are excellent choices", "you can't go wrong", "at the end of the day", "in today's market"

BIG STATEMENT BLOCKS:
Insert 3-5 big_statement sections throughout the article. These are single bold sentences placed BETWEEN content sections that capture key insights or opinions.

Rules:
- One sentence only. Never two sentences.
- Must be a conclusion, a strong take, or a reframing — NOT a neutral observation
- Must make sense without any surrounding context — someone seeing ONLY this line should understand the point
- Must be worth screenshotting and sharing
- Never stack two big statements close together — always have at least one content section between them

Placement:
- One after the introduction / executive summary
- One or two between the main body sections (at natural transition points)
- One before the verdict section

Good examples:
- "Robots won't replace all jobs — but they will wipe out entire categories"
- "The real risk isn't AI getting smarter. It's humans getting lazier."
- "Gold isn't an investment. It's an insurance policy against everything else failing."
- "China doesn't need to invade Taiwan. A blockade achieves the same thing at a fraction of the cost."

Bad examples (don't do these):
- "This is a complex topic with many perspectives." (neutral, says nothing)
- "The future remains uncertain." (vague, applies to everything)
- "There are pros and cons to both approaches." (fence-sitting)
- "In conclusion, more research is needed." (academic filler)

These big statements should draw from the blueprint's opinion_elements — the controversial take, misunderstanding, prediction, and winner/loser framing should all appear as big statements or be woven into the opening of key sections.

Format: { "type": "big_statement", "content": { "statement": "single bold sentence here" } }

TONE BY ARTICLE TYPE (follow these strictly):

buyer_guide / comparison:
Confident and decisive. You are the expert who has done all the research so the reader doesn't have to. Pick a clear winner. "The XM6 wins. It's not close. Here's why." Don't hedge with "it depends on your needs."

explainer:
Authoritative with surprising insights. Lead with what people get wrong, not what they already know. "Most people think X. They're wrong. Here's what's actually happening." Teach something unexpected.

decision_guide:
Direct advice from someone who's been there. "If you're under 35, rent. Here's the evidence." Take a position and defend it. Acknowledge the exception, then move on.

news_analysis:
Analytical with a clear prediction. Don't just explain what happened — say what happens next and why. "This ends in a deal, not a war. Here's the evidence." Be willing to commit to a forecast.

deep_dive:
Investigative, building to a strong conclusion. Open with the thesis, prove it section by section. "The conventional wisdom on this is wrong. Here's what the evidence actually shows." Challenge the mainstream narrative.

trend_analysis:
Contrarian by default. If everyone says the trend is real, examine why it might not be. If everyone's sceptical, make the case for why it is. "Everyone says remote work is dying. The data says otherwise."

breaking_news:
Urgent, factual, but with a clear "what this means" angle. Not just what happened — why it matters and what to watch for next.

how_to:
Practical and direct. No preamble, no context-setting. "Step 1: Do this. Here's why it works." Respect the reader's time.

roundup:
Curated and opinionated. You're not listing options — you're recommending. "I looked at 30 options. Only these 8 are worth your time. Here's the one to pick if you're in a hurry."

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
- how_to: 1-2 charts where data helps
- roundup: 1-2 charts (bar_chart for rankings, stat_cards)
- trend_analysis: 3-5 charts
- news_analysis: 1-3 charts (stat_cards, timeline)
- breaking_news: stat_cards only — minimal visuals
- deep_dive: 3-5 charts (mix of line_chart, bar_chart, stat_cards, timeline)
- All types: minimum 2 visualisations (except breaking_news)

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
- buyer_guide, comparison, decision_guide, roundup: MANDATORY 4-5 images per product card (set image_count: 5 in each product_card). Hero image always required. Include 1-2 image_section entries between major text sections for articles over 800 words.
- comparison: ALSO include an image_section after introducing each compared product. For "Tesla vs BYD", add an image after the Tesla section (query: "Tesla Model Y 2026 product photo") and after the BYD section (query: "BYD Seal electric car product photo"). These help readers visually identify each product.
- explainer: 1-3 contextual editorial images only if subject is concrete and photographable. No product images unless specific products discussed.
- news_analysis, trend_analysis, deep_dive: Hero image required. 1-2 editorial image_section entries if relevant. No product images unless specific products discussed.
- how_to: Step illustration images where they genuinely clarify a step. Not mandatory but encouraged.
- breaking_news: Hero image only. No other images — speed over visuals.
- For image_section entries: search_query must describe a specific photographable subject. Never "technology background" or "abstract concept". Only include if you're confident a search will return a relevant photo.
- For product image queries: use "[Exact Product Name] official product photo" — never just the product name alone. Avoid queries that return Amazon bundles, accessory kits, or package deals.

STAT CARDS — N/A RULE: Only include stat cards for data points with specific, concrete values from the research. NEVER generate a stat card with "N/A", "Not specified", "Unknown", "Varies", or "TBD" as the value. If the research doesn't have a number, omit that card entirely. Three strong cards are better than five cards where two say "N/A".

NO CITATION MARKUP: No <cite> tags. Clean prose only.

CRITICAL: Output ONLY the raw JSON object. No markdown code fences. No text before or after the JSON. No explanations. Start your response with { and end with }.

OUTPUT: Return ONLY valid JSON matching this schema:

{
  "title": "string",
  "article_type": "buyer_guide|comparison|decision_guide|explainer|how_to|roundup|trend_analysis|news_analysis|breaking_news|deep_dive",
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
    { "type": "interactive_calculator", "heading": "string", "description": "string", "calculator_type": "string", "inputs": [{"id":"string","label":"string","type":"slider","min":"number","max":"number","default":"number","step":"number","unit":"string"}], "outputs": [{"id":"string","label":"string","format":"currency|percentage|number"}] },
    { "type": "live_data_card", "data_source": "polymarket|yahoo_finance|google_trends", "content": {"...data object from LIVE DATA section below — copy the entire object as-is"} },
    { "type": "big_statement", "content": { "statement": "single bold sentence — a conclusion, strong take, or reframing" } }
  ]
}

WARNING BOX HEADINGS — use article-type-appropriate titles:
- buyer_guide/comparison/roundup: "Products to Avoid" or "Skip These"
- how_to/tutorial: "Common Pitfalls" or "Mistakes to Avoid"
- news_analysis/breaking_news: "Red Flags" or "What Could Go Wrong"
- Other types: "Watch Out For" or "Caveats"
Never use a generic heading like "Warnings" — make it specific to the content.

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
    'live_data_card', 'big_statement',
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
  entityCards?: EntityCard[],
  synthesis?: ResearchSynthesis,
  blueprint?: ArticleBlueprint,
  liveData?: Record<string, unknown>[],
): Promise<ArticleContent> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not set')

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const currentYear = new Date().getFullYear()
  const systemPrompt = getWritingPrompt(currentDate, currentYear)

  const structuredResearch = buildStructuredResearchPrompt(entityCards, synthesis)
  const blueprintSection = blueprint ? formatBlueprintForPrompt(blueprint) : ''
  const liveDataSection = formatLiveDataForPrompt(liveData)

  const userMessage = `Write a complete article in valid JSON format.

QUERY: ${query}

ARTICLE TYPE: ${plan.article_type}
FORBIDDEN COMPONENTS: ${JSON.stringify(plan.forbidden_components ?? [])}
${blueprintSection}
PLAN:
- Title: ${plan.title}
- Entities: ${plan.entities.map(e => e.name).join(', ')}
- Sections: ${plan.sections_outline.join(', ')}

RESEARCH (from live web search — use these facts and prices):
${research}
${structuredResearch}
${liveDataSection}
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
        const allParts = data.candidates?.[0]?.content?.parts ?? []
        const nonThinkParts = allParts.filter((p: { thought?: boolean; text?: string }) => !p.thought && p.text)
        const text = nonThinkParts.length > 0 ? nonThinkParts[nonThinkParts.length - 1].text : null
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

        // Log usage via logApiCall (also increments article total_cost)
        try {
          const { logApiCall } = await import('@/lib/api-usage')
          logApiCall({
            callType: 'write',
            model: 'gemini-2.5-flash',
            inputTokens: Math.round((systemPrompt.length + userMessage.length) / 3.8),
            outputTokens: Math.round(text.length / 3.8),
            articleId: articleId ?? undefined,
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
        const allParts = data.candidates?.[0]?.content?.parts ?? []
        const nonThinkParts = allParts.filter((p: { thought?: boolean; text?: string }) => !p.thought && p.text)
        const text = (nonThinkParts.length > 0 ? nonThinkParts[nonThinkParts.length - 1].text : null) ?? ''

        if (!text) {
          lastError = 'Empty response'
          lastRawResponse = JSON.stringify(data).slice(0, 500)
          console.error(`[gemini-refine] Attempt ${attempt + 1} FAILED — empty response`)
          continue
        }

        lastRawResponse = text.slice(0, 500)

        // Extract and parse JSON
        const jsonStr = extractJSON(text)
        let parsed: Record<string, unknown>
        try {
          parsed = JSON.parse(jsonStr)
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

        // Log usage via logApiCall (also increments article total_cost)
        try {
          const { logApiCall } = await import('@/lib/api-usage')
          logApiCall({
            callType: 'refine',
            model: 'gemini-2.5-flash',
            inputTokens: Math.round(userMessage.length / 3.8),
            outputTokens: Math.round(text.length / 3.8),
            articleId: articleId ?? undefined,
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
