import { NextRequest } from 'next/server'
import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'

const VALID_PLATFORMS = ['twitter', 'linkedin', 'reddit', 'copy_link'] as const

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ platforms: [] })
    }

    const { id: articleId } = await params

    const { data } = await getSupabaseAdmin()
      .from('share_credits_log')
      .select('platform')
      .eq('user_id', user.id)
      .eq('article_id', articleId)

    const platforms = (data ?? []).map(row => row.platform)

    return Response.json({ platforms })
  } catch (err) {
    console.error('[share-credit GET]', err)
    return Response.json({ platforms: [] })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id: articleId } = await params
    const body = await request.json()
    const platform = body?.platform

    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return Response.json({ error: 'Invalid platform' }, { status: 400 })
    }

    const db = getSupabaseAdmin()

    // Try to insert — unique constraint prevents duplicates
    const { error: insertError } = await db
      .from('share_credits_log')
      .insert({
        user_id: user.id,
        article_id: articleId,
        platform,
      })

    if (insertError) {
      // Unique constraint violation — already credited
      if (insertError.code === '23505') {
        const { data: profile } = await db
          .from('profiles')
          .select('bonus_credits')
          .eq('id', user.id)
          .single()

        return Response.json({
          credited: false,
          bonusCredits: profile?.bonus_credits ?? 0,
        })
      }
      throw insertError
    }

    // Insert succeeded — increment bonus_credits
    const { data: profile } = await db.rpc('increment_bonus_credits', {
      user_row_id: user.id,
      amount: 1,
    })

    // Fallback if RPC doesn't exist — manual increment
    let bonusCredits = 0
    if (profile == null) {
      const { data: updated } = await db
        .from('profiles')
        .select('bonus_credits')
        .eq('id', user.id)
        .single()

      if (updated) {
        await db
          .from('profiles')
          .update({ bonus_credits: (updated.bonus_credits ?? 0) + 1 })
          .eq('id', user.id)
        bonusCredits = (updated.bonus_credits ?? 0) + 1
      }
    } else {
      bonusCredits = typeof profile === 'number' ? profile : 0
    }

    return Response.json({
      credited: true,
      bonusCredits,
    })
  } catch (err) {
    console.error('[share-credit POST]', err)
    return Response.json({ error: 'Failed to record share credit' }, { status: 500 })
  }
}
