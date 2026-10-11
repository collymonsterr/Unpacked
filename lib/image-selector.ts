/**
 * Vision-based image verification and selection (Gemini).
 *
 * Replicates what a photo editor does with a grid of search results: look at
 * every candidate, reject anything that isn't actually the subject (a Samsung
 * foldable in an "Apple foldable" article, a stock lookalike, a collage,
 * a watermarked or text-heavy image), then pick the best of what's left.
 *
 * Model policy (Oct 2026): runs on Gemini 2.5 Flash vision — no Anthropic.
 *
 * Strict by design: if NO candidate passes verification — or the verifier
 * itself fails — callers get null and use no image (or the existing
 * non-photo fallback). We never publish the top search result unchecked.
 */

import type { ImageCandidate } from '@/lib/image-router'
import { MODELS, geminiUrl } from '@/lib/models'
import { fetchInlineImage } from '@/lib/anthropic-client'

const VISION_MODEL = MODELS.geminiFlash
const MAX_CANDIDATES = 10

interface Verification {
  /** 1-based image numbers that clearly show the subject and are usable. */
  passed: number[]
  /** 1-based best image, or 0 when none pass. */
  best: number
}

function buildInstruction(subject: string, context: string | undefined, n: number, purpose: 'hero' | 'gallery'): string {
  return `You are a strict senior photo editor verifying images for an editorial article.

SUBJECT: ${subject}${context ? `\nCONTEXT: ${context.slice(0, 300)}` : ''}

You will see ${n} candidate images, labelled "Image 1" to "Image ${n}". Check EACH one.

An image PASSES only if ALL of these hold:
1. It clearly shows the actual subject. If the subject names a specific product, brand, model, person, place, game, vehicle or company, the image must show THAT exact thing — identifiable by its design, branding or likeness. A different brand's product, a lookalike, a generic stand-in, or a different model is a FAIL (e.g. a Samsung or Google foldable is a FAIL for an Apple foldable; an Android phone is a FAIL for an iPhone).
   For an unreleased or rumoured product, a render or prototype is acceptable only if it plausibly depicts THAT product with its maker's design language; anything clearly another company's product is a FAIL.
   If the subject is a broad concept (a trend, a food category, an idea), a clearly relevant real photograph passes.
2. It is a real, sharp photograph or official product image — not a chart, infographic, meme, screenshot of a web page, collage or thumbnail grid.
3. No dominant text overlay or watermark.
${purpose === 'hero' ? '4. It would work as a wide editorial lead image.\n' : ''}
When unsure whether an image shows the exact subject, FAIL it.

Respond with ONLY JSON:
{"results":[{"image":1,"pass":true,"reason":"short"}, ...], "best": <number of the best passing image, or 0 if none pass>}`
}

async function verifyWithGemini(
  thumbs: string[],
  subject: string,
  context: string | undefined,
  purpose: 'hero' | 'gallery',
  articleId?: string,
): Promise<Verification> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not set')

  // Download thumbnails ourselves (Gemini needs inline bytes). Unfetchable
  // images are dropped — they can't be verified, so they can't be used.
  const inlined = await Promise.all(thumbs.map(u => fetchInlineImage(u)))
  const usable = inlined
    .map((data, i) => ({ data, original: i + 1 }))
    .filter((x): x is { data: { mime_type: string; data: string }; original: number } => !!x.data)
  if (usable.length === 0) return { passed: [], best: 0 }

  const parts: Record<string, unknown>[] = [
    { text: buildInstruction(subject, context, usable.length, purpose) },
  ]
  usable.forEach((u, i) => {
    parts.push({ text: `Image ${i + 1}:` })
    parts.push({ inline_data: u.data })
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  let res: Response
  try {
    res = await fetch(`${geminiUrl(VISION_MODEL)}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    })
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) throw new Error(`Gemini vision ${res.status}: ${(await res.text()).slice(0, 200)}`)

  const data = await res.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  }
  await logUsage(VISION_MODEL, data.usageMetadata?.promptTokenCount ?? 0, data.usageMetadata?.candidatesTokenCount ?? 0, articleId)

  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(match ? match[0] : text) as {
    results?: { image?: unknown; pass?: unknown; reason?: unknown }[]
    best?: unknown
  }

  // Map the model's numbering (over usable images) back to the original list.
  const toOriginal = (k: number) => usable[k - 1]?.original ?? 0
  const passed = (parsed.results ?? [])
    .filter(r => r.pass === true && Number.isInteger(Number(r.image)))
    .map(r => toOriginal(Number(r.image)))
    .filter(n => n > 0)
  const bestRaw = toOriginal(Number(parsed.best) || 0)
  const best = passed.includes(bestRaw) ? bestRaw : (passed[0] ?? 0)

  const rejected = (parsed.results ?? []).filter(r => r.pass !== true)
  if (rejected.length > 0) {
    console.log(`[image-verify] "${subject.slice(0, 40)}": ${passed.length}/${thumbs.length} passed; rejected e.g. ${rejected.slice(0, 2).map(r => String(r.reason ?? '').slice(0, 50)).join(' | ')}`)
  }
  return { passed, best }
}

async function logUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
  articleId?: string,
): Promise<void> {
  try {
    const { logApiCall } = await import('@/lib/api-usage')
    logApiCall({ callType: 'image_selection', model, inputTokens, outputTokens, articleId })
  } catch {
    // Non-critical.
  }
}

/**
 * Verify candidates and pick the best one that actually shows the subject.
 * Returns null when none pass (or verification fails) — callers must then use
 * no image / the non-photo fallback, never candidates[0] unchecked.
 */
export async function selectBestImage(
  candidates: ImageCandidate[],
  subject: string,
  context?: string,
  articleId?: string,
): Promise<ImageCandidate | null> {
  if (candidates.length === 0) return null
  const pool = candidates.slice(0, MAX_CANDIDATES)
  const thumbs = pool.map(c => c.thumbnail || c.url)

  try {
    const { best } = await verifyWithGemini(thumbs, subject, context, 'hero', articleId)
    if (best >= 1 && best <= pool.length) {
      console.log(`[image-selector] Picked #${best}/${pool.length} for "${subject.slice(0, 40)}"`)
      return pool[best - 1]
    }
    console.log(`[image-selector] No candidate shows "${subject.slice(0, 40)}" — using no image`)
  } catch (err) {
    console.warn(`[image-selector] Verification failed for "${subject.slice(0, 40)}" — using no image: ${(err as Error).message}`)
  }
  return null
}

/**
 * Verify a list of image URLs (e.g. a product gallery) and return only those
 * that show the subject, best first, preserving search order otherwise.
 * Returns [] when none pass or verification fails.
 */
export async function filterVerifiedImageUrls(
  urls: string[],
  subject: string,
  articleId?: string,
): Promise<string[]> {
  if (urls.length === 0) return []
  const pool = urls.slice(0, MAX_CANDIDATES)
  try {
    const { passed, best } = await verifyWithGemini(pool, subject, undefined, 'gallery', articleId)
    const ordered = best ? [best, ...passed.filter(n => n !== best)] : passed
    return ordered.map(n => pool[n - 1]).filter(Boolean)
  } catch (err) {
    console.warn(`[image-verify] Gallery verification failed for "${subject.slice(0, 40)}" — using no images: ${(err as Error).message}`)
    return []
  }
}
