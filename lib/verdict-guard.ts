/**
 * Verdict Guard
 *
 * Code-level enforcement of "every article reaches a clear verdict".
 * Runs after the editorial pass, before the article is saved.
 *
 * checkVerdict() is a pure check on article.quick_verdict. On failure,
 * runVerdictGuard() makes exactly ONE cheap Gemini Flash call to rewrite the
 * quick_verdict object only, re-checks it, and swaps it in if it passes.
 * If the repair fails or errors the original verdict is kept and the article
 * is flagged — the guard never blocks delivery.
 */

import type { ArticleContent, QuickVerdict } from '@/types/article'
import { ARTICLE_TYPES, type ArticleType } from '@/lib/article-types'
import { FORBIDDEN_PHRASES } from '@/lib/editorial-rules'
import { extractJSON } from '@/lib/utils/extract-json'
import { logApiCall } from '@/lib/api-usage'
import { MODELS, GEMINI_FLASH_URL } from '@/lib/models'

// ── Types ──

export interface VerdictCheck {
  ok: boolean
  reasons: string[]
}

export interface VerdictGuardResult {
  status: 'pass' | 'repaired' | 'flagged' | 'error'
  reasons: string[]
}

interface VerdictGuardOptions {
  articleId?: string
  /** Blueprint's named winner (ArticleBlueprint.winner) — null when the blueprint picked none */
  winner?: string | null
  /** Blueprint's planned verdict (ArticleBlueprint.verdict_statement) — repair context only */
  verdictStatement?: string
}

// ── Rules ──

const MIN_ONE_LINER_CHARS = 20
const MIN_ONE_LINER_WORDS = 4

// Hedging entries already banned article-wide, plus the shorter verdict-specific
// forms. A verdict is one or two sentences, so the bare stems are safe to ban here
// in a way they would not be across a whole article.
const HEDGE_MARKERS = /\b(depends|both are|ultimately|many great options)\b/
const HEDGING_PHRASES: string[] = [
  ...FORBIDDEN_PHRASES.filter(p => HEDGE_MARKERS.test(p)),
  'it depends',
  'both are excellent',
  'ultimately',
  'depends on your needs',
  'no clear winner',
  'there is no right answer',
]

const WINNER_STOPWORDS = new Set(['the', 'and', 'for', 'with', 'from', 'pro', 'max', 'plus', 'new'])

function normalise(text: string): string {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim()
}

function containsPhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`).test(text)
}

/** Every string a reader sees in the verdict box, normalised for matching. */
function verdictText(verdict: QuickVerdict): string {
  const parts: unknown[] = [verdict.one_liner, verdict.recommendation, ...(Array.isArray(verdict.bullets) ? verdict.bullets : [])]
  return normalise(parts.filter((p): p is string => typeof p === 'string').join(' \n '))
}

/** Distinctive words of the winner's name — any one appearing in the verdict counts as naming it. */
function winnerTokens(winner: string): string[] {
  return normalise(winner)
    .split(/[^a-z0-9]+/)
    .filter(tok => (tok.length >= 3 || /\d/.test(tok)) && !WINNER_STOPWORDS.has(tok))
}

// ── Check (pure) ──

/**
 * Check that an article's quick_verdict is present, substantial and decisive.
 *
 * `winner` is the blueprint's named winner. QuickVerdict itself has no winner
 * field, so for verdict-required types the check is that the verdict text
 * actually names the winner the blueprint committed to.
 */
export function checkVerdict(
  article: ArticleContent,
  articleType: string,
  winner?: string | null,
): VerdictCheck {
  const reasons: string[] = []
  const verdict = article.quick_verdict as QuickVerdict | null | undefined

  if (!verdict || typeof verdict !== 'object') {
    return { ok: false, reasons: ['quick_verdict is missing'] }
  }

  const oneLiner = typeof verdict.one_liner === 'string' ? verdict.one_liner.trim() : ''
  if (!oneLiner) {
    reasons.push('quick_verdict.one_liner is empty')
  } else if (oneLiner.length < MIN_ONE_LINER_CHARS || oneLiner.split(/\s+/).length < MIN_ONE_LINER_WORDS) {
    reasons.push(`quick_verdict.one_liner is too short to be a verdict ("${oneLiner}")`)
  }

  const text = verdictText(verdict)
  const hedges = HEDGING_PHRASES.filter(p => containsPhrase(text, p))
  // Report the shortest form only — "it depends" rather than that plus its longer variants
  const distinctHedges = [...new Set(hedges)].filter(p => !hedges.some(q => q !== p && p.includes(q)))
  if (distinctHedges.length > 0) {
    reasons.push(`quick_verdict hedges: "${distinctHedges.join('", "')}"`)
  }

  const typeConfig = ARTICLE_TYPES[articleType as ArticleType]
  if (typeConfig?.verdictRequired && winner) {
    const tokens = winnerTokens(winner)
    if (tokens.length > 0 && !tokens.some(tok => containsPhrase(text, tok))) {
      reasons.push(`quick_verdict does not name the winner ("${winner}")`)
    }
  }

  return { ok: reasons.length === 0, reasons }
}

// ── Repair (one Gemini Flash call) ──

function buildArticleContext(article: ArticleContent): string {
  const parts: string[] = [`TITLE: ${article.title}`]

  const summary = article.executive_summary
  if (summary?.short_answer) parts.push(`SHORT ANSWER: ${summary.short_answer}`)
  if (summary?.key_takeaways?.length) parts.push(`KEY TAKEAWAYS: ${summary.key_takeaways.join('; ')}`)

  for (const [i, s] of (article.sections ?? []).entries()) {
    const heading = 'heading' in s ? (s as { heading: string }).heading : `Section ${i}`
    let text = ''
    if ('content' in s && typeof s.content === 'string') text = s.content
    if ('opinion' in s && typeof s.opinion === 'string') text = s.opinion
    if ('consensus_summary' in s) text = (s as { consensus_summary: string }).consensus_summary
    if ('verdict' in s && typeof s.verdict === 'string') text += ` Verdict: ${s.verdict}`
    if (text.length > 20) parts.push(`## ${heading}\n${text.slice(0, 400)}`)
  }

  // Cap to keep the repair call cheap
  return parts.join('\n\n').slice(0, 8000)
}

