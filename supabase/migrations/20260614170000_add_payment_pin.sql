-- Add payment_pin column to public.users table if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payment_pin VARCHAR(255);
