import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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
