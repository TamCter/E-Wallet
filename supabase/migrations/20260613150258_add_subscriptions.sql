-- Safe rename of legacy column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'subscriptions'
    ) THEN
        ALTER TABLE public.users RENAME COLUMN subscriptions TO subscriptions_legacy;
        RAISE NOTICE 'Renamed legacy subscriptions column to subscriptions_legacy.';
    ELSE
        RAISE NOTICE 'Legacy subscriptions column not found or already renamed.';
    END IF;
END $$;

-- Create a dedicated subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    service_id VARCHAR(50) NOT NULL, -- e.g. 'youtube', 'spotify', 'netflix'
    cycle VARCHAR(20) NOT NULL CHECK (cycle IN ('monthly', 'yearly')),
    price DECIMAL(15, 2) NOT NULL CHECK (price >= 0),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure a user can only have one active subscription record per service
    CONSTRAINT unique_user_service UNIQUE (user_id, service_id),
    CONSTRAINT check_expiry CHECK (expires_at >= registered_at)
);

-- Idempotent backfill of subscriptions from legacy JSON data if the column exists
DO $$
DECLARE
    user_rec RECORD;
    sub_key TEXT;
    sub_val JSONB;
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'subscriptions_legacy'
    ) THEN
        FOR user_rec IN SELECT id, subscriptions_legacy FROM public.users WHERE subscriptions_legacy IS NOT NULL LOOP
            FOR sub_key, sub_val IN SELECT * FROM jsonb_each(user_rec.subscriptions_legacy) LOOP
                INSERT INTO public.subscriptions (user_id, service_id, cycle, price, registered_at, expires_at, auto_renew)
                VALUES (
                    user_rec.id,
                    sub_key,
                    COALESCE(sub_val->>'cycle', 'monthly'),
                    COALESCE((sub_val->>'price')::DECIMAL, 0.0),
                    COALESCE((sub_val->>'registeredAt')::TIMESTAMPTZ, NOW()),
                    COALESCE((sub_val->>'expiresAt')::TIMESTAMPTZ, NOW() + INTERVAL '1 month'),
                    COALESCE((sub_val->>'autoRenew')::BOOLEAN, TRUE)
                )
                ON CONFLICT (user_id, service_id) DO NOTHING;
            END LOOP;
        END LOOP;
        RAISE NOTICE 'Backfilled subscriptions from legacy JSON data.';
    ELSE
        RAISE NOTICE 'No subscriptions_legacy column found, skipping backfill.';
    END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-runs)
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.subscriptions;

-- Create RLS Policies
CREATE POLICY "Users can view their own subscriptions" 
    ON public.subscriptions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" 
    ON public.subscriptions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
    ON public.subscriptions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" 
    ON public.subscriptions FOR DELETE 
    USING (auth.uid() = user_id);
