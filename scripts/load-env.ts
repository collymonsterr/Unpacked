/**
 * Load .env.local into process.env for one-off `npx tsx scripts/…` runs.
 *
 * Deliberately not `dotenv` — that package isn't a dependency of this project,
 * so importing it made these scripts fail on a clean checkout. Same minimal
 * parse next.config.ts uses for its local-dev fallback.
 *
 * Import for side effects, before touching any env var:
 *   import './load-env'
 */
import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')

try {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) continue
    const key = line.substring(0, eqIdx).trim()
    const value = line.substring(eqIdx + 1).trim()
    if (!process.env[key] && value) process.env[key] = value
  }
} catch {
  // Fall through — the script's own env-var check will report what's missing.
}
