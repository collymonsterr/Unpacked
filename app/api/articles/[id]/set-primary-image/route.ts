import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireArticleOwner } from '@/lib/auth-check'
import { isValidUUID, isNonNegativeInt } from '@/lib/validate'
import type { ArticleContent, ProductCard } from '@/types/article'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

  const { sectionIndex, imageIndex } = await request.json()
  if (!isNonNegativeInt(sectionIndex) || !isNonNegativeInt(imageIndex)) {
    return Response.json({ error: 'sectionIndex and imageIndex must be non-negative integers' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const { data: row } = await db.from('articles').select('article').eq('id', id).single()
  if (!row?.article) return Response.json({ error: 'Not found' }, { status: 404 })

  const article = row.article as ArticleContent
  const section = article.sections[sectionIndex]
  if (!section || section.type !== 'product_card') {
    return Response.json({ error: 'Invalid section' }, { status: 400 })
  }

  const card = section as ProductCard
  const urls = card.image_urls ?? (card.image_url ? [card.image_url] : [])

  if (imageIndex < 0 || imageIndex >= urls.length) {
    return Response.json({ error: 'Invalid image index' }, { status: 400 })
  }

  // Move the selected image to the front
  const newUrls = [...urls]
  const [selected] = newUrls.splice(imageIndex, 1)
  newUrls.unshift(selected)

  article.sections[sectionIndex] = {
    ...card,
    image_url: newUrls[0],
    image_urls: newUrls,
  }

  // Also update thumbnail_url if this is the first product card
  // (homepage cards use thumbnail_url or first product image)
  const firstProductIndex = article.sections.findIndex((s) => s.type === 'product_card')
  if (firstProductIndex === sectionIndex) {
    article.thumbnail_url = newUrls[0]
  }

  await db.from('articles').update({ article }).eq('id', id)

  return Response.json({ article })
}
