import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export function useSecurityLogic() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
  };
}
