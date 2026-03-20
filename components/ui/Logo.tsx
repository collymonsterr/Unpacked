'use client'

import Link from 'next/link'
import { useRef, useCallback } from 'react'

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  const clickCount = useRef(0)
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = useCallback((e: React.MouseEvent) => {
    clickCount.current++

    if (clickTimer.current) clearTimeout(clickTimer.current)

    if (clickCount.current >= 3) {
      e.preventDefault()
      clickCount.current = 0
      // Toggle admin mode
      const isAdmin = localStorage.getItem('admin_mode') === 'true'
      if (isAdmin) {
        localStorage.removeItem('admin_mode')
      } else {
        localStorage.setItem('admin_mode', 'true')
      }
      window.location.reload()
      return
    }

    clickTimer.current = setTimeout(() => {
      clickCount.current = 0
    }, 500)
  }, [])

  return (
    <Link href="/" className="inline-flex items-center gap-1 no-underline" onClick={handleClick}>
      <span
        className={`font-extrabold tracking-tight ${sizes[size]}`}
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        Article
      </span>
      <span
        className={`font-extrabold tracking-tight ${sizes[size]}`}
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--accent)' }}
      >
        AI
      </span>
    </Link>
  )
}
