const STORAGE_KEY = 'recent_articles'
const MAX_ITEMS = 10

export interface RecentArticle {
  title: string
  slug: string
  articleType: string
  thumbnailUrl?: string
  visitedAt: number
}

export function getRecentArticles(): RecentArticle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as RecentArticle[]
  } catch {
    return []
  }
}

export function addRecentArticle(article: RecentArticle): void {
  try {
    const existing = getRecentArticles()
    // Remove duplicate if already in list
    const filtered = existing.filter(a => a.slug !== article.slug)
    // Add to front
    filtered.unshift({ ...article, visitedAt: Date.now() })
    // Trim to max
    const trimmed = filtered.slice(0, MAX_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // localStorage not available
  }
}

export function clearRecentArticles(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage not available
  }
}
