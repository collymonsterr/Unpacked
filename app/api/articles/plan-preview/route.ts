import { NextRequest } from 'next/server'
import { planArticle } from '@/lib/claude'
import { executeResearch } from '@/lib/research-orchestrator'
import { createServerSupabase } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/articles/plan-preview
 *
 * Runs planning (Haiku) + research in full, returns the plan + research data
 * as JSON so the user can see the angle, findings, and options before committing
 * to article generation.
 *
 * Rate limited: 20/hour per user or IP. Does NOT consume article allowance.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = body?.query

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return Response.json({ error: 'Query must be at least 3 characters' }, { status: 400 })
    }

    const trimmedQuery = query.trim()

    // Auth check — plan mode requires authentication
    let userId: string | undefined
    try {
      const supabase = await createServerSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch {
      // Not authenticated
    }

    if (!userId) {
      return Response.json(
        { error: 'auth_required', message: 'Sign in to use Plan mode' },
        { status: 401 }
      )
    }

    // Rate limiting: 20/hour, separate key from article creation
    const rateLimitKey = `plan:user:${userId}`
    const rateResult = await checkRateLimit(rateLimitKey, 20)
    if (!rateResult.allowed) {
      return Response.json(
        { error: 'Plan rate limit reached. Try again in a bit.' },
        { status: 429 }
      )
    }

    // Default generation options for planning (standard defaults)
    const generationOptions = { length: 'standard' as const, tone: 'opinionated' as const, visual: 'standard' as const }

    // ── Phase 1: Plan the article ──
    const t0 = Date.now()
    const plan = await planArticle(trimmedQuery, generationOptions)
    const planMs = Date.now() - t0

    // ── Phase 2: Research ──
    const length = 'standard' as const
    const manifest = plan.research_manifest ?? {
      brave_queries: [{ query: trimmedQuery, purpose: 'core_facts' as const }],
      reddit_queries: [{ query: trimmedQuery, subreddits: [] }],
      image_queries: { hero: { query: trimmedQuery, style: 'editorial_photo' as const }, products: [] },
    }
    const t1 = Date.now()
    const research = await executeResearch(manifest, plan, length)
    const researchMs = Date.now() - t1

    console.log(`[plan-preview] Plan ${planMs}ms + Research ${researchMs}ms = ${planMs + researchMs}ms total`)

    // Return everything the plan page needs
    return Response.json({
      plan,
      research: {
        summary: research.summary,
        findings: research.findings.slice(0, 12), // top findings for display
        entityCards: research.entityCards,
        synthesis: research.synthesis,
        liveData: research.liveData,
        sources: research.sources,
        redditThreads: research.redditThreads,
      },
      timing: {
        plan_ms: planMs,
        research_ms: researchMs,
      },
    })
  } catch (err) {
    const errCode = (err as NodeJS.ErrnoException).code
    console.error('[plan-preview] Failed:', err)

    if (errCode === 'PLANNING_REFUSED') {
      return Response.json(
        { error: 'This topic hit a safety filter. Try rewording your question.' },
        { status: 422 }
      )
    }

    return Response.json({ error: 'Failed to generate plan' }, { status: 500 })
  }
}
