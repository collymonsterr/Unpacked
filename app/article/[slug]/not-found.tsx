import Link from 'next/link'
import Navbar from '@/components/ui/Navbar'

export default function ArticleNotFound() {
  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div
        className="sticky top-0 z-50"
        style={{
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Navbar showSearch={true} />
      </div>

      <div className="max-w-[900px] mx-auto px-4 py-20 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ backgroundColor: 'var(--accent-light)' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <p
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Article not found
        </p>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          This article may have been removed, made private, or the link might be incorrect.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold no-underline"
            style={{ backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-sora)' }}
          >
            Ask a new question
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl text-sm font-medium no-underline"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', fontFamily: 'var(--font-sora)' }}
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
