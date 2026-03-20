'use client'

import { useState } from 'react'

interface Props {
  onSubmit: (instruction: string) => void
  isLoading: boolean
}

export default function RefinementInput({ onSubmit, isLoading }: Props) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSubmit(trimmed)
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div
        className="flex items-center gap-2 rounded-xl overflow-hidden"
        style={{ border: '1.5px solid var(--border)', backgroundColor: 'var(--card)' }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Refine this article... e.g. 'Focus on budget options' or 'Add more Reddit opinions'"
          disabled={isLoading}
          className="flex-1 px-4 py-3 text-sm outline-none bg-transparent disabled:opacity-50"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="px-5 py-3 text-sm font-semibold transition-opacity disabled:opacity-40"
          style={{
            backgroundColor: 'var(--accent)',
            color: '#fff',
            cursor: isLoading || !value.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Updating...' : 'Refine'}
        </button>
      </div>
    </form>
  )
}
