import { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/context/AuthContext';

export function useSecurityLogic() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const pinKey = user ? `saved_payment_pin_${user.id}` : 'saved_payment_pin';
  const enabledKey = user ? `biometric_payment_enabled_${user.id}` : 'biometric_payment_enabled';

  // Biometric states
  const [isBiometricsSupported, setIsBiometricsSupported] = useState(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [isLoginBiometricsEnabled, setIsLoginBiometricsEnabled] = useState(false);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinModalLoading, setPinModalLoading] = useState(false);

  // Password confirmation for enabling login biometrics
  const [isConfirmPasswordModalVisible, setIsConfirmPasswordModalVisible] = useState(false);
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [confirmPasswordLoading, setConfirmPasswordLoading] = useState(false);

  // Check biometric hardware support and enrollment on mount
  useEffect(() => {
    async function checkSupport() {
      if (Platform.OS === 'web') {
        setIsBiometricsSupported(false);
        return;
      }
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricsSupported(hasHardware && isEnrolled);

        const enabled = await SecureStore.getItemAsync(enabledKey);
        setIsBiometricsEnabled(enabled === 'true');

        if (user?.email) {
          const safeEmailKey = user.email.trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
          const loginEnabled = await SecureStore.getItemAsync(`biometric_login_enabled_${safeEmailKey}`);
          setIsLoginBiometricsEnabled(loginEnabled === 'true');
        }
      } catch (err) {
        console.warn('Check biometrics support error:', err);
        setIsBiometricsSupported(false);
      }
    }
    checkSupport();
  }, [enabledKey, user]);

  const handleToggleBiometrics = async () => {
    if (!isBiometricsSupported) {
      Alert.alert(
        'Không hỗ trợ',
        'Thiết bị của bạn không hỗ trợ sinh trắc học hoặc bạn chưa đăng ký vân tay/Face ID.'
      );
      return;
    }

    if (isBiometricsEnabled) {
      // Turn OFF
      try {
        await SecureStore.deleteItemAsync(pinKey);
        await SecureStore.setItemAsync(enabledKey, 'false');
        setIsBiometricsEnabled(false);
        Alert.alert('Thành công', 'Đã tắt xác thực sinh trắc học cho giao dịch.');
      } catch (err) {
        Alert.alert('Lỗi', 'Không thể lưu cài đặt.');
      }
    } else {
      // Turn ON -> prompt for transaction PIN
      setPinError('');
      setIsPinModalVisible(true);
    }
  };

  const handleToggleLoginBiometrics = async () => {
    if (!isBiometricsSupported) {
      Alert.alert(
        'Không hỗ trợ',
        'Thiết bị của bạn không hỗ trợ sinh trắc học hoặc bạn chưa đăng ký vân tay/Face ID.'
      );
      return;
    }

    if (isLoginBiometricsEnabled) {
      // Turn OFF
      try {
        if (user?.email) {
          const safeEmailKey = user.email.trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
          await SecureStore.deleteItemAsync(`biometric_password_${safeEmailKey}`);
          await SecureStore.setItemAsync(`biometric_login_enabled_${safeEmailKey}`, 'false');
          setIsLoginBiometricsEnabled(false);
          Alert.alert('Thành công', 'Đã tắt đăng nhập bằng sinh trắc học.');
        }
      } catch (err) {
        Alert.alert('Lỗi', 'Không thể lưu cài đặt.');
      }
    } else {
      // Turn ON -> prompt for password
      setConfirmPasswordError('');
      setConfirmPasswordInput('');
      setIsConfirmPasswordModalVisible(true);
    }
  };

  const handleVerifyPasswordForLoginBiometrics = async (): Promise<boolean> => {
    if (!confirmPasswordInput) {
      setConfirmPasswordError('Vui lòng nhập mật khẩu.');
      return false;
    }
    setConfirmPasswordLoading(true);
    setConfirmPasswordError('');
    try {
      // Re-authenticate user with entered password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: confirmPasswordInput,
      });

      if (signInError) {
        setConfirmPasswordError('Mật khẩu không chính xác.');
        setConfirmPasswordLoading(false);
        return false;
      }

      // Password is correct, save to SecureStore
      if (user?.email) {
        const safeEmailKey = user.email.trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
        await SecureStore.setItemAsync(`biometric_password_${safeEmailKey}`, confirmPasswordInput, {
          requireAuthentication: true,
        });
        await SecureStore.setItemAsync(`biometric_login_enabled_${safeEmailKey}`, 'true');
        setIsLoginBiometricsEnabled(true);
        setIsConfirmPasswordModalVisible(false);
        setConfirmPasswordLoading(false);
        setConfirmPasswordInput('');
        Alert.alert('Thành công', 'Đã bật đăng nhập bằng sinh trắc học.');
        return true;
      }
      setConfirmPasswordLoading(false);
      return false;
    } catch (err: any) {
      setConfirmPasswordError(err?.message || 'Không thể xác thực mật khẩu.');
      setConfirmPasswordLoading(false);
      return false;
    }
  };

  const handleVerifyPinForBiometrics = async (pinInput: string): Promise<boolean> => {
    setPinModalLoading(true);
    setPinError('');
    try {
      const { data: isValid, error: rpcError } = await supabase.rpc('verify_payment_pin', {
        pin_input: pinInput,
      });

      if (rpcError) {
        setPinError(`Lỗi xác thực: ${rpcError.message}`);
        setPinModalLoading(false);
        return false;
      }

      if (!isValid) {
        setPinError('Mã PIN giao dịch không chính xác.');
        setPinModalLoading(false);
        return false;
      }

      // PIN is correct, save to hardware encrypted storage with biometric protection
      await SecureStore.setItemAsync(pinKey, pinInput, {
        requireAuthentication: true,
      });
      await SecureStore.setItemAsync(enabledKey, 'true');
      setIsBiometricsEnabled(true);
      setIsPinModalVisible(false);
      setPinModalLoading(false);
      Alert.alert('Thành công', 'Đã bật xác thực sinh trắc học cho giao dịch.');
      return true;
    } catch (err: any) {
      setPinError(err?.message || 'Không thể kết nối đến máy chủ.');
      setPinModalLoading(false);
      return false;
    }
  };

  // Mật khẩu có ít nhất 8 ký tự, có chữ hoa, và có chữ số
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  const isFormValid =
    currentPassword.trim() !== '' &&
    hasMinLength &&
    hasUpperCase &&
    hasNumber &&
    newPassword === confirmPassword;

  const handleUpdatePassword = async () => {
    if (!isFormValid) {
      if (newPassword !== confirmPassword) {
        Alert.alert('Lỗi', 'Mật khẩu mới và xác nhận mật khẩu không trùng khớp');
        return;
      }
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ và đúng yêu cầu mật khẩu mới');
      return;
    }

    setLoading(true);

    try {
      // 1. Lấy thông tin user hiện tại để có email
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user || !user.email) {
        Alert.alert('Lỗi', 'Không thể lấy thông tin người dùng hiện tại');
        setLoading(false);
        return;
      }

      // 2. Xác minh mật khẩu hiện tại bằng cách thử đăng nhập lại (Re-authenticate)
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (loginError) {
        Alert.alert('Lỗi', 'Mật khẩu hiện tại không chính xác');
        setLoading(false);
        return;
      }

      // 3. Cập nhật mật khẩu mới
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        Alert.alert('Lỗi cập nhật', updateError.message);
      } else {
        // Update stored biometric password if it exists
        if (user?.email) {
          try {
            const safeEmailKey = user.email.trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
            const isBioEnabled = await SecureStore.getItemAsync(`biometric_login_enabled_${safeEmailKey}`);
            if (isBioEnabled === 'true') {
              await SecureStore.setItemAsync(`biometric_password_${safeEmailKey}`, newPassword, {
                requireAuthentication: true,
              });
            }
          } catch (err) {
            console.warn('Update biometric password error:', err);
          }
        }
        Alert.alert(
          'Thành công',
          'Mật khẩu của bạn đã được cập nhật thành công!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        // Reset form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Password update error:', error);
      Alert.alert('Lỗi hệ thống', 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    hasMinLength,
    hasUpperCase,
    hasNumber,
    isFormValid,
    handleUpdatePassword,
    isBiometricsSupported,
    isBiometricsEnabled,
    handleToggleBiometrics,
    isPinModalVisible,
    setIsPinModalVisible,
    pinError,
    setPinError,
    pinModalLoading,
    handleVerifyPinForBiometrics,
    // Login biometrics
    isLoginBiometricsEnabled,
    handleToggleLoginBiometrics,
    isConfirmPasswordModalVisible,
    setIsConfirmPasswordModalVisible,
    confirmPasswordInput,
    setConfirmPasswordInput,
    confirmPasswordError,
    setConfirmPasswordError,
    confirmPasswordLoading,
    handleVerifyPasswordForLoginBiometrics,
  };
}
