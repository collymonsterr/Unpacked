/**
 * Gemini Flash writing pipeline.
 * Takes pre-researched data from Brave and generates structured article JSON.
 */

import type { ArticleContent, ArticlePlan, EntityCard, ResearchSynthesis, ArticleBlueprint, VideoFinding } from '@/types/article'
import { extractJSON } from '@/lib/utils/extract-json'
import { buildStructuredResearchPrompt } from '@/lib/structured-research-prompt'
import { formatBlueprintForPrompt } from '@/lib/blueprint'
import { formatVideoFindingsForPrompt } from '@/lib/brave-video-search'
import { MODELS, GEMINI_FLASH_URL } from '@/lib/models'

const GEMINI_API_URL = GEMINI_FLASH_URL

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
      model: MODELS.geminiFlash,
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
  if (!liveData || liveData.length === 0) {
    return [
      '',
      'LIVE DATA: NONE AVAILABLE.',
      'No live data passed quality filters for this article. Do NOT reference Polymarket odds, Yahoo Finance prices, or Google Trends data in the article text.',
      'Do NOT write phrases like "Polymarket odds suggest...", "markets are pricing in...", or "search interest shows..." unless you have a specific data point from the research findings below.',
      'If the blueprint mentions live data sources, ignore those references — the data was attempted but filtered out due to insufficient volume, flat trends, or no relevant markets.',
      '',
    ].join('\n')
  }

  // Build a set of which sources are actually present
  const presentSources = new Set(liveData.map(item => (item.source as string).toLowerCase()))
  const allSources = ['polymarket', 'yahoo_finance', 'google_trends']
  const missingSources = allSources.filter(s => !presentSources.has(s))

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

  // Warn about sources that were attempted but filtered out
  if (missingSources.length > 0) {
    const sourceLabels: Record<string, string> = { polymarket: 'Polymarket', yahoo_finance: 'Yahoo Finance', google_trends: 'Google Trends' }
    const missingLabels = missingSources.map(s => sourceLabels[s] ?? s).join(', ')
    sections.push('')
    sections.push(`DATA NOT AVAILABLE: ${missingLabels} data was attempted but filtered out (insufficient volume, flat trends, or no relevant markets). Do NOT reference ${missingLabels} in the article text. Only reference the live data sources listed above.`)
  }

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
- NO STAT CARD / PROSE DUPLICATION: Never include a stat card that repeats a number already stated in the preceding section text. Stat cards must add NEW information that complements the prose — deeper data points, different metrics, or contextual statistics the prose doesn't cover. If the prose already states the key numbers, either move those numbers OUT of the prose and into the cards only, or use the cards for different data entirely. Stating "founded 1990, $3 billion budget, completed 2003" in prose and then showing four stat cards with the exact same figures makes the article feel padded. Pick one or the other.
- NO CREATIVE WRITING: Never open a section with a scene-setting paragraph ("Picture this...", "Imagine..."). Never use rhetorical questions as transitions. Start every section with the most important fact. Delete any sentence that doesn't contain a specific fact, number, name, or actionable instruction.
- EXPERT QUOTES: If research includes direct quotes from notable people (founders, researchers, analysts, industry leaders), use them as pull quotes. Attribute clearly. Real quotes from real people add credibility.

DATA INTEGRITY — HARD RULES:

RULE 1 — NO INVENTED NUMBERS: Never cite a specific dollar amount, percentage, statistic, or data point unless it appears verbatim in the research findings, entity cards, or live data provided below. If you cannot trace a number to a specific source in this prompt, do not include it. Write "according to analysts" or omit the claim entirely. Invented precision ($4.5B, 73%, 640 Yuan) is worse than no data — it WILL be caught by the fact-checker and destroys reader trust.

RULE 2 — NO REFERENCING UNAVAILABLE DATA: Only reference live data sources (Polymarket, Yahoo Finance, Google Trends) if their data is explicitly provided in the LIVE DATA section below. If a source is listed as "NOT AVAILABLE", do not mention it, do not write "Polymarket odds suggest...", do not write "markets are pricing in...". The data was attempted but filtered out.

RULE 3 — CHART DATA: Charts must ONLY visualise numbers from:
1. The research findings provided in this prompt
2. Entity card facts with specific numbers
3. Live data provided in the LIVE DATA section below
4. Prices, specs, or statistics explicitly stated in the research

