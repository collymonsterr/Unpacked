'use client'

import { useState } from 'react'

export interface GenerationOptions {
  length: 'quick' | 'standard' | 'deep'
  tone: 'opinionated' | 'balanced' | 'casual'
  visual: 'minimal' | 'standard' | 'maximum'
}

const DEFAULTS: GenerationOptions = {
  length: 'standard',
  tone: 'opinionated',
  visual: 'standard',
}

interface Props {
  value: GenerationOptions
  onChange: (options: GenerationOptions) => void
}

interface SegmentOption {
  value: string
  label: string
  subtitle: string
}

function SegmentedControl({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: SegmentOption[]
  selected: string
  onChange: (value: string) => void
}) {
  return (
    <div className="mb-3">
      <p
        className="text-xs font-bold mb-1.5"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)', fontSize: '13px' }}
      >
        {label}
      </p>
      <div
        className="flex rounded-lg p-[3px]"
        style={{ backgroundColor: '#F1EFE8' }}
      >
        {options.map((opt) => {
          const isActive = selected === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="flex-1 py-2 px-2 rounded-md text-center transition-all duration-200"
              style={{
                backgroundColor: isActive ? '#fff' : 'transparent',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                color: isActive ? 'var(--accent)' : '#94918D',
                fontWeight: isActive ? 500 : 400,
              }}
            >
              <span className="block text-xs leading-tight">{opt.label}</span>
              <span className="block leading-tight" style={{ fontSize: '11px', opacity: 0.7 }}>
                {opt.subtitle}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ArticleOptions({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false)

  // Check if any option differs from default
  const hasCustom = value.length !== DEFAULTS.length || value.tone !== DEFAULTS.tone || value.visual !== DEFAULTS.visual

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 mx-auto text-xs font-medium transition-colors"
        style={{ color: hasCustom ? 'var(--accent)' : 'var(--text-secondary)' }}
      >
        <span>{hasCustom ? 'Article options (customised)' : 'Article options'}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div
          className="mt-3 rounded-xl px-4 py-4"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <SegmentedControl
            label="Length"
            options={[
              { value: 'quick', label: 'Quick read', subtitle: '2-3 min' },
              { value: 'standard', label: 'Standard', subtitle: '5-7 min' },
              { value: 'deep', label: 'Deep dive', subtitle: '10+ min' },
            ]}
            selected={value.length}
            onChange={(v) => onChange({ ...value, length: v as GenerationOptions['length'] })}
          />

          <SegmentedControl
            label="Tone"
            options={[
              { value: 'opinionated', label: 'Opinionated', subtitle: 'picks winners' },
              { value: 'balanced', label: 'Balanced', subtitle: 'even-handed' },
              { value: 'casual', label: 'Casual', subtitle: 'conversational' },
            ]}
            selected={value.tone}
            onChange={(v) => onChange({ ...value, tone: v as GenerationOptions['tone'] })}
          />

          <SegmentedControl
            label="How visual"
            options={[
              { value: 'minimal', label: 'Minimal', subtitle: 'mostly text' },
              { value: 'standard', label: 'Standard', subtitle: 'images + charts' },
              { value: 'maximum', label: 'Maximum', subtitle: 'full interactive' },
            ]}
            selected={value.visual}
            onChange={(v) => onChange({ ...value, visual: v as GenerationOptions['visual'] })}
          />

          <p className="text-center mt-1" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Location, currency, and budget preferences are set in your profile settings.
          </p>
        </div>
      )}
    </div>
  )
}

export { DEFAULTS as DEFAULT_OPTIONS }
