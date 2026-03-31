import { ImageResponse } from 'next/og'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  let title = 'Unpacked'
  let articleType = ''
  let verdict = ''
  let thumbnailUrl = ''
  let sectionCount = 0

  try {
    const isUUID = /^[0-9a-f-]{36}$/i.test(slug)
    const query = getSupabaseAdmin().from('articles').select('article, plan, query')
    const { data } = isUUID
      ? await query.eq('id', slug).single()
      : await query.eq('slug', slug).single()

    if (data) {
      title = data.article?.title ?? data.plan?.title ?? data.query ?? 'Unpacked'
      articleType = data.article?.article_type ?? ''
      verdict = data.article?.quick_verdict?.one_liner ?? ''
      thumbnailUrl = data.article?.thumbnail_url ?? ''
      sectionCount = data.article?.sections?.length ?? 0
    }
  } catch {
    // Use defaults
  }

  const typeLabels: Record<string, string> = {
    buyer_guide: 'Buyer Guide', comparison: 'Comparison', decision_guide: 'Decision Guide',
    explainer: 'Explainer', how_to: 'How-To', roundup: 'Roundup',
    news_analysis: 'News Analysis', trend_analysis: 'Trend Analysis',
    breaking_news: 'Breaking News', deep_dive: 'Deep Dive',
    news: 'News', planning: 'Travel & Living', tutorial: 'Tutorial',
  }

  const typeLabel = typeLabels[articleType] ?? ''
  const displayTitle = title.length > 70 ? title.slice(0, 67) + '...' : title
  const displayVerdict = verdict.length > 100 ? verdict.slice(0, 97) + '...' : verdict
  const readingTime = Math.max(3, Math.ceil(sectionCount * 0.8))

  // Try to fetch thumbnail image
  let thumbnailData: ArrayBuffer | null = null
  if (thumbnailUrl) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)
      const imgRes = await fetch(thumbnailUrl, { signal: controller.signal })
      clearTimeout(timeout)
      if (imgRes.ok) {
        thumbnailData = await imgRes.arrayBuffer()
      }
    } catch {
      // Fall back to gradient
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: '#FAF8F5',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Left panel — text content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px 48px 48px 56px',
            width: thumbnailData ? '660px' : '100%',
            flex: thumbnailData ? 'none' : 1,
          }}
        >
          {/* Top — type badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {typeLabel && (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#fff',
                  backgroundColor: '#E07A3A',
                  padding: '4px 12px',
                  borderRadius: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {typeLabel}
              </span>
            )}
            <span style={{ fontSize: 14, color: '#94918D' }}>
              {readingTime} min read
            </span>
          </div>

          {/* Middle — title + verdict */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            <h1
              style={{
                fontSize: displayTitle.length > 45 ? 36 : 44,
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
                  fontSize: 18,
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
              gap: '6px',
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A' }}>
              The
            </span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#E07A3A' }}>
              Brief
            </span>
          </div>
        </div>

        {/* Right panel — thumbnail image or gradient */}
        {thumbnailData ? (
          <div
            style={{
              width: '540px',
              height: '100%',
              display: 'flex',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {/* Gradient overlay on left edge for blend */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '80px',
                background: 'linear-gradient(to right, #FAF8F5, transparent)',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: '540px',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #FEF3EC 0%, #E07A3A 100%)',
            }}
          >
            <span
              style={{
                fontSize: 120,
                fontWeight: 800,
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              A
            </span>
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
