import { NextRequest } from 'next/server'
import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'

function isAdmin(email: string | undefined): boolean {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  return !!(adminEmail && email && email.toLowerCase() === adminEmail.toLowerCase())
}

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !isAdmin(user.email ?? undefined)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getSupabaseAdmin()

    // Get all applications with user details
    const { data: applications } = await db
      .from('founding_applications')
      .select('id, user_id, status, created_at, reviewed_at, reviewed_by')
      .order('created_at', { ascending: false })

    if (!applications) {
      return Response.json({ applications: [], approvedCount: 0 })
    }

    // Get user details and article counts for each applicant
    const userIds = applications.map(a => a.user_id)

    // Get profiles
    const { data: profiles } = await db
      .from('profiles')
      .select('id, display_name, bio, is_founding_creator')
      .in('id', userIds)

    // Get user metadata from auth (name, email, avatar)
    const { data: articles } = await db
      .from('articles')
      .select('user_id, user_name, user_avatar')
      .in('user_id', userIds)
      .in('status', ['complete', 'verified'])

    // Count articles per user
    const articleCounts: Record<string, number> = {}
    const userMeta: Record<string, { name: string; avatar: string | null; email?: string }> = {}

    for (const art of articles ?? []) {
      if (art.user_id) {
        articleCounts[art.user_id] = (articleCounts[art.user_id] ?? 0) + 1
        if (!userMeta[art.user_id]) {
          userMeta[art.user_id] = {
            name: art.user_name ?? 'Unknown',
            avatar: art.user_avatar ?? null,
          }
        }
      }
    }

    // Merge profile names
    for (const p of profiles ?? []) {
      if (p.display_name && userMeta[p.id]) {
        userMeta[p.id].name = p.display_name
      }
    }

    const enriched = applications.map(app => ({
      ...app,
      userName: userMeta[app.user_id]?.name ?? 'Unknown',
      userAvatar: userMeta[app.user_id]?.avatar ?? null,
      articleCount: articleCounts[app.user_id] ?? 0,
    }))

    const approvedCount = applications.filter(a => a.status === 'approved').length

    return Response.json({ applications: enriched, approvedCount })
  } catch (err) {
    console.error('[founding/admin GET]', err)
    return Response.json({ error: 'Failed to load' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !isAdmin(user.email ?? undefined)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { applicationId, action } = body

    if (!applicationId || !['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const db = getSupabaseAdmin()

    // Get the application
    const { data: app } = await db
      .from('founding_applications')
      .select('id, user_id, status')
      .eq('id', applicationId)
      .single()

    if (!app) {
      return Response.json({ error: 'Application not found' }, { status: 404 })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // Update application status
    await db
      .from('founding_applications')
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.email ?? 'admin',
      })
      .eq('id', applicationId)

    if (action === 'approve') {
      // Set is_founding_creator and add 10 bonus credits
      const { data: profile } = await db
        .from('profiles')
        .select('bonus_credits')
        .eq('id', app.user_id)
        .single()

      await db
        .from('profiles')
        .update({
          is_founding_creator: true,
          bonus_credits: (profile?.bonus_credits ?? 0) + 10,
        })
        .eq('id', app.user_id)
    } else if (action === 'reject') {
      // If previously approved, revoke founding creator status
      if (app.status === 'approved') {
        await db
          .from('profiles')
          .update({ is_founding_creator: false })
          .eq('id', app.user_id)
      }
    }

    return Response.json({ success: true, status: newStatus })
  } catch (err) {
    console.error('[founding/admin POST]', err)
    return Response.json({ error: 'Failed to process' }, { status: 500 })
  }
}
