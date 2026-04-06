'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function UpgradeToastInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [tierName, setTierName] = useState('')

  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      // Fetch the updated tier to display it
      fetch('/api/profile/usage')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            const labels: Record<string, string> = { standard: 'Standard', pro: 'Pro' }
            setTierName(labels[data.tier] ?? data.tier)
            setShow(true)

            // Clear the query param
            router.replace('/dashboard', { scroll: false })

            // Auto-dismiss after 6 seconds
            setTimeout(() => setShow(false), 6000)
          }
        })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!show) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3.5 rounded-xl shadow-lg z-50 flex items-center gap-3"
      style={{
        backgroundColor: '#16a34a',
        color: '#fff',
        fontFamily: 'var(--font-outfit)',
        animation: 'fadeInUp 0.3s ease-out',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      <p className="text-sm font-semibold">
        Welcome to {tierName}! Your new article limit is active.
      </p>
      <button
        onClick={() => setShow(false)}
        className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
        style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#fff' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default function UpgradeToast() {
  return (
    <Suspense fallback={null}>
      <UpgradeToastInner />
    </Suspense>
  )
}
