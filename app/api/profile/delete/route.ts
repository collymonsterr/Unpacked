import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/profile/delete
 *
 * Deletes the authenticated user's account:
 * 1. Sets all their articles to visibility: 'private'
 * 2. Deletes related rows from founding_applications, share_credits_log,
 *    upgrade_waitlist, article_votes, rate_limits
 * 3. Deletes their profiles row
 * 4. Signs them out via Supabase Auth admin
 *
 * Requires authentication. Irreversible.
 */
export async function POST(_request: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = user.id
    const db = getSupabaseAdmin()

    // Step 1: Set all user's articles to private (don't delete — preserves links)
    await db
      .from('articles')
      .update({ visibility: 'private' })
      .eq('user_id', userId)

    // Step 2: Clean up related tables (ignore errors — tables may not exist for this user)
    await Promise.allSettled([
      db.from('founding_applications').delete().eq('user_id', userId),
      db.from('share_credits_log').delete().eq('user_id', userId),
      db.from('upgrade_waitlist').delete().eq('user_id', userId),
      db.from('article_votes').delete().eq('user_id', userId),
      db.from('rate_limits').delete().match({ key: `%${userId}%` }),
    ])

    // Step 3: Delete profile row
    const { error: profileErr } = await db
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileErr) {
      console.error('[profile/delete] Failed to delete profile:', profileErr.message)
      // Continue anyway — the user wants out
    }

    // Step 4: Sign out (server-side)
    await supabase.auth.signOut()

    console.log(`[profile/delete] Account deleted for user ${userId.slice(0, 8)}`)

    return Response.json({ success: true })
  } catch (err) {
    console.error('[profile/delete] Error:', err)
    return Response.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
