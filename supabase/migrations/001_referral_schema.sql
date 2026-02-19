-- Add referral_code to waitlist (run in Supabase SQL Editor)
-- 1. Add column (nullable first for backfill)
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS referral_code text;

-- 2. Backfill existing rows with unique url-safe codes (base64url, ~11 chars)
UPDATE public.waitlist
SET referral_code = replace(replace(replace(encode(gen_random_bytes(8), 'base64'), '+', '-'), '/', '_'), '=', '')
WHERE referral_code IS NULL;

-- 3. Enforce not null and unique
ALTER TABLE public.waitlist
  ALTER COLUMN referral_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_referral_code_key ON public.waitlist (referral_code);

-- 4. Referrals table: one row per successful referral (referred user joined via referrer's link)
-- Uses integer FKs to match waitlist(id) type (drop first if re-running after a failed create)
DROP TABLE IF EXISTS public.referrals;
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id integer NOT NULL REFERENCES public.waitlist(id) ON DELETE CASCADE,
  referred_id integer NOT NULL REFERENCES public.waitlist(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON public.referrals (referrer_id);
