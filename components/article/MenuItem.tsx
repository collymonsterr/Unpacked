'use client'

export default function MenuItem({
  children,
  onClick,
  disabled,
  loading,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full text-left text-sm px-3 py-2 transition-colors disabled:opacity-40"
      style={{
        color: danger ? '#dc2626' : 'var(--text-primary)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = danger ? '#fef2f2' : 'var(--accent-light)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
          Working...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
