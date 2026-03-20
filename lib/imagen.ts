import { getSupabaseAdmin } from '@/lib/supabase'
import type { ArticleType } from '@/types/article'

const IMAGEN_MODEL = 'imagen-4.0-fast-generate-001'
const IMAGEN_API = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict`

/**
 * Build a prompt for Imagen that produces a magazine-quality hero image
 * tailored to the article type and topic.
 */
function buildImagePrompt(title: string, articleType: ArticleType): string {
  const typeStyles: Partial<Record<ArticleType, string>> = {
    buyer_guide:
      'Clean product showcase photograph with the main products elegantly arranged on a minimal surface. Professional studio lighting, soft shadows, shallow depth of field. Editorial product photography style.',
    comparison:
      'Side-by-side product comparison scene. Clean, professional studio photograph with products artfully arranged. Soft gradient background, studio lighting. Magazine editorial layout feel.',
    decision_guide:
      'Evocative lifestyle photograph capturing the essence of the decision being made. Cinematic lighting, rich colors, editorial magazine quality. Aspirational and inviting mood.',
    explainer:
      'Conceptual editorial photograph illustrating the core concept. Clean composition, thoughtful use of negative space, professional lighting. Magazine feature article style.',
    news:
      'Journalistic editorial photograph with dynamic composition. Bold, attention-grabbing, modern. News magazine cover quality.',
    planning:
      'Beautiful aspirational photograph capturing the destination or activity. Golden hour lighting, vivid colors, wide composition. Travel magazine cover quality.',
    trend_analysis:
      'Modern editorial photograph with a forward-looking, tech-savvy aesthetic. Clean lines, contemporary setting, professional lighting. Business magazine feature quality.',
    tutorial:
      'Clean, well-lit workspace photograph showing the tools or subject matter. Inviting, approachable, professional. Step-by-step guide hero image quality.',
  }

  const style = typeStyles[articleType] ?? 'Professional editorial photograph. Magazine cover quality, beautiful lighting and composition.'

  return `${style} Topic: "${title}". No text, no logos, no watermarks, no people's faces. Photorealistic, 8K quality.`
}

interface ImagenResponse {
  predictions?: Array<{
    bytesBase64Encoded: string
    mimeType: string
  }>
}

/**
 * Generate a hero image using Google Imagen 4 Fast and upload it to Supabase Storage.
 * Returns the public URL of the uploaded image, or null on failure.
 */
export async function generateHeroImage(
  title: string,
  articleType: ArticleType,
  articleId: string
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    console.warn('[imagen] GOOGLE_AI_API_KEY not set, skipping image generation')
    return null
  }

  try {
    const prompt = buildImagePrompt(title, articleType)

    const res = await fetch(`${IMAGEN_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          enhancePrompt: false,
          personGeneration: 'dont_allow',
          outputOptions: {
            mimeType: 'image/jpeg',
            compressionQuality: 85,
          },
        },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[imagen] API error:', res.status, text)
      return null
    }

    const data: ImagenResponse = await res.json()
    const prediction = data.predictions?.[0]
    if (!prediction?.bytesBase64Encoded) {
      console.error('[imagen] No image in response')
      return null
    }

    // Upload to Supabase Storage
    const buffer = Buffer.from(prediction.bytesBase64Encoded, 'base64')
    const fileName = `heroes/${articleId}-${Date.now()}.jpg`

    const db = getSupabaseAdmin()
    const { error: uploadError } = await db.storage
      .from('article-images')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('[imagen] Upload error:', uploadError.message)
      return null
    }

    const { data: urlData } = db.storage
      .from('article-images')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  } catch (err) {
    console.error('[imagen] Error:', err)
    return null
  }
}
