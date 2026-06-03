-- Database Migration: Admin Access Policies
-- This script configures permissions to allow the admin account (admin@gmail.com)
-- to view all users, all wallets, and modify user wallet balances.

-- 1. Grant SELECT on public.users to authenticated roles (Rely on RLS to restrict standard users)
GRANT SELECT ON public.users TO authenticated;

-- 2. User Table Policies
DROP POLICY IF EXISTS "Allow admin to select all profiles" ON public.users;
CREATE POLICY "Allow admin to select all profiles" ON public.users 
    FOR SELECT 
    TO authenticated
    USING (auth.jwt() ->> 'email' = 'admin@gmail.com');

-- 3. Wallet Table Policies
DROP POLICY IF EXISTS "Allow admin to select all wallets" ON public.wallets;
CREATE POLICY "Allow admin to select all wallets" ON public.wallets 
    FOR SELECT 
    TO authenticated
    USING (auth.jwt() ->> 'email' = 'admin@gmail.com');

DROP POLICY IF EXISTS "Allow admin to update all wallets" ON public.wallets;
CREATE POLICY "Allow admin to update all wallets" ON public.wallets 
    FOR UPDATE 
    TO authenticated
    USING (auth.jwt() ->> 'email' = 'admin@gmail.com')
    WITH CHECK (auth.jwt() ->> 'email' = 'admin@gmail.com');

-- 4. Create default admin account in auth.users if not exists
-- Uses pgcrypto extension to crypt the password '071020041'
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud
)
SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'admin@gmail.com',
    crypt('071020041', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Quản trị viên", "phone_country_code": "+84", "phone_number": "000000000"}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated'
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@gmail.com'
);

