import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
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

  useEffect(() => {
    const loadLastEmail = async () => {
      try {
        let savedEmail = '';
        if (Platform.OS === 'web') {
          savedEmail = localStorage.getItem('lastEmail') || '';
        } else {
          savedEmail = await SecureStore.getItemAsync('lastEmail') || '';
        }
        if (savedEmail) {
          setEmail(savedEmail);
        }
      } catch (err) {
        console.log('Error loading lastEmail:', err);
      }
    };
    loadLastEmail();
  }, []);

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

    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

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
          // Save password for biometric login (sanitize email for SecureStore key compatibility)
          const safeEmailKey = email.trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
          await SecureStore.setItemAsync(`biometric_password_${safeEmailKey}`, password);
        }
      } catch (storeErr) {
        console.log('Could not persist lastEmail or password:', storeErr);
      }

      const isUserAdmin = authData.user?.email?.toLowerCase() === 'admin@gmail.com';
      if (isUserAdmin) {
        router.replace('/admin');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      setErrorMessage(e?.message ?? 'Đã xảy ra lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    if (Platform.OS === 'web') {
      setErrorMessage('Đăng nhập bằng sinh trắc học không hỗ trợ trên nền tảng web.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const savedEmail = await SecureStore.getItemAsync('lastEmail');
      if (!savedEmail) {
        setErrorMessage('Vui lòng đăng nhập bằng mật khẩu ít nhất một lần để kích hoạt sinh trắc học.');
        setLoading(false);
        return;
      }

      const safeEmailKey = savedEmail.trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
      const savedPassword = await SecureStore.getItemAsync(`biometric_password_${safeEmailKey}`);
      if (!savedPassword) {
        setErrorMessage('Không tìm thấy thông tin đăng nhập sinh trắc học. Vui lòng đăng nhập lại bằng mật khẩu.');
        setLoading(false);
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setErrorMessage('Thiết bị không hỗ trợ hoặc chưa đăng ký sinh trắc học.');
        setLoading(false);
        return;
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Xác thực sinh trắc học để đăng nhập',
        disableDeviceFallback: false,
      });

      if (!authResult.success) {
        setErrorMessage('Xác thực sinh trắc học không thành công.');
        setLoading(false);
        return;
      }

      // Log in with the saved credentials
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: savedEmail.trim(),
        password: savedPassword,
      });

      if (signInError) {
        setErrorMessage('Thông tin đăng nhập sinh trắc học đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập bằng mật khẩu.');
        // Clear invalid saved password
        const safeEmailKey = savedEmail.trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
        await SecureStore.deleteItemAsync(`biometric_password_${safeEmailKey}`);
        setLoading(false);
        return;
      }

      const isUserAdmin = authData.user?.email?.toLowerCase() === 'admin@gmail.com';
      if (isUserAdmin) {
        router.replace('/admin');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Đã xảy ra lỗi trong quá trình xác thực.');
    } finally {
      setLoading(false);
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