If no real data source exists for a visualisation, use stat_cards or bullet points instead. A chart with invented numbers is worse than no chart at all.

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
Narrative, not information delivery. The best explainers challenge a wrong assumption and build narrative tension — they tell a story that happens to teach. Structure the article as:
1. Open with what people commonly believe or assume about this topic, and WHY that assumption seems logical. Make the reader feel understood before you upend the belief.
2. Introduce a real-world case, dataset, or example that contradicts or complicates that assumption.
3. Build to a clear turning point where reality diverged from expectations.
4. Explain the underlying mechanism briefly — in service of the narrative, not replacing it.
5. Close with the mandatory "Why This Matters" / "The Bigger Picture" section — a decisive, opinionated take on what this means going forward.
Lead with what people get wrong, not what they already know. "Most people think X. They're wrong. Here's what's actually happening." Teach something unexpected.

decision_guide:
Direct advice from someone who's been there. "If you're under 35, rent. Here's the evidence." Take a position and defend it. Acknowledge the exception, then move on.

news_analysis:
Analytical with a clear prediction. Don't just explain what happened — say what happens next and why. "This ends in a deal, not a war. Here's the evidence." Be willing to commit to a forecast.

deep_dive:
Investigative, narrative-driven. Don't just present findings — build a case. Structure the article as:
1. Open with what people commonly believe or assume about this topic, and why that belief seems reasonable.
2. Introduce a specific real-world case, dataset, or example that complicates the consensus view.
3. Build to a clear turning point where the evidence diverges from the conventional narrative.
4. Explain the underlying mechanism or causal chain briefly — in service of the story, not as a textbook.
5. Close with the mandatory "Why This Matters" / "The Bigger Picture" section — a decisive, opinionated take on what this means going forward.
"The conventional wisdom on this is wrong. Here's what the evidence actually shows." Challenge the mainstream narrative section by section.

trend_analysis:
Contrarian by default. If everyone says the trend is real, examine why it might not be. If everyone's sceptical, make the case for why it is. "Everyone says remote work is dying. The data says otherwise."

breaking_news:
Urgent, factual, but with a clear "what this means" angle. Not just what happened — why it matters and what to watch for next.

how_to:
Practical and direct. No preamble, no context-setting. "Step 1: Do this. Here's why it works." Respect the reader's time.

roundup:
Curated and opinionated. You're not listing options — you're recommending. "I looked at 30 options. Only these 8 are worth your time. Here's the one to pick if you're in a hurry."

ranked_list:
Decisive and evidence-backed. Structure as a numbered countdown or count-up. Each item gets: a prominent rank number, the item name, and 1-2 paragraphs explaining why it's at this rank with specific evidence. Include brief comparisons to adjacent ranks ("X edges out Y because..."). The #1 pick gets 2-3 paragraphs with a definitive explanation. End with a verdict restating the winner. Output each ranked item as a section with type "ranked_item" containing an "items" array with rank, name, and content fields.

myth_buster:
Contrarian and evidence-driven. Structure as myth/reality pairs. Each pair starts with the myth stated boldly and confidently (as if you believed it), then "The reality:" with 1-2 paragraphs debunking it using specific evidence. The myth should be something people actually believe, not a strawman. The debunking should be surprising or counterintuitive. Output each pair group as a section with type "myth_reality" containing a "pairs" array with myth, reality, and evidence fields. End with a verdict on the single biggest misconception and why it persists.

timeline_article:
Narrative and authoritative. Structure as chronological entries using the existing timeline section type. Each entry has a date (or date range), a headline, and a narrative explaining what happened and why it mattered. Entries should build on each other — cause and effect, not just a list of dates. Include 8-15 entries for standard length. The intro sets up why this history matters now, the conclusion draws lessons or predictions.

visual_list:
Editorial and image-forward. Structure as a numbered list where each item leads with an image_section. Each item has: a headline, an image_section with a specific search query for that item, and 2-3 paragraphs of editorial narrative in a content_section. The writing should complement what the image shows, not describe it. Tell the story behind what's shown. Include 10-15 items for standard length.

VISUAL LIST RULES:
- The ONLY sections allowed are: one brief intro content_section, the numbered visual items (each as image_section + content_section pair), and one brief conclusion content_section (2-3 sentences max).
- Do NOT include analytical sections like "Key Takeaways", "Things to Watch Out For", "Tips", "Practical Advice", or any summary/warning sections.
- The executive_summary key_takeaways and watch_out_for arrays MUST be empty arrays [] — visual lists speak through their items, not through analytical summaries.
- For each visual item's content_section, the section heading already contains the item name. Do NOT repeat the item name at the start of the body text. Start the body text with the narrative directly.
- For image sections: the alt_text should be a factual accessibility description of the image. The caption must add editorial context — what makes this significant, where it was photographed, or why it matters. The caption must NOT be the same as the alt_text.

