import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    const db = getSupabaseAdmin()

    // Count approved applications
    const { count: approvedCount } = await db
      .from('founding_applications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')

    // If user is authenticated, get their application status
    let status: string | null = null
    if (user) {
      const { data: app } = await db
        .from('founding_applications')
        .select('status')
        .eq('user_id', user.id)
        .single()
      status = app?.status ?? null
    }

    return Response.json({
      status,
      approvedCount: approvedCount ?? 0,
      isAuthenticated: !!user,
    })
  } catch (err) {
    console.error('[founding GET]', err)
    return Response.json({ error: 'Failed to load' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const db = getSupabaseAdmin()

    // Check if already applied
    const { data: existing } = await db
      .from('founding_applications')
      .select('id, status')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return Response.json({ success: true, status: existing.status, alreadyApplied: true })
    }

    // Check if spots are full
    const { count } = await db
      .from('founding_applications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')

    if ((count ?? 0) >= 100) {
      // All spots filled — add to waitlist instead
      await db
        .from('upgrade_waitlist')
        .upsert({
          user_id: user.id,
          requested_tier: 'founding_waitlist',
        }, { onConflict: 'user_id,requested_tier' })
        .select()

      return Response.json({ success: true, status: 'waitlisted' })
    }

    // Create application
    const { error } = await db
      .from('founding_applications')
      .insert({ user_id: user.id })

    if (error) {
      // Unique constraint — already applied
      if (error.code === '23505') {
        return Response.json({ success: true, status: 'pending', alreadyApplied: true })
      }
      throw error
    }

    return Response.json({ success: true, status: 'pending' })
  } catch (err) {
    console.error('[founding POST]', err)
    return Response.json({ error: 'Failed to apply' }, { status: 500 })
  }
}
