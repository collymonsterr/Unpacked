import Link from 'next/link'

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  return (
    <Link href="/" className="inline-flex items-center no-underline py-2">
      <span
        className={`font-extrabold tracking-tight ${sizes[size]}`}
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        Un
      </span>
      <span
        className={`font-extrabold tracking-tight ${sizes[size]}`}
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--accent)' }}
      >
        packed.
      </span>
    </Link>
  )
}
