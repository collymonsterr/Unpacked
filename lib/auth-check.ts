import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'

interface AuthResult {
  authorized: boolean
  userId: string | null
  isAdmin: boolean
  error?: Response
}

/**
 * Check if a user ID is the platform admin.
 */
function isAdminUser(userId: string): boolean {
  const adminId = process.env.ADMIN_USER_ID
  return !!adminId && userId === adminId
}

/**
 * Get the current authenticated user from the server session.
 * Returns null if not authenticated.
 */
async function getSessionUser(): Promise<string | null> {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

/**
 * Require the current user to be the platform admin.
 * Returns 401 if not authenticated, 403 if authenticated but not admin.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const userId = await getSessionUser()

  if (!userId) {
    return {
      authorized: false,
      userId: null,
      isAdmin: false,
      error: Response.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  if (!isAdminUser(userId)) {
    return {
      authorized: false,
      userId,
      isAdmin: false,
      error: Response.json({ error: 'Admin access required' }, { status: 403 }),
    }
  }

  return { authorized: true, userId, isAdmin: true }
}

/**
 * Verify the current user is authenticated and owns the given article.
 * Admin users are always allowed regardless of ownership.
 * Returns { authorized: true, userId } on success.
 * Returns { authorized: false, error: Response } on failure.
 */
export async function requireArticleOwner(articleId: string): Promise<AuthResult> {
  const userId = await getSessionUser()

  if (!userId) {
    return {
      authorized: false,
      userId: null,
      isAdmin: false,
      error: Response.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  const admin = isAdminUser(userId)

  // Admin bypasses ownership check
  if (admin) {
    return { authorized: true, userId, isAdmin: true }
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
      isAdmin: false,
      error: Response.json({ error: 'Article not found' }, { status: 404 }),
    }
  }

  // Allow if: user owns the article OR article has no owner (legacy/unclaimed)
  if (row.user_id && row.user_id !== userId) {
    return {
      authorized: false,
      userId,
      isAdmin: false,
      error: Response.json(
        { error: "You don't have permission to modify this article" },
        { status: 403 }
      ),
    }
  }

  return { authorized: true, userId, isAdmin: false }
}

/**
 * Verify the current user is authenticated (does not check article ownership).
 * Used for routes where any authenticated user can act (e.g. refine creates a fork).
 */
export async function requireAuth(): Promise<AuthResult> {
  const userId = await getSessionUser()

  if (!userId) {
    return {
      authorized: false,
      userId: null,
      isAdmin: false,
      error: Response.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  return { authorized: true, userId, isAdmin: isAdminUser(userId) }
}
