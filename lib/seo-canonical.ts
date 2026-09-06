/**
 * SEO canonicalisation map — one indexable URL per search intent.
 *
 * Three mechanisms, in order of preference:
 *   1. SLUG_REDIRECTS  — permanent 301. The old URL stops resolving; link equity
 *                        moves to the keeper. Used for true duplicates.
 *   2. NOINDEX_SLUGS   — page stays live and linkable but is dropped from the
 *                        sitemap and served `robots: noindex`. Used for pages we
 *                        want reachable but not competing in search.
 *   3. DEBRIS_PATTERNS — pipeline test artefacts. Filtered out of every listing
 *                        and the sitemap, and blocked at slug-generation time.
 *
 * Nothing here deletes an article row. Every entry is reversible by editing this
 * file. Selection rules used to pick the keeper (documented so future entries stay
 * consistent):
 *   R1. An explicit editorial decision wins.
 *   R2. A `-N`-suffixed slug always loses to its unsuffixed twin — the suffix only
 *       exists because `generateUniqueSlug()` hit a collision.
 *   R3. Otherwise the higher `view_count` wins (accumulated links and traffic).
 */

/** Permanent 301s: duplicate slug → the canonical slug that survives. */
export const SLUG_REDIRECTS: Record<string, string> = {
  // ── Pipeline test artefacts → the real article on the same subject ──
  'gemini-test-robot-vacuums-2026': 'robot-vacuums-worth-large-apartments-houses',
  'sonnet-test-robot-vacuums-worth-large-apartmentsbut-buy-one': 'robot-vacuums-worth-large-apartments-houses',
  'gemini-test-dubais-property-market-2026': 'dubai-housing-market-2026',
  'sonnet-test-dubai-housing-market-2026': 'dubai-housing-market-2026',
  'gemini-test-new-wave-chinese-evs': 'new-wave-chinese-evs',
  'sonnet-test-new-wave-chinese-evs': 'new-wave-chinese-evs',

  // ── Collision forks (R2): the `-N` twin folds into the clean slug ──
  'how-much-spend-car-smart-enthusiasts-car-budgeting-2': 'how-much-spend-car-smart-enthusiasts-car-budgeting',
  'engagement-ring-buying-2': 'engagement-ring-buying',
  '10-websites-startup-founder-must-bookmark-2026-2': '10-websites-startup-founder-must-bookmark-2026',
  'best-hidden-gem-apps-mac-users-power-user-2': 'best-hidden-gem-apps-mac-users-power-user',
  'humanoid-robots-replace-human-labour-2': 'humanoid-robots-replace-human-labour',
  'worlds-oil-chokepoints-2': 'worlds-oil-chokepoints',
  'trump-iran-ceasefire-2': 'trump-iran-ceasefire',

  // ── Same query, different slug (R3): lower-traffic twin folds into the keeper ──
  'best-whisper-based-ai-voice-to-text-apps-mac-2026': 'best-whisper-based-voice-to-text-typing-apps-mac-2026',
  'best-headphones-under-dollar50-2026': 'best-in-ear-earbuds-noise-cancelling-under-dollar50-2026',
  'best-electric-vehicles-under-200000-aed-2026': 'best-electric-vehicles-under-dollar50000-2026',
  'salary-live-comfortably-dubai': 'salary-comfortable-expat-life-dubai-numbers-2026',
  'trumps-iran-ceasefire': 'trump-iran-ceasefire',
  'best-boiler-room-house-music-sets': 'best-boiler-room-house-sets',

  // ── Golf shafts: three articles from one query (R1 — keep the cleanest slug) ──
  'best-golf-shafts-iron-workability-2': 'best-golf-shafts-iron-workability',
  'best-golf-shafts-players-irons-workability-2': 'best-golf-shafts-iron-workability',
}

/**
 * Live, linkable, but not indexed. Dropped from the sitemap and served
 * `robots: noindex, follow`.
 *
 * MacBook Neo: speculative product coverage that overlaps the real Mac buying
 * guides (`mac-vs-pc-2026`, `macbook-air-vs-dell-xps-14`). Kept reachable for
 * anyone holding the link; not competing for Mac buying queries.
 */
export const NOINDEX_SLUGS = new Set<string>([
  'macbook-neo',
  'macbook-neo-vs-dell-inspiron-14',
])

/**
 * Slug shapes produced only by pipeline/model test runs. Matched anywhere in the
 * slug so `gemini-test-…`, `…-sonnet-test-…` and `pipeline-test-3` are all caught.
 *
 * Deliberately narrow: it must never match an editorial article that happens to
 * discuss testing (e.g. `chatgpt-build-production-app-test`), so a bare trailing
 * "test" does not qualify — only a `<model|pipeline>-test` marker does.
 */
const DEBRIS_PATTERNS: RegExp[] = [
  /(^|-)(sonnet|gemini|haiku|opus|gpt|claude|pipeline|smoke|e2e|qa)-test(-|$)/i,
  /(^|-)test-(article|run|fixture|\d+)(-|$)/i,
]

export function isDebrisSlug(slug: string | null | undefined): boolean {
  if (!slug) return false
  return DEBRIS_PATTERNS.some(re => re.test(slug))
}

/** True when `slug` 301s somewhere else. */
export function isRedirectedSlug(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(SLUG_REDIRECTS, slug)
}

/** The slug that should carry the canonical tag for `slug`. */
export function getCanonicalSlug(slug: string): string {
  return SLUG_REDIRECTS[slug] ?? slug
}

/**
 * Should this slug appear in the sitemap and be indexable?
 * Callers must still check visibility and status — this only covers the
 * slug-level rules.
 */
export function isIndexableSlug(slug: string | null | undefined): boolean {
  if (!slug) return false
  if (isDebrisSlug(slug)) return false
  if (NOINDEX_SLUGS.has(slug)) return false
  if (isRedirectedSlug(slug)) return false
  return true
}

/**
 * Slugs excluded from paginated listings at the SQL level, so page sizes stay
 * even. Debris slugs are all redirect sources today; `isHiddenFromListings()`
 * still runs on the returned page to catch any that are not.
 */
export const LISTING_EXCLUDED_SLUGS: string[] = Object.keys(SLUG_REDIRECTS)

/** Should this slug be hidden from homepage / category listings? */
export function isHiddenFromListings(slug: string | null | undefined): boolean {
  if (!slug) return false
  return isDebrisSlug(slug) || isRedirectedSlug(slug)
}
