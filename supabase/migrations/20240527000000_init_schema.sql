-- Cấp quyền sử dụng UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tạo bảng users (liên kết với auth.users của Supabase)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) UNIQUE,
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
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

-- User chỉ được xem và cập nhật thông tin profile của chính mình
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- User chỉ được xem ví của chính mình
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (user_id = auth.uid());

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
BEGIN
  -- Tạo bản ghi trong bảng public.users
  INSERT INTO public.users (id, phone_number, full_name)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'full_name'
  );
  
  -- Tự động tạo ví với số dư ban đầu là 0
  INSERT INTO public.wallets (user_id, balance, status)
  VALUES (new.id, 0.00, 'active');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn Trigger vào sự kiện INSERT trên auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- --------------------------------------------------------
-- POSTGRES FUNCTIONS (RPC) - TRANSACTION CONTROLLER
-- --------------------------------------------------------

-- 1. Chuyển tiền (Transfer)
CREATE OR REPLACE FUNCTION public.process_transfer(
    receiver_phone VARCHAR,
    transfer_amount DECIMAL
) RETURNS UUID AS $$
DECLARE
    v_sender_wallet_id UUID;
    v_receiver_wallet_id UUID;
    v_transaction_id UUID;
BEGIN
    -- Lấy ví người gửi
    SELECT id INTO v_sender_wallet_id FROM public.wallets WHERE user_id = auth.uid();
    IF v_sender_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy ví người gửi';
    END IF;

    -- Lấy ví người nhận dựa trên số điện thoại
    SELECT w.id INTO v_receiver_wallet_id 
    FROM public.wallets w
    JOIN public.users u ON u.id = w.user_id
    WHERE u.phone_number = receiver_phone;

    IF v_receiver_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy người nhận với số điện thoại này';
    END IF;

    -- Kiểm tra không cho phép tự chuyển tiền cho mình
    IF v_sender_wallet_id = v_receiver_wallet_id THEN
        RAISE EXCEPTION 'Không thể tự chuyển tiền cho chính mình';
    END IF;

    -- Trừ tiền người gửi (Sẽ tự văng lỗi nếu số dư âm vì có CHECK balance >= 0)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Nạp tiền (Deposit)
CREATE OR REPLACE FUNCTION public.process_deposit(
    deposit_amount DECIMAL
) RETURNS UUID AS $$
DECLARE
    v_wallet_id UUID;
    v_transaction_id UUID;
BEGIN
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = auth.uid();
    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy ví';
    END IF;

    -- Cộng tiền
    UPDATE public.wallets 
    SET balance = balance + deposit_amount, updated_at = NOW()
    WHERE id = v_wallet_id;

    -- Lưu lịch sử
    INSERT INTO public.transactions (sender_wallet_id, receiver_wallet_id, amount, type, status)
    VALUES (NULL, v_wallet_id, deposit_amount, 'deposit', 'completed')
    RETURNING id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Rút tiền (Withdrawal)
CREATE OR REPLACE FUNCTION public.process_withdrawal(
    withdrawal_amount DECIMAL
) RETURNS UUID AS $$
DECLARE
    v_wallet_id UUID;
    v_transaction_id UUID;
BEGIN
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = auth.uid();
    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy ví';
    END IF;

    -- Trừ tiền (Tự văng lỗi nếu số dư không đủ)
    UPDATE public.wallets 
    SET balance = balance - withdrawal_amount, updated_at = NOW()
    WHERE id = v_wallet_id;

    -- Lưu lịch sử
    INSERT INTO public.transactions (sender_wallet_id, receiver_wallet_id, amount, type, status)
    VALUES (v_wallet_id, NULL, withdrawal_amount, 'withdrawal', 'completed')
    RETURNING id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
