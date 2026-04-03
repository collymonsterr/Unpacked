import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'

export const maxDuration = 30

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireAuth()
  if (!auth.authorized) return auth.error!

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

  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      { error: 'Invalid file type. Only JPG, PNG, WebP, and GIF are accepted.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE) {
    return Response.json(
      { error: 'Image must be under 5MB.' },
      { status: 400 }
    )
  }

  const db = getSupabaseAdmin()
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = EXT_MAP[file.type] ?? 'jpg'
  const storagePath = `refine-images/${id}/${Date.now()}.${ext}`

  const { error: uploadError } = await db.storage
    .from('article-images')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('[upload-refine-image] Storage error:', uploadError.message)
    return Response.json({ error: 'Image upload failed. Please try again.' }, { status: 500 })
  }

  const { data: urlData } = db.storage
    .from('article-images')
    .getPublicUrl(storagePath)

  const publicUrl = urlData.publicUrl
  if (!publicUrl) {
    return Response.json({ error: 'Failed to get image URL' }, { status: 500 })
  }

  return Response.json({ url: publicUrl })
}
