import { getSupabaseAdmin } from '@/lib/supabase'
import type { ArticleType, ArticleContent, ProductCard, ImageSection } from '@/types/article'

/**
 * Photography style pool — randomly selected for each image to ensure variety.
 * Each simulates a real camera/lens/lighting setup to avoid the "AI look".
 */
const STYLE_POOL = [
  // Editorial / magazine
  'Editorial photograph. Shot on Canon EOS R5 with 35mm f/1.4 lens. Shallow depth of field, natural window light from the left. Slightly warm colour temperature. The scene looks lived-in and real, not staged. Subtle grain. No post-processing glow.',

  // Documentary / reportage
  'Documentary-style photograph. Shot on Fujifilm X-T5 with 23mm f/2 lens. Available light only, no flash. Slightly desaturated colours, natural shadows. Feels candid and unposed. Minor lens distortion at the edges.',

  // Lifestyle / editorial
  'Lifestyle editorial photograph. Shot on Sony A7IV with 50mm f/1.8 lens. Soft natural light, muted earth tones. Shallow focus with bokeh in the background. The scene feels casual and unforced, like a frame from someone\'s real life.',

  // Product / still life
  'Product photograph for a design magazine. Shot on Nikon Z8 with 85mm f/1.4 lens. Clean but not sterile — natural surface textures visible, soft directional light from above-right. Slightly cool white balance. No artificial reflections or perfect symmetry.',

  // Environmental / context
  'Environmental photograph. Shot on Leica Q3 with 28mm f/1.7 lens. Natural ambient light, real-world setting with slight imperfections visible. Muted colour palette, not oversaturated. Feels like a real moment captured, not generated.',

  // Overhead / flat lay
  'Overhead flat-lay photograph. Shot on Canon EOS R6 with 24-70mm f/2.8 lens at 35mm. Soft diffused daylight from a nearby window. Natural wood or concrete surface underneath. Items arranged with intention but not perfect symmetry. Subtle shadows.',
]

/**
 * Build a hero image subject from the article content.
 * Uses the plan's hero_image_subject if available, otherwise extracts from article data.
 */
function getSubject(article: ArticleContent): string {
  // Check if the article has a stored hero_image_subject from the plan
  const stored = (article as unknown as Record<string, unknown>).hero_image_subject as string | undefined
  if (stored && stored.length > 5) return stored

  const { title, article_type, sections } = article
  const productCards = sections.filter((s): s is ProductCard => s.type === 'product_card')
  const productNames = productCards.slice(0, 3).map(c => c.entity_name)

  // Product articles: show the products
  if (productNames.length > 0 && (article_type === 'buyer_guide' || article_type === 'comparison' || article_type === 'decision_guide')) {
    if (productNames.length === 1) return `${productNames[0]} in a real-world setting`
    if (productNames.length === 2) return `${productNames[0]} and ${productNames[1]} side by side on a desk`
    return `${productNames[0]}, ${productNames[1]}, and ${productNames[2]} arranged together`
  }

  // Topic-based subject extraction from title
  const t = title.toLowerCase()
  if (t.includes('robot vacuum')) return 'robot vacuum on a hardwood floor in a living room'
  if (t.includes('backpack')) return 'travel backpack in an airport terminal'
  if (t.includes('guitar')) return 'electric guitar leaning against an amplifier in a studio'
  if (t.includes('headphone')) return 'premium headphones on a minimal desk'
  if (t.includes('keyboard')) return 'mechanical keyboard on a clean desk setup'
  if (t.includes('laptop') || t.includes('macbook')) return 'laptop open on a wooden desk with coffee'
  if (t.includes('camera')) return 'mirrorless camera with lens on a photographer\'s desk'
  if (t.includes('phone') || t.includes('iphone') || t.includes('galaxy')) return 'smartphone on a marble surface'
  if (t.includes('drum')) return 'electronic drum kit in a home studio'
  if (t.includes('skincare')) return 'skincare products arranged on a bathroom shelf'
  if (t.includes('motorbike') || t.includes('motorcycle') || t.includes('superbike')) return 'sports motorcycle parked on a quiet road'
  if (t.includes('ev') || t.includes('electric car') || t.includes('tesla')) return 'electric car at a charging station'
  if (t.includes('dubai')) return 'Dubai marina skyline at golden hour'
  if (t.includes('mortgage') || t.includes('house') && t.includes('afford')) return 'house keys on paperwork on a kitchen table'
  if (t.includes('rent') && t.includes('buy')) return 'modern house exterior with a sold sign'
  if (t.includes('budget') || t.includes('finance')) return 'notebook with pen and calculator on a desk'
  if (t.includes('retire') || t.includes('retirement')) return 'reading glasses on financial documents'
  if (t.includes('invest') || t.includes('compound interest')) return 'glass jar of coins with a small plant growing out of it'
  if (t.includes('inflation')) return 'shopping cart with groceries in a supermarket aisle'
  if (t.includes('commute')) return 'morning commute traffic on a highway, aerial view'
  if (t.includes('freelance')) return 'laptop and notebook in a quiet coffee shop'
  if (t.includes('gym') || t.includes('workout')) return 'dumbbells and water bottle in a gym'
  if (t.includes('dog')) return 'golden retriever sitting in a park'
  if (t.includes('cooking') || t.includes('eating')) return 'fresh ingredients on a wooden cutting board in a kitchen'
  if (t.includes('smoking')) return 'broken cigarette next to a jar of coins'
  if (t.includes('subscription')) return 'smartphone showing app icons on a coffee table'
  if (t.includes('car') && (t.includes('spend') || t.includes('buy'))) return 'car key fob on the dashboard of a new car'
  if (t.includes('airbnb') || t.includes('rental')) return 'cozy vacation rental apartment interior'
  if (t.includes('baby') || t.includes('newborn')) return 'baby items — bottles, clothes, and toys — arranged on a nursery table'
  if (t.includes('college') || t.includes('university')) return 'university campus with autumn trees'
  if (t.includes('ai') || t.includes('llm') || t.includes('chatgpt')) return 'laptop screen showing code in a dimly lit room'
  if (t.includes('coding') || t.includes('programming')) return 'developer workspace with multiple monitors'
  if (t.includes('travel')) return 'passport and boarding pass on a wooden table'
  if (t.includes('salary') || t.includes('job') || t.includes('career')) return 'professional desk setup with notebook and pen'
  if (t.includes('espresso') || t.includes('coffee')) return 'espresso machine pulling a shot in a kitchen'
  if (t.includes('standing desk') || t.includes('home office')) return 'standing desk setup in a home office with natural light'

  // Fallback: use first 8 words of title as subject
  return title.split(/[:|]/).at(0)?.trim().split(' ').slice(0, 8).join(' ') + ' in a natural setting'
}

