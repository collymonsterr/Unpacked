/**
 * Vision-based image selection.
 *
 * Replicates the final step a human takes when sourcing an image: after
 * Google Images returns a grid of candidates, a person visually scans them
 * and picks the single best one. We do the same — send the candidate
 * thumbnails to a vision model and let it choose, instead of blindly taking
 * the first URL that passes a regex.
 *
 * Primary: Claude Haiku 4.5 (vision). Fallback: GPT-4o-mini (vision).
 * Final fallback: the top-ranked candidate (candidates[0]).
 *
 * Thumbnails (not full-res originals) are sent to the model — they're small,
 * fast, reliably fetchable (Google CDN), and cheaper to process.
 */

import type AnthropicSDK from '@anthropic-ai/sdk'
import type { ImageCandidate } from '@/lib/image-router'
import { MODELS } from '@/lib/models'

const HAIKU_MODEL = MODELS.haiku
const MAX_CANDIDATES = 10

interface SelectionResult {
  index: number // 1-based; 0 means "none acceptable"
  reason?: string
}

function buildInstruction(subject: string, context: string | undefined, n: number): string {
  return `You are a senior photo editor choosing the single best image for an editorial article.

The article is about: ${subject}${context ? `\nContext: ${context}` : ''}

Below are ${n} candidate images, numbered 1 to ${n}. Pick the ONE best image for the hero/lead slot.

Choose the image that:
- Clearly and accurately shows the actual subject above (the real product/person/place/thing — not a lookalike, not an unrelated stock concept)
- Looks like a real, sharp, high-quality photograph
- Has NO text overlay, watermark, logo, infographic, chart, collage, or screenshot framing
- Is suitable as a wide editorial hero image

Reject images that are off-topic, low quality, watermarked, text-heavy, collages, or the wrong subject.

Respond with ONLY a JSON object, no prose:
{"index": <number 1-${n}, or 0 if none are acceptable>, "reason": "<short reason>"}`
}

function parseSelection(text: string, n: number): SelectionResult | null {
  if (!text) return null
  // Pull the first {...} block out of the response.
  const match = text.match(/\{[\s\S]*\}/)
  const raw = match ? match[0] : text
  try {
    const parsed = JSON.parse(raw) as { index?: unknown; reason?: unknown }
    const idx = Number(parsed.index)
    if (Number.isInteger(idx) && idx >= 0 && idx <= n) {
      return { index: idx, reason: typeof parsed.reason === 'string' ? parsed.reason : undefined }
    }
  } catch {
    // Fall through to a looser numeric parse.
  }
  const numMatch = raw.match(/\d+/)
  if (numMatch) {
    const idx = Number(numMatch[0])
    if (idx >= 0 && idx <= n) return { index: idx }
  }
  return null
}

async function logUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
  articleId?: string,
): Promise<void> {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const db = getSupabaseAdmin()
    await db.from('api_usage_log').insert({
      call_type: 'image_selection',
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      article_id: articleId ?? null,
    })
  } catch {
    // Non-critical.
  }
}

async function selectWithHaiku(
  thumbs: string[],
  subject: string,
  context: string | undefined,
  articleId?: string,
): Promise<SelectionResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  // Vision requests don't fall back (the wrapper rethrows image-bearing calls and
  // the caller degrades to the first candidate) — wrapped for consistency.
  const { createAnthropic } = await import('@/lib/anthropic-client')
  const anthropic = createAnthropic({ apiKey, maxRetries: 1, timeout: 20_000 })

  const content: AnthropicSDK.MessageParam['content'] = [
    { type: 'text', text: buildInstruction(subject, context, thumbs.length) },
  ]
  thumbs.forEach((url, i) => {
    content.push({ type: 'text', text: `Image ${i + 1}:` })
    content.push({ type: 'image', source: { type: 'url', url } })
  })

  const message = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 150,
    messages: [{ role: 'user', content }],
  })

  await logUsage(
    HAIKU_MODEL,
    message.usage?.input_tokens ?? 0,
    message.usage?.output_tokens ?? 0,
    articleId,
  )

  const text = message.content.find(b => b.type === 'text')?.text ?? ''
  return parseSelection(text, thumbs.length)
}

/**
 * Pick the best image from a candidate list using a vision model.
 * Always returns a candidate when the list is non-empty (never null unless empty),
 * falling back to the top-ranked candidate if the model can't decide.
 */
export async function selectBestImage(
  candidates: ImageCandidate[],
  subject: string,
  context?: string,
  articleId?: string,
): Promise<ImageCandidate | null> {
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]

  const pool = candidates.slice(0, MAX_CANDIDATES)
  const thumbs = pool.map(c => c.thumbnail || c.url)

  try {
    // Haiku 4.5 vision picks the best; on any failure we fall through to the
    // top-ranked candidate below. (No OpenAI fallback — kept off the image path.)
    const result = await selectWithHaiku(thumbs, subject, context, articleId).catch(() => null)

    if (result && result.index >= 1 && result.index <= pool.length) {
      const chosen = pool[result.index - 1]
      console.log(
        `[image-selector] Picked #${result.index}/${pool.length} for "${subject.slice(0, 40)}"` +
        (result.reason ? ` — ${result.reason.slice(0, 60)}` : ''),
      )
      return chosen
    }

    if (result && result.index === 0) {
      // Model judged none acceptable — fall back to top-ranked candidate.
      console.log(`[image-selector] Model rejected all candidates for "${subject.slice(0, 40)}" — using top rank`)
    }
  } catch (err) {
    console.warn(`[image-selector] Selection failed: ${(err as Error).message}`)
  }

  return candidates[0]
}
