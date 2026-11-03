import type { ArticleCardData } from '@/lib/article-card'

/**
 * Automatic Featured rotation.
 *
 * Featured used to be a manual `is_featured` toggle plus a client-side random
 * hero: the four small cards were always the four newest picks, so a reader who
 * came back two days later saw the same block. Nothing rotated unless someone
 * opened the admin dashboard.
 *
 * The selection is now derived from the clock, so it changes on its own:
 *   - the pool is every hand-picked article plus everything published recently,
 *     so new work surfaces without anyone toggling anything;
 *   - a window walks through that pool, moving every `FEATURED_ROTATION_MS`.
 *
 * It is a pure function of (pool, now). Every visitor in the same window sees
 * the same block — important, because the homepage is server-rendered and the
 * selection has to survive caching and produce stable HTML for crawlers.
 */

/** How often the Featured block shows a different set. Four changes a day. */
export const FEATURED_ROTATION_MS = 6 * 60 * 60 * 1000

/** One hero card plus four small cards. */
export const FEATURED_SLOTS = 5

/**
 * Recently published articles join the rotation for this long. Without this the
 * pool would be frozen at whatever was last toggled in admin and would go stale
 * again the moment attention moved elsewhere.
 */
export const FEATURED_FRESH_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Deterministic PRNG. The same seed must give the same order on every render
 * and in every region, or readers would watch the block reshuffle under them.
 */
function mulberry32(seed: number): () => number {
  let state = seed | 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Seeded Fisher-Yates. */
function shuffle<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Everything eligible to appear in Featured: hand-picked articles, plus anything
 * published inside the fresh window.
 */
export function featuredPool(articles: ArticleCardData[], now: number = Date.now()): ArticleCardData[] {
  const cutoff = now - FEATURED_FRESH_WINDOW_MS
  return articles.filter(a => a.isFeatured || new Date(a.createdAt).getTime() >= cutoff)
}

export interface FeaturedSelection {
  hero: ArticleCardData | null
  small: ArticleCardData[]
  /** Everything on show, so the homepage can keep it out of Recent Articles. */
  shownIds: Set<string>
}

/**
 * Pick the block for the window `now` falls in.
 *
 * A window walks through one shuffled ordering rather than reshuffling each
 * time, so consecutive windows share no articles at all — the whole block is
 * genuinely new every few hours — and a full sweep covers the pool before the
 * order is drawn again.
 */
export function selectFeatured(pool: ArticleCardData[], now: number = Date.now()): FeaturedSelection {
  if (pool.length === 0) return { hero: null, small: [], shownIds: new Set() }

  const slot = Math.floor(now / FEATURED_ROTATION_MS)
  const windowsPerSweep = Math.max(1, Math.floor(pool.length / FEATURED_SLOTS))
  const order = shuffle(pool, Math.floor(slot / windowsPerSweep))
  const start = (slot % windowsPerSweep) * FEATURED_SLOTS

  const picked = order.slice(start, start + FEATURED_SLOTS)

  // The hero card is mostly image; an article without one renders as a flat
  // block. Promote the first candidate that has a picture.
  const withImage = picked.findIndex(a => a.imageUrl)
  if (withImage > 0) {
    const [chosen] = picked.splice(withImage, 1)
    picked.unshift(chosen)
  }

  const [hero, ...small] = picked
  return { hero: hero ?? null, small, shownIds: new Set(picked.map(a => a.id)) }
}
