import type {
  ArticleContent,
  FactCheckResult,
  FactCheckIssue,
  ProductCard,
  VerifiedClaim,
  HaikuReview,
  ArbitrationResult,
  FactCheckAudit,
  FactCheckAuditClaim,
} from '@/types/article'
import { extractJSON } from '@/lib/utils/extract-json'
import { logApiCall } from '@/lib/api-usage'
import { MODELS, GEMINI_FLASH_URL } from '@/lib/models'

const GEMINI_API_URL = GEMINI_FLASH_URL

// ── Stage 1: Gemini + Google Search Grounding ──────────────────────────────

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
- Your correction: write ONLY the corrected text that should directly replace the original claim in the article. Do NOT include instructions like "Update the claim to...", "Change this to...", "Clarify that...", or "Price should be updated to...". Just write the corrected sentence exactly as it should appear in the article.
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
      "correction": "Price: $349",
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

const CLAIM_EXTRACTION_PROMPT = `Extract all verifiable factual claims from this article into structured JSON. For each claim, classify its category and note the evidence source if any.

Return ONLY valid JSON:
{
  "claims": [
    {
      "id": "claim_001",
      "text": "The Sony WH-1000XM6 has 30-hour battery life",
      "category": "technical",
      "source_hint": "RTINGS.com"
    }
  ]
}

Categories: price, statistic, date, factual, medical, financial, technical

Only extract SPECIFIC verifiable claims — not opinions, recommendations, or subjective statements.
Limit to the 30 most important claims.`

/**
 * Stage 1: Gemini Flash + Google Search grounding.
 * Returns both the legacy correction format AND structured claims.
 */
