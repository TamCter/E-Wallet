import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { safeStorage } from '@/utils/safeStorage';
import { generateSpendingInsights } from '@/lib/gemini';

export interface AISpendingData {
  monthlyLimit: number;
  currentSpent: number;
  forecastMessage: string;
  installmentAlert: string | null;
  aiShoppingAlert: string | null;
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
  const [aiShoppingAlert, setAiShoppingAlert] = useState<string | null>(null);
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
        .select('amount, type, created_at, description')
        .eq('sender_wallet_id', userWalletId)
        .gte('created_at', firstDayOfMonth);

      if (monthTxsError) {
        console.error('Error fetching month transactions:', monthTxsError);
        setForecastMessage('Không thể tải dữ liệu chi tiêu từ hệ thống.');
        setForecastType('danger');
        setIsAILoading(false);
        return;
      }

      let spentSum = 0;
      if (monthTxs) {
        spentSum = monthTxs.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      }
      setCurrentSpent(spentSum);

      // 5. Run installment detection algorithm (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: historyTxs, error: histError } = await supabase
        .from('transactions')
        .select('id, amount, type, created_at, description')
        .eq('sender_wallet_id', userWalletId)
        .gte('created_at', ninetyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // --- Gemini API Call if Key is Present AND there are transactions to analyze ---
      const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (geminiApiKey && monthTxs && monthTxs.length > 0) {
        try {
          const monthlyGeminiTxs = monthTxs.map(tx => ({
            amount: parseFloat(tx.amount),
            type: tx.type,
            created_at: tx.created_at,
            description: tx.description
          }));

          const historyGeminiTxs = (historyTxs || []).map(tx => ({
            amount: parseFloat(tx.amount),
            type: tx.type,
            created_at: tx.created_at,
            description: tx.description
          }));

          const insights = await generateSpendingInsights(
            monthlyGeminiTxs,
            historyGeminiTxs,
            limitValue,
            spentSum
          );

          setForecastMessage(insights.forecastMessage);
          setInstallmentAlert(insights.installmentAlert);
          setAiShoppingAlert(insights.aiShoppingAlert);
          setForecastType(insights.forecastType);

          if (limitValue > 0) {
            setSpendingRatio(Math.min(1, spentSum / limitValue));
            setHasExceeded(spentSum >= limitValue);
          } else {
            setSpendingRatio(0);
            setHasExceeded(false);
          }
          setIsAILoading(false);
          return; // Skip offline fallback on success
        } catch (geminiError) {
          console.warn('Gemini API call failed, falling back to local heuristic model:', geminiError);
        }
      }

      // --- Offline Fallback Heuristics ---
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

      // 5.5 Run AI Supermarket shopping detection and analysis
      let detectedShoppingMsg: string | null = null;
      if (monthTxs && monthTxs.length > 0) {
        const supermarketRegex = /(winmart|coopmart|co\.opmart|lotte|aeon|bachhoaxanh|bhx|bigc|go!)/i;
        const codeRegex = /[a-zA-Z0-9]*(?:bill|scan|gd|code|txn|ma|hd|qr)[a-zA-Z0-9-]*|(?:\d{4,})/i;

        const shoppingTxs = monthTxs.filter(tx => 
          tx.description && supermarketRegex.test(tx.description)
        );

        if (shoppingTxs.length > 0) {
          const totalShoppingAmount = shoppingTxs.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
          const detectedStores = new Set<string>();
          const detectedCodes: string[] = [];

          shoppingTxs.forEach(tx => {
            const desc = tx.description || '';
            const matchStore = desc.match(supermarketRegex);
            if (matchStore) {
              let storeName = matchStore[0].toLowerCase();
              if (storeName === 'bhx' || storeName === 'bachhoaxanh') storeName = 'Bách Hóa Xanh';
              else if (storeName === 'coopmart' || storeName === 'co.opmart') storeName = 'Co.opmart';
              else if (storeName === 'winmart') storeName = 'WinMart';
              else if (storeName === 'lotte') storeName = 'Lotte Mart';
              else if (storeName === 'aeon') storeName = 'AEON';
              else if (storeName === 'bigc') storeName = 'Big C';
              else if (storeName === 'go!') storeName = 'GO! Mall';
              detectedStores.add(storeName);
            }

            const matchCode = desc.match(codeRegex);
            if (matchCode) {
              detectedCodes.push(matchCode[0].toUpperCase());
            }
          });

          const storesStr = Array.from(detectedStores).join(', ');
          const codesStr = detectedCodes.slice(0, 3).join(', ') + (detectedCodes.length > 3 ? '...' : '');

          const percentageClause = limitValue > 0
            ? `Chi phí này chiếm ${Math.round((totalShoppingAmount / limitValue) * 100)}% hạn mức tháng của bạn.`
            : 'Bạn chưa thiết lập hạn mức tháng này.';

          detectedShoppingMsg = `🤖 Phân tích AI: Phát hiện ${shoppingTxs.length} giao dịch mua sắm tại siêu thị (${storesStr}) trong tháng. ` +
            `Tổng chi tiêu mua sắm là ${formatCurrency(totalShoppingAmount)} đ. ` +
            (detectedCodes.length > 0 ? `Mã hóa đơn phát hiện: [${codesStr}]. ` : '') +
            percentageClause;
        }
      }
      setAiShoppingAlert(detectedShoppingMsg);

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
        console.error('Error saving limit to DB:', dbErr);
        // Return false immediately to prevent silent local storage divergence
        return false;
      }

      // Only save locally and update state if DB write succeeded
      await safeStorage.setItem(`spending_limit_${userId}`, newLimit.toString());
      setMonthlyLimit(newLimit);
      
      // Refresh calculations with new limit immediately
      await fetchAISpendingData();

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
    aiShoppingAlert,
    hasExceeded,
    spendingRatio,
    forecastType,
    fetchAISpendingData,
    updateSpendingLimit,
  };
}
