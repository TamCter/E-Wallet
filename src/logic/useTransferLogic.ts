import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export type Tab = 'phone' | 'qr';
export type Step = 'input' | 'amount' | 'review' | 'success' | 'error';

export function useTransferLogic() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('phone');
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

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
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
  };

  const handlePhoneLookup = async (customPhone?: string, customCountryCode?: string) => {
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
  };

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

  const handleTransfer = async () => {
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
          transfer_amount: numAmount
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
      }
    } catch (err: any) {
      Alert.alert('Lỗi kết nối', err.message);
    } finally {
      setIsTransferring(false);
    }
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
    activeTab,
    setActiveTab,
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
    handlePhoneLookup,
    handleConfirm,
    handleTransfer,
    handleReset,
  };
}
