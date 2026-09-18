import Anthropic from '@anthropic-ai/sdk'
import { MODELS, GEMINI_FLASH_URL } from '@/lib/models'
import { classifyProviderError } from '@/lib/provider-errors'

/**
 * An Anthropic client that keeps the pipeline running when the Anthropic
 * *account* is the problem — empty credit balance, quota, rejected key.
 *
 * Any `messages.create()` call that fails that way is replayed on Gemini Flash
 * and the answer is returned in Anthropic's response shape, so callers don't
 * change. Ordinary errors (timeouts, bad requests, overload) are rethrown
 * untouched — this is not a general retry layer.
 *
 * Why: Aug–Sep 2026 an empty Anthropic balance stopped every article, including
 * the daily autopilot, for a month. Gemini was healthy the whole time.
 *
 * Only text requests fall back. A request carrying images (vision selection)
 * rethrows, and its caller already degrades to the first candidate.
 */
export function createAnthropic(options?: ConstructorParameters<typeof Anthropic>[0]): Anthropic {
  const client = new Anthropic(options)
  const original = client.messages.create.bind(client.messages)

  const withFallback = async (body: Anthropic.MessageCreateParams, requestOptions?: Anthropic.RequestOptions) => {
    try {
      return await original(body, requestOptions)
    } catch (err) {
      const providerError = classifyProviderError(err)
      if (!providerError || body.stream || !isTextOnly(body)) throw err
      console.warn(`[anthropic-fallback] ${providerError.detail} Replaying ${body.model} call on ${MODELS.geminiFlash}.`)
      return await replayOnGemini(body)
    }
  }

  ;(client.messages as unknown as { create: typeof withFallback }).create = withFallback
  return client
}

function isTextOnly(body: Anthropic.MessageCreateParams): boolean {
  return body.messages.every(m =>
    typeof m.content === 'string' || m.content.every(block => block.type === 'text')
  )
}

function textOf(content: Anthropic.MessageParam['content'] | Anthropic.MessageCreateParams['system']): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  return content.map(block => ('text' in block ? block.text : '')).join('\n')
}

async function replayOnGemini(body: Anthropic.MessageCreateParams): Promise<Anthropic.Message> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('[anthropic-fallback] GOOGLE_GEMINI_API_KEY is not set')

  const system = textOf(body.system)
  const res = await fetch(`${GEMINI_FLASH_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(system && { systemInstruction: { parts: [{ text: system }] } }),
      contents: body.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: textOf(m.content) }],
      })),
      generationConfig: {
        maxOutputTokens: body.max_tokens,
        ...(body.temperature !== undefined && { temperature: body.temperature }),
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`[anthropic-fallback] Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }

  const data = await res.json() as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  }
  const candidate = data.candidates?.[0]
  const text = candidate?.content?.parts?.map(p => p.text ?? '').join('') ?? ''
  if (!text) throw new Error(`[anthropic-fallback] Gemini returned no text (${candidate?.finishReason ?? 'no candidate'})`)

  return {
    id: `gemini-fallback-${Date.now()}`,
    type: 'message',
    role: 'assistant',
    model: MODELS.geminiFlash,
    content: [{ type: 'text', text, citations: null }],
    stop_reason: candidate?.finishReason === 'MAX_TOKENS' ? 'max_tokens' : 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    },
  } as Anthropic.Message
}
