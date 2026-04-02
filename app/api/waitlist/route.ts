import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const tier = body?.tier

    if (!tier || !['standard', 'pro'].includes(tier)) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 })
    }

    // Check if already on waitlist for this tier
    const { data: existing } = await getSupabaseAdmin()
      .from('upgrade_waitlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('requested_tier', tier)
      .single()

    if (existing) {
      return Response.json({ success: true, alreadyOnList: true })
    }

    const { error } = await getSupabaseAdmin()
      .from('upgrade_waitlist')
      .insert({ user_id: user.id, requested_tier: tier })

    if (error) throw error

    return Response.json({ success: true })
  } catch (err) {
    console.error('[waitlist]', err)
    return Response.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }
}
