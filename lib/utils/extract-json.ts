/**
 * Extracts a JSON object from a string that may contain markdown fences
 * or extraneous text before/after the JSON block.
 * Shared by claude.ts and gemini-writer.ts.
 */
export function extractJSON(text: string): string {
  // Strip markdown fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  // Find first { ... } block
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1) return text.slice(start, end + 1)
  return text.trim()
}
