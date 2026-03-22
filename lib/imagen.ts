import { getSupabaseAdmin } from '@/lib/supabase'
import type { ArticleType, ArticleContent, ProductCard, ImageSection } from '@/types/article'

/**
 * Build an image prompt by analyzing what the article is actually about.
 *
 * Strategy:
 * - Product articles (buyer_guide, comparison): show the actual products by name
 * - Place articles (planning): show the destination
 * - Concept articles (explainer, trend_analysis, news): show a scene that represents the concept
 * - The quick verdict and entity names tell us exactly what to depict
 */
function buildImagePrompt(article: ArticleContent): string {
  const { title, article_type, quick_verdict, executive_summary, sections } = article

  // Extract product names if this is a product-focused article
  const productCards = sections.filter((s): s is ProductCard => s.type === 'product_card')
  const productNames = productCards.slice(0, 4).map((c) => c.entity_name)
  const topPick = quick_verdict?.recommendation
  const oneLiner = quick_verdict?.one_liner
  const shortAnswer = executive_summary?.short_answer

  // Context string — what the article concluded
  const context = [oneLiner, shortAnswer].filter(Boolean).join('. ').slice(0, 200)

  // Product-focused articles with actual physical products: show them
  if (
    (article_type === 'buyer_guide' || article_type === 'comparison') &&
    productNames.length > 0
  ) {
    const topProducts = productNames.slice(0, 3).join(', ')
    const surfaceOptions = [
      'a clean white desk',
      'a light marble countertop',
      'a minimal light grey surface',
      'a clean modern shelf',
    ]
    const surface = surfaceOptions[Math.floor(Math.random() * surfaceOptions.length)]

    return `Professional product photography of ${topProducts} arranged together on ${surface}. These are real, commercially available products — show them as they actually look. ${topPick ? `The main featured product is ${topPick}.` : ''}

Bright, even studio lighting. Clean, modern, commercial look. Eye-level angle. Sharp focus on the products. The style of a product review hero image on The Verge, Wirecutter, or TechRadar.

No people, no hands, no text, no words, no logos, no brand names written out, no watermarks. Photorealistic product photography.`
  }

  // Non-product comparisons or buyer guides (software, services, abstract topics)
  if (article_type === 'buyer_guide' || article_type === 'comparison') {
    return `Modern editorial photograph representing the technology or concept: ${title}. ${context}

Show the real-world devices, screens, interfaces, or environments where this technology is used. Bright, clean, modern aesthetic with vibrant accent colors. The style of a feature image on The Verge, Ars Technica, or TechCrunch.

No people, no faces, no text, no watermarks. Photorealistic editorial photography.`
  }

  // Planning/travel articles: show the destination
  if (article_type === 'planning') {
    return `Stunning travel photography: ${title}. ${context}

Show the actual destination, landmark, or environment that this article is about. Golden hour natural light, rich warm tones, wide scenic composition. The style of a Condé Nast Traveler or Lonely Planet cover photograph.

No people, no tourists, no text, no watermarks. Photorealistic landscape/travel photography.`
  }

  // Explainer articles: conceptual but specific to the topic
  if (article_type === 'explainer') {
    return `Editorial magazine photograph for an article about: ${title}. ${context}

Show a close-up, detailed scene that visually represents this specific topic. Use a single striking subject or object as the focal point. Dramatic side-lighting, shallow depth of field, vivid detail. The style of a Wired, National Geographic, or Scientific American feature image.

No people, no faces, no text, no watermarks. Photorealistic editorial photography.`
  }

  // Trend analysis: futuristic, data-driven aesthetic
  if (article_type === 'trend_analysis') {
    return `Modern editorial photograph representing the theme: ${title}. ${context}

Show real-world objects, technology, or environments that relate to this trend. Cool blue-teal tones, geometric composition, clean lines, lots of negative space. Shot from an interesting angle. The style of Bloomberg Businessweek or MIT Technology Review.

No people, no text, no watermarks. Photorealistic editorial photography.`
  }

  // News articles: photojournalistic feel
  if (article_type === 'news') {
    return `Photojournalistic editorial photograph about: ${title}. ${context}

Show the real-world scene, technology, or environment this news story is about. Natural available light, wide-angle perspective, cool desaturated tones. Immediate and attention-grabbing. The style of a Reuters, Bloomberg, or New York Times feature photograph.

No people, no faces, no text, no watermarks. Photorealistic editorial photography.`
  }

  // Decision guide: show the choice being made
  if (article_type === 'decision_guide') {
    if (productNames.length > 0) {
      const items = productNames.slice(0, 3).join(', ')
      return `Professional product photography showing ${items} in a real-world setting. These are real products — show them as they actually look, in the environment where someone would use them. Natural ambient lighting, warm tones, lifestyle context.

The style of a GQ, Consumer Reports, or Wirecutter buying guide hero image.

No people, no hands, no text, no watermarks. Photorealistic photography.`
    }
    return `Atmospheric editorial photograph about: ${title}. ${context}

Show the real-world environment or scene where this decision takes place. Warm ambient lighting, natural depth of field. Moody and aspirational. The style of a Monocle or Kinfolk feature.

No people, no text, no watermarks. Photorealistic editorial photography.`
  }

  // Tutorial: workspace with relevant tools
  if (article_type === 'tutorial') {
    return `Workspace photograph showing the tools and materials for: ${title}. ${context}

Show the actual items, tools, or setup someone would use for this. Arranged on a warm wooden desk with natural window light from the side. Inviting, lived-in, approachable. The style of a Bon Appétit or Kinfolk how-to feature.

No people, no hands, no text, no watermarks. Photorealistic photography.`
  }

  // Fallback: use the title and context
  return `Professional editorial magazine photograph for an article titled "${title}". ${context}

Show objects, products, or environments that directly relate to this topic. Clean composition, professional lighting, magazine feature quality.

No people, no text, no watermarks. Photorealistic photography.`
}

