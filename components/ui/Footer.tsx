import Link from 'next/link'

export default function Footer() {
  return (
    <footer
      className="w-full max-w-6xl mx-auto px-6 py-8 mt-12 flex items-center justify-between"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        The Brief
      </p>
      <div className="flex items-center gap-5">
        <Link
          href="/about"
          className="text-xs no-underline transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-secondary)' }}
        >
          About
        </Link>
        <Link
          href="/creators"
          className="text-xs no-underline transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-secondary)' }}
        >
          For Creators
        </Link>
      </div>
    </footer>
  )
}
