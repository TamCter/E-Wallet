import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { safeStorage } from '@/utils/safeStorage';
import { useAuth } from '@/context/AuthContext';

export type ServiceType = 'electricity' | 'water' | 'wifi' | 'youtube' | 'spotify' | 'netflix';

export interface SimulatedBill {
  customerName: string;
  amount: number;
  provider: string;
}

export function useServicesLogic() {
  const { triggerHomeRefresh } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [customerCode, setCustomerCode] = useState<string>('');
  const [simulatedBill, setSimulatedBill] = useState<SimulatedBill | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);

  const [subscriptionCycle, setSubscriptionCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [activeSubscriptions, setActiveSubscriptions] = useState<Record<string, {
    serviceId: string;
    cycle: string;
    price: number;
    registeredAt: string;
    expiresAt: string;
    autoRenew?: boolean;
  }>>({});

  const fetchWalletBalance = useCallback(async () => {
    try {
      setLoadingBalance(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) {
        console.error("Lỗi lấy số dư ví:", walletError.message);
        return;
      }

      if (wallet) {
        setBalance(wallet.balance);
      }
    } catch (err) {
      console.error("Lỗi lấy thông tin số dư ví:", err);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  const fetchActiveSubscriptions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const subKey = `${user.id}_active_subscriptions`;
      let subs: Record<string, any> = {};

      try {
        // Fetch active subscriptions (where expires_at is in the future)
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .gt('expires_at', new Date().toISOString());

        if (!error && data) {
          data.forEach((sub: any) => {
            subs[sub.service_id] = {
              serviceId: sub.service_id,
              cycle: sub.cycle,
              price: parseFloat(sub.price),
              registeredAt: sub.registered_at,
              expiresAt: sub.expires_at,
              autoRenew: sub.auto_renew,
            };
          });
          await safeStorage.setItem(subKey, JSON.stringify(subs));
        } else {
          const stored = await safeStorage.getItem(subKey);
          if (stored) {
            subs = JSON.parse(stored);
          }
        }
      } catch {
        const stored = await safeStorage.getItem(subKey);
        if (stored) {
          subs = JSON.parse(stored);
        }
      }

      // Cleanup expired local storage items if they didn't get cleaned by DB (e.g. offline)
      const now = new Date().getTime();
      let hasChanges = false;
      Object.keys(subs).forEach((key) => {
        const expiresAt = new Date(subs[key].expiresAt).getTime();
        if (now > expiresAt) {
          delete subs[key];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        await safeStorage.setItem(subKey, JSON.stringify(subs));
      }

      setActiveSubscriptions(subs);
    } catch (err) {
      console.error("Lỗi lấy thông tin đăng ký dịch vụ:", err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWalletBalance();
      fetchActiveSubscriptions();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchWalletBalance, fetchActiveSubscriptions]);

  const handleSelectService = (service: ServiceType) => {
    setSelectedService(service);
    setCustomerCode('');
    setSimulatedBill(null);
    setError(null);
    setIsSuccess(false);
  };

  const handleLookupBill = () => {
    if (!customerCode.trim()) {
      setError('Vui lòng nhập mã khách hàng');
      return;
    }

    setError(null);
    const codeUpper = customerCode.toUpperCase().trim();

    if (selectedService === 'electricity') {
      // EVN Customer codes usually start with PE
      if (!codeUpper.startsWith('PE') || codeUpper.length < 5) {
        setError('Mã khách hàng EVN không hợp lệ (Ví dụ: PE12000341)');
        return;
      }
      setSimulatedBill({
        customerName: 'NGUYỄN VĂN AN',
        amount: 345000,
        provider: 'Tổng Công ty Điện lực EVN',
      });
    } else if (selectedService === 'water') {
      // Water customer codes usually start with DB or similar
      if (!codeUpper.startsWith('DB') || codeUpper.length < 5) {
        setError('Mã danh bộ nước không hợp lệ (Ví dụ: DB382103)');
        return;
      }
      setSimulatedBill({
        customerName: 'NGUYỄN VĂN AN',
        amount: 120000,
        provider: 'Tổng Công ty Cấp nước SAWACO',
      });
    } else if (selectedService === 'wifi') {
      // Internet customer codes usually start with FT
      if (!codeUpper.startsWith('FT') || codeUpper.length < 5) {
        setError('Mã hợp đồng internet không hợp lệ (Ví dụ: FT98311)');
        return;
      }
      setSimulatedBill({
        customerName: 'NGUYỄN VĂN AN',
        amount: 220000,
        provider: 'Công ty Viễn thông FPT Telecom',
      });
    }
  };

  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pendingPaymentParams, setPendingPaymentParams] = useState<{ amount: number; title: string; subtitle: string } | null>(null);

  const executePay = async (amount: number, customTitle: string, customSubtitle: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Call Supabase process_withdrawal RPC
      const { data: transactionId, error: rpcError } = await supabase.rpc('process_withdrawal', {
        withdrawal_amount: amount,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!transactionId) {
        throw new Error('Không nhận được mã giao dịch từ hệ thống');
      }

      // Save custom details to safeStorage so transaction history/recent list can display custom labels
      const localPaymentsStr = await safeStorage.getItem('services_payments');
      const localPayments = localPaymentsStr ? JSON.parse(localPaymentsStr) : {};

      // Determine mapping styling based on service
      let iconColor = '#00838F';
      let iconBgColor = '#E0F7FA';
      let iconName = 'receipt-outline';

      if (selectedService === 'youtube') {
        iconName = 'logo-youtube';
        iconColor = '#FF0000';
        iconBgColor = '#FFEBEE';
      } else if (selectedService === 'spotify') {
        iconName = 'headset-outline';
        iconColor = '#1DB954';
        iconBgColor = '#E8F5E9';
      } else if (selectedService === 'netflix') {
        iconName = 'videocam-outline';
        iconColor = '#E50914';
        iconBgColor = '#FFE5E5';
      }

      localPayments[transactionId] = {
        title: customTitle,
        subtitle: customSubtitle,
        iconName,
        iconColor,
        iconBgColor,
      };

      await safeStorage.setItem('services_payments', JSON.stringify(localPayments));

      // Save to active subscriptions if it's a premium service
      if (selectedService && ['youtube', 'spotify', 'netflix'].includes(selectedService)) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const subKey = `${user.id}_active_subscriptions`;
          const stored = await safeStorage.getItem(subKey);
          const currentSubs = stored ? JSON.parse(stored) : {};

          const registeredAt = new Date();
          const targetYear = subscriptionCycle === 'yearly' ? registeredAt.getFullYear() + 1 : registeredAt.getFullYear();
          const targetMonth = subscriptionCycle === 'yearly' ? registeredAt.getMonth() : registeredAt.getMonth() + 1;
          const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
          const expiresAt = new Date(
            targetYear,
            targetMonth,
            Math.min(registeredAt.getDate(), lastDay),
            registeredAt.getHours(),
            registeredAt.getMinutes(),
            registeredAt.getSeconds(),
            registeredAt.getMilliseconds()
          );

          currentSubs[selectedService] = {
            serviceId: selectedService,
            cycle: subscriptionCycle,
            price: amount,
            registeredAt: registeredAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
            autoRenew: true,
          };

          await safeStorage.setItem(subKey, JSON.stringify(currentSubs));
          setActiveSubscriptions(currentSubs);

          const { error: dbErr } = await supabase
            .from('subscriptions')
            .upsert({
              user_id: user.id,
              service_id: selectedService,
              cycle: subscriptionCycle,
              price: amount,
              registered_at: registeredAt.toISOString(),
              expires_at: expiresAt.toISOString(),
              auto_renew: true
            }, { onConflict: 'user_id,service_id' });

          if (dbErr) {
            console.warn("DB insert/update failed:", dbErr.message);
          }
        }
      }

      setLastTransactionId(transactionId);
      setIsSuccess(true);
      await fetchWalletBalance();
      triggerHomeRefresh();
    } catch (err: any) {
      console.error('Lỗi thanh toán dịch vụ:', err);
      setError(err?.message || 'Đã xảy ra lỗi không xác định trong quá trình thanh toán');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyPinAndPay = async (pinInput: string): Promise<boolean> => {
    setIsProcessing(true);
    setPinError('');
    if (!pendingPaymentParams) {
      setError('Thiếu tham số giao dịch');
      setIsProcessing(false);
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Không tìm thấy thông tin người dùng');
        setIsProcessing(false);
        return false;
      }

      // Verify PIN via server-side RPC function
      const { data: isValid, error: rpcError } = await supabase.rpc('verify_payment_pin', {
        pin_input: pinInput,
      });

      if (rpcError) {
        setError('Không thể xác thực mã PIN của bạn lúc này.');
        setIsProcessing(false);
        return false;
      }

      if (!isValid) {
        setPinError('Mã PIN giao dịch không chính xác.');
        setIsProcessing(false);
        return false;
      }

      // PIN matches! Close modal and execute pay
      setIsPinModalVisible(false);
      const { amount, title, subtitle } = pendingPaymentParams;
      setPendingPaymentParams(null);
      await executePay(amount, title, subtitle);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối máy chủ.');
      setIsProcessing(false);
      return false;
    }
  };

  const handlePay = async (amount: number, customTitle: string, customSubtitle: string) => {
    if (balance < amount) {
      setError('Số dư ví không đủ để thực hiện giao dịch này');
      return;
    }

    setPendingPaymentParams({ amount, title: customTitle, subtitle: customSubtitle });
    setIsPinModalVisible(true);
  };

  const resetStates = () => {
    setSelectedService(null);
    setCustomerCode('');
    setSimulatedBill(null);
    setIsProcessing(false);
    setIsSuccess(false);
    setError(null);
    setLastTransactionId(null);
    setSubscriptionCycle('monthly');
    setPendingPaymentParams(null);
  };

  const handleCancelSubscription = async (serviceId: string) => {
    try {
      setIsProcessing(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Chưa đăng nhập");

      const subKey = `${user.id}_active_subscriptions`;
      const stored = await safeStorage.getItem(subKey);
      const currentSubs = stored ? JSON.parse(stored) : {};

      if (currentSubs[serviceId]) {
        currentSubs[serviceId].autoRenew = false;
      }

      await safeStorage.setItem(subKey, JSON.stringify(currentSubs));
      setActiveSubscriptions(currentSubs);

      const { error: dbErr } = await supabase
        .from('subscriptions')
        .update({ auto_renew: false })
        .eq('user_id', user.id)
        .eq('service_id', serviceId);

      if (dbErr) {
        console.warn("DB update failed:", dbErr.message);
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error("Lỗi khi hủy đăng ký gói:", err);
      setError(err?.message || "Không thể hủy đăng ký gói dịch vụ này");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    balance,
    loadingBalance,
    selectedService,
    customerCode,
    setCustomerCode,
    simulatedBill,
    isProcessing,
    isSuccess,
    error,
    lastTransactionId,
    subscriptionCycle,
    setSubscriptionCycle,
    activeSubscriptions,
    handleSelectService,
    handleLookupBill,
    handlePay,
    handleCancelSubscription,
    resetStates,
    isPinModalVisible,
    setIsPinModalVisible,
    pinError,
    setPinError,
    handleVerifyPinAndPay,
  };
}
