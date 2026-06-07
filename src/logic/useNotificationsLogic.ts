import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const isBrowser = typeof window !== 'undefined';

const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (isBrowser) {
        return AsyncStorage.getItem(key);
      }
      return null;
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (isBrowser) {
        return AsyncStorage.setItem(key, value);
      }
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
};

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

export function useNotificationsLogic() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!wallet) return;
      const userWalletId = wallet.id;

      // Load read IDs from storage
      const storedRead = await storage.getItem('read_notifications');
      const parsedRead: string[] = storedRead ? JSON.parse(storedRead) : [];
      setReadIds(parsedRead);

      // Load deleted IDs from storage
      const storedDeleted = await storage.getItem('deleted_notifications');
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

      // Generate transaction notifications
      const txNotifications: NotificationItem[] = (txs || []).map((tx: any) => {
        const isIncoming = tx.receiver_wallet_id === userWalletId;
        const amountNum = parseFloat(tx.amount);
        const formattedAmt = new Intl.NumberFormat('vi-VN').format(amountNum);
        
        let subtitle = '';
        if (tx.type === 'deposit') {
          subtitle = `Nạp tiền vào ví thành công. Số tiền: +${formattedAmt}đ`;
        } else if (tx.type === 'withdrawal') {
          subtitle = `Rút tiền khỏi ví thành công. Số tiền: -${formattedAmt}đ`;
        } else {
          if (isIncoming) {
            const senderName = tx.sender_wallet?.users?.full_name || 'Người dùng ẩn danh';
            subtitle = `Tài khoản của bạn vừa nhận +${formattedAmt}đ từ ${senderName}`;
          } else {
            const receiverName = tx.receiver_wallet?.users?.full_name || 'Người dùng ẩn danh';
            subtitle = `Tài khoản của bạn vừa chuyển -${formattedAmt}đ đến ${receiverName}`;
          }
        }

        return {
          id: tx.id,
          title: tx.type === 'deposit' ? 'Nạp tiền thành công' : tx.type === 'withdrawal' ? 'Rút tiền thành công' : 'Biến động số dư',
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
          subtitle: 'Hệ thống sẽ bảo trì từ 01:00 đến 03:00 ngày 25/10. Vui lòng không thực hiện giao dịch trong thời gian này.',
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
  }, []);

  const markAsRead = async (id: string) => {
    try {
      if (readIds.includes(id)) return;
      const updated = [...readIds, id];
      setReadIds(updated);
      await storage.setItem('read_notifications', JSON.stringify(updated));
      
      // Update local state
      setNotifications(prev => 
        prev.map(item => item.id === id ? { ...item, isRead: true } : item)
      );
    } catch (err) {
      console.error('Lỗi lưu trạng thái đã đọc:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const allIds = notifications.map(item => item.id);
      setReadIds(allIds);
      await storage.setItem('read_notifications', JSON.stringify(allIds));
      
      // Update local state
      setNotifications(prev => 
        prev.map(item => ({ ...item, isRead: true }))
      );
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc tất cả:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const updatedDeleted = [...deletedIds, id];
      setDeletedIds(updatedDeleted);
      await storage.setItem('deleted_notifications', JSON.stringify(updatedDeleted));
      
      // Update local state
      setNotifications(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Lỗi khi xóa thông báo:', err);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const allCurrentIds = notifications.map(item => item.id);
      const updatedDeleted = [...deletedIds, ...allCurrentIds];
      setDeletedIds(updatedDeleted);
      await storage.setItem('deleted_notifications', JSON.stringify(updatedDeleted));
      
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

  // Filter notifications based on tab
  const filteredNotifications = notifications.filter(item => {
    if (activeTab === 'all') return true;
    return item.type === activeTab;
  });

  // Group filtered notifications by date
  const groupedNotifications = (() => {
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
  })();

  const hasUnread = notifications.some(item => !item.isRead);

  return {
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
  };
}
