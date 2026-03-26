// jsPDF loaded from CDN to avoid Turbopack build issues with fflate
import type { ArticleContent, ContentSection, ProductCard } from '@/types/article'
type JsPDFType = import('jspdf').jsPDF

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedJsPDF: any = null

async function loadJsPDF() {
  if (cachedJsPDF) return cachedJsPDF

  // Check if already loaded globally (e.g. from a previous call)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).jspdf?.jsPDF) {
    cachedJsPDF = (window as any).jspdf.jsPDF
    return cachedJsPDF
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/3.0.3/jspdf.umd.min.js'
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cachedJsPDF = (window as any).jspdf?.jsPDF
      if (cachedJsPDF) resolve(cachedJsPDF)
      else reject(new Error('jsPDF not found after loading'))
    }
    script.onerror = () => reject(new Error('Failed to load jsPDF'))
    document.head.appendChild(script)
  })
}

const ORANGE = '#d4621a'
const DARK = '#333333'
const MUTED = '#94918D'
const VERDICT_BG = '#fff7f2'
const PAGE_WIDTH = 210 // A4 mm
const MARGIN_LEFT = 20
const MARGIN_RIGHT = 20
const MARGIN_TOP = 25
const MARGIN_BOTTOM = 25
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
const FOOTER_Y = 287

function addFooter(doc: JsPDFType) {
  const page = doc.getNumberOfPages()
  for (let i = 1; i <= page; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(MUTED)
    doc.text('unpacked.fyi', MARGIN_LEFT, FOOTER_Y)
    doc.text(`${i} / ${page}`, PAGE_WIDTH - MARGIN_RIGHT, FOOTER_Y, { align: 'right' })
  }
}

