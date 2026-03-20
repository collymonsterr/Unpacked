import { getSupabaseAdmin } from '@/lib/supabase'
import type { ArticleType } from '@/types/article'

const IMAGEN_MODEL = 'imagen-4.0-fast-generate-001'
const IMAGEN_API = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict`

/**
 * Build a prompt for Imagen that produces a believable, magazine-quality hero image.
 *
 * Key principles:
 * - Never describe people doing things (looks fake fast)
 * - Focus on objects, environments, textures, and compositions
 * - Describe the PHOTOGRAPH, not the subject — as a photographer would brief a shoot
 * - Emphasize real-world photographic techniques (lens, lighting, film stock)
 * - Avoid AI tell-tales: no "floating" objects, no hyper-saturated colors, no symmetry
 */
function buildImagePrompt(title: string, articleType: ArticleType): string {
  const typeStyles: Partial<Record<ArticleType, string>> = {
    buyer_guide:
      'Overhead flat-lay photograph of premium products arranged on a matte concrete surface. Shot on a 50mm lens, f/2.8, natural window light from the left casting soft directional shadows. Slightly imperfect arrangement — one item rotated, a subtle crease in the backdrop. Warm neutral tones, desaturated palette. Shot on Fujifilm X-T5.',
    comparison:
      'Editorial still life of two or three products placed on a worn wooden surface with natural texture. Shallow depth of field, 85mm lens, soft backlight from a window. Muted earth tones, slight vignette. The kind of image you would see in Wirecutter or GQ product reviews. No staging, no props — just the products and the surface.',
    decision_guide:
      'Atmospheric lifestyle photograph of the environment related to the topic. Available light, slightly underexposed for mood. Shot on a 35mm lens with natural bokeh in the background. Muted film-like color grading reminiscent of Kodak Portra 400. No people visible, just the setting and objects that tell the story.',
    explainer:
      'Clean editorial photograph using a single subject or detail shot to represent the concept. Macro or close-up perspective, 90mm lens, razor-thin depth of field. Neutral background with one subtle accent color. The style of a Bloomberg Businessweek or Wired feature image.',
    news:
      'Bold, high-contrast editorial photograph with a photojournalistic feel. Wide-angle perspective, natural available light, strong leading lines. Slightly gritty and immediate — like a Reuters or AP feature photo. Desaturated color palette leaning cool.',
    planning:
      'Expansive landscape or destination photograph shot during golden hour. Wide-angle 24mm lens, deep depth of field, natural warmth. The sky takes up two-thirds of the frame. Rich but not oversaturated — the kind of image you see in Condé Nast Traveler or Afar magazine. No people, just the place.',
    trend_analysis:
      'Abstract architectural or urban detail photograph with strong geometric lines. Shot from an unusual angle — looking up or down. Cool-toned color grading, high contrast, deep shadows. Minimalist composition with lots of negative space. Bloomberg or Financial Times aesthetic.',
    tutorial:
      'Top-down workspace photograph showing tools and materials neatly but naturally arranged. Slight disorder — a pencil at an angle, a smudge on the surface. Warm directional light from one side. Shot on 35mm, f/4, on a lightly textured off-white background. Martha Stewart meets Kinfolk magazine.',
  }

  const style = typeStyles[articleType] ?? 'Editorial still-life photograph with natural window light, shallow depth of field, muted color palette. Shot on a prime lens. Magazine feature quality.'

  // The core instruction: describe the scene for THIS article topic, keeping it grounded
  return `${style}

Subject matter: ${title}. Show the objects, environment, or textures that relate to this topic — NOT people, NOT text, NOT logos, NOT watermarks, NOT brand names. The image should feel like it was taken by a professional editorial photographer for a print magazine. Imperfect, natural, and real.`
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
