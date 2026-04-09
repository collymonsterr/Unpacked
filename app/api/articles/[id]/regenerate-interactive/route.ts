import { NextRequest } from 'next/server'
import { generateInteractiveComponent } from '@/lib/interactive-component'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireArticleOwner } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'

export const maxDuration = 60

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

  const db = getSupabaseAdmin()
  const { data: row, error: fetchError } = await db
    .from('articles')
    .select('article, plan, research_findings')
    .eq('id', id)
    .single()

  if (fetchError || !row?.article || !row?.plan) {
    return Response.json({ error: 'Article not found or not ready' }, { status: 404 })
  }

  try {
    const findings = (row.research_findings ?? []) as Array<{ source: string; content: string }>
    const component = await generateInteractiveComponent(row.article, row.plan, findings, id)

    if (component) {
      await db
        .from('articles')
        .update({ interactive_component: component })
        .eq('id', id)
    }

    return Response.json({
      success: true,
      component: component ?? null,
      message: component ? `Generated ${component.type}` : 'No component generated (type not suitable)',
    })
  } catch (err) {
    console.error('[regenerate-interactive]', err)
    return Response.json({ error: 'Failed to generate interactive component' }, { status: 500 })
  }
}
