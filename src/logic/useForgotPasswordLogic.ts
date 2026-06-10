import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

export function useForgotPasswordLogic() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleContinue = () => {
    let cc = '+84';
    let cleanPhone = phone.trim();

    if (cleanPhone.startsWith('+')) {
      const match = cleanPhone.match(/^\+(\d{1,4})/);
      if (match) {
        cc = '+' + match[1];
        cleanPhone = cleanPhone.substring(match[0].length);
      }
    }

    cleanPhone = cleanPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }

    const phonePattern = /^\d{7,15}$/;
    if (!cleanPhone || !phonePattern.test(cleanPhone)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (yêu cầu từ 7 đến 15 chữ số)');
      return;
    }

    setLoading(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      router.push({
        pathname: '/otp-verification',
        params: {
          phone: cleanPhone,
          phoneCountryCode: cc,
          flow: 'forgot-password'
        }
      });
    }, 1500);
  };

  return {
    router,
    phone,
    setPhone,
    loading,
    handleContinue,
  };
}
