import Stripe from 'stripe'

// Server-side Stripe instance — never import this in client components
export function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

// Price IDs from Stripe Dashboard (test mode)
// These map to the two products already created: Unpacked Standard ($12/mo) and Unpacked Pro ($29/mo)
// TODO: Colin — verify these price IDs match your Stripe Dashboard → Products → each product → Pricing → price ID
export const STRIPE_PRICES: Record<string, string> = {
  standard: process.env.STRIPE_PRICE_STANDARD || 'price_REPLACE_WITH_STANDARD_PRICE_ID', // Standard $12/month
  pro: process.env.STRIPE_PRICE_PRO || 'price_REPLACE_WITH_PRO_PRICE_ID',               // Pro $29/month
}

// Reverse lookup: price ID → tier name
export const PRICE_TO_TIER: Record<string, string> = Object.fromEntries(
  Object.entries(STRIPE_PRICES).map(([tier, priceId]) => [priceId, tier])
)

// Tier limits — single source of truth
export const TIER_LIMITS: Record<string, number> = {
  free: 3,
  standard: 15,
  pro: 60,
}
