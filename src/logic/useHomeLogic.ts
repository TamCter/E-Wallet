import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface RecentTransaction {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  displayAmount: string;
  iconName: string;
  iconBgColor: string;
  iconColor: string;
}

export interface ChartBarData {
  day: string;
  height: number;
  rawAmount: number;
}

export function useHomeLogic() {
  const [userData, setUserData] = useState<{ fullName: string } | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [showBalance, setShowBalance] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [weeklyNetFlow, setWeeklyNetFlow] = useState<string>('+0 đ');
  const [weeklyChartBars, setWeeklyChartBars] = useState<ChartBarData[]>([]);

  const fetchHomeData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Get current auth user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Auth error in home logic:', authError);
        setIsLoading(false);
        return;
      }

      // Set user metadata
      const fullName = user.user_metadata?.full_name || 'Người dùng';
      setUserData({ fullName });

      // 2. Fetch user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError || !wallet) {
        console.error('Wallet fetch error:', walletError);
        setIsLoading(false);
        return;
      }

      setBalance(wallet.balance);
      const userWalletId = wallet.id;

      // 3. Fetch latest 3 transactions
      const { data: dbTransactions, error: txError } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          type,
          status,
          created_at,
          sender_wallet_id,
          receiver_wallet_id,
          sender_wallet:sender_wallet_id (
            id,
            user_id,
            users:user_id (
              id,
              full_name,
              email
            )
          ),
          receiver_wallet:receiver_wallet_id (
            id,
            user_id,
            users:user_id (
              id,
              full_name,
              email
            )
          )
        `)
        .or(`sender_wallet_id.eq.${userWalletId},receiver_wallet_id.eq.${userWalletId}`)
        .order('created_at', { ascending: false })
        .limit(3);

      if (txError) {
        console.error('Transactions fetch error:', txError);
      } else if (dbTransactions) {
        const formatted: RecentTransaction[] = dbTransactions.map((tx: any) => {
          const isIncoming = tx.receiver_wallet_id === userWalletId || tx.receiver_wallet?.id === userWalletId;
          const date = new Date(tx.created_at);
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const timeFormatted = `${hours}:${minutes}`;

          let title = '';
          if (tx.type === 'deposit') {
            title = 'Nạp tiền vào ví';
          } else if (tx.type === 'withdrawal') {
            title = 'Rút tiền khỏi ví';
          } else {
            if (isIncoming) {
              const sender = tx.sender_wallet?.users;
              title = sender?.full_name || sender?.email || 'Người dùng ẩn danh';
            } else {
              const receiver = tx.receiver_wallet?.users;
              title = receiver?.full_name || receiver?.email || 'Người dùng ẩn danh';
            }
          }

          const subtitle = `${timeFormatted} • ${tx.type === 'deposit' ? 'Nạp tiền' : tx.type === 'withdrawal' ? 'Rút tiền' : isIncoming ? 'Nhận tiền' : 'Chuyển tiền'}`;
          const numAmount = parseFloat(tx.amount);
          const formattedVal = new Intl.NumberFormat('vi-VN').format(numAmount);
          const displayAmount = `${isIncoming ? '+' : '-'}${formattedVal} đ`;

          // Icon and styling matching type
          let iconName = 'arrow-up-outline';
          let iconBgColor = '#E3F2FD';
          let iconColor = '#0544B3';

          if (tx.type === 'deposit') {
            iconName = 'add-outline';
            iconBgColor = '#E8F5E9';
            iconColor = '#2E7D32';
          } else if (tx.type === 'withdrawal') {
            iconName = 'remove-outline';
            iconBgColor = '#FFEBEE';
            iconColor = '#C62828';
          } else if (isIncoming) {
            iconName = 'arrow-down-outline';
            iconBgColor = '#E8F5E9';
            iconColor = '#2E7D32';
          }

          return {
            id: tx.id,
            title,
            subtitle,
            amount: isIncoming ? numAmount : -numAmount,
            displayAmount,
            iconName,
            iconBgColor,
            iconColor,
          };
        });

        setRecentTransactions(formatted);
      }

      // 4. Fetch transactions of the last 7 days for Weekly Flow
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: weekTxs, error: weekError } = await supabase
        .from('transactions')
        .select('amount, type, created_at, sender_wallet_id, receiver_wallet_id')
        .or(`sender_wallet_id.eq.${userWalletId},receiver_wallet_id.eq.${userWalletId}`)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (weekError) {
        console.error('Weekly transactions fetch error:', weekError);
      } else if (weekTxs) {
        let netFlow = 0;
        
        // Group amounts for last 5 calendar days for the chart
        const last5DaysData: { [key: string]: { label: string; total: number } } = {};
        const daysShort = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']; // VN day labels
        
        for (let i = 4; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toDateString();
          const dayLabel = daysShort[d.getDay()];
          last5DaysData[dateStr] = { label: dayLabel, total: 0 };
        }

        weekTxs.forEach((tx: any) => {
          const isIncoming = tx.receiver_wallet_id === userWalletId;
          const numAmt = parseFloat(tx.amount);
          
          if (isIncoming) {
            netFlow += numAmt;
          } else {
            netFlow -= numAmt;
          }

          // Check if this falls in our last 5 days
          const txDate = new Date(tx.created_at).toDateString();
          if (last5DaysData[txDate]) {
            last5DaysData[txDate].total += numAmt;
          }
        });

        const formattedNet = new Intl.NumberFormat('vi-VN').format(Math.abs(netFlow));
        setWeeklyNetFlow(`${netFlow >= 0 ? '+' : '-'}${formattedNet} đ`);

        // Compute heights for the chart bars relative to the maximum day amount
        const bars: ChartBarData[] = Object.keys(last5DaysData).map((dateKey) => {
          const dayData = last5DaysData[dateKey];
          return {
            day: dayData.label,
            rawAmount: dayData.total,
            height: 0, // will compute below
          };
        });

        const maxAmount = Math.max(...bars.map(b => b.rawAmount));
        const finalBars = bars.map(b => {
          let height = 10; // min height (10%)
          if (maxAmount > 0) {
            height = Math.max(10, Math.round((b.rawAmount / maxAmount) * 100));
          }
          return {
            ...b,
            height,
          };
        });

        setWeeklyChartBars(finalBars);
      }

    } catch (e) {
      console.error('Error fetching home screen data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHomeData();
  }, [fetchHomeData]);

  return {
    userData,
    balance,
    showBalance,
    setShowBalance,
    isLoading,
    recentTransactions,
    weeklyNetFlow,
    weeklyChartBars,
    fetchHomeData,
  };
}
