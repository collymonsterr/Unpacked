/**
 * Editorial Pass (Session 1.7C)
 *
 * Lightweight quality check after the prose writing pass.
 * Scores the article 0-100, flags issues, and optionally rewrites weak sections.
 *
 * Uses Gemini Flash — short prompt, ~3-15 seconds depending on whether rewrites are needed.
 * Skipped for breaking_news articles.
 * If the call fails entirely, returns a passing score — never blocks article delivery.
 */

import type { ArticleContent, ArticleBlueprint, EntityCard, EditorResult, EditorIssue } from '@/types/article'
import { FORBIDDEN_PHRASES } from '@/lib/editorial-rules'
import { extractJSON } from '@/lib/utils/extract-json'
import { logApiCall } from '@/lib/api-usage'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

/**
 * Run the editorial quality pass on a completed article.
 *
 * Returns a score and optional rewrites. If the call fails, returns
 * a passing score so the article is not blocked.
 */
export async function runEditorialPass(
  article: ArticleContent,
  blueprint: ArticleBlueprint,
  entityCards: EntityCard[],
): Promise<EditorResult> {
  try {
    return await callEditorModel(article, blueprint, entityCards)
  } catch (err) {
    console.warn('[editorial-pass] Failed — returning pass score:', (err as Error).message)
    return { score: 85, issues: [], rewrites: {} }
  }
}

/**
 * Apply editor rewrites to an article's sections.
 * Modifies the article in place.
 */
export function applyEditorRewrites(article: ArticleContent, result: EditorResult): void {
  // Replace section content for flagged sections
  for (const [sectionIdx, newContent] of Object.entries(result.rewrites)) {
    const idx = parseInt(sectionIdx, 10)
    if (isNaN(idx) || idx < 0 || idx >= article.sections.length) continue

    const section = article.sections[idx]
    if ('content' in section && typeof section.content === 'string') {
      (section as { content: string }).content = newContent
    }
    if ('opinion' in section && typeof section.opinion === 'string') {
      (section as { opinion: string }).opinion = newContent
    }
  }

  // Replace verdict if rewritten
  if (result.verdict_rewrite && article.quick_verdict) {
    article.quick_verdict.one_liner = result.verdict_rewrite
  }
}

async function callEditorModel(
  article: ArticleContent,
  blueprint: ArticleBlueprint,
  entityCards: EntityCard[],
): Promise<EditorResult> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not set')

  // Build a compact representation of the article text
  const sectionTexts = article.sections.map((s, i) => {
    const heading = 'heading' in s ? (s as { heading: string }).heading : `Section ${i}`
    let text = ''
    if ('content' in s && typeof s.content === 'string') text = s.content
    if ('opinion' in s && typeof s.opinion === 'string') text = s.opinion
    if ('consensus_summary' in s) text = (s as { consensus_summary: string }).consensus_summary
    return `[${i}] ## ${heading}\n${text.slice(0, 500)}`
  }).filter(t => t.length > 20).join('\n\n')

  const verdictText = article.quick_verdict?.one_liner ?? ''
  const blueprintVerdict = blueprint.verdict_statement

  // Sample forbidden phrases for the prompt
  const forbiddenSample = FORBIDDEN_PHRASES.slice(0, 25).join('", "')

  const prompt = `You are a senior editor reviewing an article before publication. Score it and flag issues.

ARTICLE TITLE: ${article.title}
ARTICLE TYPE: ${article.article_type}

VERDICT (from article): "${verdictText}"
EXPECTED VERDICT (from blueprint): "${blueprintVerdict}"

ARTICLE SECTIONS:
${sectionTexts}

CHECK FOR THESE ISSUES:
1. HEDGING — "might", "could potentially", "it's possible that", "some people think" when a stronger claim is warranted. Acceptable when genuine uncertainty exists (future predictions, contested science).
2. AI-TELL PHRASES — any of these: "${forbiddenSample}". Flag every instance.
3. WEAK VERDICT — does the verdict take a clear position? Does it match the blueprint's intended verdict?
4. FILLER — sections that restate the same point without adding new information.
5. MISSING ATTRIBUTION — claims about specific prices, stats, or performance that should cite a source but don't.

SCORING:
- 90-100: Excellent. Decisive, well-sourced, no AI-tell phrases.
- 80-89: Good. Minor issues only. Publishable as-is.
- 70-79: Needs work. Some hedging or weak sections.
- Below 70: Significant issues. Multiple sections need rewriting.

If the score is 80 or below, provide rewritten versions of the worst sections. Reference sections by their index number [0], [1], etc.

Return ONLY valid JSON:
{
  "score": 85,
  "issues": [
    {
      "section_id": "0",
      "issue_type": "hedging|ai_phrase|weak_verdict|filler|missing_attribution",
      "description": "string — what the issue is",
      "severity": "low|medium|high"
    }
  ],
  "rewrites": {"0": "rewritten section text — only include if score <= 80"},
  "verdict_rewrite": "rewritten verdict text — only if verdict is weak, otherwise omit"
}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 45_000)

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      }),
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`)
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty response from Gemini')

    // Log usage
    try {
      logApiCall({
        callType: 'editorial_pass',
        model: 'gemini-2.5-flash',
        inputTokens: Math.round(prompt.length / 3.8),
        outputTokens: Math.round(text.length / 3.8),
      })
    } catch { /* non-critical */ }

    const parsed = JSON.parse(extractJSON(text))

    return normaliseEditorResult(parsed)
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

function normaliseEditorResult(raw: Record<string, unknown>): EditorResult {
  const score = typeof raw.score === 'number' ? raw.score : 85

  const issues: EditorIssue[] = Array.isArray(raw.issues)
    ? (raw.issues as Record<string, unknown>[]).map(i => ({
        section_id: String(i.section_id ?? ''),
        issue_type: (i.issue_type as EditorIssue['issue_type']) || 'hedging',
        description: String(i.description ?? ''),
        severity: (i.severity as EditorIssue['severity']) || 'low',
      }))
    : []

  const rewrites: Record<string, string> = {}
  if (raw.rewrites && typeof raw.rewrites === 'object') {
    for (const [k, v] of Object.entries(raw.rewrites as Record<string, unknown>)) {
      if (typeof v === 'string' && v.length > 0) {
        rewrites[k] = v
      }
    }
  }

  const verdict_rewrite = typeof raw.verdict_rewrite === 'string' && raw.verdict_rewrite.length > 0
    ? raw.verdict_rewrite
    : undefined

  return { score, issues, rewrites, verdict_rewrite }
}
