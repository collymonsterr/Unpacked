import Link from 'next/link'
import Image from 'next/image'
import { typeLabel, type ArticleCardData } from '@/lib/article-card'
import SectionHeader from './SectionHeader'

interface Props {
  /** Picked on the server by `selectFeatured()` — rotates on a clock. */
  hero: ArticleCardData | null
  small: ArticleCardData[]
}

export default function FeaturedSection({ hero, small }: Props) {
  if (!hero) return null

  const heroDate = new Date(hero.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  const heroAuthorName = hero.userName ?? 'Unpacked'
  const heroAuthorInitial = heroAuthorName.charAt(0).toUpperCase()

  return (
    <section className="w-full max-w-6xl mx-auto px-4 md:px-6">
      <SectionHeader title="Featured" badge="Editor's picks" />

      <div
        className="grid gap-[18px]"
        style={{
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)',
          height: '540px',
        }}
      >
        {/* Hero card */}
        <Link
          href={`/article/${hero.slug}`}
          className="rounded-2xl overflow-hidden no-underline flex flex-col"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <div className="relative" style={{ height: '220px' }}>
            {hero.imageUrl ? (
              <Image
                src={hero.imageUrl}
                alt={hero.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full" style={{ backgroundColor: 'var(--accent-light)' }} />
            )}
          </div>
          <div className="p-4 flex-1 flex flex-col gap-0">
            {/* 1. Category badge */}
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--accent)' }}>
              {typeLabel(hero.articleType)}
            </p>

            {/* 2. Title + verified shield */}
            <div className="flex items-start gap-1.5 mb-1.5">
              <h3
                className="text-lg font-bold leading-snug line-clamp-2"
                style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
              >
                {hero.title}
              </h3>
              {hero.hasFactCheck && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-1">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              )}
            </div>

            {/* 3. Description */}
            {hero.description && (
              <p className="text-xs leading-relaxed mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                {hero.description}
              </p>
            )}

            {/* 4. Verdict box */}
            {hero.verdict && (
              <div
                className="rounded-lg px-3 py-2 mb-2"
                style={{ backgroundColor: '#f0efed' }}
              >
                <div className="flex items-center gap-1 mb-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Verdict
                  </p>
                </div>
                <p
                  className="text-xs leading-relaxed line-clamp-2"
                  style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}
                >
                  {hero.verdict}
                </p>
              </div>
            )}

            {/* 5. Bottom metadata row */}
            <div
              className="mt-auto pt-3 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              {/* Left: author + date */}
              <div className="flex items-center gap-2">
                {hero.userAvatar ? (
                  <img
                    src={hero.userAvatar}
                    alt=""
                    className="w-6 h-6 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  >
                    {heroAuthorInitial}
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {heroAuthorName}
                  </p>
                  <p className="text-[10px] leading-tight" style={{ color: 'var(--text-secondary)' }}>
                    {heroDate}{hero.readingTime > 0 ? ` · ${hero.readingTime} min read` : ''}
                  </p>
                </div>
              </div>

              {/* Right: views + fact-checked */}
              <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                {hero.viewCount > 0 && (
                  <span>{hero.viewCount.toLocaleString()} views</span>
                )}
                {hero.verifiedAt && (
                  <span className="flex items-center gap-0.5" style={{ color: '#059669' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Fact-checked
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Small cards grid */}
        <div
          className="grid gap-[18px]"
          style={{
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(2, 1fr)',
          }}
        >
          {small.map((row) => {
            const img = row.imageUrl
            return (
              <Link
                key={row.id}
                href={`/article/${row.slug}`}
                className="rounded-xl overflow-hidden no-underline flex flex-col"
                style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="relative flex-1" style={{ minHeight: '120px' }}>
                  {img ? (
                    <Image
                      src={img}
                      alt={row.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)', minHeight: '120px' }}>
                      <span className="text-2xl font-bold" style={{ color: 'var(--accent)', opacity: 0.3 }}>U</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--accent)' }}>
                    {typeLabel(row.articleType)}
                  </p>
                  <div className="flex items-start gap-1">
                    <h4
                      className="text-sm font-bold leading-snug line-clamp-2"
                      style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
                    >
                      {row.title}
                    </h4>
                    {row.hasFactCheck && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <polyline points="9 12 11 14 15 10" />
                      </svg>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Mobile override */}
      <style>{`
        @media (max-width: 768px) {
          .grid[style*="2fr"] {
            grid-template-columns: 1fr !important;
            height: auto !important;
          }
          .grid[style*="repeat(2"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  )
}
