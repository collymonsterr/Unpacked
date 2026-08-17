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
  /** Fast, cheap Anthropic: planning, research synthesis, selection, fact-check review, daily topic. */
  haiku: 'claude-haiku-4-5-20251001',
  /** Premium Anthropic: editorial pass, deep/premium writing, refine, Gemini-writer fallback. */
  sonnet: 'claude-sonnet-5',
  /** Google workhorse: blueprint, default writer, fact-check grounding, social content. */
  geminiFlash: 'gemini-2.5-flash',
  /** OpenAI: kept ONLY as the independent third voice in fact-check arbitration. */
  gptMini: 'gpt-4o-mini',
  /** OpenAI image generation — emergency AI hero fallback (lib/imagen.ts). */
  gptImage: 'gpt-image-1',
} as const

/** Full Gemini generateContent endpoint for the current Flash model. */
export const GEMINI_FLASH_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.geminiFlash}:generateContent`
