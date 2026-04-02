'use client'

import { useState, useEffect } from 'react'

interface FoundingApplication {
  id: string
  user_id: string
  status: string
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  userName: string
  userAvatar: string | null
  articleCount: number
}

export default function AdminFounders() {
  const [applications, setApplications] = useState<FoundingApplication[]>([])
  const [approvedCount, setApprovedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/founding/admin')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setApplications(data.applications ?? [])
          setApprovedCount(data.approvedCount ?? 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleAction(applicationId: string, action: 'approve' | 'reject') {
    setProcessing(applicationId)
    try {
      const res = await fetch('/api/founding/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, action }),
      })
      if (res.ok) {
        const newStatus = action === 'approve' ? 'approved' : 'rejected'
        setApplications(prev =>
          prev.map(a =>
            a.id === applicationId
              ? { ...a, status: newStatus, reviewed_at: new Date().toISOString() }
              : a
          )
        )
        if (action === 'approve') setApprovedCount(prev => prev + 1)
        if (action === 'reject') {
          const was = applications.find(a => a.id === applicationId)
          if (was?.status === 'approved') setApprovedCount(prev => prev - 1)
        }
      }
    } catch {
      // silently fail
    } finally {
      setProcessing(null)
    }
  }

  const filtered = applications.filter(a => filter === 'all' || a.status === filter)

  const filterTabs = [
    { id: 'all' as const, label: 'All', count: applications.length },
    { id: 'pending' as const, label: 'Pending', count: applications.filter(a => a.status === 'pending').length },
    { id: 'approved' as const, label: 'Approved', count: applications.filter(a => a.status === 'approved').length },
    { id: 'rejected' as const, label: 'Rejected', count: applications.filter(a => a.status === 'rejected').length },
  ]

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
        />
      </div>
    )
  }

  return (
    <div>
      {/* Counter */}
      <div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-4"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <span className="text-sm font-bold" style={{ color: 'var(--accent)', fontFamily: 'var(--font-sora)' }}>
          {approvedCount}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          of 100 approved
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: filter === tab.id ? 'var(--accent)' : 'transparent',
              color: filter === tab.id ? '#fff' : 'var(--text-secondary)',
              border: filter === tab.id ? '1px solid var(--accent)' : '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                style={{
                  backgroundColor: filter === tab.id ? 'rgba(255,255,255,0.2)' : 'var(--bg)',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Applications list */}
      {filtered.length === 0 ? (
        <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
          No applications in this view.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((app) => {
            const date = new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            const isProcessing = processing === app.id

            return (
              <div
                key={app.id}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0" style={{ backgroundColor: 'var(--bg)' }}>
                  {app.userAvatar ? (
                    <img src={app.userAvatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      {app.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {app.userName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      Applied {date}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      {app.articleCount} article{app.articleCount !== 1 ? 's' : ''}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor:
                          app.status === 'approved' ? '#dcfce7' :
                          app.status === 'rejected' ? '#fef2f2' :
                          '#FEF3EC',
                        color:
                          app.status === 'approved' ? '#16a34a' :
                          app.status === 'rejected' ? '#dc2626' :
                          '#BA7517',
                      }}
                    >
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {app.status === 'pending' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleAction(app.id, 'approve')}
                      disabled={isProcessing}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30"
                      style={{
                        backgroundColor: '#16a34a',
                        color: '#fff',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        border: 'none',
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(app.id, 'reject')}
                      disabled={isProcessing}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30"
                      style={{
                        color: '#dc2626',
                        backgroundColor: 'transparent',
                        border: '1px solid #fecaca',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
