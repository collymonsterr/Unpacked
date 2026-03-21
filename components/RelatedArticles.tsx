'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { ArticleRow, ProductCard } from '@/types/article'

function getCardImage(row: ArticleRow): string | null {
  if (row.article?.thumbnail_url) return row.article.thumbnail_url
  const sections = row.article?.sections ?? []
  const firstCard = sections.find((s): s is ProductCard => s.type === 'product_card')
  return firstCard?.image_urls?.[0] ?? firstCard?.image_url ?? null
}

function getReadingTime(row: ArticleRow): number {
  if (!row.article) return 0
  let words = 0
  for (const section of row.article.sections) {
    const json = JSON.stringify(section)
    words += json.split(/\s+/).length
  }
  return Math.max(2, Math.round(words / 200))
}

interface Props {
  articleId: string
  articleType: string
}

export default function RelatedArticles({ articleId, articleType }: Props) {
  const [articles, setArticles] = useState<ArticleRow[]>([])

  useEffect(() => {
    fetch('/api/articles/recent')
      .then(res => res.json())
      .then((all: ArticleRow[]) => {
        // Exclude current article
        const others = all.filter(a => a.id !== articleId)

        // Match by type first
        const sameType = others.filter(
          a => (a.article?.article_type ?? a.plan?.article_type) === articleType
        )

        // Fill remaining slots with popular articles
        const remaining = others
          .filter(a => !sameType.includes(a))
          .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))

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
          const imageUrl = getCardImage(row)
          const title = row.article?.title ?? row.plan?.title ?? row.query
          const readTime = getReadingTime(row)

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
