'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { NavItem } from '@/lib/section-ids'

interface Props {
  items: NavItem[]
}

export default function ArticleSidebarNav({ items }: Props) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '')
  const observerRef = useRef<IntersectionObserver | null>(null)
  const isClickScrolling = useRef(false)

  // Set up IntersectionObserver to track visible sections
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    const visibleSections = new Map<string, number>()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return

        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio)
          } else {
            visibleSections.delete(entry.target.id)
          }
        }

        // Pick the first visible section in document order
        if (visibleSections.size > 0) {
          for (const item of items) {
            if (visibleSections.has(item.id)) {
              setActiveId(item.id)
              break
            }
          }
        }
      },
      {
        rootMargin: '-10% 0px -60% 0px',
        threshold: [0, 0.1, 0.5],
      }
    )

    // Observe all section elements
    for (const item of items) {
      const el = document.getElementById(item.id)
      if (el) observerRef.current.observe(el)
    }

    return () => observerRef.current?.disconnect()
  }, [items])

  const handleClick = useCallback(
    (id: string) => {
      const el = document.getElementById(id)
      if (!el) return

      // Temporarily disable observer updates during programmatic scroll
      isClickScrolling.current = true
      setActiveId(id)

      el.scrollIntoView({ behavior: 'smooth', block: 'start' })

      // Re-enable observer after scroll settles
      setTimeout(() => {
        isClickScrolling.current = false
      }, 1000)
    },
    []
  )

  if (items.length < 3) return null

  return (
    <nav className="article-sidebar-nav" aria-label="Article sections">
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = item.id === activeId
          return (
            <li key={item.id}>
              <button
                onClick={() => handleClick(item.id)}
                className="sidebar-nav-item"
                data-active={isActive || undefined}
                title={item.label}
              >
                {item.label}
              </button>
            </li>
          )
        })}
      </ul>

      <style>{`
        .article-sidebar-nav {
          position: sticky;
          top: 50%;
          transform: translateY(-50%);
          width: 160px;
          max-height: 70vh;
          overflow-y: auto;
          flex-shrink: 0;
          padding-right: 12px;
          scrollbar-width: none;
        }
        .article-sidebar-nav::-webkit-scrollbar {
          display: none;
        }
        .sidebar-nav-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 6px 0 6px 14px;
          font-size: 13px;
          line-height: 1.3;
          color: #94918D;
          font-weight: 400;
          border: none;
          background: none;
          cursor: pointer;
          position: relative;
          transition: color 300ms ease;
          font-family: var(--font-outfit);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-nav-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 4px;
          bottom: 4px;
          width: 3px;
          border-radius: 2px;
          background: transparent;
          transition: background 300ms ease;
        }
        .sidebar-nav-item:hover {
          color: #6B6B6B;
        }
        .sidebar-nav-item[data-active] {
          color: #E07A3A;
          font-weight: 500;
        }
        .sidebar-nav-item[data-active]:hover {
          color: #E07A3A;
        }
        .sidebar-nav-item[data-active]::before {
          background: #E07A3A;
        }
        @media (max-width: 1024px) {
          .article-sidebar-nav {
            display: none;
          }
        }
      `}</style>
    </nav>
  )
}
