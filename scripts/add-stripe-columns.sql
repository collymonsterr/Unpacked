-- Add Stripe-related columns to profiles table
-- Run this in the Supabase Dashboard SQL Editor

-- Stripe customer ID (created on first checkout, reused thereafter)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Stripe subscription ID (active subscription reference)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Payment failure flag (set by webhook, cleared on successful payment)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_failed boolean DEFAULT false;

-- Index for looking up profiles by Stripe customer ID (webhook handler)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
