import slugify from 'slugify'
import { getSupabaseAdmin } from './supabase'

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
  // Question words
  'what', 'how', 'why', 'when', 'where', 'who', 'which',
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
  'new', 'latest', 'updated', 'current',
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

  // Split into words, remove stop words but preserve numbers and proper-looking terms
  const words = text.split(/\s+/)
  const filtered = words.filter(w => {
    const lower = w.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!lower) return false
    // Keep numbers (years, prices, model numbers)
    if (/\d/.test(w)) return true
    // Keep "vs" for comparisons
    if (lower === 'vs') return true
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
