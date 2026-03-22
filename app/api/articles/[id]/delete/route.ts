import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const db = getSupabaseAdmin()
  const { error } = await db
    .from('articles')
    .delete()
    .eq('id', id)

  if (error) {
    return Response.json({ error: 'Failed to delete article' }, { status: 500 })
  }

  return Response.json({ deleted: true })
}
