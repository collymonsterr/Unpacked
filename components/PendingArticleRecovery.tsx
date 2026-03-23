'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getPendingArticle, clearPendingArticle } from '@/lib/pending-article'

/**
 * Silently checks if there's a pending article in localStorage.
 * If the article is complete, redirects to it.
 * If still generating, redirects to the loading page.
 * If gone or errored, clears the pending state.
 *
 * Only runs on the homepage — skips if already on an article page.
 */
export default function PendingArticleRecovery() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only check on homepage
    if (pathname !== '/') return

    const pending = getPendingArticle()
    if (!pending) return

    // Check the article status
    fetch(`/api/articles/${pending.id}`)
      .then(res => {
        if (!res.ok) {
          clearPendingArticle()
          return
        }
        return res.json()
      })
      .then(data => {
        if (!data) return

        if (data.status === 'complete' || data.status === 'verified') {
          // Article is done — redirect to it
          clearPendingArticle()
          router.push(`/article/${pending.slug}`)
        } else if (data.status === 'generating' || data.status === 'planning') {
          // Still generating — resume the loading page
          router.push(`/article/${pending.slug}`)
        } else {
          // Error or unknown — clear
          clearPendingArticle()
        }
      })
      .catch(() => {
        clearPendingArticle()
      })
  }, [pathname, router])

  return null // Invisible component
}
