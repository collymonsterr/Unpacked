/**
 * Single source of truth for the ACTIVE inference model IDs used across the
 * pipeline. Change a model here and every stage that uses it updates at once —
 * no more hunting the same string across a dozen files.
 *
 * Note: the historical IDs in `lib/api-usage.ts` MODEL_PRICING are deliberately
 * NOT sourced from here. That table is a price ledger keyed by exact past model
 * IDs (so old usage rows still cost out correctly); this is the live selector.
 * When you bump a model here, add its price to MODEL_PRICING too.
 */
export const MODELS = {
  /**
   * Legacy — no longer called. Model policy (Oct 2026): Claude Sonnet ONLY for the
   * final editorial polish; Gemini everywhere else. lib/anthropic-client.ts routes
   * any non-Sonnet model straight to Gemini, so a stray reference can't bill Anthropic.
   */
  haiku: 'claude-haiku-4-5-20251001',
  /** The ONE Anthropic step: editorial polish (lib/editorial-pass.ts). Also an emergency fallback if the Gemini writer/refine fails. */
  sonnet: 'claude-sonnet-5',
  /** Google workhorse: planning, topic, research synthesis, blueprint, writer, fact-check, image verification, social. */
  geminiFlash: 'gemini-2.5-flash',
  /** Google, cheapest: trivial classification / one-liners (hero query, card summary, filters, categories). */
  geminiFlashLite: 'gemini-2.5-flash-lite',
  /** OpenAI: kept ONLY as the independent third voice in fact-check arbitration. */
  gptMini: 'gpt-4o-mini',
  /** OpenAI image generation — emergency AI hero fallback (lib/imagen.ts). */
  gptImage: 'gpt-image-1',
} as const

/** Gemini generateContent endpoint for any Gemini model ID. */
export const geminiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

/** Full Gemini generateContent endpoint for the current Flash model. */
export const GEMINI_FLASH_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.geminiFlash}:generateContent`
