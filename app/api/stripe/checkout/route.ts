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
    const stripe = getStripe()
    const db = getSupabaseAdmin()

    // 3. Get or create Stripe customer
    const { data: profile } = await db
      .from('profiles')
      .select('stripe_customer_id, tier')
      .eq('id', user.id)
      .single()

    // Prevent re-subscribing to the same tier
    if (profile?.tier === tier) {
      return Response.json({ error: `You're already on the ${tier} plan.` }, { status: 400 })
    }

    let stripeCustomerId = profile?.stripe_customer_id

    if (!stripeCustomerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: user.user_metadata?.full_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      stripeCustomerId = customer.id

      // Save to profile
      await db
        .from('profiles')
        .upsert({
          id: user.id,
          stripe_customer_id: stripeCustomerId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
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
    console.error('[stripe/checkout] Error:', err)
    return Response.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