MANDATORY CLOSING EDITORIAL SECTION — EVERY ARTICLE MUST END WITH ONE:
Before further_reading and sources, every article must include exactly ONE final content_section that provides editorial closure. The section is not optional. Choose the heading and purpose by article type:

- Product types (buyer_guide, comparison, decision_guide, roundup, ranked_list):
  Heading: "Bottom Line"
  Length: 80-120 words
  Purpose: Reinforce the verdict with a final decisive statement. What should the reader take away and do next? Do not re-summarise — commit.

- Knowledge types (explainer, deep_dive, myth_buster, timeline_article):
  Heading: "Why This Matters" or "The Bigger Picture"
  Length: 140-180 words
  Purpose: A forward-looking opinion connecting the topic to something the reader cares about today. Must be opinionated and add NEW perspective — NOT a summary of what was already said. This is the section that makes the reader walk away thinking.

- News types (news_analysis, breaking_news, trend_analysis):
  Heading: "What to Watch"
  Length: 100-140 words
  Purpose: What happens next. Specific signals, upcoming decisions, dates to watch, indicators that will prove the analysis right or wrong. Commit to a forecast.

- how_to: Heading "Final Tips" or "Before You Start" — 80-100 words of last-mile practical advice (skip the closing section only if the how_to article is under 800 words).
- visual_list: A 2-3 sentence brief closer only. Do not expand into a full editorial closer — visual lists speak through their items.

This closing section REPLACES any "Conclusion" or "Summary" section you might otherwise write. Do not write both. The closing section is always positioned immediately before further_reading and sources.

SHORT ANSWER RULE — When to leave executive_summary.short_answer EMPTY:
For the following article types, the short_answer paragraph duplicates the amber verdict box above it and wastes the reader's first scroll. Leave short_answer as an empty string "":
- explainer, deep_dive, myth_buster, timeline_article, news_analysis, trend_analysis, visual_list

For all other types (buyer_guide, comparison, decision_guide, roundup, ranked_list, how_to, breaking_news), short_answer should be ONE SHORT SENTENCE (under 25 words) that FRAMES THE QUESTION without restating the verdict. It sets up the problem; the verdict box answers it. If the only thing you can write in short_answer is a restatement of the verdict, leave it empty instead.

CRITICAL RULE — NEVER REVEAL THE VERDICT EARLY:
- The article title must NOT name the winner, #1 pick, or verdict. It should promise what the reader will learn, not give them the answer.
- The subtitle must NOT reveal the conclusion.
- The introduction must set up the question and establish stakes but NEVER answer it. Hint that the result is surprising if it is, but don't say what it is.
- The verdict, winner, or main conclusion belongs ONLY in the verdict section at the end.

This applies to ALL article types:
- ranked_list: Do not name the #1 pick in the title. "The 10 Best Laptops of 2026, Ranked" is good. "The 10 Best Laptops of 2026: MacBook Pro Wins" is bad.
- buyer_guide: Do not name the recommended product in the title or intro.
- myth_buster: Do not debunk the main myth in the intro. Set up why people believe the myths, then debunk them one by one.
- comparison: Do not declare the winner before the analysis.
- All types: The reader should reach the verdict feeling like they earned the answer by reading the evidence. If they already know the answer from the title, the article has failed.

EXECUTIVE SUMMARY RULES — Key Takeaways and Watch Out For:
These boxes should ONLY appear on specific article types:

BOTH Key Takeaways AND Watch Out For:
- buyer_guide (practical purchase advice and warnings)
- decision_guide (helping someone make a choice)
- how_to (practical steps with pitfalls to avoid)

Key Takeaways ONLY (no Watch Out For — set watch_out_for to empty array []):
- comparison (summarise the key differences)
- explainer (summarise the key concepts)
- deep_dive (summarise a long piece)

NEITHER (set executive_summary key_takeaways and watch_out_for to empty arrays []):
- ranked_list (the ranking is the takeaway)
- myth_buster (the myth/reality pairs are the takeaway)
- timeline_article (narrative, not advisory)
- visual_list (image-led, no analytical sections)
- news_analysis (the analysis is the content)
- trend_analysis (the trends are the point)
- breaking_news (short and urgent)
- roundup (the roundup is already a summary)

