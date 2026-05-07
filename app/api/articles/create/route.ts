import { NextRequest } from 'next/server'
import { after } from 'next/server'
import { planArticle } from '@/lib/claude'
import { executeResearch } from '@/lib/research-orchestrator'
import { getSupabaseAdmin, createServerSupabase } from '@/lib/supabase'
import { generateUniqueSlug } from '@/lib/slug'
import { checkRateLimit, getRateLimitInfo } from '@/lib/rate-limit'
import { findCachedArticle } from '@/lib/query-cache'
import { buildResearchPreview } from '@/lib/research-preview'
import { runWritePipeline } from '@/lib/write-pipeline'
import { detectUrls, prefetchUrls, extractUserRequest, buildPrefetchContext, type PrefetchedContent } from '@/lib/url-prefetch'

export const maxDuration = 300 // 5 minutes — deep articles need 2-3 min for full pipeline

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = body?.query
    const generationOptions = body?.options ?? { length: 'standard', tone: 'opinionated', visual: 'standard' }
    const planData = body?.planData // From Plan Mode — contains plan + research + optional userFeedback

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

        // Load profile preferences (including display name) and merge into generation options
        const { data: profile } = await getSupabaseAdmin()
          .from('profiles')
          .select('display_name, avatar_url, location, currency, language')
          .eq('id', user.id)
          .single()

        if (profile) {
          // Prefer custom display name over Google OAuth name
          if (profile.display_name) userName = profile.display_name
          if (profile.avatar_url) userAvatar = profile.avatar_url
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

    // Tier-based article allowance check (skip for admin and anonymous users)
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    const isAdmin = !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase())

    if (userId && !isAdmin) {
      const { data: tierProfile } = await getSupabaseAdmin()
        .from('profiles')
        .select('tier, articles_used_this_month, bonus_credits, month_reset_date, monthly_article_limit')
        .eq('id', userId)
        .single()

      if (tierProfile) {
        // Reset monthly counter if past reset date
        const resetDate = new Date(tierProfile.month_reset_date)
        const now = new Date()
        if (now >= resetDate) {
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

          // Check if founding creator — add 10 bonus credits on reset
          const { data: fcProfile } = await getSupabaseAdmin()
            .from('profiles')
            .select('is_founding_creator, bonus_credits')
            .eq('id', userId)
            .single()

          const foundingBonus = fcProfile?.is_founding_creator ? 10 : 0

          await getSupabaseAdmin()
            .from('profiles')
            .update({
              articles_used_this_month: 0,
              month_reset_date: nextMonth.toISOString(),
              ...(foundingBonus > 0 ? { bonus_credits: (fcProfile?.bonus_credits ?? 0) + foundingBonus } : {}),
            })
            .eq('id', userId)
          tierProfile.articles_used_this_month = 0
          tierProfile.month_reset_date = nextMonth.toISOString()
          if (foundingBonus > 0) {
            tierProfile.bonus_credits = (fcProfile?.bonus_credits ?? 0) + foundingBonus
          }
        }

        const remaining = (tierProfile.monthly_article_limit - tierProfile.articles_used_this_month) + (tierProfile.bonus_credits ?? 0)
        if (remaining <= 0) {
          return Response.json(
            {
              error: 'limit_reached',
              tier: tierProfile.tier,
              limit: tierProfile.monthly_article_limit,
              nextReset: tierProfile.month_reset_date,
            },
            { status: 403 }
          )
        }

        // Increment usage: use bonus credits only when tier limit is exceeded
        if (tierProfile.articles_used_this_month >= tierProfile.monthly_article_limit) {
          await getSupabaseAdmin()
            .from('profiles')
            .update({ bonus_credits: Math.max(0, (tierProfile.bonus_credits ?? 0) - 1) })
            .eq('id', userId)
        } else {
          await getSupabaseAdmin()
            .from('profiles')
            .update({ articles_used_this_month: tierProfile.articles_used_this_month + 1 })
            .eq('id', userId)
        }
      }
    }

    // Cleanup: reset articles stuck in 'generating' for >10 minutes
    // Fire-and-forget — runs on every new generation request, no cron needed
    getSupabaseAdmin()
      .from('articles')
      .update({ status: 'error' })
      .eq('status', 'generating')
      .lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .then(() => {}) // intentionally fire and forget

    // Cleanup: reset articles stuck in 'awaiting_auth' for >24 hours
    getSupabaseAdmin()
      .from('articles')
      .update({ status: 'error' })
      .eq('status', 'awaiting_auth')
      .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .then(() => {}) // intentionally fire and forget

    // Generate slug from the query (not the title — we don't have it yet)
    const slug = await generateUniqueSlug(trimmedQuery)

    const isAuthenticated = !!userId

    // Save to Supabase immediately with status 'planning' — no plan yet
    const { data, error } = await getSupabaseAdmin()
      .from('articles')
      .insert({
        slug,
        query: trimmedQuery,
        status: 'planning',
        generation_options: generationOptions,
        // Logged-in users default to published; anonymous get unlisted
        visibility: (() => {
          if (!userId) return 'unlisted'
          return 'published'
        })(),
        ...(userId ? { user_id: userId, user_name: userName, user_avatar: userAvatar } : {}),
      })
      .select('id, slug')
      .single()

    if (error) throw error

    // Respond immediately — user navigates to article page in <1s
    // Background work runs in after() — differs based on auth status
    after(async () => {
      const db = getSupabaseAdmin()
      const t: Record<string, number> = {}
      const pipelineStart = Date.now()
      try {
        // ── PLAN MODE: skip planning + research if planData is provided ──
        if (planData?.plan && planData?.research) {
          console.log('[create] Plan Mode — skipping plan + research, jumping to write pipeline')
          const plan = planData.plan
          const research = planData.research

          // Generate clean slug from AI title and update
          const cleanSlug = await generateUniqueSlug(plan.title, data.id)

          // Update with plan data + clean slug — transition to 'generating' immediately
          await db
            .from('articles')
            .update({
              plan,
              slug: cleanSlug,
              suggestion_chips: plan.suggestion_chips,
              status: 'generating',
              ...(plan.category ? { category: plan.category } : {}),
            })
            .eq('id', data.id)

          // Save research data
          const researchUpdate: Record<string, unknown> = {}
          if (research.findings?.length > 0) researchUpdate.research_findings = research.findings
          researchUpdate.entity_cards = research.entityCards ?? []
          if (research.synthesis) researchUpdate.research_synthesis = research.synthesis
          if (research.liveData?.length > 0) researchUpdate.live_data = research.liveData
          // Always persist twitter_findings (even as []) so we can distinguish
          // "planner didn't ask" (null) from "ran but nothing came back" ([]).
          researchUpdate.twitter_findings = research.twitterFindings ?? []
          if (research.twitterSummary) researchUpdate.twitter_summary = research.twitterSummary
          if (research.twitterSentimentSplit) researchUpdate.twitter_sentiment_split = research.twitterSentimentSplit
          if (research.twitterContextTrigger) researchUpdate.twitter_context_trigger = research.twitterContextTrigger
          if (research.twitterPostsAnalysed > 0) researchUpdate.twitter_posts_analysed = research.twitterPostsAnalysed
          // Reddit threads as top-level column (full pool for remove/replace mechanic)
          if (research.redditThreadsPool?.length > 0) researchUpdate.reddit_threads = research.redditThreadsPool
          if (research.redditSentimentSplit) researchUpdate.reddit_sentiment_split = research.redditSentimentSplit
          if (research.redditContextTrigger) researchUpdate.reddit_context_trigger = research.redditContextTrigger
          if (research.redditThreadsAnalysed > 0) researchUpdate.reddit_threads_analysed = research.redditThreadsAnalysed
          if (Object.keys(researchUpdate).length > 0) {
            await db.from('articles').update(researchUpdate).eq('id', data.id)
          }

          // Inject userFeedback into generationOptions so blueprint can use it
          if (planData.userFeedback) {
            generationOptions._userFeedback = planData.userFeedback
          }

          if (isAuthenticated) {
            await runWritePipeline({
              articleId: data.id,
              query: trimmedQuery,
              plan,
              researchSummary: research.summary,
              generationOptions,
              entityCards: research.entityCards,
              synthesis: research.synthesis,
              liveData: research.liveData,
              videoFindings: research.videoFindings,
              _timings: t,
            })
          } else {
            // Anonymous with plan mode — build preview and pause
            const preview = buildResearchPreview(plan, research.findings, research.entityCards, research.synthesis)
            await db
              .from('articles')
              .update({ research_preview: preview, status: 'awaiting_auth' })
              .eq('id', data.id)
          }
          return
        }

        // ── STANDARD FLOW: Plan + Research from scratch ──

        // ── Phase 0: Detect and prefetch URLs ──
        let planQuery = trimmedQuery
        let prefetched: PrefetchedContent[] = []
        const urlDetections = detectUrls(trimmedQuery)
        if (urlDetections.length > 0) {
          console.log(`[create] Detected ${urlDetections.length} URL(s):`, urlDetections.map(d => `${d.type}:${d.label}`).join(', '))
          prefetched = await prefetchUrls(urlDetections)
          if (prefetched.length > 0) {
            const userRequest = extractUserRequest(trimmedQuery)
            planQuery = buildPrefetchContext(prefetched, userRequest)
            console.log(`[create] Injecting ${prefetched.length} prefetched source(s) into planning context`)

            // Store source data on the article record
            const sourceData: Record<string, unknown> = {}
            const tweetSource = prefetched.find(p => p.type === 'tweet')
            if (tweetSource) {
              sourceData.source_tweet = tweetSource.sourceMeta
            }
            const redditSource = prefetched.find(p => p.type === 'reddit')
            if (redditSource) {
              sourceData.source_reddit = redditSource.sourceMeta
            }
            const articleSource = prefetched.find(p => p.type === 'article')
            if (articleSource) {
              sourceData.source_article = articleSource.sourceMeta
            }
            if (Object.keys(sourceData).length > 0) {
              // Merge into generation_options JSONB
              await db
                .from('articles')
                .update({
                  generation_options: { ...generationOptions, ...sourceData },
                })
                .eq('id', data.id)
            }
          }
        }

        // ── Phase 1: Plan the article ──
        console.log('[create] Planning article for:', trimmedQuery.slice(0, 50), 'options:', JSON.stringify(generationOptions))
        const t0 = Date.now()
        const plan = await planArticle(planQuery, generationOptions, data.id)
        t.planning_ms = Date.now() - t0

        // Generate clean slug from AI title and update
        const cleanSlug = await generateUniqueSlug(plan.title, data.id)

        // Update with plan data + clean slug — client sees this via polling
        const t1 = Date.now()
        await db
          .from('articles')
          .update({
            plan,
            slug: cleanSlug,
            suggestion_chips: plan.suggestion_chips,
            status: 'generating',
            ...(plan.category ? { category: plan.category } : {}),
          })
          .eq('id', data.id)
        t.plan_save_ms = Date.now() - t1

        // ── Phase 2: Parallel research via orchestrator ──
        // research_manifest is guaranteed by planArticle() (fallback built if AI didn't return one)
        const length = (generationOptions?.length as 'quick' | 'standard' | 'deep') ?? 'standard'
        const manifest = plan.research_manifest ?? {
          brave_queries: [{ query: trimmedQuery, purpose: 'core_facts' as const }],
          reddit_queries: [{ query: trimmedQuery, subreddits: [] }],
          image_queries: { hero: { query: trimmedQuery, style: 'editorial_photo' as const }, products: [] },
        }
        const t2 = Date.now()
        const research = await executeResearch(
          manifest,
          plan,
          length,
          data.id,
        )
        t.research_ms = Date.now() - t2

        // Save research findings + entity cards + synthesis + live data + twitter immediately — preserved even if writing fails
        const researchUpdate: Record<string, unknown> = {}
        if (research.findings.length > 0) researchUpdate.research_findings = research.findings
        researchUpdate.entity_cards = research.entityCards ?? []
        if (research.synthesis) researchUpdate.research_synthesis = research.synthesis
        if (research.liveData && research.liveData.length > 0) researchUpdate.live_data = research.liveData
        // Always persist twitter_findings (even as []) so we can distinguish
        // "planner didn't ask" (null) from "ran but nothing came back" ([]).
        researchUpdate.twitter_findings = research.twitterFindings ?? []
        if (research.twitterSummary) researchUpdate.twitter_summary = research.twitterSummary
        if (research.twitterSentimentSplit) researchUpdate.twitter_sentiment_split = research.twitterSentimentSplit
        if (research.twitterContextTrigger) researchUpdate.twitter_context_trigger = research.twitterContextTrigger
        if (research.twitterPostsAnalysed > 0) researchUpdate.twitter_posts_analysed = research.twitterPostsAnalysed
        // Reddit threads as top-level column (full pool for remove/replace mechanic)
        if (research.redditThreadsPool?.length > 0) researchUpdate.reddit_threads = research.redditThreadsPool
        if (research.redditSentimentSplit) researchUpdate.reddit_sentiment_split = research.redditSentimentSplit
        if (research.redditContextTrigger) researchUpdate.reddit_context_trigger = research.redditContextTrigger
        if (research.redditThreadsAnalysed > 0) researchUpdate.reddit_threads_analysed = research.redditThreadsAnalysed
        if (Object.keys(researchUpdate).length > 0) {
          const t3 = Date.now()
          const { error: saveErr } = await db
            .from('articles')
            .update(researchUpdate)
            .eq('id', data.id)
          t.research_save_ms = Date.now() - t3
          if (saveErr) console.error('[create] SAVE ERROR:', saveErr)
        }

        const preWriteTotal = Date.now() - pipelineStart
        console.log(`[timing] Pre-write: plan=${t.planning_ms}ms research=${t.research_ms}ms saves=${(t.plan_save_ms ?? 0) + (t.research_save_ms ?? 0)}ms total=${preWriteTotal}ms`)

        // ── Fork: authenticated users continue to writing; anonymous users pause ──
        if (isAuthenticated) {
          // Authenticated: run the full writing pipeline without pausing
          await runWritePipeline({
            articleId: data.id,
            query: trimmedQuery,
            plan,
            researchSummary: research.summary,
            generationOptions,
            entityCards: research.entityCards,
            synthesis: research.synthesis,
            liveData: research.liveData,
            videoFindings: research.videoFindings,
            _timings: t,
          })
        } else {
          // Anonymous: build preview, save it, and pause at awaiting_auth
          console.log('[create] Anonymous user — pausing at research preview:', plan.title.slice(0, 50))
          const preview = buildResearchPreview(plan, research.findings, research.entityCards, research.synthesis)

          await db
            .from('articles')
            .update({
              research_preview: preview,
              status: 'awaiting_auth',
            })
            .eq('id', data.id)

          // Pipeline stops here. Writing will be triggered by /api/articles/[id]/start-writing
          // after the user signs in and claims the article.
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