async function stage1GeminiVerification(
  article: ArticleContent,
  articleId?: string,
): Promise<{ corrections: FactCheckResult; claims: VerifiedClaim[] }> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    console.error('[fact-check] GOOGLE_GEMINI_API_KEY not set')
    return {
      corrections: { issues_found: false, total_issues: 0, checks_performed: 0, issues: [] },
      claims: [],
    }
  }

  const articleJson = JSON.stringify(article, null, 2)

  // Step 1a: Run existing fact-check with Google Search grounding
  const userMessage = `${FACT_CHECK_PROMPT}\n\nHere is the article to fact-check:\n\nArticle title: ${article.title}\nArticle type: ${article.article_type}\nArticle content:\n${articleJson}`

  let corrections: FactCheckResult = { issues_found: false, total_issues: 0, checks_performed: 0, issues: [] }

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1 },
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const textPart = data.candidates?.[0]?.content?.parts?.find(
        (p: { text?: string }) => typeof p.text === 'string'
      )
      const text = textPart?.text ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        corrections = JSON.parse(jsonMatch[0]) as FactCheckResult
      }

      const usage = data.usageMetadata
      logApiCall({
        callType: 'fact_check_stage1',
        model: MODELS.geminiFlash,
        inputTokens: usage?.promptTokenCount,
        outputTokens: usage?.candidatesTokenCount,
        articleId,
      })
    }
  } catch (err) {
    console.error('[fact-check] Stage 1 Gemini error:', err)
  }

  // Step 1b: Extract structured claims (small separate call, no search)
  // Uses responseMimeType + thinkingBudget:0 to ensure clean JSON output
  let claims: VerifiedClaim[] = []
  try {
    const claimRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${CLAIM_EXTRACTION_PROMPT}\n\nArticle title: ${article.title}\nArticle type: ${article.article_type}\n\n${articleJson}`,
          }],
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          // Disable thinking for structured JSON extraction — thinking mode
          // can interfere with responseMimeType, returning empty results
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    })

    if (claimRes.ok) {
      const claimData = await claimRes.json()
      const parts = claimData.candidates?.[0]?.content?.parts ?? []
      // With thinking disabled, there should be a single text part with JSON
      const textParts = parts.filter((p: { thought?: boolean; text?: string }) => !p.thought && p.text)
      const claimText = textParts.length > 0 ? textParts[textParts.length - 1].text : null

      if (!claimText) {
        console.warn('[fact-check] Claim extraction returned no text. Parts:', JSON.stringify(parts).slice(0, 300))
      }

      if (claimText) {
        const parsed = JSON.parse(extractJSON(claimText) || claimText)
        const rawClaims = parsed.claims ?? parsed

        claims = (Array.isArray(rawClaims) ? rawClaims : []).map((c: Record<string, string>, i: number) => ({
          id: c.id || `claim_${String(i + 1).padStart(3, '0')}`,
          text: c.text || '',
          category: (c.category || 'factual') as VerifiedClaim['category'],
          verdict: 'verified' as const, // Default — corrections override below
          evidence: c.source_hint ? [{ source: c.source_hint, url: '', snippet: '' }] : [],
        }))

        // Cross-reference Stage 1 corrections with extracted claims
        for (const issue of corrections.issues) {
          const matchingClaim = claims.find(c =>
            c.text.toLowerCase().includes(issue.original_claim.toLowerCase().slice(0, 30)) ||
            issue.original_claim.toLowerCase().includes(c.text.toLowerCase().slice(0, 30))
          )
          if (matchingClaim) {
            matchingClaim.verdict = issue.severity === 'note' ? 'verified' : 'flagged'
            matchingClaim.correction = issue.correction
            matchingClaim.evidence = [{
              source: issue.finding.split(' ').slice(-3).join(' '),
              url: '',
              snippet: issue.finding,
            }]
          }
        }
      }

      const usage2 = claimData.usageMetadata
      logApiCall({
        callType: 'fact_check_claims',
        model: MODELS.geminiFlash,
        inputTokens: usage2?.promptTokenCount,
        outputTokens: usage2?.candidatesTokenCount,
        articleId,
      })
    }
  } catch (err) {
    console.error('[fact-check] Claim extraction error:', err)
  }

  console.log(`[fact-check] Stage 1 complete: ${corrections.checks_performed} checks, ${corrections.total_issues} issues, ${claims.length} claims extracted`)
  return { corrections, claims }
}

// ── Stage 2: Haiku Source Credibility + Consistency ──────────────────────────

const HAIKU_REVIEW_PROMPT = `You are a source credibility reviewer. You've been given a list of fact-checked claims with their evidence sources. Your job is to evaluate:

1. SOURCE CREDIBILITY: Is each claim's evidence source appropriate?
   - Flag if: Reddit comment used as source for medical/financial claim
   - Flag if: manufacturer's own website used as "independent" review
   - Flag if: source is older than 2 years for a current pricing claim
   - Flag if: blog or forum used for technical specifications

2. INTERNAL CONSISTENCY: Do any claims contradict each other?
   - e.g., "30-hour battery" in one place and "24 hours" in another

3. REASONING CHECK: Does any claim seem technically supported but likely incorrect based on common knowledge?

For each claim, respond with whether you agree with the Stage 1 verdict.

Return ONLY valid JSON — an array:
[
  {
    "claim_id": "claim_001",
    "agrees_with_stage1": true,
    "confidence": "high",
    "concerns": null
  }
]

Confidence levels:
- "high" — clear agreement or disagreement
- "medium" — some uncertainty but leaning one way
- "low" — genuinely uncertain`

async function stage2HaikuReview(
  claims: VerifiedClaim[],
  articleType: string,
  category: string,
  articleId?: string,
): Promise<HaikuReview[]> {
  if (claims.length === 0) return []

  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.warn('[fact-check] GOOGLE_GEMINI_API_KEY not set — skipping Stage 2')
    return []
  }

  try {
    const claimsText = claims.map(c =>
      `[${c.id}] "${c.text}" (category: ${c.category}, verdict: ${c.verdict})${c.evidence.length > 0 ? `\n  Evidence: ${c.evidence.map(e => `${e.source}: "${e.snippet}"`).join('; ')}` : ''}${c.correction ? `\n  Correction: ${c.correction}` : ''}`
    ).join('\n\n')

    // Stage 2 runs on Gemini Flash (model policy: Claude only for the editorial polish).
    const { geminiText } = await import('@/lib/anthropic-client')
    const g = await geminiText({
      model: MODELS.geminiFlash,
      maxTokens: 2048,
      prompt: `${HAIKU_REVIEW_PROMPT}\n\nArticle type: ${articleType}\nCategory: ${category}\n\nClaims to review:\n${claimsText}`,
    })
    const data = { usage: { input_tokens: g.inputTokens, output_tokens: g.outputTokens } }
    const text = g.text

    logApiCall({
      callType: 'fact_check_stage2',
      model: MODELS.geminiFlash,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      articleId,
    })

    const parsed = JSON.parse(extractJSON(text) || text)
    const reviews: HaikuReview[] = (Array.isArray(parsed) ? parsed : parsed.reviews ?? []).map(
      (r: Record<string, unknown>) => ({
        claim_id: String(r.claim_id ?? ''),
        agrees_with_stage1: Boolean(r.agrees_with_stage1),
        confidence: String(r.confidence ?? 'medium') as 'high' | 'medium' | 'low',
        concerns: r.concerns ? String(r.concerns) : undefined,
      })
    )

    console.log(`[fact-check] Stage 2 complete: ${reviews.length} reviews, ${reviews.filter(r => !r.agrees_with_stage1).length} disagreements`)
    return reviews
  } catch (err) {
    console.error('[fact-check] Stage 2 error:', err)
    return []
  }
}

// ── Stage 3: GPT-4o-mini Independent Arbitration (conditional) ──────────────

const ARBITRATION_PROMPT = `You are an independent fact-check arbitrator. Two AI systems have reviewed claims from an article and disagree on some of them. Your job is to provide an independent assessment.

For each claim below, evaluate it purely on its merits. You have:
- The claim text
- Stage 1's verdict and evidence (from Google Search)
- Stage 2's review and concerns

Give your independent verdict: "verified", "flagged", or "insufficient".

Return ONLY valid JSON — an array:
[
  {
    "claim_id": "claim_001",
    "verdict": "verified",
    "reasoning": "The evidence from RTINGS.com is credible and recent"
  }
]`

async function stage3Arbitration(
  disputedClaims: VerifiedClaim[],
  haikuReviews: HaikuReview[],
  articleId?: string,
): Promise<ArbitrationResult[]> {
  if (disputedClaims.length === 0) return []

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('[fact-check] OPENAI_API_KEY not set — skipping Stage 3')
    return []
  }

  try {
    const claimsText = disputedClaims.map(c => {
      const review = haikuReviews.find(r => r.claim_id === c.id)
      return `[${c.id}] "${c.text}"
  Stage 1 verdict: ${c.verdict}${c.correction ? ` (correction: ${c.correction})` : ''}
  Evidence: ${c.evidence.map(e => `${e.source}: "${e.snippet}"`).join('; ') || 'none'}
  Stage 2: ${review ? `${review.agrees_with_stage1 ? 'agrees' : 'disagrees'} (${review.confidence})${review.concerns ? ` — "${review.concerns}"` : ''}` : 'no review'}`
    }).join('\n\n')

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODELS.gptMini,
        temperature: 0.1,
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `${ARBITRATION_PROMPT}\n\nClaims to arbitrate:\n${claimsText}`,
        }],
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      console.error('[fact-check] Stage 3 GPT error:', res.status)
      return []
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? ''

    logApiCall({
      callType: 'fact_check_stage3',
      model: MODELS.gptMini,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      articleId,
    })

    const parsed = JSON.parse(text)
    const results: ArbitrationResult[] = (Array.isArray(parsed) ? parsed : parsed.results ?? []).map(
      (r: Record<string, unknown>) => ({
        claim_id: String(r.claim_id ?? ''),
        verdict: String(r.verdict ?? 'insufficient') as 'verified' | 'flagged' | 'insufficient',
        reasoning: String(r.reasoning ?? ''),
      })
    )

    console.log(`[fact-check] Stage 3 complete: ${results.length} arbitrations`)
    return results
  } catch (err) {
    console.error('[fact-check] Stage 3 error:', err)
    return []
  }
}

// ── Consensus Logic ─────────────────────────────────────────────────────────

function determineFinalVerdict(
  claim: VerifiedClaim,
  review: HaikuReview | undefined,
  arbitration: ArbitrationResult | undefined,
): 'verified' | 'corrected' | 'softened' | 'insufficient' {
  // If claim was flagged by Stage 1 with a correction → corrected
  if (claim.verdict === 'flagged' && claim.correction) {
    // If Stage 2 disagrees (says it's fine), and Stage 3 agrees with Stage 2 → verified
    if (review && review.agrees_with_stage1 === false && arbitration?.verdict === 'verified') {
      return 'verified'
    }
    return 'corrected'
  }

  // If Stage 2 flags concerns on a verified claim
  if (claim.verdict === 'verified' && review && !review.agrees_with_stage1) {
    // Stage 3 decides
    if (arbitration) {
      if (arbitration.verdict === 'flagged') return 'softened'
      if (arbitration.verdict === 'insufficient') return 'insufficient'
      return 'verified'
    }
    // No Stage 3 — note the disagreement but trust Stage 1 (it has evidence)
    return review.confidence === 'high' ? 'softened' : 'verified'
  }

  // Stage 1 said insufficient
  if (claim.verdict === 'insufficient') return 'insufficient'

  // All agree or only Stage 1 ran
  return 'verified'
}

// ── Build Audit Trail ───────────────────────────────────────────────────────

function buildAudit(
  claims: VerifiedClaim[],
  haikuReviews: HaikuReview[],
  arbitrationResults: ArbitrationResult[],
  stagesRun: number,
): FactCheckAudit {
  const auditClaims: FactCheckAuditClaim[] = claims.map(claim => {
    const review = haikuReviews.find(r => r.claim_id === claim.id)
    const arbitration = arbitrationResults.find(a => a.claim_id === claim.id)
    const finalVerdict = determineFinalVerdict(claim, review, arbitration)

    let actionTaken: string | undefined
    if (finalVerdict === 'corrected') actionTaken = `Corrected: ${claim.correction}`
    else if (finalVerdict === 'softened') actionTaken = 'Claim softened due to credibility concerns'
    else if (finalVerdict === 'insufficient') actionTaken = 'Marked as unverifiable'

    return {
      id: claim.id,
      text: claim.text,
      category: claim.category,
      stage1_verdict: claim.verdict,
      stage1_evidence: claim.evidence,
      stage2_review: review ? {
        agrees: review.agrees_with_stage1,
        confidence: review.confidence,
        concerns: review.concerns,
      } : undefined,
      stage3_arbitration: arbitration ? {
        verdict: arbitration.verdict,
        reasoning: arbitration.reasoning,
      } : undefined,
      final_verdict: finalVerdict,
      action_taken: actionTaken,
    }
  })

  const summary = {
    verified: auditClaims.filter(c => c.final_verdict === 'verified').length,
    corrected: auditClaims.filter(c => c.final_verdict === 'corrected').length,
    softened: auditClaims.filter(c => c.final_verdict === 'softened').length,
    insufficient: auditClaims.filter(c => c.final_verdict === 'insufficient').length,
    disagreements: haikuReviews.filter(r => !r.agrees_with_stage1).length,
    stages_run: stagesRun,
  }

  return {
    timestamp: new Date().toISOString(),
    total_claims: claims.length,
    stages_run: stagesRun,
    claims: auditClaims,
    summary,
  }
}

// ── Main Orchestrator ───────────────────────────────────────────────────────

const HIGH_RISK_CATEGORIES = ['health_fitness', 'finance', 'current_affairs', 'science']

/**
 * Run the triple fact-check pipeline:
 *   Stage 1: Gemini + Google Search (always)
 *   Stage 2: Haiku credibility review (always)
 *   Stage 3: GPT-4o-mini arbitration (conditional — disagreements or high-risk)
 *
 * Returns both the legacy FactCheckResult (backward compat) and the full FactCheckAudit.
 */
export async function runTripleFactCheck(
  article: ArticleContent,
  articleType: string,
  category: string,
  articleId?: string,
): Promise<{ factCheck: FactCheckResult; audit: FactCheckAudit }> {
  console.log(`[fact-check] Starting triple fact-check for: ${article.title.slice(0, 60)} (type: ${articleType}, category: ${category})`)

  // Stage 1: Gemini + Google Search
  const stage1 = await stage1GeminiVerification(article, articleId)

  // Stage 2: Haiku review (always runs)
  const stage2 = await stage2HaikuReview(stage1.claims, articleType, category, articleId)

  // Stage 3: Conditional
  const isHighRisk = HIGH_RISK_CATEGORIES.includes(category)
  const hasDisagreements = stage2.some(r => !r.agrees_with_stage1)

  let stage3: ArbitrationResult[] = []
  let stagesRun = 2

  if (hasDisagreements || isHighRisk) {
    stagesRun = 3
    const claimsForArbitration = hasDisagreements
      ? stage1.claims.filter(c => stage2.find(r => r.claim_id === c.id && !r.agrees_with_stage1))
      : stage1.claims // all claims for high-risk categories
    stage3 = await stage3Arbitration(claimsForArbitration, stage2, articleId)
  }

  // Build audit
  const audit = buildAudit(stage1.claims, stage2, stage3, stagesRun)

  console.log(`[fact-check] Triple fact-check complete: ${audit.total_claims} claims, ${stagesRun} stages, ${audit.summary.corrected} corrected, ${audit.summary.disagreements} disagreements`)

  return { factCheck: stage1.corrections, audit }
}

/**
 * Legacy wrapper — keeps backward compat for code that calls runFactCheck().
 */
export async function runFactCheck(article: ArticleContent): Promise<FactCheckResult> {
  const { factCheck } = await runTripleFactCheck(article, article.article_type ?? '', '')
  return factCheck
}

/**
 * Apply fact-check corrections to an article.
 * Only applies "critical" and "minor" severity issues.
 * Returns the corrected article.
 */
/**
 * Sanitise a correction string: strip instructional prefixes so the
 * correction reads as natural prose that can replace the original claim.
 */
function sanitiseCorrection(correction: string): string {
  if (!correction) return correction

  // Strip common instructional prefixes the model sometimes generates
  const instructionalPrefixes = [
    /^update\s+the\s+claim\s+to\s+(reflect|say|read|state|indicate)\s+/i,
    /^change\s+(this\s+)?to\s+(reflect|say|read|state)\s+/i,
    /^correct\s+this\s+to\s+(say|read|state|reflect)\s+/i,
    /^clarify\s+that\s+/i,
    /^should\s+(be\s+)?(updated|changed|corrected)\s+to\s+(say|read|reflect|state)?\s*/i,
    /^(price|this)\s+should\s+be\s+(updated|changed|corrected)\s+to\s+/i,
    /^replace\s+with\s+/i,
    /^revise\s+to\s+(say|read|reflect|state)\s+/i,
    /^modify\s+to\s+(say|read|reflect|state)\s+/i,
  ]

  let result = correction
  for (const prefix of instructionalPrefixes) {
    result = result.replace(prefix, '')
  }

  // Strip surrounding quotes that wrapping the actual correction
  result = result.replace(/^["']+|["']+$/g, '').trim()

  // If stripping emptied the string, return original
  return result || correction
}

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

    // Sanitise the correction text to remove instructional prefixes
    issue.correction = sanitiseCorrection(issue.correction)

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
              const correctionText = issue.correction || issue.finding
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
