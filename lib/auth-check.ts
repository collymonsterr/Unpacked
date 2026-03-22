import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'

interface AuthResult {
  authorized: boolean
  userId: string | null
  isAdmin: boolean
  error?: Response
}

interface SessionUser {
  id: string
  email: string | null
}

/**
 * Check if a user is the platform admin.
 * Matches against ADMIN_USER_ID (by ID) or ADMIN_EMAIL (by email).
 */
function isAdminUser(user: SessionUser): boolean {
  const adminId = process.env.ADMIN_USER_ID
  if (adminId && user.id === adminId) return true

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail && user.email && user.email.toLowerCase() === adminEmail.toLowerCase()) return true

  return false
}

/**
 * Get the current authenticated user from the server session.
 * Returns null if not authenticated.
 */
async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    return { id: user.id, email: user.email ?? null }
  } catch {
    return null
  }
}

/**
 * Require the current user to be the platform admin.
 * Returns 401 if not authenticated, 403 if authenticated but not admin.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const sessionUser = await getSessionUser()

  if (!sessionUser) {
    return {
      authorized: false,
      userId: null,
      isAdmin: false,
      error: Response.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  if (!isAdminUser(sessionUser)) {
    return {
      authorized: false,
      userId: sessionUser.id,
      isAdmin: false,
      error: Response.json({ error: 'Admin access required' }, { status: 403 }),
    }
  }

  return { authorized: true, userId: sessionUser.id, isAdmin: true }
}

/**
 * Verify the current user is authenticated and owns the given article.
 * Admin users are always allowed regardless of ownership.
 */
export async function requireArticleOwner(articleId: string): Promise<AuthResult> {
  const sessionUser = await getSessionUser()

  if (!sessionUser) {
    return {
      authorized: false,
      userId: null,
      isAdmin: false,
      error: Response.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  const admin = isAdminUser(sessionUser)

  // Admin bypasses ownership check
  if (admin) {
    return { authorized: true, userId: sessionUser.id, isAdmin: true }
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
      userId: sessionUser.id,
      isAdmin: false,
      error: Response.json({ error: 'Article not found' }, { status: 404 }),
    }
  }

  // Allow if: user owns the article OR article has no owner (legacy/unclaimed)
  if (row.user_id && row.user_id !== sessionUser.id) {
    return {
      authorized: false,
      userId: sessionUser.id,
      isAdmin: false,
      error: Response.json(
        { error: "You don't have permission to modify this article" },
        { status: 403 }
      ),
    }
  }

  return { authorized: true, userId: sessionUser.id, isAdmin: false }
}

/**
 * Verify the current user is authenticated (does not check article ownership).
 * Used for routes where any authenticated user can act (e.g. refine creates a fork).
 */
export async function requireAuth(): Promise<AuthResult> {
  const sessionUser = await getSessionUser()

  if (!sessionUser) {
    return {
      authorized: false,
      userId: null,
      isAdmin: false,
      error: Response.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  return { authorized: true, userId: sessionUser.id, isAdmin: isAdminUser(sessionUser) }
}
