export const maxDuration = 300 // full pipeline runs inline (2-3 min)

import { NextRequest } from 'next/server'
import { planArticle } from '@/lib/claude'
import { executeResearch } from '@/lib/research-orchestrator'
import { runWritePipeline } from '@/lib/write-pipeline'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateUniqueSlug } from '@/lib/slug'
import { requireAdmin } from '@/lib/auth-check'
import { pickDailyTopic } from '@/lib/daily-topic'

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
      return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
  }

  const db = getSupabaseAdmin()

  // ── Guard: don't double-publish if a daily article already ran in the last 20h ──
  // (Skipped for an explicit admin manual run with ?force=1.)
  if (!force) {
    const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await db
      .from('articles')
      .select('id, slug')
      .filter('generation_options->>source', 'eq', 'daily_cron')
      .gte('created_at', since)
      .limit(1)
    if (recent && recent.length > 0) {
      return Response.json({ ok: false, reason: 'already_ran_today', existing: recent[0] }, { status: 200 })
    }
  }

  // ── Pick today's topic ──
  const topic = await pickDailyTopic()
  if (!topic) {
    return Response.json({ ok: false, reason: 'no_topic_signal' }, { status: 200 })
  }
  const query = topic.query

  const generationOptions: Record<string, unknown> = {
    length: 'standard',
    tone: 'opinionated',
    visual: 'standard',
    source: 'daily_cron',
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
    await db.from('articles').update({ status: 'error' }).eq('id', data.id)
    return Response.json({ ok: false, error: 'generation_failed', detail: String(err) }, { status: 500 })
  }
}