/**
 * Generate a hero image using OpenAI GPT Image (gpt-image-1) and upload to Supabase Storage.
 * Returns the public URL of the uploaded image, or null on failure.
 *
 * Pass the full article content so the prompt can be built from actual article data.
 */
export async function generateHeroImage(
  article: ArticleContent | { title: string; article_type: ArticleType },
  articleId: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('[gpt-image] OPENAI_API_KEY not set, skipping image generation')
    return null
  }

  try {
    // Build a smart prompt from the article content
    const fullArticle: ArticleContent = 'sections' in article
      ? article
      : {
          ...article,
          quick_verdict: { recommendation: '', one_liner: '' },
          executive_summary: { short_answer: '', key_takeaways: [], watch_out_for: [] },
          sections: [],
        }

    const prompt = buildImagePrompt(fullArticle)
    console.log('[gpt-image] Prompt:', prompt.substring(0, 150) + '...')

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1536x1024', // landscape, close to 16:9
        quality: 'high',
        output_format: 'jpeg',
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[gpt-image] API error:', res.status, text)
      return null
    }

    const data = await res.json()
    const imageData = data.data?.[0]

    if (!imageData) {
      console.error('[gpt-image] No image in response')
      return null
    }

    // GPT Image returns base64 in b64_json or a URL
    let buffer: Buffer
    if (imageData.b64_json) {
      buffer = Buffer.from(imageData.b64_json, 'base64')
    } else if (imageData.url) {
      // Download from URL
      const imgRes = await fetch(imageData.url)
      if (!imgRes.ok) {
        console.error('[gpt-image] Failed to download image from URL')
        return null
      }
      buffer = Buffer.from(await imgRes.arrayBuffer())
    } else {
      console.error('[gpt-image] No image data in response')
      return null
    }

    // Upload to Supabase Storage
    const fileName = `heroes/${articleId}-${Date.now()}.jpg`

    const db = getSupabaseAdmin()
    const { error: uploadError } = await db.storage
      .from('article-images')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('[gpt-image] Upload error:', uploadError.message)
      return null
    }

    const { data: urlData } = db.storage
      .from('article-images')
      .getPublicUrl(fileName)

    console.log('[gpt-image] Generated and uploaded:', urlData.publicUrl)
    return urlData.publicUrl
  } catch (err) {
    console.error('[gpt-image] Error:', err)
    return null
  }
}

/**
 * Pick the best existing image from the article to use as a hero.
 * Priority: first product card image > first image section image.
 * This is used as a final fallback when both AI generation and Brave fail.
 */
export function pickBestArticleImage(article: ArticleContent): string | null {
  // Try product card images first (the top pick / first product is usually most relevant)
  const productCards = article.sections.filter(
    (s): s is ProductCard => s.type === 'product_card'
  )
  for (const card of productCards) {
    if (card.image_url) return card.image_url
    if (card.image_urls?.[0]) return card.image_urls[0]
  }

  // Try image sections
  const imageSections = article.sections.filter(
    (s): s is ImageSection => s.type === 'image_section'
  )
  for (const section of imageSections) {
    for (const img of section.images) {
      if (img.image_url) return img.image_url
    }
  }

  return null
}
