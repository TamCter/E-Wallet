-- Add description column to transactions table
ALTER TABLE public.transactions ADD COLUMN description TEXT;

-- Update process_transfer to support description
CREATE OR REPLACE FUNCTION public.process_transfer(
    receiver_country_code VARCHAR,
    receiver_phone VARCHAR,
    transfer_amount DECIMAL,
    transfer_description TEXT DEFAULT NULL
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

    -- Lưu lịch sử giao dịch với description
    INSERT INTO public.transactions (sender_wallet_id, receiver_wallet_id, amount, type, status, description)
    VALUES (v_sender_wallet_id, v_receiver_wallet_id, transfer_amount, 'transfer', 'completed', transfer_description)
    RETURNING id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_transfer(VARCHAR, VARCHAR, DECIMAL, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_transfer(VARCHAR, VARCHAR, DECIMAL, TEXT) TO authenticated;
