'use client'

import { useState, useEffect } from 'react'

interface UsersData {
  totalUsers: number
  newThisWeek: number
  newThisMonth: number
  recentUsers: { email: string; name: string | null; joinedAt: string }[]
}

export default function AdminUsers() {
  const [data, setData] = useState<UsersData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mb-8">
        <h2
          className="text-lg font-bold mb-4"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Users
        </h2>
        <div className="animate-pulse h-32 rounded-xl" style={{ backgroundColor: 'var(--border)' }} />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="mb-8">
      <h2
        className="text-lg font-bold mb-4"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        Users
      </h2>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatCard label="Total users" value={data.totalUsers} />
        <StatCard label="New this week" value={data.newThisWeek} />
        <StatCard label="New this month" value={data.newThisMonth} />
      </div>

      {/* Recent signups table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th
                className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-2.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                User
              </th>
              <th
                className="text-right text-xs font-semibold uppercase tracking-wider px-4 py-2.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {data.recentUsers.map((user, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: i < data.recentUsers.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <td className="px-4 py-2.5">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {user.name ?? user.email}
                  </p>
                  {user.name && (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {user.email}
                    </p>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(user.joinedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <p
        className="text-2xl font-bold mb-1"
        style={{ color: 'var(--accent)', fontFamily: 'var(--font-sora)' }}
      >
        {value.toLocaleString()}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
    </div>
  )
}
