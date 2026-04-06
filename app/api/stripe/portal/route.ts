import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'
import { getStripe } from '@/lib/stripe-config'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 1. Require authentication
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Look up Stripe customer ID
    const db = getSupabaseAdmin()
    const { data: profile } = await db
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return Response.json({ error: 'No billing account found' }, { status: 400 })
    }

    // 3. Create Billing Portal session
    const stripe = getStripe()
    const origin = request.headers.get('origin') || 'https://unpacked.fyi'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/settings/profile`,
    })

    return Response.json({ url: portalSession.url })
  } catch (err) {
    console.error('[stripe/portal] Error:', err)
    return Response.json({ error: 'Failed to create billing portal session' }, { status: 500 })
  }
}
