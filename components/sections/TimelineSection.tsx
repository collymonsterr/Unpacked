'use client'

import { useRef, useState, useEffect } from 'react'
import type { TimelineSection as TimelineSectionType } from '@/types/article'

export default function TimelineSection({ section }: { section: TimelineSectionType }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="mb-8">
      <div
        className="rounded-2xl overflow-hidden p-5 md:p-6"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)',
        }}
      >
        <h3
          className="text-lg font-bold mb-6"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {section.heading}
        </h3>

        <div className="relative">
          {/* Central line */}
          <div
            className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5"
            style={{
              backgroundColor: 'var(--border)',
              transform: 'translateX(-50%)',
            }}
          />

          {section.events.map((event, i) => {
            const isLeft = i % 2 === 0

            return (
              <div
                key={i}
                className={`relative flex items-start mb-8 last:mb-0 ${
                  // On mobile, always align right of the line
                  'pl-10 md:pl-0'
                } ${
                  // On desktop, alternate sides
                  isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(16px)',
                  transition: `opacity 0.4s ease ${i * 200}ms, transform 0.4s ease ${i * 200}ms`,
                }}
              >
                {/* Dot on the line */}
                <div
                  className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full z-10"
                  style={{
                    backgroundColor: '#E07A3A',
                    transform: 'translate(-50%, 4px)',
                    border: '2px solid var(--card)',
                    boxShadow: '0 0 0 2px #E07A3A',
                  }}
                />

                {/* Content */}
                <div className={`md:w-[calc(50%-24px)] ${isLeft ? 'md:pr-6 md:text-right' : 'md:pl-6 md:text-left'}`}>
                  <span
                    className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mb-1.5"
                    style={{ backgroundColor: '#E07A3A', color: '#fff' }}
                  >
                    {event.year}
                  </span>
                  <h4
                    className="text-sm font-bold mb-0.5"
                    style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
                  >
                    {event.title}
                  </h4>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {event.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