function ensureSpace(doc: JsPDFType, needed: number, y: number): number {
  if (y + needed > FOOTER_Y - 10) {
    doc.addPage()
    return MARGIN_TOP
  }
  return y
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function wrapAndWrite(
  doc: JsPDFType,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number = 5.5
): number {
  const lines = doc.splitTextToSize(text, maxWidth)
  for (const line of lines) {
    y = ensureSpace(doc, lineHeight, y)
    doc.text(line, x, y)
    y += lineHeight
  }
  return y
}

export async function generateArticlePDF(article: ArticleContent, slug: string) {
  // Load jsPDF from CDN to avoid Turbopack/fflate build issues
  const jsPDFClass = await loadJsPDF()
  const doc = new jsPDFClass({ unit: 'mm', format: 'a4' }) as JsPDFType

  let y = MARGIN_TOP

  // ─── Header: Unpacked branding ───
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(DARK)
  doc.text('Article', MARGIN_LEFT, y)
  const articleW = doc.getTextWidth('Article')
  doc.setTextColor(ORANGE)
  doc.text('AI', MARGIN_LEFT + articleW + 1, y)
  const aiW = doc.getTextWidth('AI')
  doc.setFontSize(10)
  doc.setTextColor(MUTED)
  doc.text('unpacked.fyi', MARGIN_LEFT + articleW + aiW + 6, y)
  y += 12

  // ─── Article title ───
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(DARK)
  const titleLines = doc.splitTextToSize(article.title, CONTENT_WIDTH)
  for (const line of titleLines) {
    y = ensureSpace(doc, 10, y)
    doc.text(line, MARGIN_LEFT, y)
    y += 10
  }
  y += 4

  // ─── Article type + date line ───
  const typeLabels: Record<string, string> = {
    buyer_guide: 'Buying Guide', comparison: 'Comparison', decision_guide: 'Decision Guide',
    explainer: 'Explainer', news: 'News', planning: 'Travel & Living',
    trend_analysis: 'Trend Analysis', tutorial: 'Tutorial',
  }
  const typeLabel = typeLabels[article.article_type] ?? article.article_type.replace(/_/g, ' ')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(ORANGE)
  doc.text(typeLabel.toUpperCase(), MARGIN_LEFT, y)
  y += 8

  // ─── Quick Verdict ───
  if (article.quick_verdict?.recommendation) {
    y = ensureSpace(doc, 30, y)

    const verdictText = stripMarkdown(article.quick_verdict.recommendation)
    const verdictLines = doc.splitTextToSize(verdictText, CONTENT_WIDTH - 10)
    const blockHeight = verdictLines.length * 5.5 + 10

    // Background
    doc.setFillColor(VERDICT_BG)
    doc.setDrawColor(ORANGE)
    doc.roundedRect(MARGIN_LEFT, y - 4, CONTENT_WIDTH, blockHeight, 2, 2, 'FD')
    // Left border accent
    doc.setFillColor(ORANGE)
    doc.rect(MARGIN_LEFT, y - 4, 2, blockHeight, 'F')

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(ORANGE)
    doc.text('VERDICT', MARGIN_LEFT + 6, y + 1)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(DARK)
    for (const line of verdictLines) {
      doc.text(line, MARGIN_LEFT + 6, y)
      y += 5.5
    }
    y += 8
  }

  // ─── Executive Summary ───
  if (article.executive_summary) {
    y = ensureSpace(doc, 20, y)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(ORANGE)
    doc.text('Key Takeaways', MARGIN_LEFT, y)
    y += 7

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(DARK)

    if (article.executive_summary.short_answer) {
      y = wrapAndWrite(doc, stripMarkdown(article.executive_summary.short_answer), MARGIN_LEFT, y, CONTENT_WIDTH)
      y += 3
    }

    for (const point of article.executive_summary.key_takeaways ?? []) {
      y = ensureSpace(doc, 8, y)
      y = wrapAndWrite(doc, `• ${stripMarkdown(point)}`, MARGIN_LEFT + 3, y, CONTENT_WIDTH - 6)
      y += 2
    }

    if ((article.executive_summary.watch_out_for ?? []).length > 0) {
      y += 3
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(ORANGE)
      y = wrapAndWrite(doc, 'Watch out for:', MARGIN_LEFT, y, CONTENT_WIDTH)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(DARK)
      for (const warn of article.executive_summary.watch_out_for ?? []) {
        y = ensureSpace(doc, 8, y)
        y = wrapAndWrite(doc, `⚠ ${stripMarkdown(warn)}`, MARGIN_LEFT + 3, y, CONTENT_WIDTH - 6)
        y += 2
      }
    }
    y += 8
  }

  // ─── Sections ───
  for (const section of article.sections) {
    // Get heading and content based on section type
    let heading = ''
    let content = ''

    if (section.type === 'content_section') {
      const cs = section as ContentSection
      heading = cs.heading ?? ''
      content = cs.content ?? ''
    } else if (section.type === 'product_card') {
      const pc = section as ProductCard
      heading = pc.entity_name
      const parts: string[] = []
      if (pc.price) parts.push(`Price: ${pc.price}`)
      if (pc.verdict) parts.push(pc.verdict)
      if (pc.opinion) parts.push(pc.opinion)
      if (pc.key_specs) {
        const specs = Object.entries(pc.key_specs).map(([k, v]) => `${k}: ${v}`).join(' | ')
        parts.push(specs)
      }
      content = parts.join('\n\n')
    } else if (section.type === 'comparison_table') {
      heading = (section as unknown as Record<string, unknown>).heading as string ?? 'Comparison'
      const rows = (section as unknown as Record<string, unknown>).rows as Record<string, unknown>[] ?? []
      content = rows.map(r => {
        return Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(' | ')
      }).join('\n')
    } else if (section.type === 'warning_box') {
      heading = (section as unknown as Record<string, unknown>).heading as string ?? 'Things to Avoid'
      const items = (section as unknown as Record<string, unknown>).items as string[] ?? []
      content = items.map(i => `⚠ ${stripMarkdown(i)}`).join('\n')
    } else if (section.type === 'community_insights') {
      heading = 'What People Are Saying'
      const insights = (section as unknown as Record<string, unknown>).insights as Record<string, unknown>[] ?? []
      content = insights.map(i => {
        const quote = i.quote as string ?? ''
        const source = i.source as string ?? ''
        return `"${stripMarkdown(quote)}" — ${source}`
      }).join('\n\n')
    } else if (section.type === 'sources') {
      heading = 'Sources'
      const links = (section as unknown as Record<string, unknown>).links as Record<string, unknown>[] ?? []
      content = links.map((l, i) => {
        const title = l.title as string ?? l.url as string ?? ''
        const url = l.url as string ?? ''
        return `${i + 1}. ${title}${url ? ` — ${url}` : ''}`
      }).join('\n')
    } else if (section.type === 'stat_cards') {
      heading = (section as unknown as Record<string, unknown>).heading as string ?? 'Key Numbers'
      const cards = (section as unknown as Record<string, unknown>).cards as Record<string, unknown>[] ?? []
      content = cards.map(c => `${c.value} — ${c.label}`).join('\n')
    } else {
      // Generic fallback for other section types
      heading = (section as unknown as Record<string, unknown>).heading as string ?? ''
      content = (section as unknown as Record<string, unknown>).content as string ?? ''
    }

    if (!heading && !content) continue

    // Section heading
    if (heading) {
      y = ensureSpace(doc, 20, y)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(ORANGE)
      const headLines = doc.splitTextToSize(heading, CONTENT_WIDTH)
      for (const line of headLines) {
        doc.text(line, MARGIN_LEFT, y)
        y += 6.5
      }
      y += 2
    }

    // Section content
    if (content) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(DARK)

      const paragraphs = content.split(/\n\n+/)
      for (const para of paragraphs) {
        const cleaned = stripMarkdown(para)
        if (!cleaned) continue
        y = wrapAndWrite(doc, cleaned, MARGIN_LEFT, y, CONTENT_WIDTH)
        y += 3
      }
    }

    y += 5
  }

  // ─── Add footers to all pages ───
  addFooter(doc)

  // ─── Save ───
  const filename = (slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 60)
  doc.save(`${filename}-unpacked.fyi.pdf`)
}
