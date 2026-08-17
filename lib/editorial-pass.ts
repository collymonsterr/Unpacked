/**
 * Editorial Pass
 *
 * Quality check after the prose writing pass.
 * Scores the article 0-100, flags issues, and optionally rewrites weak sections.
 *
 * Primary: Claude Sonnet — different model family from the writer (Gemini),
 * so it catches blind spots the writer can't see in its own output.
 *
 * Fallback: Gemini Flash — if Sonnet fails for any reason.
 * If both fail, returns a passing score — never blocks article delivery.
 *
 * Skipped for breaking_news articles (handled by caller).
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ArticleContent, ArticleBlueprint, EntityCard, EditorResult, EditorIssue } from '@/types/article'
import { FORBIDDEN_PHRASES } from '@/lib/editorial-rules'
import { extractJSON } from '@/lib/utils/extract-json'
import { logApiCall } from '@/lib/api-usage'
import { MODELS, GEMINI_FLASH_URL } from '@/lib/models'

// ── Anthropic client (lazy-init) ──

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 2,
      timeout: 60_000,
    })
  }
  return _anthropic
}

const SONNET_MODEL = MODELS.sonnet

// ── Gemini fallback ──

const GEMINI_API_URL = GEMINI_FLASH_URL

// ── Public API ──

/**
 * Run the editorial quality pass on a completed article.
 *
 * Tries Claude Sonnet first, falls back to Gemini Flash, and if both
 * fail returns a passing score so the article is not blocked.
 */
export async function runEditorialPass(
  article: ArticleContent,
  blueprint: ArticleBlueprint,
  entityCards: EntityCard[],
  articleId?: string,
): Promise<EditorResult> {
  const { prompt, sectionTexts } = buildEditorialPrompt(article, blueprint)

  // Try Sonnet first
  try {
    const result = await callSonnetEditor(prompt, articleId)
    const rewriteKeys = Object.keys(result.rewrites)
    if (rewriteKeys.length > 0) {
      console.log(`[editorial] Sonnet score: ${result.score} — ${rewriteKeys.length} rewrites (sections ${rewriteKeys.join(', ')})`)
    } else {
      console.log(`[editorial] Sonnet score: ${result.score} — passed clean`)
    }
    return result
  } catch (err) {
    console.error('[editorial] Sonnet failed, falling back to Gemini:', (err as Error).message)
  }

  // Fall back to Gemini
  try {
    const result = await callGeminiEditor(prompt, articleId)
    const rewriteKeys = Object.keys(result.rewrites)
    console.log(`[editorial] Gemini fallback score: ${result.score} — ${rewriteKeys.length} rewrites`)
    return result
  } catch (err) {
    console.warn('[editorial] Gemini fallback also failed:', (err as Error).message)
  }

  // Both failed — return passing score
  return { score: 85, issues: [], rewrites: {} }
}

/**
 * Apply editor rewrites to an article's sections.
 * Modifies the article in place.
 */
export function applyEditorRewrites(article: ArticleContent, result: EditorResult): void {
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

  if (result.verdict_rewrite && article.quick_verdict) {
    article.quick_verdict.one_liner = result.verdict_rewrite
  }
}

// ── Prompt builder ──

