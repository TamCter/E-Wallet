import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';

import * as LocalAuthentication from 'expo-local-authentication';

export function useLoginLogic() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setErrorMessage(null);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    setErrorMessage(null);
  };

  const handleLogin = async () => {
    if (loading) return;
    if (!email) {
      setErrorMessage('Vui lòng nhập email');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Định dạng email không hợp lệ (Ví dụ: user@example.com)');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải chứa ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    setErrorMessage(null);

    const isAdmin = email.trim().toLowerCase() === 'admin@gmail.com' && password === '071020041';

    try {
      let { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      // Nếu đăng nhập admin thất bại do chưa có tài khoản, tự động đăng ký tài khoản admin
      if (signInError && isAdmin && signInError.message === 'Invalid login credentials') {
        console.log('Admin account does not exist. Auto-creating admin user...');
        const { error: signUpError } = await supabase.auth.signUp({
          email: 'admin@gmail.com',
          password: '071020041',
          options: {
            data: {
              full_name: 'Quản trị viên',
              phone_country_code: '+84',
              phone_number: '000000000',
            }
          }
        });

        if (!signUpError) {
          // Đăng ký thành công, thử đăng nhập lại lần nữa
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email: 'admin@gmail.com',
            password: '071020041',
          });
          signInError = retryError;
          authData = retryData;
        } else {
          signInError = signUpError;
        }
      }

      if (signInError) {
        let errMsg = signInError.message;
        if (errMsg === 'Invalid login credentials') {
          errMsg = 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!';
        } else if (errMsg === 'Email not confirmed') {
          errMsg = 'Địa chỉ email của bạn chưa được xác minh. Vui lòng xác thực trước!';
        }
        setErrorMessage(errMsg);
        return;
      }

      try {
        if (Platform.OS === 'web') {
          localStorage.setItem('lastEmail', email);
        } else {
          await SecureStore.setItemAsync('lastEmail', email);
        }
      } catch (storeErr) {
        console.warn('Could not persist lastEmail:', storeErr);
      }

      if (isAdmin) {
        router.replace('/admin');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      if (isAdmin) {
        router.replace('/admin');
      } else {
        setErrorMessage(e?.message ?? 'Đã xảy ra lỗi không xác định');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setErrorMessage('Thiết bị không hỗ trợ hoặc chưa đăng ký sinh trắc học.');
        return;
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Xác thực sinh trắc học để đăng nhập',
        disableDeviceFallback: false,
      });

      if (!authResult.success) {
        setErrorMessage('Xác thực sinh trắc học không thành công.');
        return;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setErrorMessage('Không tìm thấy phiên đăng nhập hợp lệ. Vui lòng đăng nhập bằng mật khẩu.');
        return;
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Đã xảy ra lỗi trong quá trình xác thực.');
    }
  };

  return {
    router,
    email,
    setEmail: handleEmailChange,
    password,
    setPassword: handlePasswordChange,
    loading,
    errorMessage,
    handleLogin,
    handleBiometric,
  };
}
