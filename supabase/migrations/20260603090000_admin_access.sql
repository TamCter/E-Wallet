-- 1. Grant table privileges explicitly to authenticated and service_role roles
-- Restrict authenticated role to SELECT and UPDATE, and keep full privileges on service_role
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;
GRANT SELECT, UPDATE ON public.wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallets TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;

-- 2. Add email column to public.users if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 3. Backfill emails of existing users from auth.users
UPDATE public.users u
SET email = a.email
FROM auth.users a
WHERE u.id = a.id AND (u.email IS NULL OR u.email <> a.email);

-- 4. Update the handle_new_user trigger function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_phone VARCHAR(20);
BEGIN
  -- Lấy số điện thoại từ metadata
  v_phone := new.raw_user_meta_data->>'phone_number';
  
  -- Tự động loại bỏ số 0 ở đầu
  IF v_phone LIKE '0%' THEN
    v_phone := SUBSTRING(v_phone FROM 2);
  END IF;

  -- Tạo hoặc cập nhật bản ghi trong bảng public.users bao gồm cả email
  INSERT INTO public.users (id, phone_country_code, phone_number, full_name, email)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'phone_country_code', '+84'),
    v_phone,
    new.raw_user_meta_data->>'full_name',
    new.email
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      phone_number = EXCLUDED.phone_number,
      phone_country_code = EXCLUDED.phone_country_code;
  
  -- Tự động tạo ví với số dư ban đầu là 0
  INSERT INTO public.wallets (user_id, balance, status)
  VALUES (new.id, 0.00, 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. User Table Policies
DROP POLICY IF EXISTS "Allow admin to select all profiles" ON public.users;
CREATE POLICY "Allow admin to select all profiles" ON public.users 
    FOR SELECT 
    TO authenticated
    USING (auth.jwt() ->> 'email' = 'admin@gmail.com');

-- 6. Wallet Table Policies
DROP POLICY IF EXISTS "Allow admin to select all wallets" ON public.wallets;
CREATE POLICY "Allow admin to select all wallets" ON public.wallets 
    FOR SELECT 
    TO authenticated
    USING (auth.jwt() ->> 'email' = 'admin@gmail.com');

DROP POLICY IF EXISTS "Allow admin to update all wallets" ON public.wallets;
CREATE POLICY "Allow admin to update all wallets" ON public.wallets 
    FOR UPDATE 
    TO authenticated
    USING (auth.jwt() ->> 'email' = 'admin@gmail.com');

