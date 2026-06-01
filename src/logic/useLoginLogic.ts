import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';

import * as LocalAuthentication from 'expo-local-authentication';

export function useLoginLogic() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return;
    }
    if (!password) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        Alert.alert('Đăng nhập thất bại', signInError.message);
        return;
      }
      try {
        await SecureStore.setItemAsync('lastEmail', email);
      } catch (storeErr) {
        console.warn('Could not persist lastEmail:', storeErr);
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Đã xảy ra lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Không khả dụng', 'Thiết bị không hỗ trợ hoặc chưa đăng ký sinh trắc học.');
        return;
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Xác thực sinh trắc học để đăng nhập',
        disableDeviceFallback: false,
      });

      if (!authResult.success) {
        Alert.alert('Xác thực thất bại', 'Xác thực sinh trắc học không thành công.');
        return;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        Alert.alert('Phiên đăng nhập hết hạn', 'Không tìm thấy phiên đăng nhập hợp lệ. Vui lòng đăng nhập bằng mật khẩu.');
        return;
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message ?? 'Đã xảy ra lỗi trong quá trình xác thực.');
    }
  };

  return {
    router,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    handleLogin,
    handleBiometric,
  };
}
