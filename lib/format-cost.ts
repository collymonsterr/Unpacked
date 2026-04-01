/**
 * Format a USD cost as human-readable cents.
 * Under 1¢: "0.3¢" | 1¢ to 99¢: "14¢" | Over $1: "$1.23"
 */
export function formatCost(usd: number): string {
  if (usd <= 0) return '0¢'
  const cents = usd * 100
  if (cents >= 100) return `$${usd.toFixed(2)}`
  if (cents >= 1) return `${Math.round(cents)}¢`
  return `${cents.toFixed(1)}¢`
}
