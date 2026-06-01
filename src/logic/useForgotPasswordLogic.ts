import { useState } from 'react';
import { useRouter } from 'expo-router';

export function useForgotPasswordLogic() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = () => {
    setLoading(true);
    // Giả lập cuộc gọi API để gửi mã OTP
    setTimeout(() => {
      setLoading(false);
      router.push('/otp-verification');
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
