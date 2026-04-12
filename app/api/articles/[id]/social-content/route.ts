import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/articles/[id]/social-content
 * Returns the social_content column for an article.
 * Used by SharePanel to poll for async-generated content.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const db = getSupabaseAdmin()

    const { data, error } = await db
      .from('articles')
      .select('social_content')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ social_content: null }, { status: 404 })
    }

    return NextResponse.json({ social_content: data.social_content })
  } catch (err) {
    console.error('[social-content]', err)
    return NextResponse.json({ social_content: null }, { status: 500 })
  }
}
