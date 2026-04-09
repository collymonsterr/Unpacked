export const maxDuration = 300 // 5 minutes — admin regenerate runs full pipeline

import { NextRequest, after } from 'next/server'
import { writeWithSonnet } from '@/lib/claude'
import { writeWithGemini } from '@/lib/gemini-writer'
import { runBraveResearch } from '@/lib/brave-research'
import { enrichArticleWithImages, fetchThumbnailImage } from '@/lib/images'
import { pickBestArticleImage } from '@/lib/imagen'
import { runFactCheck, applyCorrections } from '@/lib/fact-check'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'

// Domain patterns for link categorization
const REVIEW_DOMAINS = ['rtings.com', 'wirecutter.com', 'theverge.com', 'techradar.com', 'pcmag.com', 'tomsguide.com', 'soundguys.com', 'dpreview.com', 'gsmarena.com', 'cnet.com', 'engadget.com', 'whatifi.com', 'headfi.org']
const RETAILER_DOMAINS = ['bestbuy.com', 'currys.co.uk', 'johnlewis.com', 'bhphotovideo.com', 'sweetwater.com', 'walmart.com', 'target.com', 'adorama.com', 'newegg.com']

interface EntityLinks {
  [entityName: string]: { label: string; url: string }[]
}

/**
 * Extract per-entity links from research sources.
 * Categorizes URLs and assigns them to matching entities.
 */
function extractEntityLinks(
  sources: { title: string; url: string }[],
  entities: { name: string }[]
): EntityLinks {
  const result: EntityLinks = {}

  for (const entity of entities) {
    const name = entity.name.toLowerCase()
    const links: { label: string; url: string; priority: number }[] = []

    for (const source of sources) {
      const titleLower = source.title.toLowerCase()
      const urlLower = source.url.toLowerCase()

      // Check if this source is relevant to this entity
      const nameWords = name.split(/\s+/).filter(w => w.length > 2)
      const matchCount = nameWords.filter(w => titleLower.includes(w) || urlLower.includes(w)).length
      const isRelevant = matchCount >= Math.min(2, nameWords.length)

      if (!isRelevant) continue

      const domain = new URL(source.url).hostname.replace('www.', '')

      // Categorize
      if (urlLower.includes('amazon.com') || urlLower.includes('amazon.co')) {
        links.push({ label: 'Amazon', url: source.url, priority: 1 })
      } else if (urlLower.includes('reddit.com')) {
        links.push({ label: 'Reddit Discussion', url: source.url, priority: 4 })
      } else if (REVIEW_DOMAINS.some(d => domain.includes(d))) {
        const siteName = source.title.split(/[|\-–—]/).pop()?.trim() ?? domain
        links.push({ label: siteName, url: source.url, priority: 2 })
      } else if (RETAILER_DOMAINS.some(d => domain.includes(d))) {
        links.push({ label: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1), url: source.url, priority: 3 })
      } else {
        // Could be manufacturer or other — check if domain contains brand name
        const brandWords = name.split(/\s+/).slice(0, 2)
        const isBrandSite = brandWords.some(w => domain.includes(w.toLowerCase()))
        if (isBrandSite) {
          links.push({ label: 'Official Site', url: source.url, priority: 0 })
        } else {
          links.push({ label: source.title.slice(0, 40), url: source.url, priority: 5 })
        }
      }
    }

    // Deduplicate by priority category and take top 5
    const seen = new Set<number>()
    const deduped = links
      .sort((a, b) => a.priority - b.priority)
      .filter(l => {
        if (seen.has(l.priority)) return false
        seen.add(l.priority)
        return true
      })
      .slice(0, 5)

    if (deduped.length > 0) {
      result[entity.name] = deduped.map(({ label, url }) => ({ label, url }))
    }
  }

  return result
}

