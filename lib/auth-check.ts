import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'

interface AuthResult {
  authorized: boolean
  userId: string | null
  error?: Response
}

/**
 * Verify the current user is authenticated and owns the given article.
 * Returns { authorized: true, userId } on success.
 * Returns { authorized: false, error: Response } on failure — caller should return the error.
 */
export async function requireArticleOwner(articleId: string): Promise<AuthResult> {
  // Check authentication
  let userId: string | null = null
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {
    // Auth failed
  }

  if (!userId) {
    return {
      authorized: false,
      userId: null,
      error: Response.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  // Check article ownership
  const db = getSupabaseAdmin()
  const { data: row } = await db
    .from('articles')
    .select('user_id')
    .eq('id', articleId)
    .single()

  if (!row) {
    return {
      authorized: false,
      userId,
      error: Response.json({ error: 'Article not found' }, { status: 404 }),
    }
  }

  // Allow if: user owns the article OR article has no owner (legacy/unclaimed)
  if (row.user_id && row.user_id !== userId) {
    return {
      authorized: false,
      userId,
      error: Response.json(
        { error: "You don't have permission to modify this article" },
        { status: 403 }
      ),
    }
  }

  return { authorized: true, userId }
}

/**
 * Verify the current user is authenticated (does not check article ownership).
 * Used for routes where any authenticated user can act (e.g. refine creates a fork).
 */
export async function requireAuth(): Promise<AuthResult> {
  let userId: string | null = null
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {
    // Auth failed
  }

  if (!userId) {
    return {
      authorized: false,
      userId: null,
      error: Response.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  return { authorized: true, userId }
}
