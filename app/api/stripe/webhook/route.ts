import { getStripe, PRICE_TO_TIER, TIER_LIMITS } from '@/lib/stripe-config'
import { getSupabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

// Disable Next.js body parsing — we need the raw body for signature verification
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const stripe = getStripe()
  const db = getSupabaseAdmin()

  // 1. Read raw body and verify signature
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not configured')
    return Response.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err instanceof Error ? err.message : err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // 2. Handle events
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(db, session)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(db, stripe, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(db, subscription)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(db, invoice)
        break
      }

      default:
        // Unhandled event type — acknowledge receipt
        break
    }

    return Response.json({ received: true })
  } catch (err) {
    console.error(`[stripe/webhook] Error handling ${event.type}:`, err)
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

/**
 * checkout.session.completed — user completed Stripe Checkout
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCheckoutCompleted(db: any, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const tier = session.metadata?.tier
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id ?? null

  if (!userId || !tier) {
    console.error('[stripe/webhook] checkout.session.completed missing metadata:', { userId, tier })
    return
  }

  console.log(`[stripe/webhook] Checkout completed: user=${userId}, tier=${tier}`)

  // Update profile with new tier
  const limit = TIER_LIMITS[tier] ?? 3
  await db
    .from('profiles')
    .update({
      tier,
      monthly_article_limit: limit,
      tier_updated_at: new Date().toISOString(),
      stripe_subscription_id: subscriptionId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  // Remove from waitlist — they've upgraded
  await db
    .from('upgrade_waitlist')
    .delete()
    .eq('user_id', userId)
}

/**
 * customer.subscription.updated — subscription changed (upgrade/downgrade)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionUpdated(db: any, stripe: Stripe, subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) {
    console.error('[stripe/webhook] subscription.updated missing userId in metadata')
    return
  }

  // Determine the new tier from the subscription's price
  const priceId = subscription.items.data[0]?.price?.id
  if (!priceId) return

  const tier = PRICE_TO_TIER[priceId]
  if (!tier) {
    console.error('[stripe/webhook] Unknown price ID:', priceId)
    return
  }

  console.log(`[stripe/webhook] Subscription updated: user=${userId}, tier=${tier}`)

  const limit = TIER_LIMITS[tier] ?? 3
  await db
    .from('profiles')
    .update({
      tier,
      monthly_article_limit: limit,
      tier_updated_at: new Date().toISOString(),
      stripe_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
}

/**
 * customer.subscription.deleted — subscription cancelled or expired
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionDeleted(db: any, subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) {
    console.error('[stripe/webhook] subscription.deleted missing userId in metadata')
    return
  }

  console.log(`[stripe/webhook] Subscription cancelled: user=${userId}`)

  // Downgrade to free
  await db
    .from('profiles')
    .update({
      tier: 'free',
      monthly_article_limit: 3,
      tier_updated_at: new Date().toISOString(),
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
}

/**
 * invoice.payment_failed — payment attempt failed
 * Don't downgrade immediately — Stripe handles retries.
 * Just log and optionally flag the profile.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentFailed(db: any, invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id ?? null

  if (!customerId) return

  console.warn(`[stripe/webhook] Payment failed for customer=${customerId}`)

  // Find profile by stripe_customer_id and flag it
  const { data: profile } = await db
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (profile) {
    await db
      .from('profiles')
      .update({
        payment_failed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
  }
}
