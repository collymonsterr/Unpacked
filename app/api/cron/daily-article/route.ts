export const maxDuration = 300 // full pipeline runs inline (2-3 min)

import { NextRequest } from 'next/server'
import { planArticle } from '@/lib/claude'
import { executeResearch } from '@/lib/research-orchestrator'
import { runWritePipeline } from '@/lib/write-pipeline'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateUniqueSlug } from '@/lib/slug'
import { requireAdmin } from '@/lib/auth-check'
import { pickDailyTopic } from '@/lib/daily-topic'
import { classifyProviderError } from '@/lib/provider-errors'

/**
 * Daily automated article generation.
 *
 * Triggered by Vercel Cron (see vercel.json). Picks the most topical subject of
 * the day, then runs the exact same pipeline as a normal generation — plan →
 * research → write → (fact-check + social async) — and publishes it, attributed
 * to the admin user. One fresh article per day, hands-off.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` when the
 * CRON_SECRET env var is set. An authenticated admin session is also accepted
 * so the founder can trigger a run manually for testing.
 *
 * Visibility defaults to `published`; set DAILY_ARTICLE_VISIBILITY=unlisted to
 * turn this into a review queue (articles get a live URL but stay off the
 * homepage until the founder publishes them).
 */
export async function GET(request: NextRequest) {
  // ── Auth: cron secret OR admin session ──
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const viaCron = !!secret && authHeader === `Bearer ${secret}`
  const force = new URL(request.url).searchParams.get('force') === '1'

  let viaAdmin = false
  if (!viaCron) {
    const auth = await requireAdmin()
    viaAdmin = auth.authorized
    if (!viaAdmin) {
      // Vercel only attaches `Authorization: Bearer <CRON_SECRET>` when the
      // CRON_SECRET env var exists on the project. Without it every scheduled
      // run is rejected here — which is exactly what happened silently from
      // Jun to Sep 2026. Say so loudly rather than returning a bare 401.
      if (!secret) {
        console.error(
          '[daily-article] CRON_SECRET is NOT SET on this project. Vercel therefore sends no ' +
          'Authorization header and every scheduled run is rejected. Set CRON_SECRET in ' +
          'Project Settings → Environment Variables (Production) and redeploy.'
        )
      } else if (authHeader) {
        console.error('[daily-article] Authorization header did not match CRON_SECRET — the env var and the caller disagree.')
      }
      return Response.json(
        { ok: false, error: 'unauthorized', hint: secret ? 'cron_secret_mismatch' : 'cron_secret_not_set' },
        { status: 401 }
      )
    }
  }

  const db = getSupabaseAdmin()

  // Morning cron (06:00 UTC) = slot 0, afternoon cron (14:00 UTC) = slot 1.
  // The slot offsets the topic beat so two articles on the same day are
  // different categories, and the week fans out across the beat calendar.
  const slot = new Date().getUTCHours() >= 12 ? 1 : 0
  const WEEKLY_CAP = 12

  if (!force) {
    // Guard 1: don't double-fire the SAME run — skip if an auto-article was
    // created in the last 5h. Morning/afternoon runs are ~8h apart, so this
    // only catches accidental retries, never the intended second run of a day.
    const recentSince = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await db
      .from('articles')
      .select('id, slug')
      .filter('generation_options->>source', 'eq', 'daily_cron')
      .gte('created_at', recentSince)
      .limit(1)
    if (recent && recent.length > 0) {
      return Response.json({ ok: false, reason: 'ran_recently', existing: recent[0] }, { status: 200 })
    }

    // Guard 2: weekly cap — never publish more than WEEKLY_CAP auto-articles / 7 days.
    const weekSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: weekCount } = await db
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .filter('generation_options->>source', 'eq', 'daily_cron')
      .gte('created_at', weekSince)
    if ((weekCount ?? 0) >= WEEKLY_CAP) {
      return Response.json({ ok: false, reason: 'weekly_cap_reached', weekCount }, { status: 200 })
    }

    // Guard 3: monthly budget — stop once this month's estimated spend hits the cap.
    // `total_cost` captures per-article LLM spend; Brave/SerpAPI aren't logged
    // per-article, so add a flat search estimate. (Weekly cap above is the volume
    // backstop; this is the dollar backstop.) Override with DAILY_ARTICLE_MONTHLY_BUDGET.
    const budget = Number(process.env.DAILY_ARTICLE_MONTHLY_BUDGET ?? '5')
    if (budget > 0) {
      const monthStart = new Date()
      monthStart.setUTCDate(1)
      monthStart.setUTCHours(0, 0, 0, 0)
      const { data: monthRows } = await db
        .from('articles')
        .select('total_cost')
        .filter('generation_options->>source', 'eq', 'daily_cron')
        .gte('created_at', monthStart.toISOString())
      const rows = monthRows ?? []
      const SEARCH_EST_PER_ARTICLE = 0.08 // Brave + SerpAPI, not logged per-article
      const spent =
        rows.reduce((s, r) => s + ((r as { total_cost?: number }).total_cost ?? 0), 0) +
        rows.length * SEARCH_EST_PER_ARTICLE
      if (spent >= budget) {
        return Response.json(
          { ok: false, reason: 'monthly_budget_reached', spent: Math.round(spent * 100) / 100, budget },
          { status: 200 },
        )
      }
    }
  }

  // ── Pick today's topic (beat varies by day + slot) ──
  const topic = await pickDailyTopic(slot)
  if (!topic) {
    return Response.json({ ok: false, reason: 'no_topic_signal' }, { status: 200 })
  }
  const query = topic.query

  const generationOptions: Record<string, unknown> = {
    length: 'quick',        // cheap mode — 800-1200 words, fewer sections/images
    tone: 'opinionated',
    visual: 'standard',
    source: 'daily_cron',
    cheap: true,            // legacy flag; the editorial polish runs on Sonnet for every article (model policy)
    _slot: slot,
    _beat: topic.category,
    _topicRationale: topic.rationale,
  }

  // ── Admin attribution ──
  const adminId = process.env.ADMIN_USER_ID
  let userName: string | undefined
  let userAvatar: string | undefined
  if (adminId) {
    const { data: profile } = await db
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', adminId)
      .single()
    userName = profile?.display_name ?? undefined
    userAvatar = profile?.avatar_url ?? undefined
  }

  const visibility = process.env.DAILY_ARTICLE_VISIBILITY === 'unlisted' ? 'unlisted' : 'published'

  // ── Insert the article shell ──
  const slug = await generateUniqueSlug(query)
  const { data, error } = await db
    .from('articles')
    .insert({
      slug,
      query,
      status: 'planning',
      generation_options: generationOptions,
      visibility,
      ...(adminId ? { user_id: adminId, user_name: userName, user_avatar: userAvatar } : {}),
    })
    .select('id, slug')
    .single()

  if (error || !data) {
    console.error('[daily-article] insert failed:', error)
    return Response.json({ ok: false, error: 'insert_failed' }, { status: 500 })
  }

  console.log(`[daily-article] Generating "${query}" (${topic.category}) → ${data.id.slice(0, 8)}`)

  try {
    // ── Phase 1: Plan ──
    const plan = await planArticle(query, generationOptions, data.id)
    const cleanSlug = await generateUniqueSlug(plan.title, data.id)
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

    // ── Phase 2: Research ──
    const manifest = plan.research_manifest ?? {
      brave_queries: [{ query, purpose: 'core_facts' as const }],
      reddit_queries: [{ query, subreddits: [] }],
      image_queries: { hero: { query, style: 'editorial_photo' as const }, products: [] },
    }
    const research = await executeResearch(manifest, plan, 'standard', data.id)

    // Persist research (mirrors the create route so the section data is identical)
    const researchUpdate: Record<string, unknown> = {}
    if (research.findings.length > 0) researchUpdate.research_findings = research.findings
    researchUpdate.entity_cards = research.entityCards ?? []
    if (research.synthesis) researchUpdate.research_synthesis = research.synthesis
    if (research.liveData && research.liveData.length > 0) researchUpdate.live_data = research.liveData
    researchUpdate.twitter_findings = research.twitterFindings ?? []
    if (research.twitterSummary) researchUpdate.twitter_summary = research.twitterSummary
    if (research.twitterSentimentSplit) researchUpdate.twitter_sentiment_split = research.twitterSentimentSplit
    if (research.twitterContextTrigger) researchUpdate.twitter_context_trigger = research.twitterContextTrigger
    if (research.twitterPostsAnalysed > 0) researchUpdate.twitter_posts_analysed = research.twitterPostsAnalysed
    if (research.redditThreadsPool?.length > 0) researchUpdate.reddit_threads = research.redditThreadsPool
    if (research.redditSentimentSplit) researchUpdate.reddit_sentiment_split = research.redditSentimentSplit
    if (research.redditContextTrigger) researchUpdate.reddit_context_trigger = research.redditContextTrigger
    if (research.redditThreadsAnalysed > 0) researchUpdate.reddit_threads_analysed = research.redditThreadsAnalysed
    if (Object.keys(researchUpdate).length > 0) {
      await db.from('articles').update(researchUpdate).eq('id', data.id)
    }

    // ── Phase 3: Write (+ fact-check & social run async inside the pipeline) ──
    await runWritePipeline({
      articleId: data.id,
      query,
      plan,
      researchSummary: research.summary,
      generationOptions,
      entityCards: research.entityCards,
      synthesis: research.synthesis,
      liveData: research.liveData,
      videoFindings: research.videoFindings,
      _timings: {},
    })

    const { data: done } = await db.from('articles').select('slug, status').eq('id', data.id).single()
    const finalSlug = done?.slug ?? cleanSlug
    console.log(`[daily-article] Done: "${plan.title}" → /article/${finalSlug}`)

    return Response.json({
      ok: true,
      id: data.id,
      slug: finalSlug,
      title: plan.title,
      category: topic.category,
      rationale: topic.rationale,
      visibility,
      url: `https://unpacked.fyi/article/${finalSlug}`,
    })
  } catch (err) {
    console.error('[daily-article] generation failed:', err)
    const providerError = classifyProviderError(err)
    await db
      .from('articles')
      .update({
        status: 'error',
        ...(providerError && {
          generation_options: { ...generationOptions, _error: providerError.code, _error_detail: providerError.detail },
        }),
      })
      .eq('id', data.id)
    return Response.json({ ok: false, error: providerError?.code ?? 'generation_failed', detail: providerError?.detail ?? String(err) }, { status: 500 })
  }
}
