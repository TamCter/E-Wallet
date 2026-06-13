-- Add subscriptions column to public.users table to store active premium subscriptions in the database
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscriptions JSONB DEFAULT '{}'::jsonb;
