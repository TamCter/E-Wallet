import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export function useForgotPasswordLogic() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const cleanEmail = email.trim().toLowerCase();

    // Email validation regex
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailPattern.test(cleanEmail)) {
      Alert.alert('Lỗi', 'Địa chỉ email không hợp lệ');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      setLoading(false);

      if (error) {
        Alert.alert('Lỗi gửi yêu cầu', error.message);
      } else {
        router.push({
          pathname: '/otp-verification',
          params: {
            email: cleanEmail,
            flow: 'forgot-password'
          }
        });
      }
    } catch {
      setLoading(false);
      Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ.');
    }
  };

  return {
    router,
    email,
    setEmail,
    loading,
    handleContinue,
  };
}
