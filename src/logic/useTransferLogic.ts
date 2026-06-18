import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

export type Step = 'input' | 'amount' | 'review' | 'success' | 'error';

export interface RecentContact {
  name: string;
  phone: string;
  phoneCountryCode: string;
}

export function useTransferLogic() {
  const router = useRouter();
  const { phone: paramPhone, countryCode: paramCountryCode } = useLocalSearchParams<{ phone?: string; countryCode?: string }>();
  const lastProcessedParamsRef = useRef<{ phone?: string; countryCode?: string }>({});
  const [step, setStep] = useState<Step>('input');

  const [phoneCountryCode, setPhoneCountryCode] = useState('+84');
  const [phone, setPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [txnId, setTxnId] = useState('');

  const [realBalance, setRealBalance] = useState<number>(0);
  const [isDropdownFocus, setIsDropdownFocus] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);

  const fetchRecentContacts = useCallback(async () => {
    try {
      setIsLoadingRecent(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRecentContacts([]);
        return;
      }

      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!wallet) {
        setRecentContacts([]);
        return;
      }
      const userWalletId = wallet.id;

      const { data: txs, error } = await supabase
        .from('transactions')
        .select(`
          sender_wallet:sender_wallet_id (
            id,
            user_id,
            users:user_id (
              id,
              full_name,
              phone_number,
              phone_country_code
            )
          ),
          receiver_wallet:receiver_wallet_id (
            id,
            user_id,
            users:user_id (
              id,
              full_name,
              phone_number,
              phone_country_code
            )
          )
        `)
        .eq('type', 'transfer')
        .or(`sender_wallet_id.eq.${userWalletId},receiver_wallet_id.eq.${userWalletId}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Lỗi khi lấy danh sách liên hệ gần đây:', error.message);
        setRecentContacts([]);
        return;
      }

      if (txs) {
        const uniqueContacts = new Map<string, RecentContact>();
        txs.forEach((tx: any) => {
          const senderUser = tx.sender_wallet?.users;
          const receiverUser = tx.receiver_wallet?.users;

          if (senderUser && senderUser.id !== user.id && senderUser.phone_number) {
            uniqueContacts.set(senderUser.id, {
              name: senderUser.full_name || 'Người dùng ẩn danh',
              phone: senderUser.phone_number,
              phoneCountryCode: senderUser.phone_country_code || '+84',
            });
          } else if (receiverUser && receiverUser.id !== user.id && receiverUser.phone_number) {
            uniqueContacts.set(receiverUser.id, {
              name: receiverUser.full_name || 'Người dùng ẩn danh',
              phone: receiverUser.phone_number,
              phoneCountryCode: receiverUser.phone_country_code || '+84',
            });
          }
        });

        setRecentContacts(Array.from(uniqueContacts.values()).slice(0, 5));
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách liên hệ gần đây:', err);
      setRecentContacts([]);
    } finally {
      setIsLoadingRecent(false);
    }
  }, []);

  const fetchWalletBalance = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: wallet, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error("Lỗi truy vấn ví từ Supabase:", error.message);
        return;
      }

      if (wallet) {
        setRealBalance(wallet.balance);
      } else {
        setRealBalance(0);
      }
    } catch (err) {
      console.error("Lỗi lấy thông tin số dư:", err);
    }
  }, []);

  const handlePhoneLookup = useCallback(async (customPhone?: string, customCountryCode?: string) => {
    const targetPhone = customPhone !== undefined ? customPhone : phone;
    const targetCountryCode = customCountryCode !== undefined ? customCountryCode : phoneCountryCode;

    if (!targetCountryCode) {
      Alert.alert('Lỗi', 'Vui lòng chọn mã quốc gia');
      return;
    }

    let cleanPhone = targetPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }

    if (cleanPhone.length < 9) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại hợp lệ');
      return;
    }

    setIsLookingUp(true);
    const cleanCode = targetCountryCode.split('-')[0].trim();

    try {
      const { data, error } = await supabase.rpc('find_user_by_phone', {
        p_country_code: cleanCode,
        p_phone: cleanPhone
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setPhone(targetPhone);
        setPhoneCountryCode(targetCountryCode);
        setRecipientName(data[0].full_name);
        setStep('amount');
      } else {
        Alert.alert('Không tìm thấy', 'Số điện thoại này chưa đăng ký tài khoản ví.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể kiểm tra thông tin người nhận: ' + err.message);
    } finally {
      setIsLookingUp(false);
    }
  }, [phone, phoneCountryCode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWalletBalance();
    fetchRecentContacts();
  }, [fetchWalletBalance, fetchRecentContacts]);
  useEffect(() => {
    const prevPhone = lastProcessedParamsRef.current.phone;
    const prevCountryCode = lastProcessedParamsRef.current.countryCode;

    if (paramPhone && (paramPhone !== prevPhone || paramCountryCode !== prevCountryCode)) {
      lastProcessedParamsRef.current = { phone: paramPhone, countryCode: paramCountryCode };
      (async () => {
        await handlePhoneLookup(paramPhone, paramCountryCode || '+84');
      })();
    }
  }, [paramPhone, paramCountryCode, handlePhoneLookup]);
  const handleConfirm = () => {
    const numAmount = parseInt(amount.replace(/\./g, ''), 10);
    if (!numAmount || numAmount < 1000) {
      Alert.alert('Lỗi', 'Số tiền tối thiểu là 1.000đ');
      return;
    }
    if (numAmount > realBalance) {
      Alert.alert('Lỗi', 'Số dư tài khoản không đủ');
      return;
    }
    setStep('review');
  };

  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [pinError, setPinError] = useState('');

  const executeTransfer = async () => {
    const numAmount = parseInt(amount.replace(/\./g, ''), 10);
    setIsTransferring(true);

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }
    const cleanCode = phoneCountryCode.split('-')[0].trim();

    try {
      const { data: transactionId, error } = await supabase
        .rpc('process_transfer', {
          receiver_country_code: cleanCode,
          receiver_phone: cleanPhone,
          transfer_amount: numAmount,
          transfer_description: note?.trim() || null
        });

      if (error) {
        Alert.alert('Giao dịch thất bại', error.message);
      } else if (!transactionId) {
        console.error('Giao dịch thất bại: process_transfer RPC returned an empty transactionId.', { transactionId });
        Alert.alert('Giao dịch thất bại', 'Không nhận được mã giao dịch hợp lệ từ hệ thống.');
        setStep('error');
      } else {
        setTxnId(transactionId);
        setStep('success');
        fetchWalletBalance();
        fetchRecentContacts();
      }
    } catch (err: any) {
      Alert.alert('Lỗi kết nối', err.message);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleVerifyPinAndTransfer = async (pinInput: string): Promise<boolean> => {
    setIsTransferring(true);
    setPinError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
        setIsTransferring(false);
        return false;
      }

      // Verify PIN via server-side RPC function
      const { data: isValid, error: rpcError } = await supabase.rpc('verify_payment_pin', {
        pin_input: pinInput,
      });

      if (rpcError) {
        Alert.alert('Lỗi', 'Không thể xác thực mã PIN của bạn lúc này.');
        setIsTransferring(false);
        return false;
      }

      if (!isValid) {
        setPinError('Mã PIN giao dịch không chính xác.');
        setIsTransferring(false);
        return false;
      }

      // PIN is correct! Close modal and call transfer
      setIsPinModalVisible(false);
      await executeTransfer();
      return true;
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể kết nối đến máy chủ.');
      setIsTransferring(false);
      return false;
    }
  };

  const handleTransfer = () => {
    setIsPinModalVisible(true);
  };

  const handleReset = () => {
    setStep('input');
    setPhoneCountryCode('+84');
    setPhone('');
    setRecipientName('');
    setAmount('');
    setNote('');
    setTxnId('');
  };

  return {
    router,
    step,
    setStep,
    phoneCountryCode,
    setPhoneCountryCode,
    phone,
    setPhone,
    recipientName,
    setRecipientName,
    isLookingUp,
    amount,
    setAmount,
    note,
    setNote,
    txnId,
    realBalance,
    isDropdownFocus,
    setIsDropdownFocus,
    isTransferring,
    recentContacts,
    isLoadingRecent,
    handlePhoneLookup,
    handleConfirm,
    handleTransfer,
    handleReset,
    isPinModalVisible,
    setIsPinModalVisible,
    pinError,
    setPinError,
    handleVerifyPinAndTransfer,
  };
}