function formatEntityLinksForPrompt(entityLinks: EntityLinks): string {
  const lines: string[] = []
  lines.push('ENTITY LINKS (use these real URLs in product card links — do NOT invent URLs):')
  for (const [name, links] of Object.entries(entityLinks)) {
    lines.push(`- ${name}:`)
    for (const link of links) {
      lines.push(`  ${link.label}: ${link.url}`)
    }
  }
  return lines.join('\n')
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const db = getSupabaseAdmin()
  const { data: row, error: fetchError } = await db
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !row) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  if (!row.plan) {
    return Response.json({ error: 'Article has no plan' }, { status: 400 })
  }

  await db.from('articles').update({ status: 'generating' }).eq('id', id)

  after(async () => {
    const bgDb = getSupabaseAdmin()
    try {
      const storedOptions = row.generation_options ?? undefined
      const length = storedOptions?.length ?? 'standard'
      const isDeep = length === 'deep'

      // Step 1: Brave pre-research
      console.log('[generate] Running Brave research for', id.slice(0, 8))
      const research = await runBraveResearch(
        row.query,
        row.plan.entities ?? [],
        row.plan.article_type,
        length as 'quick' | 'standard' | 'deep',
      )

      // Log Brave Search cost (~$0.005 per query)
      try {
        const { logApiCall } = await import('@/lib/api-usage')
        logApiCall({
          callType: 'brave_search',
          model: 'brave-search-api',
          inputTokens: research.searchCount * 50, // nominal tokens for cost tracking
          outputTokens: research.tokenEstimate,
          articleId: id,
        })
      } catch {}

      // Step 1b: Extract per-entity links from research sources
      const entityLinks = extractEntityLinks(research.sources, row.plan.entities ?? [])
      const entityLinksPrompt = Object.keys(entityLinks).length > 0
        ? '\n\n' + formatEntityLinksForPrompt(entityLinks)
        : ''
      const researchWithLinks = research.summary + entityLinksPrompt

      // Step 2: Write article
      let rawArticle
      if (isDeep) {
        // Deep articles use Sonnet (higher quality, more output tokens)
        console.log('[generate] Writing with Sonnet (deep mode)')
        rawArticle = await writeWithSonnet(row.query, row.plan, researchWithLinks, storedOptions, id)
      } else {
        // Standard/quick use Gemini Flash (fast, cheap)
        try {
          console.log('[generate] Writing with Gemini Flash')
          const optionsPrompt = storedOptions ? buildSimpleOptionsPrompt(storedOptions) : ''
          rawArticle = await writeWithGemini(row.query, row.plan, researchWithLinks, optionsPrompt, id)
        } catch (geminiErr) {
          // Fallback to Sonnet if Gemini fails
          const geminiErrMsg = (geminiErr as Error).message
          console.log('[fallback] Gemini Flash failed — falling back to Sonnet:', geminiErrMsg)
          rawArticle = await writeWithSonnet(row.query, row.plan, researchWithLinks, storedOptions, id, geminiErrMsg)
        }
      }

      // Step 3: Image enrichment + hero image (parallel)
      const [enrichedArticle, heroUrl] = await Promise.all([
        enrichArticleWithImages(
          rawArticle,
          row.plan.entities,
          row.plan.visual_strategy?.image_density
        ),
        fetchThumbnailImage(
          rawArticle.title,
          rawArticle.article_type,
          undefined,
          row.plan.hero_image_query,
          rawArticle.quick_verdict?.one_liner ?? rawArticle.executive_summary?.short_answer ?? '',
          id
        ),
      ])

      if (row.plan.hero_image_subject) {
        (enrichedArticle as unknown as Record<string, unknown>).hero_image_subject = row.plan.hero_image_subject
      }
      if (row.plan.hero_image_query) {
        (enrichedArticle as unknown as Record<string, unknown>).hero_image_query = row.plan.hero_image_query
      }

      enrichedArticle.thumbnail_url = heroUrl ?? pickBestArticleImage(enrichedArticle)

      await bgDb
        .from('articles')
        .update({ article: enrichedArticle, status: 'complete' })
        .eq('id', id)

      // Step 4: Fact-check (background)
      try {
        console.log('[generate] Starting fact-check for', id.slice(0, 8))
        const factCheckResult = await runFactCheck(enrichedArticle)
        let finalArticle = enrichedArticle
        if (factCheckResult.issues_found && factCheckResult.issues.length > 0) {
          finalArticle = applyCorrections(enrichedArticle, factCheckResult)
        }
        await bgDb
          .from('articles')
          .update({
            article: finalArticle,
            fact_check: factCheckResult,
            verified_at: new Date().toISOString(),
            status: 'verified',
          })
          .eq('id', id)
        console.log('[generate] Fact-check done:', factCheckResult.total_issues, 'issues')
      } catch (fcErr) {
        console.error('[generate] Fact-check failed:', fcErr)
      }
    } catch (err) {
      console.error('[generate]', err)
      await bgDb.from('articles').update({ status: 'error' }).eq('id', id)
    }
  })

  return Response.json({ success: true, status: 'generating' })
}

// Simple options prompt for Gemini (keep short)
function buildSimpleOptionsPrompt(options: Record<string, unknown>): string {
  const parts: string[] = []
  if (options.length === 'quick') parts.push('LENGTH: Concise quick-read. 800-1200 words. Fewer sections, tighter writing.')
  if (options.length === 'deep') parts.push('LENGTH: Comprehensive deep-dive. 4000-6000 words.')
  if (options.tone === 'balanced') parts.push('TONE: Balanced. Present all options fairly.')
  if (options.tone === 'technical') parts.push('TONE: Technical. Expert audience, assume domain knowledge, skip basics.')
  if (options.visual === 'minimal') parts.push('VISUALS: Minimal. Focus on text.')
  if (options.visual === 'maximum') parts.push('VISUALS: Maximum. Charts in every section.')
  if (options.location) parts.push(`LOCATION: ${options.location} (only if topic-relevant)`)
  if (options.currency && options.currency !== 'USD') parts.push(`CURRENCY: ${options.currency}`)
  if (options.language && options.language !== 'en') parts.push(`LANGUAGE: Write in ${options.language}`)
  return parts.length > 0 ? '\n\nPREFERENCES:\n' + parts.join('\n') : ''
}