/**
 * Build the full image generation prompt using style pool + subject + critical rules.
 */
function buildImagePrompt(article: ArticleContent): { prompt: string; style: string } {
  const style = STYLE_POOL[Math.floor(Math.random() * STYLE_POOL.length)]
  const subject = getSubject(article)

  const prompt = `${style}

Subject: ${subject}

CRITICAL RULES:
- This must look like a real photograph taken by a human photographer
- No artificial glow, no HDR look, no oversaturated colours
- Include natural imperfections: slight dust, fingerprints on surfaces, uneven lighting, minor shadows
- No text, watermarks, logos, or overlaid graphics
- No people's faces (hands are fine)
- The image should feel like it belongs in a premium but understated publication — Monocle, Kinfolk, or Cereal magazine
- Absolutely no "AI art" aesthetic: no dreamlike blurring, no impossible lighting, no plastic textures
- Aspect ratio: 16:9 landscape`

  return { prompt, style }
}

/**
 * Generate a hero image using OpenAI GPT Image (gpt-image-1) and upload to Supabase Storage.
 * Returns the public URL of the uploaded image, or null on failure.
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
    const fullArticle: ArticleContent = 'sections' in article
      ? article
      : {
          ...article,
          quick_verdict: { recommendation: '', one_liner: '' },
          executive_summary: { short_answer: '', key_takeaways: [], watch_out_for: [] },
          sections: [],
        }

    const { prompt, style } = buildImagePrompt(fullArticle)
    console.log('[gpt-image] Style:', style.substring(0, 50) + '...')
    console.log('[gpt-image] Subject:', getSubject(fullArticle))

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
        size: '1536x1024',
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

    let buffer: Buffer
    if (imageData.b64_json) {
      buffer = Buffer.from(imageData.b64_json, 'base64')
    } else if (imageData.url) {
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

    // Store the style used in the article JSONB for tracking
    try {
      const { data: row } = await db.from('articles').select('article').eq('id', articleId).single()
      if (row?.article) {
        const updated = { ...row.article, hero_image_style: style.substring(0, 50) }
        await db.from('articles').update({ article: updated }).eq('id', articleId)
      }
    } catch {
      // Non-critical — don't fail the whole operation
    }

    return urlData.publicUrl
  } catch (err) {
    console.error('[gpt-image] Error:', err)
    return null
  }
}

/**
 * Pick the best existing image from the article to use as a hero.
 * Priority: first product card image > first image section image.
 */
export function pickBestArticleImage(article: ArticleContent): string | null {
  const productCards = article.sections.filter(
    (s): s is ProductCard => s.type === 'product_card'
  )
  for (const card of productCards) {
    if (card.image_url) return card.image_url
    if (card.image_urls?.[0]) return card.image_urls[0]
  }

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
