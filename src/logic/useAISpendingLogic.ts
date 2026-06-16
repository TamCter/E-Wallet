import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { safeStorage } from '@/utils/safeStorage';

export interface AISpendingData {
  monthlyLimit: number;
  currentSpent: number;
  forecastMessage: string;
  installmentAlert: string | null;
  hasExceeded: boolean;
  spendingRatio: number; // 0 to 1
  forecastType: 'success' | 'warning' | 'danger' | 'info';
}

export function useAISpendingLogic() {
  const [monthlyLimit, setMonthlyLimit] = useState<number>(0);
  const [currentSpent, setCurrentSpent] = useState<number>(0);
  const [isAILoading, setIsAILoading] = useState<boolean>(true);
  const [forecastMessage, setForecastMessage] = useState<string>('');
  const [installmentAlert, setInstallmentAlert] = useState<string | null>(null);
  const [hasExceeded, setHasExceeded] = useState<boolean>(false);
  const [spendingRatio, setSpendingRatio] = useState<number>(0);
  const [forecastType, setForecastType] = useState<'success' | 'warning' | 'danger' | 'info'>('info');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const fetchAISpendingData = useCallback(async () => {
    try {
      setIsAILoading(true);
      
      // 1. Get user and wallet
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setIsAILoading(false);
        return;
      }

      const userId = user.id;

      // 2. Fetch spending limit (with local storage fallback)
      let limitValue = 0;
      try {
        const { data: limitData, error: limitError } = await supabase
          .from('spending_limits')
          .select('monthly_limit')
          .eq('user_id', userId)
          .maybeSingle();

        if (limitError) {
          throw limitError;
        }

        if (limitData) {
          limitValue = parseFloat(limitData.monthly_limit);
        } else {
          // Try local storage
          const localLimit = await safeStorage.getItem(`spending_limit_${userId}`);
          if (localLimit) {
            limitValue = parseFloat(localLimit) || 0;
          }
        }
      } catch (err) {
        console.warn('Error fetching spending limit from DB, using fallback local storage:', err);
        const localLimit = await safeStorage.getItem(`spending_limit_${userId}`);
        if (localLimit) {
          limitValue = parseFloat(localLimit) || 0;
        }
      }
      setMonthlyLimit(limitValue);

      // 3. Fetch user's wallet to know userWalletId
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (walletError || !wallet) {
        setIsAILoading(false);
        return;
      }
      const userWalletId = wallet.id;

      // 4. Fetch current month's transactions
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfMonth = new Date(year, month, 1).toISOString();

      const { data: monthTxs, error: monthTxsError } = await supabase
        .from('transactions')
        .select('amount, type, created_at')
        .eq('sender_wallet_id', userWalletId)
        .gte('created_at', firstDayOfMonth);

      let spentSum = 0;
      if (!monthTxsError && monthTxs) {
        spentSum = monthTxs.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      }
      setCurrentSpent(spentSum);

      // 5. Run installment detection algorithm (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: historyTxs, error: histError } = await supabase
        .from('transactions')
        .select('id, amount, created_at')
        .eq('sender_wallet_id', userWalletId)
        .gte('created_at', ninetyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      let detectedInstallmentMsg: string | null = null;
      if (!histError && historyTxs && historyTxs.length > 0) {
        const detectedInstallments: { amount: number; day: number }[] = [];
        const matchedIds = new Set<string>();

        const outgoing = historyTxs
          .map(tx => ({
            id: tx.id,
            amount: parseFloat(tx.amount),
            date: new Date(tx.created_at),
          }))
          .filter(tx => tx.amount >= 1000000 && tx.amount <= 5000000);

        for (let i = 0; i < outgoing.length; i++) {
          for (let j = i + 1; j < outgoing.length; j++) {
            const txI = outgoing[i];
            const txJ = outgoing[j];
            if (matchedIds.has(txI.id) || matchedIds.has(txJ.id)) continue;

            const diffTime = Math.abs(txJ.date.getTime() - txI.date.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Check if transaction dates are roughly 27 to 33 days apart (monthly)
            const isMonthly = diffDays >= 27 && diffDays <= 33;
            // Check if amounts are within 5% similarity
            const isSimilarAmount = Math.abs(txI.amount - txJ.amount) / txI.amount <= 0.05;

            if (isMonthly && isSimilarAmount) {
              matchedIds.add(txI.id);
              matchedIds.add(txJ.id);
              detectedInstallments.push({
                amount: (txI.amount + txJ.amount) / 2,
                day: txJ.date.getDate(),
              });
              break;
            }
          }
        }

        if (detectedInstallments.length > 0) {
          const items = detectedInstallments.map(ins => 
            `~${formatCurrency(ins.amount)} đ vào ngày ${ins.day} hàng tháng`
          );
          detectedInstallmentMsg = `Phát hiện khoản chi trả góp định kỳ: ${items.join(', ')}.`;
        }
      }
      setInstallmentAlert(detectedInstallmentMsg);

      // 6. Forecast & limit calculations
      if (limitValue === 0) {
        setForecastMessage('Bạn chưa thiết lập hạn mức chi tiêu tháng này. Hãy nhấn nút phía dưới để bắt đầu quản lý tài chính hiệu quả hơn.');
        setHasExceeded(false);
        setSpendingRatio(0);
        setForecastType('info');
      } else {
        const ratio = Math.min(1, spentSum / limitValue);
        setSpendingRatio(ratio);

        if (spentSum >= limitValue) {
          setForecastMessage(`🚨 CẢNH BÁO: Bạn đã vượt quá hạn mức chi tiêu của tháng này (${formatCurrency(spentSum)} đ / ${formatCurrency(limitValue)} đ)! Hãy thắt chặt hầu bao.`);
          setHasExceeded(true);
          setForecastType('danger');
        } else {
          setHasExceeded(false);
          const dailySpeed = spentSum / Math.max(1, dayOfMonth);
          const expectedSpent = dailySpeed * daysInMonth;

          if (expectedSpent > limitValue) {
            const exceedDay = Math.min(daysInMonth, Math.max(1, Math.round(limitValue / dailySpeed)));
            setForecastMessage(`⚠️ Tốc độ chi tiêu của bạn đang khá nhanh. Dự kiến bạn sẽ vượt hạn mức tháng vào ngày ${exceedDay} (ước tính cả tháng tiêu khoảng ${formatCurrency(expectedSpent)} đ).`);
            setForecastType('warning');
          } else {
            setForecastMessage(`✨ Tuyệt vời! Bạn đang kiểm soát chi tiêu rất tốt. Dự kiến cả tháng chi tiêu khoảng ${formatCurrency(expectedSpent)} đ (dưới hạn mức ${formatCurrency(limitValue)} đ).`);
            setForecastType('success');
          }
        }
      }

    } catch (e) {
      console.error('Error fetching AI spending insights:', e);
    } finally {
      setIsAILoading(false);
    }
  }, []);

  const updateSpendingLimit = async (newLimit: number): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const userId = user.id;

      try {
        const { error } = await supabase
          .from('spending_limits')
          .upsert({ user_id: userId, monthly_limit: newLimit }, { onConflict: 'user_id' });

        if (error) {
          throw error;
        }
      } catch (dbErr) {
        console.warn('Error saving limit to DB, saving locally instead:', dbErr);
      }

      // Always save to safeStorage for backup/offline fallback
      await safeStorage.setItem(`spending_limit_${userId}`, newLimit.toString());
      setMonthlyLimit(newLimit);
      
      // Refresh calculations with new limit
      setTimeout(() => {
        fetchAISpendingData();
      }, 200);

      return true;
    } catch (e) {
      console.error('Error in updateSpendingLimit:', e);
      return false;
    }
  };

  return {
    monthlyLimit,
    currentSpent,
    isAILoading,
    forecastMessage,
    installmentAlert,
    hasExceeded,
    spendingRatio,
    forecastType,
    fetchAISpendingData,
    updateSpendingLimit,
  };
}
