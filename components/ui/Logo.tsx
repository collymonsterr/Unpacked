import Link from 'next/link'

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  return (
    <Link href="/" className="inline-flex items-center no-underline">
      <span
        className={`font-extrabold tracking-tight ${sizes[size]}`}
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        The
      </span>
      <span
        className={`font-extrabold tracking-tight ${sizes[size]}`}
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--accent)' }}
      >
        Brief.
      </span>
    </Link>
  )
}
