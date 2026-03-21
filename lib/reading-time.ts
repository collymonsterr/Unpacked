import type { ArticleContent } from '@/types/article'

export function getReadingTime(article: ArticleContent): number {
  let text = article.title + ' '
  for (const section of article.sections) {
    // Extract text content from all section fields
    const json = JSON.stringify(section)
    text += json + ' '
  }
  const words = text.split(/\s+/).filter(w => w.length > 0).length
  return Math.max(2, Math.round(words / 200))
}
