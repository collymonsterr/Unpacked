import { NextRequest } from 'next/server'
import { after } from 'next/server'
import { planArticle, writeWithSonnet, buildOptionsPrompt } from '@/lib/claude'
import { writeWithGemini } from '@/lib/gemini-writer'
import { runBraveResearch } from '@/lib/brave-research'
import { enrichArticleWithImages, fetchThumbnailImage } from '@/lib/images'
import { pickBestArticleImage } from '@/lib/imagen'
import { runFactCheck, applyCorrections } from '@/lib/fact-check'
import { getSupabaseAdmin, createServerSupabase } from '@/lib/supabase'
import { generateUniqueSlug } from '@/lib/slug'
import { checkRateLimit, getRateLimitInfo } from '@/lib/rate-limit'
import { findCachedArticle } from '@/lib/query-cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = body?.query
    const generationOptions = body?.options ?? { length: 'standard', tone: 'opinionated', visual: 'standard' }

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return Response.json({ error: 'Query must be at least 3 characters' }, { status: 400 })
    }

    const trimmedQuery = query.trim()
    const forceNew = body?.forceNew === true

    // Check for cached similar article (skip if user explicitly wants a new one)
    if (!forceNew) {
      const cached = await findCachedArticle(trimmedQuery)
      if (cached) {
        return Response.json({
          id: cached.id,
          slug: cached.slug,
          cached: true,
          cachedTitle: cached.title,
        })
      }
    }

    // Check if user is authenticated and load their preferences
    let userId: string | undefined
    let userEmail: string | undefined
    let userName: string | undefined
    let userAvatar: string | undefined
    try {
      const supabase = await createServerSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
        userEmail = user.email ?? undefined
        userName = user.user_metadata?.full_name ?? undefined
        userAvatar = user.user_metadata?.avatar_url ?? undefined

        // Load profile preferences and merge into generation options
        const { data: profile } = await getSupabaseAdmin()
          .from('profiles')
          .select('location, currency, language')
          .eq('id', user.id)
          .single()

        if (profile) {
          if (profile.location) generationOptions.location = profile.location
          if (profile.currency && profile.currency !== 'USD') generationOptions.currency = profile.currency
          if (profile.language && profile.language !== 'en') generationOptions.language = profile.language
        }
      }
    } catch {
      // Not authenticated — continue as anonymous
    }

    // Rate limiting
    const { key, limit } = getRateLimitInfo(request, userId)
    const rateResult = await checkRateLimit(key, limit)
    if (!rateResult.allowed) {
      return Response.json(
        { error: "You've reached the generation limit. Try again in a bit." },
        { status: 429 }
      )
    }

    // Cleanup: reset articles stuck in 'generating' for >10 minutes
    // Fire-and-forget — runs on every new generation request, no cron needed
    getSupabaseAdmin()
      .from('articles')
      .update({ status: 'error' })
      .eq('status', 'generating')
      .lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .then(() => {}) // intentionally fire and forget

    // Generate slug from the query (not the title — we don't have it yet)
    const slug = await generateUniqueSlug(trimmedQuery)

    // Save to Supabase immediately with status 'planning' — no plan yet
    const { data, error } = await getSupabaseAdmin()
      .from('articles')
      .insert({
        slug,
        query: trimmedQuery,
        status: 'planning',
        generation_options: generationOptions,
        // Admin articles publish immediately; logged-in users start private; logged-out get unlisted
        visibility: (() => {
          if (!userId) return 'unlisted'
          const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
          if (adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase()) return 'published'
          return 'private'
        })(),
        ...(userId ? { user_id: userId, user_name: userName, user_avatar: userAvatar } : {}),
      })
      .select('id, slug')
      .single()

    if (error) throw error

    // Respond immediately — user navigates to article page in <1s
    // ALL work (plan, write, images, fact-check) runs in the background
    after(async () => {
      const db = getSupabaseAdmin()
      try {
        // Phase 1: Plan the article
        console.log('[create] Planning article for:', trimmedQuery.slice(0, 50), 'options:', JSON.stringify(generationOptions))
        const plan = await planArticle(trimmedQuery, generationOptions, data.id)

        // Generate clean slug from AI title and update
        const cleanSlug = await generateUniqueSlug(plan.title, data.id)

        // Update with plan data + clean slug — client sees this via polling
        await db
          .from('articles')
          .update({
            plan,
            slug: cleanSlug,
            suggestion_chips: plan.suggestion_chips,
            status: 'generating',
          })
          .eq('id', data.id)

        console.log('[create] Plan complete, now researching:', plan.title.slice(0, 50))

        // Phase 2a: Brave pre-research
        const length = (generationOptions?.length as 'quick' | 'standard' | 'deep') ?? 'standard'
        const research = await runBraveResearch(
          trimmedQuery,
          plan.entities ?? [],
          plan.article_type,
          length,
        )

        // Phase 2b: Write the article
        let rawArticle
        const isDeep = length === 'deep'

        if (isDeep) {
          console.log('[create] Writing with Sonnet (deep mode)')
          rawArticle = await writeWithSonnet(trimmedQuery, plan, research.summary, generationOptions, data.id)
        } else {
          try {
            console.log('[create] Writing with Gemini Flash')
            const optsPrompt = buildOptionsPrompt(generationOptions)
            rawArticle = await writeWithGemini(trimmedQuery, plan, research.summary, optsPrompt, data.id)
          } catch (geminiErr) {
            const geminiErrMsg = (geminiErr as Error).message
            console.log('[fallback] Gemini failed — falling back to Sonnet:', geminiErrMsg)
            rawArticle = await writeWithSonnet(trimmedQuery, plan, research.summary, generationOptions, data.id, geminiErrMsg)
          }
        }

        // Phase 3: Enrich images + hero thumbnail (parallel)
        const [enrichedArticle, heroUrl] = await Promise.all([
          enrichArticleWithImages(
            rawArticle,
            plan.entities,
            plan.visual_strategy?.image_density
          ),
          fetchThumbnailImage(
            rawArticle.title,
            rawArticle.article_type,
            undefined,
            plan.hero_image_query,
            rawArticle.quick_verdict?.one_liner ?? rawArticle.executive_summary?.short_answer ?? '',
            data.id
          ),
        ])

        enrichedArticle.thumbnail_url = heroUrl ?? pickBestArticleImage(enrichedArticle)

        // Store hero_image_query on article for future thumbnail replacements
        if (plan.hero_image_query) {
          (enrichedArticle as unknown as Record<string, unknown>).hero_image_query = plan.hero_image_query
        }

        // Save complete article
        await db
          .from('articles')
          .update({ article: enrichedArticle, status: 'complete' })
          .eq('id', data.id)

        console.log('[create] Article complete, starting fact-check')

        // Phase 4: Fact-check (non-blocking — article is already readable)
        try {
          const factCheckResult = await runFactCheck(enrichedArticle)
          let finalArticle = enrichedArticle
          if (factCheckResult.issues_found && factCheckResult.issues.length > 0) {
            finalArticle = applyCorrections(enrichedArticle, factCheckResult)
          }
          await db
            .from('articles')
            .update({
              article: finalArticle,
              fact_check: factCheckResult,
              verified_at: new Date().toISOString(),
              status: 'verified',
            })
            .eq('id', data.id)
          console.log('[create] Fact-check done:', factCheckResult.total_issues, 'issues')
        } catch (fcErr) {
          console.error('[create] Fact-check failed:', fcErr)
        }
      } catch (err) {
        const errCode = (err as NodeJS.ErrnoException).code
        const isRefused = errCode === 'PLANNING_REFUSED' || errCode === 'PLANNING_PARSE_ERROR'
        console.error(`[create] Generation failed (${errCode ?? 'unknown'}):`, err)
        await db
          .from('articles')
          .update({
            status: 'error',
            ...(isRefused && {
              generation_options: { ...(generationOptions ?? {}), _error: 'topic_refused' },
            }),
          })
          .eq('id', data.id)
      }
    })

    return Response.json({ id: data.id, slug: data.slug })
  } catch (err) {
    console.error('[create]', err)
    return Response.json({ error: 'Failed to create article' }, { status: 500 })
  }
}
