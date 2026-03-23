import Link from 'next/link'

interface Props {
  title: string
  badge?: string
  badgeColor?: string
  viewAllHref?: string
}

export default function SectionHeader({ title, badge, badgeColor, viewAllHref }: Props) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <h2
          className="text-lg md:text-xl font-bold"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)', fontSize: '22px' }}
        >
          {title}
        </h2>
        {badge && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase"
            style={{
              backgroundColor: badgeColor ?? 'var(--border)',
              color: badgeColor ? '#fff' : 'var(--text-secondary)',
              fontSize: '11px',
              letterSpacing: '0.04em',
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="text-sm font-medium no-underline hover:opacity-80 transition-opacity"
          style={{ color: 'var(--accent)' }}
        >
          View all →
        </Link>
      )}
    </div>
  )
}