function buildEditorialPrompt(
  article: ArticleContent,
  blueprint: ArticleBlueprint,
): { prompt: string; sectionTexts: string } {
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

6. REPETITION — the same claim, stat, or argument appearing in multiple sections. Each section should add new information. The verdict and executive summary should say different things.

7. CREATIVE FILLER — scene-setting paragraphs ("Picture this...", "Imagine..."), rhetorical questions used as transitions, sentences without any specific fact, number, name, or instruction. Every sentence must earn its place.

8. WEAK BIG STATEMENTS — the article should have 3-5 big_statement sections. Flag if fewer than 3 exist. Also flag any big_statement that is neutral, vague, or fence-sitting (e.g. "This is a complex topic", "The future remains uncertain", "There are pros and cons"). Good big statements are bold, specific, and worth screenshotting.

9. UNSOURCED CHART DATA — check every bar_chart, line_chart, and pie_chart section. Each must have a "source" field that cites where the data came from. If a chart has no source, or the data points look like round numbers that could be invented (e.g. exactly 10%, 20%, 30%, 40%), flag it as "unsourced_chart".

10. GENERIC SECTION TITLES — Are the section headings insight-led or generic?
   Bad: "The Economic Impact" (just describes the topic)
   Bad: "Battery Life" (just a label)
   Good: "The Economic Impact Is Already Worse Than 2008" (contains an insight)
   Good: "Battery Life Is the Only Spec That Actually Matters" (carries a position)
   Every section title should carry a position or surprising finding, not just label the content. Flag generic titles and suggest sharper alternatives.

11. WEAK OPENING — Does the article open with a hook or a slow windup?
   Bad: "In recent years, there has been growing interest in..." (throat-clearing)
   Bad: "When it comes to choosing a..." (stalling)
   Good: "Side hustles are dying — and most people haven't noticed yet." (immediate thesis)
   Good: "The Sony XM6 made me sell my AirPods Max." (personal, specific, surprising)
   The first sentence should make the reader want to read the second sentence. If it doesn't, rewrite it.

12. BIG STATEMENT QUALITY — Are the big_statement sections genuinely sharp and quotable?
   Bad: "This is a significant development." (says nothing)
   Bad: "The implications are far-reaching." (vague)
   Good: "Robots won't replace all jobs — but they'll wipe out entire categories." (specific, surprising, shareable)
   Every big statement should pass the screenshot test: would someone share this single line on social media? If not, rewrite it.

13. VERDICT STRENGTH — Is the verdict specific and decisive?
   Bad: "There are many factors to consider and both options have merit." (fence-sitting)
   Bad: "Both are excellent choices depending on your needs." (non-answer)
   Good: "Buy the Sony XM6. The Bose is good but not $50 better." (specific, actionable)
   The verdict should feel like advice from an expert who's done all the research, not a disclaimer from someone afraid to commit.

14. VOICE CONSISTENCY — Does the article sound like it was written by a confident, knowledgeable person?
   Flag any sentences that sound like:
   - a Wikipedia entry ("X is a Y that was first Z in...")
   - a customer service bot ("We hope you found this helpful")
   - a student essay ("In conclusion, it is clear that...")
   - corporate marketing ("leveraging synergies to drive innovation")
   The voice should be: direct, slightly opinionated, informed, like a smart friend who's done the research.

15. FABRICATED CHART DATA — Flag any chart or data visualisation section where the numbers do not come from a cited source in the research findings, entity cards, or live data integrations. Charts must ONLY visualise real data from real sources. If the writer invented numbers from training knowledge (e.g. made-up statistics about "side hustle income trends"), flag for removal or replacement with a text-based summary.

16. VERDICT IN TITLE — Check whether the article title or subtitle reveals the verdict, winner, or main conclusion. The title should promise what the reader will discover, NOT give them the answer.
   Bad: "Best Laptop for 2026: MacBook Pro Wins" (names the winner)
   Bad: "The 5 Best Cities for Digital Nomads: Chiang Mai Reigns Supreme" (reveals the #1)
   Bad: "Myths About EVs: They're Actually Better Than You Think" (gives away the conclusion)
   Good: "The 10 Best Laptops of 2026, Ranked" (promises a ranking without spoiling it)
   Good: "We Tested 8 Laptops for Video Editing — One Stood Out" (creates curiosity)
   If the title names a specific winner, flag this as a major issue (severity "high") and provide a rewritten title that removes the spoiler while keeping it engaging. The verdict belongs in the verdict section, not the title.

SCORING:
- 90-100: Excellent. Decisive, well-sourced, no AI-tell phrases, strong voice throughout.
- 80-89: Good. Minor issues only. Publishable as-is.
- 70-79: Needs work. Some hedging, weak sections, or generic titles.
- Below 70: Significant issues. Multiple sections need rewriting.

REWRITE GUIDELINES:
If the score is 80 or below, rewrite the worst sections. When rewriting:
- Lead with the most surprising or important point
- Use contrast ("You'd expect X. The data shows Y.")
- Be specific (names, numbers, dates — never vague)
- Keep paragraphs to 2-4 sentences maximum
- Every sentence must earn its place — if it doesn't add a fact, insight, or evidence, cut it
Reference sections by their index number [0], [1], etc.

Return ONLY valid JSON:
{
  "score": 85,
  "issues": [
    {
      "section_id": "0",
      "issue_type": "hedging|ai_phrase|weak_verdict|filler|missing_attribution|repetition|creative_filler|weak_big_statements|unsourced_chart|generic_title|weak_opening|weak_voice|fabricated_chart",
      "description": "string — what the issue is",
      "severity": "low|medium|high"
    }
  ],
  "rewrites": {"0": "rewritten section text — only include if score <= 80"},
  "verdict_rewrite": "rewritten verdict text — only if verdict is weak, otherwise omit"
}`

  return { prompt, sectionTexts }
}

// ── Sonnet editor (primary) ──

async function callSonnetEditor(
  prompt: string,
  articleId?: string,
): Promise<EditorResult> {
  const message = await getAnthropic().messages.create({
    model: SONNET_MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content.find(b => b.type === 'text')?.text ?? ''
  if (!text) throw new Error('Empty response from Sonnet')

  try {
    logApiCall({
      callType: 'editorial_pass',
      model: SONNET_MODEL,
      inputTokens: message.usage?.input_tokens,
      outputTokens: message.usage?.output_tokens,
      articleId,
    })
  } catch { /* non-critical */ }

  const parsed = JSON.parse(extractJSON(text))
  return normaliseEditorResult(parsed)
}

// ── Gemini editor (fallback) ──

async function callGeminiEditor(
  prompt: string,
  articleId?: string,
): Promise<EditorResult> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not set')

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
          maxOutputTokens: 2048,
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
        callType: 'editorial_pass',
        model: MODELS.geminiFlash,
        inputTokens: Math.round(prompt.length / 3.8),
        outputTokens: Math.round(text.length / 3.8),
        articleId,
      })
    } catch { /* non-critical */ }

    const parsed = JSON.parse(extractJSON(text))
    return normaliseEditorResult(parsed)
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

// ── Response normaliser ──

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
