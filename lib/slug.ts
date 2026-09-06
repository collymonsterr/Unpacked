import slugify from 'slugify'
import { getSupabaseAdmin } from './supabase'
import { isDebrisSlug } from './seo-canonical'

// Words that add no meaning to a URL
const STOP_WORDS = new Set([
  // Articles & conjunctions
  'the', 'a', 'an', 'and', 'or', 'but', 'nor',
  // Prepositions
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'into',
  'over', 'after', 'before', 'between', 'through', 'during', 'above', 'below',
  // Pronouns
  'you', 'your', 'my', 'our', 'their', 'his', 'her', 'we', 'they', 'it', 'its',
  // Verbs (common)
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did',
  'have', 'has', 'had', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
  // Question words (keep 'how' — meaningful in titles like "How Much", "How to")
  'what', 'why', 'when', 'where', 'who', 'which',
  // Filler
  'that', 'this', 'not', 'no', 'so', 'if', 'then', 'than', 'too', 'very',
  'just', 'about', 'up', 'out', 'all', 'also', 'as', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own',
  'same', 'here', 'there',
  // Article-specific filler words
  'actually', 'really', 'complete', 'comprehensive', 'ultimate', 'definitive',
  'everything', 'need', 'know', 'guide', 'review', 'explained', 'breakdown',
  'edition', 'analysis', 'deep', 'dive', 'full', 'real', 'honest',
  'detailed', 'expert', 'insider', 'essential', 'critical', 'important',
  'visual', 'interactive', 'step', 'tips', 'tricks', 'secrets',
  'properly', 'effectively', 'exactly', 'right', 'way',
  'latest', 'updated', 'current',
])

const MAX_SLUG_LENGTH = 60

/**
 * Generate a clean, SEO-friendly slug from a title.
 * - Strips filler words
 * - Uses only the main title (before colon/pipe/dash subtitle)
 * - Caps at 60 chars, never truncates mid-word
 * - Keeps product names, numbers, and key terms
 */
function cleanSlug(input: string): string {
  let text = input.trim()

  // If there's a colon/pipe subtitle pattern, use only the main title
  // But only if the first part is >15 chars (avoid splitting "X vs Y: Details")
  const colonIdx = text.indexOf(':')
  if (colonIdx > 15) {
    text = text.substring(0, colonIdx).trim()
  }
  const pipeIdx = text.indexOf('|')
  if (pipeIdx > 15) {
    text = text.substring(0, pipeIdx).trim()
  }
  // Long-dash subtitle: "Topic — Subtitle"
  const dashIdx = text.indexOf(' — ')
  if (dashIdx > 15) {
    text = text.substring(0, dashIdx).trim()
  }

  // Protect compound proper nouns from stop word stripping
  const PROTECTED_PHRASES: Record<string, string> = {
    'new york': 'New-York',
    'new zealand': 'New-Zealand',
    'new orleans': 'New-Orleans',
    'new jersey': 'New-Jersey',
    'los angeles': 'Los-Angeles',
    'san francisco': 'San-Francisco',
    'saudi arabia': 'Saudi-Arabia',
    'hong kong': 'Hong-Kong',
    'south korea': 'South-Korea',
    'north korea': 'North-Korea',
    'south africa': 'South-Africa',
    'united states': 'United-States',
    'united kingdom': 'United-Kingdom',
    'middle east': 'Middle-East',
    'sri lanka': 'Sri-Lanka',
  }
  let protectedText = text
  for (const [phrase, token] of Object.entries(PROTECTED_PHRASES)) {
    protectedText = protectedText.replace(new RegExp(phrase, 'gi'), token)
  }

  // Split into words, remove stop words but preserve numbers and proper-looking terms
  const words = protectedText.split(/\s+/)
  const filtered = words.filter(w => {
    const lower = w.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!lower) return false
    // Keep numbers (years, prices, model numbers)
    if (/\d/.test(w)) return true
    // Keep "vs" for comparisons
    if (lower === 'vs') return true
    // Keep protected phrase tokens (compare without hyphens since we stripped non-alphanumeric)
    if (Object.values(PROTECTED_PHRASES).some(t => t.toLowerCase().replace(/-/g, '') === lower)) return true
    // Keep short product-name words (2-3 chars that look like model numbers)
    if (lower.length <= 3 && /[0-9]/.test(w)) return true
    // Remove stop words
    return !STOP_WORDS.has(lower)
  })

  // If too few words remain, use original (minus subtitle)
  const result = filtered.length >= 2 ? filtered.join(' ') : text

  // Slugify
  let slug = slugify(result, { lower: true, strict: true, trim: true })

  // Cap at MAX_SLUG_LENGTH, never truncate mid-word
  if (slug.length > MAX_SLUG_LENGTH) {
    const truncated = slug.substring(0, MAX_SLUG_LENGTH)
    const lastHyphen = truncated.lastIndexOf('-')
    if (lastHyphen > 20) {
      slug = truncated.substring(0, lastHyphen)
    } else {
      slug = truncated
    }
  }

  // Remove trailing hyphens
  slug = slug.replace(/-+$/, '')

  // A title like "Gemini Test: Robot Vacuums 2026" would mint a slug that every
  // listing and the sitemap then have to filter back out. Strip the test marker
  // at the source instead — see lib/seo-canonical.ts.
  if (isDebrisSlug(slug)) {
    slug = slug
      .replace(/(^|-)(sonnet|gemini|haiku|opus|gpt|claude|pipeline|smoke|e2e|qa)-test(-|$)/gi, '$1')
      .replace(/(^|-)test-(article|run|fixture|\d+)(-|$)/gi, '$1')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
    // "Pipeline Test 3" strips down to "3" — not a usable URL.
    if (!/[a-z]/.test(slug)) slug = ''
  }

  return slug || 'article'
}

/**
 * Generate a unique slug, appending -2, -3 etc. if the slug already exists.
 * Optionally exclude a specific article ID from the uniqueness check (for migrations).
 */
export async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = cleanSlug(title)

  const db = getSupabaseAdmin()

  // Check if base slug is available
  let query = db.from('articles').select('id').eq('slug', base)
  if (excludeId) query = query.neq('id', excludeId)
  const { data: existing } = await query.maybeSingle()

  if (!existing) return base

  // Try -2, -3, etc.
  for (let i = 2; i <= 20; i++) {
    const candidate = `${base}-${i}`
    let q2 = db.from('articles').select('id').eq('slug', candidate)
    if (excludeId) q2 = q2.neq('id', excludeId)
    const { data: exists } = await q2.maybeSingle()
    if (!exists) return candidate
  }

  // Fallback: append random suffix
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}

// Re-export for direct use in migration
export { cleanSlug }
