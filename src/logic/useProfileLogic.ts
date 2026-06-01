import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';

export function useProfileLogic() {
  const router = useRouter();
  const [userData, setUserData] = useState<{ fullName: string; phoneNumber: string } | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchProfileAndWallet();
  }, []);

  const fetchProfileAndWallet = async () => {
    try {
      setIsLoading(true);

      // 1. Lấy thông tin user hiện tại từ Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('Lỗi lấy thông tin Auth hoặc chưa đăng nhập:', authError);
        router.replace('/login');
        return;
      }

      // Trích xuất chính xác cấu trúc Metadata đã ẩn trong Auth
      const fullName = user.user_metadata?.full_name || 'Người dùng';
      const countryCode = user.user_metadata?.phone_country_code || '';
      const phoneNum = user.user_metadata?.phone_number || '';

      // Ghép mã quốc gia với số điện thoại (Ví dụ: +84 987654321)
      const phoneNumber = countryCode ? `${countryCode} ${phoneNum}` : phoneNum || 'Chưa cập nhật';

      setUserData({ fullName, phoneNumber });

      // 2. Lấy thông tin ví (Số dư) từ bảng 'wallets' dựa trên ID người dùng hiện tại
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) {
        console.error('Lỗi lấy số dư ví:', walletError.message);
      } else if (wallet) {
        setBalance(wallet.balance);
      } else {
        setBalance(0);
      }

    } catch (error) {
      console.error('Đã xảy ra lỗi hệ thống khi tải profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync('supabase.auth.token');
      }
      router.replace('/login');
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  return {
    router,
    userData,
    balance,
    isLoading,
    fetchProfileAndWallet,
    handleLogout,
  };
}
