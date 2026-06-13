import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { safeStorage } from '@/utils/safeStorage';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const DEBUG = false;

export interface NotificationItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'transaction' | 'promo' | 'system';
  createdAt: string; // ISO String
  isRead: boolean;
  amount?: number;
  isIncoming?: boolean;
}

export type NotificationTab = 'all' | 'transaction' | 'promo' | 'system';

interface NotificationsContextType {
  notifications: NotificationItem[];
  groupedNotifications: { title: string; data: NotificationItem[] }[];
  activeTab: NotificationTab;
  setActiveTab: (tab: NotificationTab) => void;
  loading: boolean;
  readIds: string[];
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  hasUnread: boolean;
  refreshNotifications: () => Promise<void>;
}

export const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const isBrowser = typeof window !== 'undefined';

const storage = safeStorage;

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [loading, setLoading] = useState(false);

  // Dynamic user specific storage keys
  const readKey = useMemo(() => (user ? `${user.id}_read_notifications` : null), [user]);
  const deletedKey = useMemo(() => (user ? `${user.id}_deleted_notifications` : null), [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user || !readKey || !deletedKey) {
      setNotifications([]);
      setReadIds([]);
      setDeletedIds([]);
      return;
    }

    try {
      setLoading(true);

      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!wallet) return;
      const userWalletId = wallet.id;

      // Load read and deleted IDs from namespaced storage
      const storedRead = await storage.getItem(readKey);
      const parsedRead: string[] = storedRead ? JSON.parse(storedRead) : [];
      setReadIds(parsedRead);

      const storedDeleted = await storage.getItem(deletedKey);
      const parsedDeleted: string[] = storedDeleted ? JSON.parse(storedDeleted) : [];
      setDeletedIds(parsedDeleted);

      // Fetch user's transactions
      const { data: txs, error } = await supabase
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
              full_name
            )
          ),
          receiver_wallet:receiver_wallet_id (
            id,
            user_id,
            users:user_id (
              id,
              full_name
            )
          )
        `)
        .or(`sender_wallet_id.eq.${userWalletId},receiver_wallet_id.eq.${userWalletId}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Lỗi lấy giao dịch làm thông báo:', error.message);
        return;
      }

      // Generate transaction notifications inspect status
      const txNotifications: NotificationItem[] = (txs || []).map((tx: any) => {
        const isIncoming = tx.receiver_wallet_id === userWalletId;
        const amountNum = parseFloat(tx.amount);
        const formattedAmt = new Intl.NumberFormat('vi-VN').format(amountNum);
        
        let title = '';
        let subtitle = '';
        const isPending = tx.status === 'pending' || tx.status === 'processing';
        const isFailed = tx.status === 'failed';

        if (tx.type === 'deposit') {
          if (isFailed) {
            title = 'Nạp tiền thất bại';
            subtitle = `Nạp tiền vào ví thất bại. Số tiền: +${formattedAmt}đ`;
          } else if (isPending) {
            title = 'Nạp tiền đang xử lý';
            subtitle = `Yêu cầu nạp tiền đang được xử lý. Số tiền: +${formattedAmt}đ`;
          } else {
            title = 'Nạp tiền thành công';
            subtitle = `Nạp tiền vào ví thành công. Số tiền: +${formattedAmt}đ`;
          }
        } else if (tx.type === 'withdrawal') {
          if (isFailed) {
            title = 'Rút tiền thất bại';
            subtitle = `Rút tiền khỏi ví thất bại. Số tiền: -${formattedAmt}đ`;
          } else if (isPending) {
            title = 'Rút tiền đang xử lý';
            subtitle = `Yêu cầu rút tiền đang được xử lý. Số tiền: -${formattedAmt}đ`;
          } else {
            title = 'Rút tiền thành công';
            subtitle = `Rút tiền khỏi ví thành công. Số tiền: -${formattedAmt}đ`;
          }
        } else {
          // Transfer
          const counterpartName = isIncoming
            ? (tx.sender_wallet?.users?.full_name || 'Người dùng ẩn danh')
            : (tx.receiver_wallet?.users?.full_name || 'Người dùng ẩn danh');
          
          if (isFailed) {
            title = isIncoming ? 'Nhận tiền thất bại' : 'Chuyển tiền thất bại';
            subtitle = isIncoming
              ? `Nhận khoản chuyển tiền +${formattedAmt}đ từ ${counterpartName} thất bại`
              : `Chuyển khoản -${formattedAmt}đ đến ${counterpartName} thất bại`;
          } else if (isPending) {
            title = isIncoming ? 'Nhận tiền đang xử lý' : 'Chuyển tiền đang xử lý';
            subtitle = isIncoming
              ? `Giao dịch nhận +${formattedAmt}đ từ ${counterpartName} đang xử lý`
              : `Giao dịch chuyển -${formattedAmt}đ đến ${counterpartName} đang xử lý`;
          } else {
            title = 'Biến động số dư';
            subtitle = isIncoming
              ? `Tài khoản của bạn vừa nhận +${formattedAmt}đ từ ${counterpartName}`
              : `Tài khoản của bạn vừa chuyển -${formattedAmt}đ đến ${counterpartName}`;
          }
        }

        return {
          id: tx.id,
          title,
          subtitle,
          type: 'transaction',
          createdAt: tx.created_at,
          isRead: parsedRead.includes(tx.id),
          amount: amountNum,
          isIncoming,
        };
      });

      // Construct dynamic mock promotions and system notifications relative to today
      const today = new Date();
      
      const promo1Time = new Date(today);
      promo1Time.setHours(8, 15, 0, 0);

      const system1Time = new Date(today);
      system1Time.setDate(today.getDate() - 1);
      system1Time.setHours(1, 0, 0, 0);

      const system2Time = new Date(today);
      system2Time.setDate(today.getDate() - 1);
      system2Time.setHours(14, 0, 0, 0);

      const formattedSystem1Date = `${String(system1Time.getDate()).padStart(2, '0')}/${String(system1Time.getMonth() + 1).padStart(2, '0')}`;

      const staticNotifications: NotificationItem[] = [
        {
          id: 'promo-1',
          title: 'Ưu đãi đặc biệt',
          subtitle: 'Giảm ngay 20k khi nạp điện thoại vào khung giờ vàng 12h-14h hôm nay!',
          type: 'promo',
          createdAt: promo1Time.toISOString(),
          isRead: parsedRead.includes('promo-1'),
        },
        {
          id: 'system-1',
          title: 'Bảo trì hệ thống',
          subtitle: `Hệ thống sẽ bảo trì từ 01:00 đến 03:00 ngày ${formattedSystem1Date}. Vui lòng không thực hiện giao dịch trong thời gian này.`,
          type: 'system',
          createdAt: system1Time.toISOString(),
          isRead: parsedRead.includes('system-1'),
        },
        {
          id: 'bill-1',
          title: 'Thanh toán hóa đơn',
          subtitle: 'Thanh toán tiền điện tháng 10 thành công. Số tiền: 1,245,000đ.',
          type: 'transaction',
          createdAt: system2Time.toISOString(),
          isRead: parsedRead.includes('bill-1'),
        }
      ];

      // Combine both lists, filter out deleted ones, and sort by createdAt descending
      const combined = [...txNotifications, ...staticNotifications]
        .filter(item => !parsedDeleted.includes(item.id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(combined);
    } catch (err) {
      console.error('Lỗi khi tải thông báo:', err);
    } finally {
      setLoading(false);
    }
  }, [user, readKey, deletedKey]);

  const markAsRead = async (id: string) => {
    if (!readKey) return;
    try {
      if (readIds.includes(id)) return;
      const updated = [...readIds, id];
      setReadIds(updated);
      await storage.setItem(readKey, JSON.stringify(updated));
      
      // Update local state
      setNotifications(prev => 
        prev.map(item => item.id === id ? { ...item, isRead: true } : item)
      );
    } catch (err) {
      console.error('Lỗi lưu trạng thái đã đọc:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!readKey) return;
    try {
      const allIds = notifications.map(item => item.id);
      setReadIds(allIds);
      await storage.setItem(readKey, JSON.stringify(allIds));
      
      // Update local state
      setNotifications(prev => 
        prev.map(item => ({ ...item, isRead: true }))
      );
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc tất cả:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!deletedKey) return;
    try {
      const updatedDeleted = [...deletedIds, id];
      setDeletedIds(updatedDeleted);
      await storage.setItem(deletedKey, JSON.stringify(updatedDeleted));
      
      // Update local state
      setNotifications(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Lỗi khi xóa thông báo:', err);
    }
  };

  const deleteAllNotifications = async () => {
    if (!deletedKey) return;
    try {
      const allCurrentIds = notifications.map(item => item.id);
      const updatedDeleted = [...deletedIds, ...allCurrentIds];
      setDeletedIds(updatedDeleted);
      await storage.setItem(deletedKey, JSON.stringify(updatedDeleted));
      
      // Update local state
      setNotifications([]);
    } catch (err) {
      console.error('Lỗi khi xóa tất cả thông báo:', err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
  }, [fetchNotifications]);

  const fetchNotificationsRef = useRef(fetchNotifications);
  const showToastRef = useRef(showToast);

  useEffect(() => {
    fetchNotificationsRef.current = fetchNotifications;
  }, [fetchNotifications]);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  // Real-time Supabase subscription for new transactions
  useEffect(() => {
    if (!user?.id) return;

    let active = true;
    let channel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      try {
        if (DEBUG) console.log('[Realtime Setup] Fetching wallet for user:', user.id);
        const { data: wallet } = await supabase
          .from('wallets')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!active || !wallet) {
          if (DEBUG) console.log('[Realtime Setup] Wallet not found or hook inactive');
          return;
        }
        const userWalletId = wallet.id;
        if (DEBUG) console.log('[Realtime Setup] User Wallet ID:', userWalletId);

        // Subscribe to INSERT events on public.transactions
        channel = supabase
          .channel(`user-txs-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'transactions',
            },
            async (payload) => {
              if (DEBUG) console.log('[Realtime Event] Received new transaction insert:', payload);
              const newTx = payload.new;
              
              const isSender = newTx.sender_wallet_id === userWalletId;
              const isReceiver = newTx.receiver_wallet_id === userWalletId;
              
              if (DEBUG) console.log(`[Realtime Event] Wallet match check - isSender: ${isSender}, isReceiver: ${isReceiver}`);

              if (isSender || isReceiver) {
                if (DEBUG) console.log('[Realtime Event] Transaction matches user wallet. Fetching details...');
                // Fetch full details of the transaction including counterpart names
                const { data: rawTxDetails, error } = await supabase
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
                        full_name
                      )
                    ),
                    receiver_wallet:receiver_wallet_id (
                      id,
                      user_id,
                      users:user_id (
                        id,
                        full_name
                      )
                    )
                  `)
                  .eq('id', newTx.id)
                  .maybeSingle();

                if (error) {
                  if (DEBUG) console.error('[Realtime Event] Error fetching details:', error);
                }

                if (!active || !rawTxDetails) {
                  if (DEBUG) console.log('[Realtime Event] No details fetched or hook inactive');
                  return;
                }
                const txDetails = rawTxDetails as any;
                if (DEBUG) console.log('[Realtime Event] Fetched details successfully:', txDetails);

                // 1. Refresh local notifications list
                if (DEBUG) console.log('[Realtime Event] Refreshing notification list...');
                fetchNotificationsRef.current();

                // 2. Determine details for the Toast
                const isIncoming = txDetails.receiver_wallet_id === userWalletId;
                const amountNum = parseFloat(txDetails.amount);
                const formattedAmt = new Intl.NumberFormat('vi-VN').format(amountNum);

                let title = '';
                let subtitle = '';
                let toastType: 'incoming' | 'outgoing' | 'info' = 'info';

                if (txDetails.type === 'deposit') {
                  title = 'Nạp tiền thành công';
                  subtitle = `Số dư khả dụng vừa tăng thêm +${formattedAmt}đ`;
                  toastType = 'incoming';
                } else if (txDetails.type === 'withdrawal') {
                  title = 'Rút tiền thành công';
                  subtitle = `Số dư khả dụng vừa giảm đi -${formattedAmt}đ`;
                  toastType = 'outgoing';
                } else {
                  // transfer
                  const counterpartName = isIncoming
                    ? (txDetails.sender_wallet?.users?.full_name || 'Người dùng ẩn danh')
                    : (txDetails.receiver_wallet?.users?.full_name || 'Người dùng ẩn danh');

                  if (isIncoming) {
                    title = 'Biến động số dư (Nhận tiền)';
                    subtitle = `Tài khoản vừa nhận +${formattedAmt}đ từ ${counterpartName}`;
                    toastType = 'incoming';
                  } else {
                    title = 'Biến động số dư (Chuyển tiền)';
                    subtitle = `Tài khoản vừa chuyển -${formattedAmt}đ đến ${counterpartName}`;
                    toastType = 'outgoing';
                  }
                }

                // 3. Trigger the toast!
                if (DEBUG) console.log(`[Realtime Event] Triggering showToast - Title: "${title}", Type: ${toastType}`);
                showToastRef.current(title, subtitle, toastType, amountNum);
              }
            }
          );

        if (active) {
          channel.subscribe((status: string) => {
            if (DEBUG) console.log('[Realtime Setup] Channel subscription status:', status);
          });
        }
      } catch (err) {
        if (DEBUG) console.error('Error setting up transaction realtime subscription:', err);
      }
    };

    setupRealtime();

    return () => {
      active = false;
      if (channel) {
        if (DEBUG) console.log('[Realtime Cleanup] Unsubscribing from channel');
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  // Filter notifications based on tab
  const filteredNotifications = useMemo(() => {
    return notifications.filter(item => {
      if (activeTab === 'all') return true;
      return item.type === activeTab;
    });
  }, [notifications, activeTab]);

  // Group filtered notifications by date
  const groupedNotifications = useMemo(() => {
    const todayItems: NotificationItem[] = [];
    const yesterdayItems: NotificationItem[] = [];
    const earlierItems: NotificationItem[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    filteredNotifications.forEach(item => {
      const itemTime = new Date(item.createdAt).getTime();
      if (itemTime >= todayStart) {
        todayItems.push(item);
      } else if (itemTime >= yesterdayStart) {
        yesterdayItems.push(item);
      } else {
        earlierItems.push(item);
      }
    });

    const sections = [];
    if (todayItems.length > 0) {
      sections.push({ title: 'HÔM NAY', data: todayItems });
    }
    if (yesterdayItems.length > 0) {
      sections.push({ title: 'HÔM QUA', data: yesterdayItems });
    }
    if (earlierItems.length > 0) {
      sections.push({ title: 'TRƯỚC ĐÓ', data: earlierItems });
    }
    return sections;
  }, [filteredNotifications]);

  const hasUnread = useMemo(() => {
    return notifications.some(item => !item.isRead);
  }, [notifications]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications: filteredNotifications,
        groupedNotifications,
        activeTab,
        setActiveTab,
        loading,
        readIds,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        hasUnread,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};
