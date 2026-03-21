import type { ArticleContent } from '@/types/article'

function extractStrings(obj: unknown): string {
  if (typeof obj === 'string') return obj + ' '
  if (Array.isArray(obj)) return obj.map(extractStrings).join('')
  if (obj && typeof obj === 'object') {
    let result = ''
    for (const [key, val] of Object.entries(obj)) {
      // Skip non-content fields like urls, types, ids
      if (key === 'type' || key.endsWith('_url') || key.endsWith('_urls') || key === 'url' || key === 'id') continue
      result += extractStrings(val)
    }
    return result
  }
  return ''
}

export function getReadingTime(article: ArticleContent): number {
  const text = extractStrings(article.sections)
  const words = text.split(/\s+/).filter(w => w.length > 1).length
  return Math.max(2, Math.round(words / 300))
}
