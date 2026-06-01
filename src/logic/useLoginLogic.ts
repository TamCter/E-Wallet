import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';

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

  const handleBiometric = () => {
    router.replace('/(tabs)');
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
