import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { safeStorage } from '@/utils/safeStorage';

export interface FormattedTransaction {
  id: string;
  amount: number;
  type: 'transfer' | 'deposit' | 'withdrawal';
  status: string;
  createdAt: string;
  isIncoming: boolean;
  title: string;
  subtitle: string;
  displayAmount: string;
  statusText: string;
  statusColor: string;
  statusIcon: string;
  iconName: string;
  iconBgColor: string;
  iconColor: string;
  rawSender?: any;
  rawReceiver?: any;
}

export type FilterType = 'all' | 'transfer' | 'received' | 'deposit' | 'withdrawal';

export function useHistoryLogic() {
  const [transactions, setTransactions] = useState<FormattedTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedTx, setSelectedTx] = useState<FormattedTransaction | null>(null);

  const fetchTransactions = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // 1. Get current user session
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Auth error in history logic:', authError);
        return;
      }

      // 2. Get user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError || !wallet) {
        console.error('Wallet error in history logic:', walletError);
        return;
      }

      const userWalletId = wallet.id;

      // 3. Get transactions involving this wallet
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
              phone_number,
              phone_country_code,
              email
            )
          ),
          receiver_wallet:receiver_wallet_id (
            id,
            user_id,
            users:user_id (
              id,
              full_name,
              phone_number,
              phone_country_code,
              email
            )
          )
        `)
        .or(`sender_wallet_id.eq.${userWalletId},receiver_wallet_id.eq.${userWalletId}`)
        .order('created_at', { ascending: false });

      if (txError) {
        console.error('Transactions fetch error:', txError.message);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      let servicesPayments: any = {};
      try {
        const stored = await safeStorage.getItem('services_payments');
        if (stored) {
          servicesPayments = JSON.parse(stored);
        }
      } catch (storageErr) {
        console.error('Lỗi khi đọc services_payments từ safeStorage:', storageErr);
      }

      if (dbTransactions) {
        const formatted: FormattedTransaction[] = dbTransactions.map((tx: any) => {
          const isIncoming = tx.receiver_wallet_id === userWalletId || tx.receiver_wallet?.id === userWalletId;
          const serviceMeta = servicesPayments[tx.id];
          const date = new Date(tx.created_at);
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          
          // Time formatting
          const now = new Date();
          const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const diffTime = dNow.getTime() - dDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          const timeFormatted = diffDays <= 1 ? `${hours}:${minutes}` : `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

          // Title & Subtitle logic
          let title = '';
          let typeLabel = '';
          
          if (tx.type === 'deposit') {
            title = 'Nạp tiền vào ví';
            typeLabel = 'Nạp tiền';
          } else if (tx.type === 'withdrawal') {
            if (serviceMeta) {
              title = serviceMeta.title;
              typeLabel = 'Thanh toán';
            } else {
              title = 'Rút tiền khỏi ví';
              typeLabel = 'Rút tiền';
            }
          } else {
            // Transfer type
            if (isIncoming) {
              const sender = tx.sender_wallet?.users;
              title = sender?.full_name || sender?.email || 'Người dùng ẩn danh';
              typeLabel = 'Nhận tiền';
            } else {
              const receiver = tx.receiver_wallet?.users;
              title = receiver?.full_name || receiver?.email || 'Người dùng ẩn danh';
              typeLabel = 'Chuyển tiền';
            }
          }

          const subtitle = serviceMeta ? `${timeFormatted} • ${serviceMeta.subtitle || typeLabel}` : `${timeFormatted} • ${typeLabel}`;

          // Amount styling
          const numAmount = parseFloat(tx.amount);
          const formattedVal = new Intl.NumberFormat('vi-VN').format(numAmount);
          const displayAmount = `${isIncoming ? '+' : '-'}${formattedVal} đ`;

          // Status details
          let statusText = 'Thành công';
          let statusColor = '#2E7D32';
          let statusIcon = 'checkmark-circle-outline';

          if (tx.status === 'pending' || tx.status === 'processing') {
            statusText = 'Đang xử lý';
            statusColor = '#EF6C00';
            statusIcon = 'time-outline';
          } else if (tx.status === 'failed') {
            statusText = 'Thất bại';
            statusColor = '#C62828';
            statusIcon = 'close-circle-outline';
          }

          // Dynamic icon logic
          const lowerTitle = title.toLowerCase();
          let iconName = 'arrow-up-outline';
          let iconBgColor = '#E3F2FD';
          let iconColor = '#0544B3';

          if (serviceMeta) {
            iconName = serviceMeta.iconName || 'receipt-outline';
            iconColor = serviceMeta.iconColor || '#00838F';
            iconBgColor = serviceMeta.iconBgColor || '#E0F7FA';
          } else if (lowerTitle.includes('shopee') || lowerTitle.includes('lazada') || lowerTitle.includes('tiki') || lowerTitle.includes('mua sắm') || lowerTitle.includes('shopping') || lowerTitle.includes('cửa hàng')) {
            iconName = 'cart-outline';
            iconBgColor = '#F5F5F5';
            iconColor = '#616161';
          } else if (lowerTitle.includes('lương') || lowerTitle.includes('salary') || lowerTitle.includes('thưởng') || lowerTitle.includes('nhận lương')) {
            iconName = 'business-outline';
            iconBgColor = '#E8F5E9';
            iconColor = '#2E7D32';
          } else if (lowerTitle.includes('nhà hàng') || lowerTitle.includes('ăn uống') || lowerTitle.includes('coffee') || lowerTitle.includes('cà phê') || lowerTitle.includes('quán ăn') || lowerTitle.includes('food') || lowerTitle.includes('ăn trưa') || lowerTitle.includes('ăn tối')) {
            iconName = 'restaurant-outline';
            iconBgColor = '#FCE4EC';
            iconColor = '#C2185B';
          } else if (lowerTitle.includes('nước') || lowerTitle.includes('điện') || lowerTitle.includes('internet') || lowerTitle.includes('hóa đơn') || lowerTitle.includes('bill') || lowerTitle.includes('rác') || lowerTitle.includes('tv') || lowerTitle.includes('viễn thông') || lowerTitle.includes('nạp card')) {
            iconName = 'receipt-outline';
            iconBgColor = '#E0F7FA';
            iconColor = '#00838F';
          } else {
            // Defaults based on transaction direction
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
            } else {
              iconName = 'arrow-up-outline';
              iconBgColor = '#E3F2FD';
              iconColor = '#0544B3';
            }
          }

          return {
            id: tx.id,
            amount: numAmount,
            type: tx.type,
            status: tx.status,
            createdAt: tx.created_at,
            isIncoming,
            title,
            subtitle,
            displayAmount,
            statusText,
            statusColor,
            statusIcon,
            iconName,
            iconBgColor,
            iconColor,
            rawSender: tx.sender_wallet?.users,
            rawReceiver: tx.receiver_wallet?.users,
          };
        });

        setTransactions(formatted);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransactions();
  }, [fetchTransactions]);

  const handleRefresh = useCallback(() => {
    fetchTransactions(true);
  }, [fetchTransactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // 1. Search Query Filter
      const matchesSearch =
        tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.displayAmount.includes(searchQuery) ||
        tx.id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Tab Category Filter
      if (activeFilter === 'all') return true;
      if (activeFilter === 'transfer') return tx.type === 'transfer' && !tx.isIncoming;
      if (activeFilter === 'received') return tx.type === 'transfer' && tx.isIncoming;
      if (activeFilter === 'deposit') return tx.type === 'deposit';
      if (activeFilter === 'withdrawal') return tx.type === 'withdrawal';

      return true;
    });
  }, [transactions, searchQuery, activeFilter]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: FormattedTransaction[] } = {};
    const now = new Date();
    const todayStr = 'HÔM NAY';
    const yesterdayStr = 'HÔM QUA';
    const thisMonthStr = 'THÁNG NÀY';

    filteredTransactions.forEach(tx => {
      const date = new Date(tx.createdAt);
      const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffTime = dNow.getTime() - dDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let sectionTitle = '';
      if (diffDays === 0) {
        sectionTitle = todayStr;
      } else if (diffDays === 1) {
        sectionTitle = yesterdayStr;
      } else if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
        sectionTitle = thisMonthStr;
      } else {
        sectionTitle = `THÁNG ${date.getMonth() + 1}/${date.getFullYear()}`;
      }

      if (!groups[sectionTitle]) {
        groups[sectionTitle] = [];
      }
      groups[sectionTitle].push(tx);
    });

    // We want to return an array of sections ordered in time.
    // Note: Since filteredTransactions is already sorted descending by created_at,
    // the keys insertion order will naturally be chronological (newest first).
    return Object.keys(groups).map(title => ({
      title,
      data: groups[title],
    }));
  }, [filteredTransactions]);

  return {
    transactions,
    filteredTransactions,
    groupedTransactions,
    loading,
    isRefreshing,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    selectedTx,
    setSelectedTx,
    handleRefresh,
  };
}
