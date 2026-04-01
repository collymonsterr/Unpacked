/**
 * Extracts a JSON object from a string that may contain markdown fences,
 * thinking text, or truncated output.
 * Shared by claude.ts, gemini-writer.ts, blueprint.ts, editorial-pass.ts.
 */
export function extractJSON(text: string): string {
  // Strip markdown fences if present (complete fence: ```json ... ```)
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()

  // Handle truncated markdown fence: starts with ```json but no closing ```
  // (happens when maxOutputTokens is hit mid-response)
  const truncatedFence = text.match(/```(?:json)?\s*([\s\S]+)/)
  if (truncatedFence) {
    const inner = truncatedFence[1].trim()
    // Try to find valid JSON within the truncated content
    const start = inner.indexOf('{')
    if (start !== -1) {
      const candidate = inner.slice(start)
      // Try to close truncated JSON by finding the deepest valid point
      return repairTruncatedJSON(candidate)
    }
  }

  // Find first { ... last } block
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) return text.slice(start, end + 1)

  // Last resort: if we have { but no }, try to repair truncated JSON
  if (start !== -1) {
    return repairTruncatedJSON(text.slice(start))
  }

  return text.trim()
}

/**
 * Attempt to repair truncated JSON by closing open braces/brackets.
 * This handles the case where Gemini's output is cut off mid-JSON.
 */
function repairTruncatedJSON(text: string): string {
  // Find the last valid position — scan for balanced braces
  let depth = 0
  let inString = false
  let escape = false
  let lastValidEnd = -1

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escape) {
      escape = false
      continue
    }

    if (ch === '\\' && inString) {
      escape = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (ch === '{' || ch === '[') {
      depth++
    } else if (ch === '}' || ch === ']') {
      depth--
      if (depth === 0) {
        lastValidEnd = i
      }
    }
  }

  // If we found a complete top-level object, return it
  if (lastValidEnd > 0) {
    return text.slice(0, lastValidEnd + 1)
  }

  // Otherwise, close open braces/brackets
  let repaired = text.trimEnd()
  // Remove trailing comma or incomplete key/value
  repaired = repaired.replace(/,\s*$/, '')
  repaired = repaired.replace(/,\s*"[^"]*"?\s*$/, '')
  repaired = repaired.replace(/:\s*$/, ': null')

  // Count unclosed braces and brackets
  let openBraces = 0
  let openBrackets = 0
  inString = false
  escape = false

  for (const ch of repaired) {
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') openBraces++
    else if (ch === '}') openBraces--
    else if (ch === '[') openBrackets++
    else if (ch === ']') openBrackets--
  }

  // Close everything
  for (let i = 0; i < openBrackets; i++) repaired += ']'
  for (let i = 0; i < openBraces; i++) repaired += '}'

  return repaired
}
