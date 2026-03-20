export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { ArticleRow } from '@/types/article'
import ArticlePageClient from './ArticlePageClient'

interface Props {
  params: Promise<{ slug: string }>
}

async function getArticle(slug: string): Promise<ArticleRow | null> {
  // Support UUID or slug
  const isUUID = /^[0-9a-f-]{36}$/i.test(slug)

  const query = getSupabaseAdmin().from('articles').select('*')
  const { data, error } = isUUID
    ? await query.eq('id', slug).single()
    : await query.eq('slug', slug).single()

  if (error || !data) return null
  return data as ArticleRow
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const row = await getArticle(slug)

  if (!row) notFound()

  // isOwner is determined client-side via localStorage (no auth for MVP)
  return <ArticlePageClient initialRow={row} />
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const row = await getArticle(slug)

  if (!row) return {}

  const title = row.article?.title ?? row.plan?.title ?? row.query

  return {
    title: `${title} — ArticleAI`,
    description: row.article?.quick_verdict?.one_liner ?? row.plan?.quick_verdict_preview ?? '',
  }
}
