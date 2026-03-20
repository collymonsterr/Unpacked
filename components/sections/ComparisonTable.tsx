import type { ComparisonTable as ComparisonTableType } from '@/types/article'

export default function ComparisonTable({ section }: { section: ComparisonTableType }) {
  return (
    <div className="mb-8">
      <h2
        className="text-xl font-bold mb-4"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {section.heading}
      </h2>
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#f0ede6' }}>
              {section.columns.map((col, i) => (
                <th
                  key={i}
                  className="text-left px-4 py-3 font-semibold"
                  style={{
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sora)',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row, ri) => {
              // Highlight rows that contain top pick indicators
              const isTopPick = row.some(
                (cell) =>
                  typeof cell === 'string' &&
                  (cell.includes('★') || cell.toLowerCase().includes('top pick'))
              )
              return (
                <tr
                  key={ri}
                  style={{
                    backgroundColor: isTopPick
                      ? 'var(--accent-light)'
                      : ri % 2 === 0
                      ? 'var(--card)'
                      : '#f8f7f5',
                  }}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-4 py-3"
                      style={{
                        color: ci === 0 ? 'var(--text-secondary)' : 'var(--text-primary)',
                        fontWeight: ci === 0 ? 500 : 400,
                        borderBottom: ri < section.rows.length - 1 ? '1px solid var(--border)' : 'none',
                        whiteSpace: ci === 0 ? 'nowrap' : undefined,
                      }}
                    >
                      {isTopPick && ci > 0 && cell.includes('★') ? (
                        <span className="font-semibold" style={{ color: 'var(--accent)' }}>{cell}</span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
