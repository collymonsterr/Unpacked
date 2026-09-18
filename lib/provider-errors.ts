/**
 * Recognise failures that come from an AI provider's account rather than from
 * the article — an empty credit balance, a revoked key, a hard quota. These
 * fail every generation, instantly, until someone fixes the account, so they
 * need a distinct error tag instead of the generic "something went wrong".
 *
 * Aug–Sep 2026: an exhausted Anthropic balance failed every generation for a
 * month and was logged as `(unknown)` with nothing recorded on the row.
 */

export interface ProviderError {
  /** Stored as `generation_options._error`. */
  code: 'provider_unavailable'
  /** Admin-facing one-liner, stored as `generation_options._error_detail`. */
  detail: string
}

export function classifyProviderError(err: unknown): ProviderError | null {
  const e = err as { status?: number; message?: string } | null
  const message = String(e?.message ?? err ?? '')
  const status = e?.status

  const provider =
    /anthropic/i.test(message) || /credit balance/i.test(message) ? 'Anthropic'
    : /gemini|generativelanguage|google/i.test(message) ? 'Gemini'
    : /openai/i.test(message) ? 'OpenAI'
    : 'AI provider'

  if (/credit balance is too low/i.test(message)) {
    return { code: 'provider_unavailable', detail: `${provider} API credit balance is empty — top up billing to restore generation.` }
  }
  if (/insufficient_quota|exceeded your current quota|billing/i.test(message)) {
    return { code: 'provider_unavailable', detail: `${provider} quota or billing limit reached — check the provider's billing page.` }
  }
  if (status === 401 || status === 403 || /invalid x-api-key|invalid api key|authentication_error|permission_error/i.test(message)) {
    return { code: 'provider_unavailable', detail: `${provider} rejected the API key (${status ?? 'auth error'}) — check the key in Vercel env vars.` }
  }
  return null
}