Never generate a Key Takeaways or Watch Out For section for types in the NEITHER list. These sections add nothing and undermine the format.

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
- ranked_list: ranked_item sections + 1-2 charts (bar_chart for rankings, stat_cards)
- myth_buster: myth_reality sections + 1-2 stat_cards for key data
- timeline_article: timeline section as primary visual + stat_cards
- visual_list: image_section per item as primary visual
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
- news_analysis, trend_analysis, deep_dive: Hero image required. MANDATORY 3-5 editorial image_section entries spread throughout the article. Each should depict a specific photographable subject relevant to that section — key figures, locations, events, infrastructure, etc. Think photojournalism: "Strait of Hormuz cargo ship aerial", "Wall Street traders reacting to news", "diplomat handshake press conference". Never use generic stock-photo queries like "world news" or "geopolitics".
- how_to: Step illustration images where they genuinely clarify a step. Not mandatory but encouraged.
- breaking_news: Hero image required. Include 2-3 editorial image_section entries for key visual moments — the subject of the news, key figures, affected locations. Speed matters but visuals help readers engage.
- For image_section entries: search_query must describe a specific photographable subject. Never "technology background" or "abstract concept". Only include if you're confident a search will return a relevant photo.
- For product image queries: use "[Exact Product Name] official product photo" — never just the product name alone. Avoid queries that return Amazon bundles, accessory kits, or package deals.

STAT CARDS — N/A RULE: Only include stat cards for data points with specific, concrete values from the research. NEVER generate a stat card with "N/A", "Not specified", "Unknown", "Varies", or "TBD" as the value. If the research doesn't have a number, omit that card entirely. Three strong cards are better than five cards where two say "N/A".

POLITICAL & CURRENT AFFAIRS ARTICLES:
- If the research includes fact-checker verdicts (PolitiFact, Snopes, FactCheck.org), cite them BY NAME: "PolitiFact rated this claim as Mostly False" or "Snopes found this to be unproven."
- Reference official data sources by name (Bureau of Labor Statistics, World Bank, CBO, etc.) — not just "according to data."
- Include opposing expert viewpoints: "Most economists agree X, but [Name] at [Institution] argues Y."

NO CITATION MARKUP: No <cite> tags. Clean prose only.

NO MARKDOWN HEADINGS IN CONTENT: Do NOT use markdown heading syntax (# or ## or ###) within section content. Each section already has a "heading" field in the JSON structure — use that for the section heading. Body content within sections should be plain prose paragraphs. If you need a subheading within a section, prefix the line with "**Subheading Text**" using bold markdown — do NOT use # syntax.

CRITICAL: Output ONLY the raw JSON object. No markdown code fences. No text before or after the JSON. No explanations. Start your response with { and end with }.

OUTPUT: Return ONLY valid JSON matching this schema:

{
  "title": "string",
  "article_type": "buyer_guide|comparison|decision_guide|explainer|how_to|roundup|ranked_list|myth_buster|timeline_article|visual_list|trend_analysis|news_analysis|breaking_news|deep_dive",
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
    { "type": "big_statement", "content": { "statement": "single bold sentence — a conclusion, strong take, or reframing" } },
    { "type": "ranked_item", "heading": "string", "items": [{"rank": 1, "name": "string", "content": "string (1-2 paragraphs of evidence)"}] },
    { "type": "myth_reality", "heading": "string", "pairs": [{"myth": "string (bold claim)", "reality": "string (evidence-backed debunking)", "evidence": "string (optional supporting data)"}] },
    { "type": "video_embed", "url": "string — EXACT YouTube or Vimeo URL from the VIDEOS list. Never invent.", "caption": "string — one-line description of what's in the video", "context": "string — channel · duration · year (when available)" }
  ]
}

VIDEO EMBEDS — STRICT RULES (post-write validation will strip violations):

1. URL FIDELITY — if you cannot find an exact match, OMIT THE EMBED:
   - The url field MUST be copied character-for-character from the VIDEOS list.
   - Real YouTube IDs are EXACTLY 11 characters (e.g. "dQw4w9WgXcQ"). Anything shorter or longer is invented and will be stripped from the published article.
   - NEVER guess, complete, abbreviate, or construct URLs. If the VIDEOS list does not contain a match for an item you want to discuss, write the content_section WITHOUT a video_embed. A missing video is fine; an invented URL embarrasses the platform.
   - "Plausible-looking" YouTube IDs you've seen in training data are still inventions. Only the IDs in the VIDEOS list are real.

