'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ArticleRow, ArticleSection } from '@/types/article'
import { getArticleTypeLabel } from '@/lib/article-types'

const SERIF_STACK = 'Georgia, "Times New Roman", Cambria, serif'
const AMBER = '#BA7517'
const AMBER_BG = '#FAEEDA'
const PAGE_BG = '#FAFAF8'

interface Props {
  row: ArticleRow
}

interface EditableSection {
  /** Stable id for dnd-kit (uuid-like, generated client-side) */
  uid: string
  /** Index in the original article.sections array */
  originalIndex: number
  /** The section object as currently displayed (after edits) */
  data: ArticleSection
  /** The section object as it was on initial load (for diffing) */
  pristine: ArticleSection
}

type Mode = 'write' | 'reorder'

export default function EditFullClient({ row }: Props) {
  const router = useRouter()
  const article = row.article!
  const articleId = row.id
  const slug = row.slug

  // ── Initial editable section list ────────────────────────────────────────
  const [sections, setSections] = useState<EditableSection[]>(() =>
    article.sections.map((s, i) => ({
      uid: `sec-${i}-${Math.random().toString(36).slice(2, 9)}`,
      originalIndex: i,
      data: deepClone(s),
      pristine: deepClone(s),
    }))
  )

  const [title, setTitle] = useState(article.title)
  const pristineTitle = useRef(article.title)

  const [mode, setMode] = useState<Mode>('write')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Edit detection ───────────────────────────────────────────────────────
  const editCount = useMemo(() => {
    let n = title !== pristineTitle.current ? 1 : 0
    for (const s of sections) {
      if (sectionDiffers(s.data, s.pristine)) n++
    }
    // Reorder counts as one change if section ids no longer match positions
    const reordered = sections.some((s, i) => s.originalIndex !== i)
    if (reordered) n++
    return n
  }, [title, sections])

  const hasChanges = editCount > 0

  // ── Word count ───────────────────────────────────────────────────────────
  const wordCount = useMemo(() => countWords(title, sections.map(s => s.data)), [title, sections])

  // ── Unsaved-changes warning on browser back/close ────────────────────────
  useEffect(() => {
    if (!hasChanges) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  // ── Save handler ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const payloadSections = sections.map(s => ({
        ...s.data,
        _originalIndex: s.originalIndex,
      }))
      const res = await fetch(`/api/articles/${articleId}/edit-full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sections: payloadSections }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `Save failed (${res.status})`)
      }
      // Success — clear pristine so beforeunload no longer fires, then navigate
      pristineTitle.current = title
      setSections(prev => prev.map(s => ({ ...s, pristine: deepClone(s.data), originalIndex: prev.indexOf(s) })))
      // Toast via query param the article page can read (or just navigate)
      router.push(`/article/${slug}?edited=1`)
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }, [articleId, title, sections, slug, router, saving])

  // ── Cmd/Ctrl+S to save ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (hasChanges && !saving) handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hasChanges, saving, handleSave])

  // ── Cancel ───────────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      const ok = window.confirm('Discard all changes?')
      if (!ok) return
    }
    router.push(`/article/${slug}`)
  }, [hasChanges, router, slug])

  // ── Section update helpers ───────────────────────────────────────────────
  const updateSection = useCallback((uid: string, mutator: (data: ArticleSection) => ArticleSection) => {
    setSections(prev =>
      prev.map(s => (s.uid === uid ? { ...s, data: mutator(s.data) } : s))
    )
  }, [])

  // ── Reorder ──────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setSections(prev => {
      const oldIndex = prev.findIndex(s => s.uid === active.id)
      const newIndex = prev.findIndex(s => s.uid === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }, [])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: PAGE_BG }}>
      {/* ── Sticky toolbar ───────────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: PAGE_BG,
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="max-w-[860px] mx-auto px-4 md:px-6 py-3 flex items-center gap-2 md:gap-3 flex-wrap">
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 text-sm"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sora)' }}
            title="Back to article"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="hidden sm:block w-px h-5" style={{ backgroundColor: 'var(--border)' }} />

          {/* Mode toggle */}
          <div
            className="inline-flex rounded-lg p-0.5"
            style={{ backgroundColor: '#fff', border: '1px solid var(--border)' }}
          >
            {(['write', 'reorder'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                style={{
                  backgroundColor: mode === m ? AMBER : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sora)',
                }}
              >
                {m === 'write' ? 'Write' : 'Reorder'}
              </button>
            ))}
          </div>

          {/* Edit counter */}
          <span
            className="text-xs"
            style={{
              color: hasChanges ? AMBER : 'var(--text-secondary)',
              fontFamily: 'var(--font-sora)',
              fontWeight: hasChanges ? 600 : 400,
            }}
          >
            {hasChanges ? `${editCount} change${editCount === 1 ? '' : 's'}` : 'No changes'}
          </span>

          {/* Spacer */}
          <div className="flex-1 min-w-[8px]" />

          {/* Cancel */}
          <button
            onClick={handleCancel}
            className="text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sora)',
            }}
          >
            Cancel
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="text-xs font-semibold px-4 py-1.5 rounded-lg"
            style={{
              backgroundColor: hasChanges && !saving ? AMBER : '#d1d5db',
              color: '#fff',
              border: 'none',
              cursor: hasChanges && !saving ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-sora)',
            }}
            title="Save changes (⌘S)"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {error && (
          <div
            className="max-w-[860px] mx-auto px-4 md:px-6 pb-3 text-xs"
            style={{ color: '#b91c1c', fontFamily: 'var(--font-sora)' }}
          >
            {error}
          </div>
        )}
      </div>

      {/* ── Document body ──────────────────────────────────────────────────── */}
      <div className="max-w-[760px] mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Title — always editable, both modes */}
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Article title"
          className="w-full"
          style={{
            fontFamily: SERIF_STACK,
            fontSize: '26px',
            fontWeight: 600,
            lineHeight: 1.25,
            color: 'var(--text-primary)',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '4px 0',
            borderBottom: '2px solid transparent',
            transition: 'border-color 0.15s ease',
          }}
          onFocus={e => (e.currentTarget.style.borderBottomColor = AMBER)}
          onBlur={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
        />
        {title !== pristineTitle.current && <EditedPill />}

        {/* Metadata line */}
        <div
          className="flex items-center gap-3 flex-wrap text-xs mt-3 mb-6"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}
        >
          <span>{getArticleTypeLabel(article.article_type)}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{row.category ?? 'Uncategorised'}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{sections.length} sections</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{wordCount.toLocaleString()} words</span>
        </div>

        {/* ── Mode body ──────────────────────────────────────────────────── */}
        {mode === 'write' ? (
          <div>
            {sections.map((s, idx) => (
              <div key={s.uid}>
                <SectionEditor
                  section={s.data}
                  pristine={s.pristine}
                  onChange={mutator => updateSection(s.uid, mutator)}
                />
                {idx < sections.length - 1 && (
                  <div
                    className="my-6"
                    style={{ borderTop: '1px solid var(--border)', opacity: 0.5 }}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map(s => s.uid)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sections.map((s, i) => (
                  <ReorderRow key={s.uid} uid={s.uid} index={i} section={s.data} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Bottom spacer */}
        <div className="h-24" />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Per-section editor — renders editable text fields by section type
// ════════════════════════════════════════════════════════════════════════════

interface SectionEditorProps {
  section: ArticleSection
  pristine: ArticleSection
  onChange: (mutator: (s: ArticleSection) => ArticleSection) => void
}

function SectionEditor({ section, pristine, onChange }: SectionEditorProps) {
  const edited = sectionDiffers(section, pristine)

  const headingChange = (value: string) => {
    onChange(s => ({ ...(s as { heading?: string }), heading: value }) as ArticleSection)
  }

  const renderHeading = (heading: string | undefined) => (
    <EditableInput
      value={heading ?? ''}
      onChange={headingChange}
      placeholder="Section heading"
      style={{
        fontFamily: 'var(--font-sora)',
        fontSize: '20px',
        fontWeight: 500,
        lineHeight: 1.3,
        color: 'var(--text-primary)',
      }}
    />
  )

  const editedPill = edited ? <EditedPill /> : null

  switch (section.type) {
    case 'content_section': {
      const s = section as { type: 'content_section'; heading: string; content: string }
      return (
        <div>
          {renderHeading(s.heading)}
          <div className="h-3" />
          <AutoTextarea
            value={s.content}
            onChange={value =>
              onChange(prev => ({ ...(prev as object), content: value }) as ArticleSection)
            }
            style={{
              fontSize: '16px',
              lineHeight: 1.85,
              fontFamily: 'var(--font-sora)',
              color: 'var(--text-primary)',
            }}
          />
          {editedPill}
        </div>
      )
    }

    case 'big_statement': {
      const s = section as { type: 'big_statement'; content: { statement: string } }
      return (
        <div
          className="my-2 rounded-xl"
          style={{
            backgroundColor: AMBER_BG,
            padding: '1.25rem 1.75rem',
          }}
        >
          <AutoTextarea
            value={s.content.statement}
            onChange={value =>
              onChange(
                prev =>
                  ({
                    ...(prev as object),
                    content: { statement: value },
                  }) as ArticleSection
              )
            }
            style={{
              fontFamily: SERIF_STACK,
              fontSize: '18px',
              fontStyle: 'italic',
              lineHeight: 1.55,
              color: '#412402',
              fontWeight: 500,
            }}
            focusBorderColor={AMBER}
          />
          {editedPill}
        </div>
      )
    }

    case 'image_section': {
      const s = section as {
        type: 'image_section'
        heading?: string
        images: Array<{ image_url?: string | null; caption?: string; search_query: string }>
      }
      return (
        <div>
          {s.heading != null && renderHeading(s.heading)}
          <div className="h-3" />
          <div className="space-y-3">
            {s.images.map((img, i) => (
              <div key={i}>
                {img.image_url ? (
                  // Use a plain <img> rather than next/image to avoid the optimisation
                  // pipeline for what is purely an editor preview.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.image_url}
                    alt={img.caption ?? img.search_query ?? ''}
                    style={{
                      width: '100%',
                      maxHeight: '200px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      display: 'block',
                    }}
                  />
                ) : (
                  <PlaceholderBlock
                    icon={<ImageIcon />}
                    label="Image"
                    description={img.search_query || 'Image (no URL set)'}
                  />
                )}
                {(img.caption || img.search_query) && (
                  <p
                    className="mt-1.5 text-xs italic"
                    style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}
                  >
                    {img.caption ?? img.search_query}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p
            className="mt-2 text-[11px]"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}
          >
            Image content is edited on the article page, not here.
          </p>
          {editedPill}
        </div>
      )
    }

    case 'product_card': {
      const s = section as {
        type: 'product_card'
        heading: string
        entity_name: string
        opinion: string
        verdict: string
        price: string
      }
      return (
        <div
          className="rounded-lg p-4"
          style={{ backgroundColor: '#fff', border: '1px solid var(--border)' }}
        >
          {renderHeading(s.heading)}
          <p
            className="text-xs mt-1 mb-3"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}
          >
            {s.entity_name} · {s.price}
          </p>

          <Label>Opinion</Label>
          <AutoTextarea
            value={s.opinion}
            onChange={value =>
              onChange(prev => ({ ...(prev as object), opinion: value }) as ArticleSection)
            }
            style={{ fontSize: '15px', lineHeight: 1.7, fontFamily: 'var(--font-sora)' }}
          />
          <div className="h-2" />
          <Label>Verdict</Label>
          <AutoTextarea
            value={s.verdict}
            onChange={value =>
              onChange(prev => ({ ...(prev as object), verdict: value }) as ArticleSection)
            }
            style={{
              fontFamily: SERIF_STACK,
              fontSize: '17px',
              fontStyle: 'italic',
              lineHeight: 1.55,
            }}
          />
          {editedPill}
        </div>
      )
    }

    // ── Structured components: heading is editable, body is a placeholder ──
    default: {
      return (
        <div>
          {(section as { heading?: string }).heading != null &&
            renderHeading((section as { heading?: string }).heading)}
          <div className="h-2" />
          <PlaceholderBlock
            icon={iconForType(section.type)}
            label={labelForType(section.type)}
            description={describeStructuredSection(section)}
          />
          {editedPill}
        </div>
      )
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Reorder mode row
// ════════════════════════════════════════════════════════════════════════════

function ReorderRow({ uid, index, section }: { uid: string; index: number; section: ArticleSection }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: uid })

  const heading = (section as { heading?: string }).heading ?? labelForType(section.type)

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: '#fff',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag handle"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'grab',
          padding: '4px',
          color: 'var(--text-secondary)',
          touchAction: 'none',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="6" r="1" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="18" r="1" />
          <circle cx="15" cy="6" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="18" r="1" />
        </svg>
      </button>

      <span
        className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
        style={{
          backgroundColor: '#f3f4f6',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-sora)',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {labelForType(section.type)}
      </span>

      <span
        className="text-sm flex-1 truncate"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
        title={heading}
      >
        {heading}
      </span>

      <span
        className="text-[10px]"
        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}
      >
        #{index + 1}
      </span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Editable input + auto-resize textarea + small UI atoms
// ════════════════════════════════════════════════════════════════════════════

function EditableInput({
  value,
  onChange,
  placeholder,
  style,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  style?: React.CSSProperties
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full"
      style={{
        background: 'transparent',
        border: 'none',
        borderLeft: '3px solid transparent',
        outline: 'none',
        padding: '4px 0 4px 10px',
        marginLeft: '-13px',
        transition: 'border-color 0.15s ease',
        ...style,
      }}
      onFocus={e => (e.currentTarget.style.borderLeftColor = AMBER)}
      onBlur={e => (e.currentTarget.style.borderLeftColor = 'transparent')}
    />
  )
}

function AutoTextarea({
  value,
  onChange,
  style,
  focusBorderColor,
}: {
  value: string
  onChange: (v: string) => void
  style?: React.CSSProperties
  focusBorderColor?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [])

  useEffect(() => {
    resize()
  }, [resize, value])

  useEffect(() => {
    // Resize on window resize too — line wrapping changes
    const handler = () => resize()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [resize])

  const borderColor = focusBorderColor ?? AMBER

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={e => {
        onChange(e.target.value)
        // resize() called via the effect after value updates, but call it here too
        // for snappy single-frame response.
        resize()
      }}
      onInput={resize}
      className="w-full resize-none"
      style={{
        background: 'transparent',
        border: 'none',
        borderLeft: '3px solid transparent',
        outline: 'none',
        padding: '6px 0 6px 10px',
        marginLeft: '-13px',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease',
        ...style,
      }}
      onFocus={e => (e.currentTarget.style.borderLeftColor = borderColor)}
      onBlur={e => (e.currentTarget.style.borderLeftColor = 'transparent')}
    />
  )
}

function EditedPill() {
  return (
    <div
      className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{
        backgroundColor: AMBER_BG,
        color: '#633806',
        fontFamily: 'var(--font-sora)',
      }}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Edited
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] uppercase tracking-wider mb-1"
      style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)', fontWeight: 600 }}
    >
      {children}
    </p>
  )
}

function PlaceholderBlock({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode
  label: string
  description: string
}) {
  return (
    <div
      className="rounded-lg p-3 flex items-start gap-3"
      style={{
        backgroundColor: '#f3f4f6',
        border: '1px dashed #d1d5db',
      }}
    >
      <div
        className="flex-shrink-0 rounded-md p-1.5"
        style={{ backgroundColor: '#fff', color: 'var(--text-secondary)' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] uppercase tracking-wider font-semibold"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}
        >
          {label}
        </p>
        <p
          className="text-xs mt-0.5 truncate"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
        >
          {description}
        </p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════════

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function sectionDiffers(a: ArticleSection, b: ArticleSection): boolean {
  return JSON.stringify(stripEditedFlag(a)) !== JSON.stringify(stripEditedFlag(b))
}

function stripEditedFlag(s: ArticleSection): ArticleSection {
  const { edited: _edited, ...rest } = s as ArticleSection & { edited?: boolean }
  void _edited
  return rest as ArticleSection
}

function countWords(title: string, sections: ArticleSection[]): number {
  let total = wordsIn(title)
  for (const s of sections) {
    total += wordsIn((s as { heading?: string }).heading ?? '')
    if (s.type === 'content_section') {
      total += wordsIn((s as { content: string }).content)
    } else if (s.type === 'big_statement') {
      total += wordsIn((s as { content: { statement: string } }).content.statement)
    } else if (s.type === 'product_card') {
      const p = s as { opinion: string; verdict: string }
      total += wordsIn(p.opinion) + wordsIn(p.verdict)
    }
  }
  return total
}

function wordsIn(text: string): number {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

function labelForType(type: string): string {
  const map: Record<string, string> = {
    content_section: 'Text',
    big_statement: 'Big statement',
    image_section: 'Image',
    product_card: 'Product',
    comparison_table: 'Comparison',
    warning_box: 'Warning',
    price_tier_breakdown: 'Price tiers',
    community_insights: 'Community',
    sources: 'Sources',
    further_reading: 'Further reading',
    head_to_head: 'Head to head',
    who_this_is_for: 'Who it\'s for',
    bar_chart: 'Bar chart',
    comparison_matrix: 'Comparison matrix',
    pie_chart: 'Pie chart',
    line_chart: 'Line chart',
    stat_cards: 'Stat cards',
    treemap: 'Treemap',
    timeline: 'Timeline',
    interactive_calculator: 'Calculator',
    live_data_card: 'Live data',
    ranked_item: 'Ranked',
    myth_reality: 'Myth vs reality',
  }
  return map[type] ?? type
}

function describeStructuredSection(s: ArticleSection): string {
  const heading = (s as { heading?: string }).heading
  switch (s.type) {
    case 'comparison_table': {
      const ct = s as { columns?: string[]; rows?: unknown[] }
      return `${ct.rows?.length ?? 0} rows, ${ct.columns?.length ?? 0} columns`
    }
    case 'bar_chart':
    case 'pie_chart':
    case 'treemap': {
      const c = s as { data?: unknown[] }
      return `${c.data?.length ?? 0} data points${heading ? ` — ${heading}` : ''}`
    }
    case 'line_chart': {
      const c = s as { series?: unknown[] }
      return `${c.series?.length ?? 0} series${heading ? ` — ${heading}` : ''}`
    }
    case 'stat_cards': {
      const c = s as { cards?: unknown[] }
      return `${c.cards?.length ?? 0} stats`
    }
    case 'comparison_matrix': {
      const c = s as { items?: unknown[]; metrics?: unknown[] }
      return `${c.items?.length ?? 0} items × ${c.metrics?.length ?? 0} metrics`
    }
    case 'timeline': {
      const c = s as { events?: unknown[] }
      return `${c.events?.length ?? 0} events`
    }
    case 'interactive_calculator': {
      const c = s as { calculator_type?: string }
      return `Calculator (${c.calculator_type ?? 'custom'})`
    }
    case 'community_insights': {
      const c = s as { insights?: unknown[] }
      return `${c.insights?.length ?? 0} community insights`
    }
    case 'price_tier_breakdown': {
      const c = s as { tiers?: unknown[] }
      return `${c.tiers?.length ?? 0} pricing tiers`
    }
    case 'head_to_head': {
      const c = s as { categories?: unknown[] }
      return `${c.categories?.length ?? 0} head-to-head categories`
    }
    case 'who_this_is_for': {
      const c = s as { profiles?: unknown[] }
      return `${c.profiles?.length ?? 0} reader profiles`
    }
    case 'ranked_item': {
      const c = s as { items?: unknown[] }
      return `${c.items?.length ?? 0} ranked items`
    }
    case 'myth_reality': {
      const c = s as { pairs?: unknown[] }
      return `${c.pairs?.length ?? 0} myth/reality pairs`
    }
    case 'warning_box': {
      const c = s as { items?: unknown[] }
      return `${c.items?.length ?? 0} warning items`
    }
    case 'sources': {
      const c = s as { items?: unknown[] }
      return `${c.items?.length ?? 0} sources`
    }
    case 'further_reading': {
      const c = s as { items?: unknown[] }
      return `${c.items?.length ?? 0} further-reading links`
    }
    case 'live_data_card': {
      const c = s as { data_source?: string }
      return `Live data (${c.data_source ?? 'unknown source'})`
    }
    default:
      return labelForType(s.type)
  }
}

function iconForType(type: string): React.ReactNode {
  switch (type) {
    case 'bar_chart':
    case 'pie_chart':
    case 'line_chart':
    case 'treemap':
    case 'stat_cards':
    case 'comparison_matrix':
      return <ChartIcon />
    case 'comparison_table':
    case 'head_to_head':
    case 'who_this_is_for':
    case 'price_tier_breakdown':
      return <TableIcon />
    case 'interactive_calculator':
      return <CalcIcon />
    case 'timeline':
      return <TimelineIcon />
    case 'community_insights':
      return <CommunityIcon />
    case 'sources':
    case 'further_reading':
      return <LinkIcon />
    case 'live_data_card':
      return <LiveIcon />
    case 'image_section':
      return <ImageIcon />
    default:
      return <BlockIcon />
  }
}

// Icons (14×14 stroke-based, matching the EditorBar style)
function ChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  )
}
function TableIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  )
}
function CalcIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="8.01" y2="10" />
      <line x1="12" y1="10" x2="12.01" y2="10" />
      <line x1="16" y1="10" x2="16.01" y2="10" />
    </svg>
  )
}
function TimelineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <circle cx="7" cy="12" r="2" />
      <circle cx="17" cy="12" r="2" />
    </svg>
  )
}
function CommunityIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  )
}
function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}
function LiveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}
function ImageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}
function BlockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  )
}
