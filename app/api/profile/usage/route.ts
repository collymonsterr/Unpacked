import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const db = getSupabaseAdmin()

    const { data: profile } = await db
      .from('profiles')
      .select('tier, articles_used_this_month, monthly_article_limit, bonus_credits, month_reset_date, is_founding_creator')
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
        isFoundingCreator: false,
        shareCreditsEarned: 0,
      })
    }

    // Auto-reset if past reset date
    const resetDate = new Date(profile.month_reset_date)
    const now = new Date()
    if (now >= resetDate) {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

      // Founding creator bonus on monthly reset
      const foundingBonus = profile.is_founding_creator ? 10 : 0

      await db
        .from('profiles')
        .update({
          articles_used_this_month: 0,
          month_reset_date: nextMonth.toISOString(),
          ...(foundingBonus > 0 ? { bonus_credits: (profile.bonus_credits ?? 0) + foundingBonus } : {}),
        })
        .eq('id', user.id)

      // Count share credits earned this month
      const { count: shareCredits } = await db
        .from('share_credits_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      return Response.json({
        tier: profile.tier ?? 'free',
        articlesUsed: 0,
        monthlyLimit: profile.monthly_article_limit ?? 3,
        bonusCredits: (profile.bonus_credits ?? 0) + foundingBonus,
        nextReset: nextMonth.toISOString(),
        isFoundingCreator: profile.is_founding_creator ?? false,
        shareCreditsEarned: shareCredits ?? 0,
      })
    }

    // Count share credits earned (all time — they represent bonus credits added)
    const { count: shareCredits } = await db
      .from('share_credits_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return Response.json({
      tier: profile.tier ?? 'free',
      articlesUsed: profile.articles_used_this_month ?? 0,
      monthlyLimit: profile.monthly_article_limit ?? 3,
      bonusCredits: profile.bonus_credits ?? 0,
      nextReset: profile.month_reset_date,
      isFoundingCreator: profile.is_founding_creator ?? false,
      shareCreditsEarned: shareCredits ?? 0,
    })
  } catch (err) {
    console.error('[profile/usage]', err)
    return Response.json({ error: 'Failed to load usage' }, { status: 500 })
  }
}
