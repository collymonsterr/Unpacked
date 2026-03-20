import type { ArticleType } from '@/types/article'
import { ARTICLE_TYPE_LABELS } from '@/lib/article-config'

export default function ArticleTypeBadge({ type }: { type: ArticleType }) {
  return (
    <span
      className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
      style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
    >
      {ARTICLE_TYPE_LABELS[type] ?? type.replace(/_/g, ' ')}
    </span>
  )
}
