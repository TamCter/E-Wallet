-- Cấp quyền sử dụng UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tạo bảng users (liên kết với auth.users của Supabase)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_country_code VARCHAR(10) DEFAULT '+84',
    phone_number VARCHAR(20),
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(phone_country_code, phone_number)
);

-- 2. Tạo bảng wallets (mỗi user có 1 ví)
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    status VARCHAR(50) DEFAULT 'active',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. Tạo bảng transactions (lưu lịch sử giao dịch)
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    receiver_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    type VARCHAR(50) NOT NULL CHECK (type IN ('transfer', 'deposit', 'withdrawal')),
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- CẤU HÌNH BẢO MẬT (ROW LEVEL SECURITY - RLS)
-- --------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Thu hồi quyền SELECT trực tiếp trên bảng public.users cho vai trò authenticated
REVOKE SELECT ON public.users FROM authenticated;

-- Cho phép người dùng cập nhật thông tin cá nhân của chính họ
CREATE POLICY "Users can update own profile" ON public.users 
    FOR UPDATE USING (auth.uid() = id);

-- Cho phép người dùng xem thông tin cá nhân của chính họ
CREATE POLICY "Users can view own profile" ON public.users 
    FOR SELECT USING (auth.uid() = id);

-- User chỉ được xem ví của chính mình
CREATE POLICY "Users can view own wallet" ON public.wallets 
    FOR SELECT USING (user_id = auth.uid());

-- User có thể xem lịch sử giao dịch nếu họ là người gửi HOẶC người nhận
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT 
USING (
    sender_wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()) 
    OR 
    receiver_wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
);


-- --------------------------------------------------------
-- DATABASE TRIGGERS (Tự động tạo User và Wallet khi Đăng ký)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_phone VARCHAR(20);
BEGIN
  -- Lấy số điện thoại từ metadata
  v_phone := new.raw_user_meta_data->>'phone_number';
  
  -- [TỐI ƯU HÓA SỐ ĐIỆN THOẠI]: Tự động loại bỏ số 0 ở đầu nếu người dùng quen tay nhập dạng 0987654321
  -- Để khi lưu vào database đồng bộ định dạng với mã quốc gia (Ví dụ: +84 và 987654321)
  IF v_phone LIKE '0%' THEN
    v_phone := SUBSTRING(v_phone FROM 2);
  END IF;

  -- Tạo bản ghi trong bảng public.users
  INSERT INTO public.users (id, phone_country_code, phone_number, full_name)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'phone_country_code', '+84'),
    v_phone,
    new.raw_user_meta_data->>'full_name'
  );
  
  -- Tự động tạo ví với số dư ban đầu là 0
  INSERT INTO public.wallets (user_id, balance, status)
  VALUES (new.id, 0.00, 'active');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn Trigger vào sự kiện INSERT trên auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- --------------------------------------------------------
-- POSTGRES FUNCTIONS (RPC) - TRANSACTION CONTROLLER
-- --------------------------------------------------------

-- 1. Chuyển tiền (Transfer)
CREATE OR REPLACE FUNCTION public.process_transfer(
    receiver_country_code VARCHAR,
    receiver_phone VARCHAR,
    transfer_amount DECIMAL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sender_wallet_id UUID;
    v_receiver_wallet_id UUID;
    v_transaction_id UUID;
    v_clean_phone VARCHAR;
BEGIN
    -- Đồng bộ xử lý số điện thoại: cắt bỏ số 0 ở đầu nếu có
    v_clean_phone := receiver_phone;
    IF v_clean_phone LIKE '0%' THEN
        v_clean_phone := SUBSTRING(v_clean_phone FROM 2);
    END IF;

    -- Lấy ví người gửi
    SELECT id INTO v_sender_wallet_id FROM public.wallets WHERE user_id = auth.uid();
    IF v_sender_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy ví người gửi';
    END IF;

    -- Lấy ví người nhận dựa trên số điện thoại đã làm sạch và mã quốc gia
    SELECT w.id INTO v_receiver_wallet_id 
    FROM public.wallets w
    JOIN public.users u ON u.id = w.user_id
    WHERE u.phone_number = v_clean_phone AND u.phone_country_code = receiver_country_code;

    IF v_receiver_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy người nhận với số điện thoại này';
    END IF;

    -- Kiểm tra không cho phép tự chuyển tiền cho mình
    IF v_sender_wallet_id = v_receiver_wallet_id THEN
        RAISE EXCEPTION 'Không thể tự chuyển tiền cho chính mình';
    END IF;

    -- Trừ tiền người gửi
    UPDATE public.wallets 
    SET balance = balance - transfer_amount, updated_at = NOW()
    WHERE id = v_sender_wallet_id;

    -- Cộng tiền người nhận
    UPDATE public.wallets 
    SET balance = balance + transfer_amount, updated_at = NOW()
    WHERE id = v_receiver_wallet_id;

    -- Lưu lịch sử giao dịch
    INSERT INTO public.transactions (sender_wallet_id, receiver_wallet_id, amount, type, status)
    VALUES (v_sender_wallet_id, v_receiver_wallet_id, transfer_amount, 'transfer', 'completed')
    RETURNING id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_transfer(VARCHAR, VARCHAR, DECIMAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_transfer(VARCHAR, VARCHAR, DECIMAL) TO authenticated;

-- 2. Tìm kiếm thông tin người dùng theo số điện thoại (RPC bảo mật ẩn danh)
CREATE OR REPLACE FUNCTION public.find_user_by_phone(
    p_country_code VARCHAR,
    p_phone VARCHAR
) RETURNS TABLE (
    full_name VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_phone VARCHAR;
BEGIN
    -- Làm sạch số điện thoại người nhận: cắt bỏ số 0 ở đầu nếu có
    v_clean_phone := p_phone;
    IF v_clean_phone LIKE '0%' THEN
        v_clean_phone := SUBSTRING(v_clean_phone FROM 2);
    END IF;

    RETURN QUERY
    SELECT u.full_name
    FROM public.users u
    WHERE u.phone_country_code = p_country_code
      AND u.phone_number = v_clean_phone
    LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.find_user_by_phone(VARCHAR, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_by_phone(VARCHAR, VARCHAR) TO authenticated;