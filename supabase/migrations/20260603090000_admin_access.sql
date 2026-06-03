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
