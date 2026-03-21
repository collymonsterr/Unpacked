import { ImageResponse } from 'next/og'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Fetch article data
  let title = 'ArticleAI'
  let articleType = ''
  let verdict = ''

  try {
    const isUUID = /^[0-9a-f-]{36}$/i.test(slug)
    const query = getSupabaseAdmin().from('articles').select('article, plan, query')
    const { data } = isUUID
      ? await query.eq('id', slug).single()
      : await query.eq('slug', slug).single()

    if (data) {
      title = data.article?.title ?? data.plan?.title ?? data.query ?? 'ArticleAI'
      articleType = data.article?.article_type ?? ''
      verdict = data.article?.quick_verdict?.one_liner ?? ''
    }
  } catch {
    // Use defaults
  }

  const typeLabels: Record<string, string> = {
    buyer_guide: 'Buyer Guide',
    comparison: 'Comparison',
    decision_guide: 'Decision Guide',
    explainer: 'Explainer',
    news: 'News',
    planning: 'Planning',
    trend_analysis: 'Trend Analysis',
    tutorial: 'Tutorial',
  }

  const typeLabel = typeLabels[articleType] ?? ''

  // Truncate title if too long
  const displayTitle = title.length > 80 ? title.slice(0, 77) + '...' : title
  const displayVerdict = verdict.length > 120 ? verdict.slice(0, 117) + '...' : verdict

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 64px',
          backgroundColor: '#FAF8F5',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top — type badge */}
        {typeLabel && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#E07A3A',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {typeLabel}
            </span>
          </div>
        )}

        {/* Middle — title + verdict */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <h1
            style={{
              fontSize: displayTitle.length > 50 ? 42 : 52,
              fontWeight: 800,
              color: '#1A1A1A',
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {displayTitle}
          </h1>
          {displayVerdict && (
            <p
              style={{
                fontSize: 22,
                color: '#6B6B6B',
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {displayVerdict}
            </p>
          )}
        </div>

        {/* Bottom — branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#1A1A1A' }}>
              Article
            </span>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#E07A3A' }}>
              AI
            </span>
          </div>
          <div
            style={{
              width: 48,
              height: 4,
              backgroundColor: '#E07A3A',
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
