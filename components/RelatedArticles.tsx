'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { ArticleCardData } from '@/lib/article-card'

// Image, title and type now arrive resolved from /api/articles/recent, which
// no longer ships article bodies to the browser. Reading time needs the full
// body to compute, so it is 0 here and the label is hidden — same trade as the
// homepage cards. See CLAUDE.md "Writes to `articles` are expensive".

interface Props {
  articleId: string
  articleType: string
}

export default function RelatedArticles({ articleId, articleType }: Props) {
  const [articles, setArticles] = useState<ArticleCardData[]>([])

  useEffect(() => {
    fetch('/api/articles/recent')
      .then(res => res.json())
      .then((all: ArticleCardData[]) => {
        // Exclude current article
        const others = all.filter(a => a.id !== articleId)

        // Match by type first
        const sameType = others.filter(a => a.articleType === articleType)

        // Fill remaining slots with popular articles
        const remaining = others
          .filter(a => !sameType.includes(a))
          .sort((a, b) => b.viewCount - a.viewCount)

        const result = [...sameType.slice(0, 4)]
        if (result.length < 4) {
          result.push(...remaining.slice(0, 4 - result.length))
        }

        setArticles(result.slice(0, 4))
      })
      .catch(() => {})
  }, [articleId, articleType])

  if (articles.length === 0) return null

  return (
    <div className="mt-12 mb-8">
      <h2
        className="text-lg font-bold mb-5"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-secondary)' }}
      >
        You might also like
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {articles.map(row => {
          const imageUrl = row.imageUrl
          const title = row.title
          const readTime = row.readingTime

          return (
            <Link
              key={row.id}
              href={`/article/${row.slug}`}
              className="group block rounded-xl overflow-hidden no-underline"
              style={{
                backgroundColor: 'var(--card)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: 'var(--accent-light)' }}
                  >
                    <span
                      className="text-2xl font-bold"
                      style={{ color: 'var(--accent)', opacity: 0.3 }}
                    >
                      A
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3
                  className="font-bold leading-snug line-clamp-2 text-sm mb-1"
                  style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
                >
                  {title}
                </h3>
                {readTime > 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                    {readTime} min read
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