function buildRepairPrompt(
  article: ArticleContent,
  articleType: string,
  reasons: string[],
  opts: VerdictGuardOptions,
): string {
  const typeConfig = ARTICLE_TYPES[articleType as ArticleType]

  return `You are the verdict editor for Unpacked, an opinionated editorial publication. Every article must reach a clear verdict. This article's quick verdict failed that check. Rewrite ONLY the quick_verdict object.

WHY IT FAILED:
${reasons.map(r => `- ${r}`).join('\n')}

CURRENT quick_verdict:
${JSON.stringify(article.quick_verdict ?? null)}

ARTICLE TYPE: ${articleType}${typeConfig ? ` (verdict style: ${typeConfig.verdictStyle})` : ''}
${opts.verdictStatement ? `PLANNED VERDICT: ${opts.verdictStatement}\n` : ''}${opts.winner ? `PLANNED WINNER: ${opts.winner} — name it in the verdict, unless the article below clearly argues for a different winner, in which case name that one.\n` : ''}
ARTICLE CONTENT:
${buildArticleContext(article)}

RULES:
- Ground the verdict strictly in the article content above. Do not introduce any fact, number, price, product or claim that is not already in the article.
- Take one clear position. Name the winner, the recommendation or the conclusion outright.
- No hedging. Never write: "${HEDGING_PHRASES.join('", "')}".
- one_liner: a single decisive sentence, 10-30 words.
- bullets: 3-4 standalone takeaways, each under 15 words.
- Keep the article's voice: confident, plain, specific.

Return ONLY valid JSON in exactly this shape, no markdown fences:
{ "bullets": ["string"], "one_liner": "string" }`
}

/**
 * Ask Gemini Flash for a decisive replacement quick_verdict.
 * Throws on any API, timeout or parse failure — the caller decides what that means.
 */
async function repairVerdict(
  article: ArticleContent,
  articleType: string,
  reasons: string[],
  opts: VerdictGuardOptions,
): Promise<QuickVerdict> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not set')

  const prompt = buildRepairPrompt(article, articleType, reasons, opts)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20_000)

  try {
    const res = await fetch(`${GEMINI_FLASH_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`)
    }

    const data = await res.json()
    const parts = data.candidates?.[0]?.content?.parts ?? []
    const textParts = parts.filter((p: { thought?: boolean; text?: string }) => !p.thought && p.text)
    const text = textParts.length > 0 ? textParts[textParts.length - 1].text : null
    if (!text) throw new Error('Empty response from Gemini')

    try {
      logApiCall({
        callType: 'verdict_guard',
        model: MODELS.geminiFlash,
        inputTokens: Math.round(prompt.length / 3.8),
        outputTokens: Math.round(text.length / 3.8),
        articleId: opts.articleId,
      })
    } catch { /* non-critical */ }

    const raw = JSON.parse(extractJSON(text)) as Record<string, unknown>
    const bullets = Array.isArray(raw.bullets)
      ? raw.bullets.filter((b): b is string => typeof b === 'string' && b.trim().length > 0).map(b => b.trim())
      : []

    return {
      ...(bullets.length > 0 ? { bullets } : {}),
      one_liner: typeof raw.one_liner === 'string' ? raw.one_liner.trim() : '',
    }
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

// ── Public API ──

/**
 * Check the article's verdict and repair it once if it fails.
 * Mutates article.quick_verdict only when a repair passes the re-check.
 *
 * - pass: verdict was already decisive
 * - repaired: failed, the rewrite passed and replaced it (reasons = why the original failed)
 * - flagged: failed and the rewrite failed too or the call errored — original kept
 */
export async function runVerdictGuard(
  article: ArticleContent,
  articleType: string,
  opts: VerdictGuardOptions = {},
): Promise<VerdictGuardResult> {
  const initial = checkVerdict(article, articleType, opts.winner)
  if (initial.ok) return { status: 'pass', reasons: [] }

  console.log(`[verdict-guard] Verdict failed (${initial.reasons.join('; ')}) — attempting repair`)

  let repaired: QuickVerdict
  try {
    repaired = await repairVerdict(article, articleType, initial.reasons, opts)
  } catch (err) {
    const message = (err as Error).message
    console.warn('[verdict-guard] Repair call failed — keeping original verdict:', message)
    return { status: 'flagged', reasons: [...initial.reasons, `repair call failed: ${message}`] }
  }

  const recheck = checkVerdict({ ...article, quick_verdict: repaired }, articleType, opts.winner)
  if (!recheck.ok) {
    console.warn(`[verdict-guard] Repair still fails (${recheck.reasons.join('; ')}) — keeping original verdict`)
    return { status: 'flagged', reasons: [...initial.reasons, ...recheck.reasons.map(r => `after repair: ${r}`)] }
  }

  article.quick_verdict = repaired
  console.log(`[verdict-guard] Verdict repaired: "${repaired.one_liner.slice(0, 80)}"`)
  return { status: 'repaired', reasons: initial.reasons }
}
