import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export function useEditProfileLogic() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+84');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setOriginalEmail] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isFocus, setIsFocus] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsFetching(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('Error fetching Auth user:', authError);
        router.replace('/login');
        return;
      }

      setUserId(user.id);
      
      const metaName = user.user_metadata?.full_name || '';
      const metaCountry = user.user_metadata?.phone_country_code || '+84';
      const metaPhone = user.user_metadata?.phone_number || '';
      const userEmail = user.email || '';

      setFullName(metaName);
      setPhoneCountryCode(metaCountry);
      setPhoneNumber(metaPhone);
      setOriginalEmail(userEmail);
      setCurrentEmail(userEmail);
    } catch (error) {
      console.error('System error fetching profile:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!fullName.trim()) {
      Alert.alert('Lỗi', 'Họ và tên không được để trống');
      return;
    }

    if (!currentEmail.trim()) {
      Alert.alert('Lỗi', 'Email không được để trống');
      return;
    }

    // Email validation regex
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(currentEmail.trim())) {
      Alert.alert('Lỗi', 'Địa chỉ email không hợp lệ');
      return;
    }

    setLoading(true);

    try {
      // 1. Cập nhật Supabase Auth Metadata (bỏ qua thông tin điện thoại đã xác thực)
      const updateData: any = {
        data: {
          full_name: fullName.trim(),
        }
      };

      // Nếu thay đổi email, thêm email mới vào cập nhật
      if (currentEmail.trim() !== email) {
        updateData.email = currentEmail.trim();
      }

      const { data: authData, error: authError } = await supabase.auth.updateUser(updateData);

      if (authError) {
        Alert.alert('Lỗi cập nhật Auth', authError.message);
        setLoading(false);
        return;
      }

      // 2. Cập nhật bảng public.users trong Database (bỏ qua thông tin điện thoại đã xác thực)
      const userUpdatePayload: any = {
        full_name: fullName.trim(),
      };
      if (currentEmail.trim() !== email) {
        userUpdatePayload.email = currentEmail.trim();
      }

      const { error: dbError } = await supabase
        .from('users')
        .update(userUpdatePayload)
        .eq('id', userId);

      if (dbError) {
        // Rollback Auth email change if DB update fails
        if (currentEmail.trim() !== email) {
          await supabase.auth.updateUser({ email: email });
        }
        Alert.alert('Lỗi cơ sở dữ liệu', dbError.message);
        setLoading(false);
        return;
      }

      // Nếu đổi email, Supabase có thể gửi email xác thực đến địa chỉ mới
      if (currentEmail.trim() !== email) {
        Alert.alert(
          'Thành công',
          'Đã cập nhật thông tin thành công! Một email xác nhận đã được gửi đến email mới của bạn.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'Thành công',
          'Cập nhật thông tin cá nhân thành công!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }

    } catch (err) {
      console.error('Save profile error:', err);
      Alert.alert('Lỗi hệ thống', 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return {
    fullName,
    setFullName,
    phoneCountryCode,
    phoneNumber,
    email: currentEmail,
    setEmail: setCurrentEmail,
    loading,
    isFetching,
    isFocus,
    setIsFocus,
    userId,
    handleSaveChanges,
  };
}
