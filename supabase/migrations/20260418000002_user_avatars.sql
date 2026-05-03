-- Add avatar_url to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
