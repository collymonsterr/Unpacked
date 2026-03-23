const KEY = 'pendingArticle'

interface PendingArticle {
  id: string
  slug: string
  startedAt: number
}

export function setPendingArticle(id: string, slug: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ id, slug, startedAt: Date.now() }))
  } catch {}
}

export function getPendingArticle(): PendingArticle | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingArticle
    // Expire after 10 minutes — if it's been that long, something failed
    if (Date.now() - parsed.startedAt > 10 * 60 * 1000) {
      clearPendingArticle()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearPendingArticle(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}
