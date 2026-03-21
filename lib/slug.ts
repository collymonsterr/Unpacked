import slugify from 'slugify'
import { getSupabaseAdmin } from './supabase'

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'what', 'how', 'why', 'when', 'where', 'who', 'which', 'that', 'this',
  'it', 'its', 'do', 'does', 'did', 'have', 'has', 'had', 'will',
  'would', 'could', 'should', 'may', 'might', 'can', 'shall',
  'not', 'no', 'nor', 'so', 'if', 'then', 'than', 'too', 'very',
  'just', 'about', 'up', 'out', 'all', 'also', 'as', 'by', 'from',
  'into', 'over', 'after', 'before', 'between', 'through', 'during',
  'above', 'below', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'only', 'own', 'same', 'here', 'there',
  'your', 'you', 'my', 'our', 'their', 'his', 'her', 'we', 'they',
])

function removeStopWords(title: string): string {
  const words = title.split(/\s+/)
  const filtered = words.filter(w => !STOP_WORDS.has(w.toLowerCase()))
  // Keep original if too few words remain
  if (filtered.length < 3) return title
  return filtered.join(' ')
}

export async function generateUniqueSlug(title: string): Promise<string> {
  const cleaned = removeStopWords(title)
  const base = slugify(cleaned, { lower: true, strict: true, trim: true }).slice(0, 80)

  // Check if slug exists
  const { data } = await getSupabaseAdmin()
    .from('articles')
    .select('slug')
    .eq('slug', base)
    .maybeSingle()

  if (!data) return base

  // Append random 4-char suffix
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}
