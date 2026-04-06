import { NextRequest } from 'next/server'
import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe-config'

export async function POST(request: NextRequest) {
  try {
    // 1. Require authentication
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Validate requested tier
    const body = await request.json()
    const tier = body.tier as string
    if (!tier || !STRIPE_PRICES[tier]) {
      return Response.json({ error: 'Invalid tier. Must be "standard" or "pro".' }, { status: 400 })
    }

    const priceId = STRIPE_PRICES[tier]

    // Validate price ID is configured (not a placeholder)
    if (!priceId || priceId.includes('REPLACE')) {
      console.error(`[stripe/checkout] Price ID not configured for tier "${tier}". Set STRIPE_PRICE_${tier.toUpperCase()} env var.`)
      return Response.json({ error: 'Payment not configured yet. Please set Stripe price IDs.' }, { status: 500 })
    }

    // Validate Stripe secret key exists
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[stripe/checkout] STRIPE_SECRET_KEY not set')
      return Response.json({ error: 'Payment not configured yet.' }, { status: 500 })
    }

    const stripe = getStripe()
    const db = getSupabaseAdmin()

    // 3. Get or create Stripe customer
    // Query profile — handle case where stripe columns don't exist yet
    let stripeCustomerId: string | null = null
    let currentTier: string | null = null

    try {
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('stripe_customer_id, tier')
        .eq('id', user.id)
        .single()

      if (!profileError && profile) {
        stripeCustomerId = profile.stripe_customer_id ?? null
        currentTier = profile.tier ?? null
      }
    } catch {
      // stripe_customer_id column may not exist yet — continue without it
      console.warn('[stripe/checkout] Could not read stripe_customer_id — column may not exist yet')

      // Try reading just tier
      const { data: basicProfile } = await db
        .from('profiles')
        .select('tier')
        .eq('id', user.id)
        .single()
      currentTier = basicProfile?.tier ?? null
    }

    // Prevent re-subscribing to the same tier
    if (currentTier === tier) {
      return Response.json({ error: `You're already on the ${tier} plan.` }, { status: 400 })
    }

    if (!stripeCustomerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: user.user_metadata?.full_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      stripeCustomerId = customer.id

      // Save to profile — try to save stripe_customer_id, gracefully handle if column missing
      try {
        await db
          .from('profiles')
          .upsert({
            id: user.id,
            stripe_customer_id: stripeCustomerId,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })
      } catch {
        console.warn('[stripe/checkout] Could not save stripe_customer_id — column may not exist. Continuing...')
      }
    }

    // 4. Create Checkout Session
    const origin = request.headers.get('origin') || 'https://unpacked.fyi'
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?upgraded=true`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        userId: user.id,
        tier,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier,
        },
      },
    })

    return Response.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[stripe/checkout] Error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
