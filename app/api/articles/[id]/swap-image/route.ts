import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireArticleOwner } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'

export const maxDuration = 15

interface SwapTarget {
  type: 'hero' | 'section' | 'product'
  sectionIndex?: number
  imageIndex?: number
  productIndex?: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

  let body: { imageUrl: string | null; target: SwapTarget }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { imageUrl, target } = body
  if (!target || !target.type) {
    return Response.json({ error: 'Missing target' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const { data: row, error: fetchError } = await db
    .from('articles')
    .select('article')
    .eq('id', id)
    .single()

  if (fetchError || !row?.article) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  const article = row.article as Record<string, unknown>
  const sections = article.sections as Array<Record<string, unknown>> | undefined

  try {
    switch (target.type) {
      case 'hero': {
        // Update the hero/thumbnail URL
        article.thumbnail_url = imageUrl
        if (imageUrl && article.hero_attribution) {
          // Clear attribution when replacing with user's own image
          article.hero_attribution = null
        }
        break
      }

      case 'section': {
        if (!sections || target.sectionIndex === undefined) {
          return Response.json({ error: 'Invalid section target' }, { status: 400 })
        }
        const section = sections[target.sectionIndex]
        if (!section || section.type !== 'image_section') {
          return Response.json({ error: 'Target section is not an image section' }, { status: 400 })
        }

        if (imageUrl === null) {
          // Remove the entire image_section
          sections.splice(target.sectionIndex, 1)
        } else {
          // Replace the image URL at the specified imageIndex
          const images = section.images as Array<Record<string, unknown>>
          const imgIdx = target.imageIndex ?? 0
          if (!images || !images[imgIdx]) {
            return Response.json({ error: 'Image index out of range' }, { status: 400 })
          }
          images[imgIdx].image_url = imageUrl
          images[imgIdx].source = 'user_upload'
        }
        break
      }

      case 'product': {
        if (!sections || target.sectionIndex === undefined) {
          return Response.json({ error: 'Invalid product target' }, { status: 400 })
        }
        const section = sections[target.sectionIndex]
        if (!section || section.type !== 'product_card') {
          return Response.json({ error: 'Target section is not a product card' }, { status: 400 })
        }

        const productImages = section.images as Array<string> | undefined
        const imgIdx = target.productIndex ?? 0

        if (imageUrl === null) {
          // Remove the image from the product
          if (productImages && productImages[imgIdx]) {
            productImages.splice(imgIdx, 1)
          }
        } else {
          // Replace or add the image
          if (productImages) {
            if (imgIdx < productImages.length) {
              productImages[imgIdx] = imageUrl
            } else {
              productImages.push(imageUrl)
            }
          } else {
            section.images = [imageUrl]
          }
        }
        break
      }

      default:
        return Response.json({ error: 'Unknown target type' }, { status: 400 })
    }

    // Save the updated article back
    const { error: updateError } = await db
      .from('articles')
      .update({ article })
      .eq('id', id)

    if (updateError) {
      console.error('[swap-image] Update error:', updateError.message)
      return Response.json({ error: 'Failed to update article' }, { status: 500 })
    }

    return Response.json({ ok: true, article })
  } catch (err) {
    console.error('[swap-image] Error:', (err as Error).message)
    return Response.json({ error: 'Failed to swap image' }, { status: 500 })
  }
}
