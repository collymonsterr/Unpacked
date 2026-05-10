import Link from 'next/link'

interface Props {
  /** The big statement / quote — single sentence, opinionated */
  quote: string
  /** Optional small attribution shown below the quote */
  attribution?: string
  /** Where the CTA link goes (e.g. "/about", "/how-it-works") */
  href: string
  /** CTA text shown as a link below the quote */
  ctaLabel: string
}

/**
 * QuoteBreaker — visual section break with a big editorial quote and a
 * single CTA link to a deeper page (/about, /how-it-works, etc.).
 *
 * Visually matches the article BigStatement component (amber background,
 * decorative quote mark, dark amber text) so it reads consistently with
 * the rest of the brand. Used in the marketing homepage between sections
 * to pause the visual flow and offer a "go deeper" path.
 */
export default function QuoteBreaker({ quote, attribution, href, ctaLabel }: Props) {
  return (
    <section className="max-w-[1060px] mx-auto px-4 md:px-6 py-12">
      <div
        className="mx-auto rounded-2xl relative overflow-hidden"
        style={{
          maxWidth: '820px',
          backgroundColor: '#FAEEDA',
          padding: '2rem 2.5rem 2rem 3rem',
        }}
      >
        {/* Decorative quote mark — matches BigStatement */}
        <svg
          width="36"
          height="28"
          viewBox="0 0 32 24"
          fill="none"
          className="absolute"
          style={{ top: '1.4rem', left: '1.2rem', opacity: 0.3 }}
          aria-hidden="true"
        >
          <path
            d="M0 24V14.4C0 10.4 0.8 7.2 2.4 4.8C4.08 2.4 6.56 0.64 9.84 0L11.2 3.36C9.28 3.84 7.76 4.8 6.64 6.24C5.6 7.68 5.04 9.36 4.96 11.28H11.2V24H0ZM20.8 24V14.4C20.8 10.4 21.6 7.2 23.2 4.8C24.88 2.4 27.36 0.64 30.64 0L32 3.36C30.08 3.84 28.56 4.8 27.44 6.24C26.4 7.68 25.84 9.36 25.76 11.28H32V24H20.8Z"
            fill="#BA7517"
          />
        </svg>

        <p
          className="text-xl md:text-2xl font-semibold leading-snug"
          style={{
            color: '#633806',
            paddingLeft: '1.75rem',
            fontFamily: 'var(--font-sora)',
          }}
        >
          {quote}
        </p>

        {attribution && (
          <p
            className="mt-3 text-sm"
            style={{ color: '#854F0B', paddingLeft: '1.75rem' }}
          >
            &mdash; {attribution}
          </p>
        )}

        <div className="mt-5" style={{ paddingLeft: '1.75rem' }}>
          <Link
            href={href}
            className="text-sm font-semibold no-underline inline-flex items-center gap-1"
            style={{
              color: '#BA7517',
              fontFamily: 'var(--font-sora)',
              borderBottom: '1.5px solid #BA7517',
              paddingBottom: '1px',
            }}
          >
            {ctaLabel} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
