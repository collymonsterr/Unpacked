import type { WhoThisIsFor as WhoThisIsForType } from '@/types/article'

export default function WhoThisIsFor({ section }: { section: WhoThisIsForType }) {
  return (
    <div className="mb-8">
      <h2
        className="text-xl font-bold mb-4"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {section.heading}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {section.profiles.map((profile, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
            }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              {profile.user_type}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {profile.recommendation}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
