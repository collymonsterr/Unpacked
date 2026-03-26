import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const db = getSupabaseAdmin()

  try {
    const { data, error } = await db.auth.admin.listUsers()
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    const users = data.users ?? []
    const now = new Date()

    // This week = last 7 days
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)

    // This month = since 1st of current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const totalUsers = users.length
    const newThisWeek = users.filter(u => new Date(u.created_at) >= weekAgo).length
    const newThisMonth = users.filter(u => new Date(u.created_at) >= monthStart).length

    // 10 most recent signups
    const recentUsers = [...users]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(u => ({
        email: u.email ?? 'Unknown',
        name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
        joinedAt: u.created_at,
      }))

    return NextResponse.json({
      totalUsers,
      newThisWeek,
      newThisMonth,
      recentUsers,
    })
  } catch (err) {
    console.error('[admin/users]', err)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
