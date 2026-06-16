-- Create spending_limits table
CREATE TABLE IF NOT EXISTS public.spending_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    monthly_limit DECIMAL(15, 2) NOT NULL CHECK (monthly_limit >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.spending_limits ENABLE ROW LEVEL SECURITY;

-- Create Policies for authenticated users
CREATE POLICY "Users can view own spending limit" ON public.spending_limits
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own spending limit" ON public.spending_limits
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own spending limit" ON public.spending_limits
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own spending limit" ON public.spending_limits
    FOR DELETE USING (user_id = auth.uid());
