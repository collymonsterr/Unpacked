export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { getSupabaseAdmin, createServerSupabase } from '@/lib/supabase'
import type { ArticleRow } from '@/types/article'
import EditFullClient from './EditFullClient'

interface Props {
  params: Promise<{ slug: string }>
}

async function getArticle(slug: string): Promise<ArticleRow | null> {
  const isUUID = /^[0-9a-f-]{36}$/i.test(slug)
  const db = getSupabaseAdmin()

  if (isUUID) {
    const { data } = await db.from('articles').select('*').eq('id', slug).single()
    return (data as ArticleRow) ?? null
  }

  const { data } = await db.from('articles').select('*').eq('slug', slug).single()
  if (data) return data as ArticleRow

  const { data: fuzzy } = await db
    .from('articles')
    .select('*')
    .ilike('slug', `${slug.slice(0, 30)}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (fuzzy as ArticleRow) ?? null
}

export default async function ArticleEditPage({ params }: Props) {
  const { slug } = await params
  const row = await getArticle(slug)
  if (!row) notFound()
  if (!row.article) {
    // No article body yet (still generating). Bounce back to the article page.
    redirect(`/article/${row.slug}`)
  }

  // Owner-or-admin gate (server-side)
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/article/${row.slug}`)

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL
  const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? process.env.ADMIN_USER_ID
  const isAdmin =
    (!!adminId && user.id === adminId) ||
    (!!adminEmail && !!user.email && user.email.toLowerCase() === adminEmail.toLowerCase())
  const isOwner = !!row.user_id && row.user_id === user.id

  if (!isOwner && !isAdmin) {
    redirect(`/article/${row.slug}`)
  }

  return <EditFullClient row={row} />
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  return {
    title: `Edit · ${slug} | Unpacked`,
    robots: { index: false, follow: false },
  }
}
