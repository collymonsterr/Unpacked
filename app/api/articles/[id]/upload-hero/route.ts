import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireArticleOwner } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'
import type { ArticleContent } from '@/types/article'

export const maxDuration = 30

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

  // Parse multipart form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return Response.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate file type
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      { error: 'Invalid file type. Only JPG, PNG, and WebP are accepted.' },
      { status: 400 }
    )
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    return Response.json(
      { error: 'File too large. Maximum size is 5MB.' },
      { status: 400 }
    )
  }

  const db = getSupabaseAdmin()

  // Read file into buffer
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = EXT_MAP[file.type] ?? 'jpg'
  const storagePath = `hero-images/${id}/${Date.now()}.${ext}`

  // Upload to Supabase Storage
  const { error: uploadError } = await db.storage
    .from('article-images')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('[upload-hero] Storage error:', uploadError.message)
    return Response.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = db.storage
    .from('article-images')
    .getPublicUrl(storagePath)

  const publicUrl = urlData.publicUrl
  if (!publicUrl) {
    return Response.json({ error: 'Failed to get image URL' }, { status: 500 })
  }

  // Update article — save current hero to history, set new URL
  const { data: row } = await db.from('articles').select('article').eq('id', id).single()
  if (!row?.article) return Response.json({ error: 'Article not found' }, { status: 404 })

  const article = row.article as ArticleContent
  const history = article.thumbnail_history ?? []

  if (article.thumbnail_url && !history.includes(article.thumbnail_url)) {
    history.push(article.thumbnail_url)
  }

  article.thumbnail_url = publicUrl
  article.thumbnail_history = history

  await db.from('articles').update({ article }).eq('id', id)

  console.log('[upload-hero] Uploaded:', publicUrl, 'for article', id.slice(0, 8))

  return Response.json({ article })
}
