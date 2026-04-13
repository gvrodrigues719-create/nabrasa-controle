import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const sql = `
CREATE TABLE IF NOT EXISTS public.user_pin_credentials (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    pin_hash TEXT NOT NULL,
    failed_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_pin_credentials ENABLE ROW LEVEL SECURITY;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.verify_user_pin(p_user_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_hash TEXT;
BEGIN
    SELECT pin_hash INTO v_hash FROM public.user_pin_credentials WHERE user_id = p_user_id;
    IF v_hash IS NULL THEN RETURN FALSE; END IF;
    RETURN v_hash = crypt(p_pin, v_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_pin(p_user_id UUID, p_pin TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.user_pin_credentials (user_id, pin_hash)
    VALUES (p_user_id, crypt(p_pin, gen_salt('bf')))
    ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, failed_attempts = 0, locked_until = NULL, updated_at = NOW();
END;
$$;

CREATE OR REPLACE VIEW public.v_active_employees AS
SELECT id, name, role FROM public.users WHERE active = true ORDER BY name ASC;

GRANT SELECT ON public.v_active_employees TO anon, authenticated;
`

async function run() {
    console.log("Running migration...")

    // As Supabase JS doesn't support raw SQL from client naturally if we don't have access to Postgres directly,
    // we must use the REST API through RPC or wait, can we?
    // There is no query() method on Supabase-js REST client.
    // If the user has Neon, we can use Neon, but here we only have Supabase URL.
    console.log("WAIT. Supabase-js REST doesn't support raw SQL. I will just alert the user to run it via the dashboard.")
}

run()
