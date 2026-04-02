import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('tier, articles_used_this_month, monthly_article_limit, bonus_credits, month_reset_date')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // Return defaults for profiles that haven't been backfilled yet
      return Response.json({
        tier: 'free',
        articlesUsed: 0,
        monthlyLimit: 3,
        bonusCredits: 0,
        nextReset: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
      })
    }

    // Auto-reset if past reset date
    const resetDate = new Date(profile.month_reset_date)
    const now = new Date()
    if (now >= resetDate) {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      await getSupabaseAdmin()
        .from('profiles')
        .update({
          articles_used_this_month: 0,
          month_reset_date: nextMonth.toISOString(),
        })
        .eq('id', user.id)

      return Response.json({
        tier: profile.tier ?? 'free',
        articlesUsed: 0,
        monthlyLimit: profile.monthly_article_limit ?? 3,
        bonusCredits: profile.bonus_credits ?? 0,
        nextReset: nextMonth.toISOString(),
      })
    }

    return Response.json({
      tier: profile.tier ?? 'free',
      articlesUsed: profile.articles_used_this_month ?? 0,
      monthlyLimit: profile.monthly_article_limit ?? 3,
      bonusCredits: profile.bonus_credits ?? 0,
      nextReset: profile.month_reset_date,
    })
  } catch (err) {
    console.error('[profile/usage]', err)
    return Response.json({ error: 'Failed to load usage' }, { status: 500 })
  }
}
