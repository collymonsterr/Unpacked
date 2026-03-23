'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getPendingArticle, clearPendingArticle } from '@/lib/pending-article'

/**
 * Silently checks if there's a pending article in localStorage.
 * Only redirects if the article is COMPLETE (user closed tab, came back).
 * Does NOT redirect if still generating — user likely has the loading page
 * open in another tab and intentionally navigated to the homepage.
 */
export default function PendingArticleRecovery() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname !== '/') return

    const pending = getPendingArticle()
    if (!pending) return

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
          // Article finished while user was away — redirect to it
          clearPendingArticle()
          router.push(`/article/${pending.slug}`)
        } else if (data.status === 'error') {
          clearPendingArticle()
        }
        // If still generating — do nothing. User intentionally came to homepage.
        // The pending state will auto-expire after 10 minutes (in getPendingArticle).
      })
      .catch(() => {
        clearPendingArticle()
      })
  }, [pathname, router])

  return null
}
