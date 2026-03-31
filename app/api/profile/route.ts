import { NextRequest } from 'next/server'
import { getSupabaseAdmin, createServerSupabase } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const db = getSupabaseAdmin()
    const { data: profile } = await db
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return Response.json({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? '',
      avatar_url: user.user_metadata?.avatar_url ?? '',
      display_name: profile?.display_name ?? '',
      bio: profile?.bio ?? '',
      website: profile?.website ?? '',
      twitter_url: profile?.twitter_url ?? '',
      linkedin_url: profile?.linkedin_url ?? '',
      location: profile?.location ?? '',
      currency: profile?.currency ?? 'USD',
      language: profile?.language ?? 'en',
    })
  } catch {
    return Response.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const displayName = typeof body.display_name === 'string' ? body.display_name.trim().slice(0, 100) : undefined
    const bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 160) : undefined
    const website = typeof body.website === 'string' ? body.website.trim().slice(0, 200) : undefined
    const location = typeof body.location === 'string' ? body.location.trim().slice(0, 100) : undefined
    const currency = typeof body.currency === 'string' ? body.currency.trim().slice(0, 10) : undefined
    const language = typeof body.language === 'string' ? body.language.trim().slice(0, 10) : undefined

    // Social links: validate https:// prefix, empty string → null
    let twitterUrl: string | null = null
    if (typeof body.twitter_url === 'string') {
      const trimmed = body.twitter_url.trim().slice(0, 200)
      if (trimmed && trimmed.startsWith('https://')) twitterUrl = trimmed
    }
    let linkedinUrl: string | null = null
    if (typeof body.linkedin_url === 'string') {
      const trimmed = body.linkedin_url.trim().slice(0, 200)
      if (trimmed && trimmed.startsWith('https://')) linkedinUrl = trimmed
    }

    const db = getSupabaseAdmin()

    // Upsert profile
    const { error } = await db
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: displayName ?? '',
        bio: bio ?? '',
        website: website ?? '',
        twitter_url: twitterUrl,
        linkedin_url: linkedinUrl,
        location: location ?? '',
        currency: currency ?? 'USD',
        language: language ?? 'en',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (error) {
      console.error('[profile] Upsert error:', error.message)
      return Response.json({ error: 'Failed to save profile' }, { status: 500 })
    }

    // Also update user_name on all their articles if display_name changed
    if (displayName) {
      await db
        .from('articles')
        .update({ user_name: displayName })
        .eq('user_id', user.id)
    }

    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}
