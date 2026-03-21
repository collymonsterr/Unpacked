import type { ArticleContent, FactCheckResult, ProductCard } from '@/types/article'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const FACT_CHECK_PROMPT = `You are a meticulous fact-checker. You have been given an article to verify. Your job is to use Google Search to independently check every specific factual claim.

CHECK THESE THINGS:

For product articles (buyer guides, comparisons):
- Product prices: Search current prices. Flag if off by more than 10%.
- Product specs: Verify key specifications. Flag inaccuracies.
- Product availability: Confirm products are still available, not discontinued.
- Links: Check URLs are real and relevant.

For finance and money articles:
- Statistics and figures: Verify interest rates, tax brackets, market data, economic figures.
- Calculations: Check any mathematical examples or projections.
- Policy claims: Verify government policy details, eligibility criteria, dates.

For health and wellness articles:
- Medical claims: Verify health claims against reputable medical sources.
- Statistics: Check any health statistics or study references.
- Product ingredients or effects: Verify claimed benefits or risks.

For explainer and "how it works" articles:
- Technical accuracy: Verify how processes or systems are described.
- Historical facts: Check dates, events, attributions.
- Statistics and data: Verify any numbers, percentages, or figures cited.

For travel and living articles:
- Prices and costs: Verify accommodation, flight, and activity costs.
- Practical info: Check visa requirements, opening hours, seasonal advice.
- Rankings or statistics: Verify any tourism data or city rankings.

For ALL article types:
- Reddit/community quotes: Verify the sentiment is accurately represented.
- Company claims: Verify founding dates, ownership, market position.
- Any specific number, date, or named fact.

DO NOT CHECK:
- Subjective opinions or recommendations (these are editorial choices, not facts)
- Writing quality or tone
- Article structure

For each issue found, provide:
- The original claim in the article
- What you found through Google Search
- Your correction
- Severity: "critical" (completely wrong, misleading), "minor" (slightly off, outdated price), or "note" (worth updating but not wrong)

Respond ONLY with valid JSON:
{
  "issues_found": true/false,
  "total_issues": 0,
  "checks_performed": 15,
  "issues": [
    {
      "section_type": "product_card",
      "entity_name": "Yamaha Pacifica 112V",
      "original_claim": "Price: $299",
      "finding": "Current price on Sweetwater is $349 as of March 2026",
      "correction": "Price should be updated to $349",
      "severity": "minor"
    }
  ]
}

If no issues are found, return:
{
  "issues_found": false,
  "total_issues": 0,
  "checks_performed": 15,
  "issues": []
}`

/**
 * Call Gemini with Google Search grounding to fact-check an article.
 */
export async function runFactCheck(article: ArticleContent): Promise<FactCheckResult> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    console.error('[fact-check] GOOGLE_GEMINI_API_KEY not set')
    return { issues_found: false, total_issues: 0, checks_performed: 0, issues: [] }
  }

  const articleJson = JSON.stringify(article, null, 2)
  const userMessage = `${FACT_CHECK_PROMPT}

Here is the article to fact-check:

Article title: ${article.title}
Article type: ${article.article_type}
Article content:
${articleJson}`

  console.log('[fact-check] Starting fact-check for:', article.title.slice(0, 60))

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }],
        tools: [{ google_search_retrieval: {} }],
        generationConfig: { temperature: 0.1 },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[fact-check] Gemini API error:', res.status, errText.slice(0, 300))
      return { issues_found: false, total_issues: 0, checks_performed: 0, issues: [] }
    }

    const data = await res.json()

    // Extract text from Gemini response
    const textPart = data.candidates?.[0]?.content?.parts?.find(
      (p: { text?: string }) => typeof p.text === 'string'
    )
    const text = textPart?.text ?? ''

    // Extract JSON from response (may have markdown fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[fact-check] No JSON found in response:', text.slice(0, 300))
      return { issues_found: false, total_issues: 0, checks_performed: 0, issues: [] }
    }

    const result = JSON.parse(jsonMatch[0]) as FactCheckResult
    console.log('[fact-check] Complete:', result.checks_performed, 'checks,', result.total_issues, 'issues')
    return result
  } catch (err) {
    console.error('[fact-check] Error:', err)
    return { issues_found: false, total_issues: 0, checks_performed: 0, issues: [] }
  }
}

/**
 * Apply fact-check corrections to an article.
 * Only applies "critical" and "minor" severity issues.
 * Returns the corrected article.
 */
export function applyCorrections(
  article: ArticleContent,
  factCheck: FactCheckResult
): ArticleContent {
  if (!factCheck.issues_found || factCheck.issues.length === 0) {
    return article
  }

  const corrected = JSON.parse(JSON.stringify(article)) as ArticleContent

  for (const issue of factCheck.issues) {
    if (issue.severity === 'note') continue // Don't modify for notes

    // Try to fix product card prices/specs
    if (issue.section_type === 'product_card' && issue.entity_name) {
      const card = corrected.sections.find(
        (s): s is ProductCard =>
          s.type === 'product_card' &&
          s.entity_name.toLowerCase() === issue.entity_name!.toLowerCase()
      )
      if (card) {
        // Price correction
        if (issue.original_claim.toLowerCase().includes('price')) {
          const priceMatch = issue.correction.match(/\$[\d,]+\.?\d*/)
          if (priceMatch) {
            card.price = priceMatch[0]
          }
        }
        // Spec correction — try to find and update the spec
        if (card.key_specs) {
          for (const [key, val] of Object.entries(card.key_specs)) {
            if (issue.original_claim.includes(val)) {
              // Extract the corrected value from the correction text
              const correctionText = issue.correction || issue.finding
              // Simple heuristic: if the correction mentions a specific value, use it
              const newVal = correctionText.match(/should be[:\s]+["']?([^"'\n]+)/i)?.[1]
                ?? correctionText.match(/corrected to[:\s]+["']?([^"'\n]+)/i)?.[1]
              if (newVal) {
                card.key_specs[key] = newVal.trim()
              }
            }
          }
        }
        // Opinion/verdict text correction
        if (issue.original_claim && card.opinion?.includes(issue.original_claim)) {
          card.opinion = card.opinion.replace(
            issue.original_claim,
            issue.finding || issue.correction
          )
        }
      }
    }

    // Try to fix content in any section's string fields
    for (const section of corrected.sections) {
      const sectionObj = section as unknown as Record<string, unknown>
      for (const key of Object.keys(sectionObj)) {
        const val = sectionObj[key]
        if (typeof val === 'string' && issue.original_claim && val.includes(issue.original_claim)) {
          sectionObj[key] = val.replace(
            issue.original_claim,
            issue.correction || issue.finding
          )
        }
      }
    }

    // Fix executive summary
    if (corrected.executive_summary.short_answer.includes(issue.original_claim)) {
      corrected.executive_summary.short_answer = corrected.executive_summary.short_answer.replace(
        issue.original_claim,
        issue.correction || issue.finding
      )
    }
  }

  return corrected
}
