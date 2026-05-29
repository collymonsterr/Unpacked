/**
 * Image rehosting — download a chosen web image and serve it from our own
 * Supabase Storage bucket.
 *
 * Web images (Google Images results) can disappear, change, or block
 * hotlinking. Once the pipeline has picked an image, we copy it into the
 * `article-images` bucket so the article always has a stable URL we control —
 * the same pattern lib/imagen.ts uses for AI-generated heroes.
 *
 * On any failure (timeout, non-image, too large, upload error) returns null,
 * so callers keep the original URL or fall through to the next candidate.
 */

import { getSupabaseAdmin } from '@/lib/supabase'

const BUCKET = 'article-images'
const MAX_BYTES = 10 * 1024 * 1024 // 10MB
const DOWNLOAD_TIMEOUT_MS = 10_000

const FOLDER: Record<RehostKind, string> = {
  hero: 'heroes',
  section: 'sections',
  product: 'products',
}

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

export type RehostKind = 'hero' | 'section' | 'product'

/** True if the URL is already served from our own Supabase Storage. */
function isAlreadyOurs(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (base && url.startsWith(base)) return true
  return url.includes(`/storage/v1/object/public/${BUCKET}/`)
}

function extFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname.toLowerCase()
    const m = path.match(/\.(jpe?g|png|webp|gif|avif)$/)
    if (m) return m[1] === 'jpeg' ? 'jpg' : m[1]
  } catch {
    // ignore
  }
  return 'jpg'
}

/**
 * Download `sourceUrl` and upload it to Supabase Storage.
 * Returns the new public URL, or null on any failure.
 *
 * If the URL is already one of ours, it's returned unchanged (no-op).
 */
export async function rehostImage(
  sourceUrl: string,
  articleId: string,
  kind: RehostKind,
): Promise<string | null> {
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return null
  if (isAlreadyOurs(sourceUrl)) return sourceUrl

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)

  try {
    const res = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: {
        // Some hosts reject requests without a UA / referer.
        'User-Agent': 'Mozilla/5.0 (compatible; UnpackedBot/1.0; +https://unpacked.fyi)',
        Accept: 'image/*',
      },
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      console.warn(`[rehost] download failed ${res.status} for ${sourceUrl.slice(0, 60)}`)
      return null
    }

    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    const declaredLength = Number(res.headers.get('content-length') || 0)
    if (declaredLength && declaredLength > MAX_BYTES) {
      console.warn(`[rehost] too large (${declaredLength} bytes) for ${sourceUrl.slice(0, 60)}`)
      return null
    }

    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    if (buffer.length === 0 || buffer.length > MAX_BYTES) {
      console.warn(`[rehost] empty or oversize body (${buffer.length} bytes)`)
      return null
    }

    // Must be a real image. Accept by content-type, or by URL extension when
    // the server returns a generic/missing type.
    const looksImageByType = contentType.startsWith('image/')
    const looksImageByUrl = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(sourceUrl)
    if (!looksImageByType && !looksImageByUrl) {
      console.warn(`[rehost] not an image (content-type: "${contentType}") for ${sourceUrl.slice(0, 60)}`)
      return null
    }

    const ext = EXT_BY_TYPE[contentType] || extFromUrl(sourceUrl)
    const uploadType = contentType.startsWith('image/') ? contentType : `image/${ext === 'jpg' ? 'jpeg' : ext}`
    const rand = Math.random().toString(36).slice(2, 8)
    const fileName = `${FOLDER[kind]}/${articleId}-${Date.now()}-${rand}.${ext}`

    const db = getSupabaseAdmin()
    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(fileName, buffer, { contentType: uploadType, upsert: true })

    if (uploadError) {
      console.warn(`[rehost] upload error: ${uploadError.message}`)
      return null
    }

    const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(fileName)
    console.log(`[rehost] ${kind}: ${sourceUrl.slice(0, 50)} -> ${fileName}`)
    return urlData.publicUrl
  } catch (err) {
    clearTimeout(timeoutId)
    const isTimeout = (err as Error).name === 'AbortError'
    console.warn(`[rehost] failed${isTimeout ? ' (timeout)' : ''}: ${(err as Error).message}`)
    return null
  }
}
