import Anthropic from '@anthropic-ai/sdk'
import { MODELS, geminiUrl } from '@/lib/models'
import { classifyProviderError } from '@/lib/provider-errors'

/**
 * An Anthropic-shaped client that enforces the model policy (Oct 2026):
 *
 *   - Claude Sonnet is used ONLY where callers explicitly ask for it (the final
 *     editorial polish, plus emergency fallbacks). If the Sonnet call fails for
 *     an account reason (empty credit, quota, rejected key) or a transient one
 *     (overload, 5xx, timeout, network), it is replayed on Gemini Flash.
 *   - Every other model — Gemini IDs, and any leftover Haiku reference — goes
 *     straight to Gemini without touching Anthropic. Haiku maps to Flash.
 *
 * Responses always come back in Anthropic's message shape, so callers don't
 * change. Image blocks (base64 or URL) are converted to Gemini inline data, so
 * vision requests (image verification) work on Gemini too.
 *
 * Why: Aug–Sep 2026 an empty Anthropic balance stopped every article for a
 * month, and again from 7 Oct 2026. Anthropic spend target: a few euro a month.
 */
export function createAnthropic(options?: ConstructorParameters<typeof Anthropic>[0]): Anthropic {
  // A placeholder key keeps construction from throwing when ANTHROPIC_API_KEY is
  // absent: Gemini-routed calls never use it, and a Sonnet call then fails auth
  // and falls back to Gemini.
  const client = new Anthropic({ ...options, apiKey: options?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? 'unset' })
  const original = client.messages.create.bind(client.messages)

  const routed = async (body: Anthropic.MessageCreateParams, requestOptions?: Anthropic.RequestOptions) => {
    if (!isClaudeSonnet(body.model)) {
      return await callGemini(body, geminiModelFor(body.model))
    }
    try {
      return await original(body, requestOptions)
    } catch (err) {
      const reason = classifyProviderError(err)?.detail ?? transientReason(err)
      if (!reason || body.stream) throw err
      console.warn(`[anthropic-fallback] ${reason} Replaying ${body.model} call on ${MODELS.geminiFlash}.`)
      return await callGemini(body, MODELS.geminiFlash)
    }
  }

  ;(client.messages as unknown as { create: typeof routed }).create = routed
  return client
}

function isClaudeSonnet(model: string): boolean {
  return /^claude-.*sonnet/i.test(model)
}

/** Gemini model to use for a requested model ID. Non-Gemini IDs map to Flash. */
function geminiModelFor(model: string): string {
  return model.startsWith('gemini-') ? model : MODELS.geminiFlash
}

/** Errors worth retrying on another provider: overload, server errors, timeouts, network. */
function transientReason(err: unknown): string | null {
  const e = err as { status?: number; name?: string; message?: string } | null
  const status = e?.status
  const msg = String(e?.message ?? '')
  if (status === 429 || status === 529 || (status !== undefined && status >= 500)) return `Anthropic ${status}.`
  if (/overloaded|timed? ?out|timeout|ECONNRESET|ENOTFOUND|fetch failed|connection/i.test(msg) || e?.name === 'APIConnectionError' || e?.name === 'APIConnectionTimeoutError') {
    return `Anthropic unreachable (${msg.slice(0, 80)}).`
  }
  return null
}

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } }

function systemText(system: Anthropic.MessageCreateParams['system']): string {
  if (!system) return ''
  if (typeof system === 'string') return system
  return system.map(block => ('text' in block ? block.text : '')).join('\n')
}

/** Fetch an image URL and return it as Gemini inline data, or null if unusable. */
export async function fetchInlineImage(url: string, timeoutMs = 8000): Promise<{ mime_type: string; data: string } | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UnpackedBot/1.0)', Accept: 'image/*' },
    })
    if (!res.ok) return null
    const mime = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!/^image\/(jpeg|jpg|png|webp|heic|heif)$/.test(mime)) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0 || buf.length > 7_000_000) return null
    return { mime_type: mime === 'image/jpg' ? 'image/jpeg' : mime, data: buf.toString('base64') }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function toGeminiParts(content: Anthropic.MessageParam['content']): Promise<GeminiPart[]> {
  if (typeof content === 'string') return [{ text: content }]
  const parts: GeminiPart[] = []
  for (const block of content) {
    if (block.type === 'text') {
      parts.push({ text: block.text })
    } else if (block.type === 'image') {
      const src = block.source as { type: string; media_type?: string; data?: string; url?: string }
      if (src.type === 'base64' && src.data && src.media_type) {
        parts.push({ inline_data: { mime_type: src.media_type, data: src.data } })
      } else if (src.type === 'url' && src.url) {
        const inline = await fetchInlineImage(src.url)
        parts.push(inline ? { inline_data: inline } : { text: '[image could not be loaded]' })
      }
    } else if ('text' in block && typeof block.text === 'string') {
      parts.push({ text: block.text })
    }
  }
  return parts.length > 0 ? parts : [{ text: '' }]
}

async function callGemini(body: Anthropic.MessageCreateParams, model: string): Promise<Anthropic.Message> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('[gemini] GOOGLE_GEMINI_API_KEY is not set')

  const system = systemText(body.system)
  const contents = await Promise.all(body.messages.map(async m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: await toGeminiParts(m.content),
  })))

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90_000)
  let res: Response
  try {
    res = await fetch(`${geminiUrl(model)}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        ...(system && { systemInstruction: { parts: [{ text: system }] } }),
        contents,
        generationConfig: {
          maxOutputTokens: body.max_tokens,
          ...(body.temperature !== undefined && { temperature: body.temperature }),
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    })
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    throw new Error(`[gemini] ${model} ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }

  const data = await res.json() as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  }
  const candidate = data.candidates?.[0]
  const text = candidate?.content?.parts?.filter(p => !p.thought).map(p => p.text ?? '').join('') ?? ''
  if (!text) throw new Error(`[gemini] ${model} returned no text (${candidate?.finishReason ?? 'no candidate'})`)

  return {
    id: `gemini-${Date.now()}`,
    type: 'message',
    role: 'assistant',
    model,
    content: [{ type: 'text', text, citations: null }],
    stop_reason: candidate?.finishReason === 'MAX_TOKENS' ? 'max_tokens' : 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    },
  } as Anthropic.Message
}

/**
 * Convenience for call sites that don't need an Anthropic client at all:
 * a single Gemini text call returning { text, usage, model }.
 */
export async function geminiText(params: {
  prompt: string
  system?: string
  model?: string
  maxTokens: number
  temperature?: number
}): Promise<{ text: string; inputTokens: number; outputTokens: number; model: string }> {
  const model = params.model ?? MODELS.geminiFlash
  const msg = await callGemini({
    model,
    max_tokens: params.maxTokens,
    ...(params.system && { system: params.system }),
    ...(params.temperature !== undefined && { temperature: params.temperature }),
    messages: [{ role: 'user', content: params.prompt }],
  }, model)
  const block = msg.content[0]
  return {
    text: block && block.type === 'text' ? block.text : '',
    inputTokens: msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
    model,
  }
}