2. VIDEO REPLACES IMAGE — never both for the same item:
   - For ranked_list articles where each item IS a video (best DJ sets, best speeches, best music videos, best TED talks, best ad campaigns), each item gets EITHER a video_embed OR an image_section, NEVER both.
   - If the VIDEOS list contains a match for that item → use video_embed only. Skip the image_section entirely.
   - If the VIDEOS list does NOT contain a match for that item → use image_section only (or no media at all). Do not invent a video.
   - Post-write validation drops any image_section that immediately precedes a video_embed.

3. MATCHING:
   - Match by entity name + context. "Peggy Gou - Boiler Room NYC 2017" in VIDEOS pairs with a section about Peggy Gou's NYC Boiler Room. Don't pair it with a section about Peggy Gou's Seoul set — that's a different video.
   - If multiple list entries match an item, pick the most relevant one based on title/description.

4. CAPTION + CONTEXT:
   - Caption: one line of editorial value — what's notable about this clip, not a restatement of the title
   - Context: "channel · duration · year" when those fields exist in the VIDEOS list. Skip if data isn't there — don't invent metadata.

5. WHEN VIDEOS LIST IS EMPTY: Do NOT emit any video_embed sections. The article should still work as a written piece.

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
Include 4-6 insight cards in the community_insights section — each with a source, summary, and sentiment. Draw from Reddit threads, Twitter findings, and research to show the range of real opinions. More cards = better representation of the debate.
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
    'live_data_card', 'big_statement', 'ranked_item', 'myth_reality',
    'video_embed',
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
  videoFindings?: VideoFinding[],
): Promise<ArticleContent> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not set')

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const currentYear = new Date().getFullYear()
  const systemPrompt = getWritingPrompt(currentDate, currentYear)

  const structuredResearch = buildStructuredResearchPrompt(entityCards, synthesis)
  const blueprintSection = blueprint ? formatBlueprintForPrompt(blueprint) : ''
  const liveDataSection = formatLiveDataForPrompt(liveData)
  const videoSection = videoFindings && videoFindings.length > 0
    ? formatVideoFindingsForPrompt(videoFindings)
    : ''

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
${videoSection}
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
            model: MODELS.geminiFlash,
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
  researchContext?: string,
): Promise<{ article: ArticleContent; suggestion_chips: { refinements: string[]; related: string[] } }> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not set')

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const currentYear = new Date().getFullYear()
  const systemPrompt = getWritingPrompt(currentDate, currentYear)

  const researchBlock = researchContext
    ? `\n\nORIGINAL RESEARCH FINDINGS (use these as factual source material when adding or replacing content — do NOT hallucinate product names, specs, or claims):\n${researchContext}`
    : ''

  const userMessage = `You are making a SURGICAL EDIT to an existing article. Apply ONLY the specific change requested below. This is critical — you must preserve everything the user did not ask to change.

RULES FOR REFINEMENT:
1. Do NOT change the article title unless the user explicitly asks for a title change.
2. Do NOT change the article_type field. Ever.
3. Do NOT rewrite sections that are not affected by the user's instruction. Copy them exactly as-is.
4. Do NOT remove products, sections, or content unless the user explicitly asks for their removal.
5. Do NOT rephrase, reorganise, or "improve" content the user didn't mention.
6. When adding new content, draw from the research findings provided below — do not invent product names, specifications, prices, or claims.
7. Preserve all existing text, structure, formatting, component types, and data exactly as written for unchanged sections.

IMAGE HANDLING RULES (critical — images break if you get this wrong):
8. UPLOADING: When the user provides an image URL to insert, use EXACTLY that URL in the image_section's image_url field. Never substitute a different URL. Set source to "user_upload".
9. SWAPPING: When the user asks to swap/replace an existing image, change ONLY the image_url field on the target image. Keep the same image_section position, layout, caption, alt_text, and search_query. Do NOT remove the image_section or set image_url to null.
10. REMOVING: When the user asks to remove an image, remove ONLY that specific image_section. Keep all other image_sections unchanged.
11. PRESERVING: Every image_section in the current article that the user did NOT mention must appear in your output with identical image_url, search_query, caption, alt_text, and layout. Clearing image_url or search_query makes the image disappear — never do this unless explicitly asked.

QUERY: ${query}
REFINEMENT INSTRUCTION: "${instruction}"
${optionsPrompt}${researchBlock}

CURRENT ARTICLE:
${JSON.stringify(currentArticle)}

Apply ONLY the requested change and return the full updated article JSON. All sections not affected by the instruction must be identical to the input. Also include a "suggestion_chips" key at the top level with new contextually relevant suggestions. IMPORTANT: The current year is ${currentYear} — if any suggestion includes a year, use ${currentYear}, never 2024 or 2025.
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
            model: MODELS.geminiFlash,
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
