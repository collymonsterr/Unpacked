import Link from 'next/link'

const CATEGORIES = [
  { name: 'Tech', slug: 'tech' },
  { name: 'AI & Future', slug: 'ai' },
  { name: 'Finance', slug: 'finance' },
  { name: 'Health', slug: 'health' },
  { name: 'News', slug: 'news' },
  { name: 'Travel', slug: 'travel' },
  { name: 'Business', slug: 'business' },
  { name: 'Science', slug: 'science' },
  { name: 'Home', slug: 'home' },
  { name: 'Entertainment', slug: 'entertainment' },
  { name: 'Culture', slug: 'culture' },
  { name: 'Automotive', slug: 'automotive' },
]

export default function ExploreByTopic() {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 md:px-6 py-2">
      <p
        className="text-center mb-5"
        style={{
          fontSize: '13px',
          fontWeight: 500,
          textTransform: 'uppercase' as const,
          letterSpacing: '1.5px',
          color: '#888780',
        }}
      >
        Explore by topic
      </p>

      <div
        className="flex flex-wrap justify-center mx-auto"
        style={{ gap: '8px', maxWidth: '680px' }}
      >
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}`}
            className="no-underline explore-chip"
            style={{
              fontSize: '14px',
              fontWeight: 500,
              padding: '9px 20px',
              borderRadius: '8px',
              backgroundColor: '#EDECEA',
              color: '#5F5E5A',
              transition: 'all 0.15s ease',
            }}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      <style>{`
        .explore-chip:hover {
          background-color: #BA7517 !important;
          color: #fff !important;
        }
        @media (max-width: 640px) {
          .explore-chip {
            font-size: 13px !important;
            padding: 8px 16px !important;
          }
        }
      `}</style>
    </section>
  )
}
