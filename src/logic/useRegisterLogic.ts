import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export function useRegisterLogic() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+84');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocus, setIsFocus] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !name || !phone || !phoneCountryCode) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Lỗi', 'Định dạng email không hợp lệ (Ví dụ: user@example.com)');
      return;
    }

    // Kiểm tra độ dài mật khẩu
    if (password.length < 8) {
      Alert.alert('Lỗi', 'Mật khẩu phải chứa ít nhất 8 ký tự');
      return;
    }

    // Kiểm tra độ bảo mật mật khẩu (phải chứa chữ hoa và chữ số)
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasUpperCase || !hasNumber) {
      Alert.alert('Lỗi', 'Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa và 1 chữ số');
      return;
    }

    setLoading(true);

    // 1. Làm sạch Country Code phòng trường hợp dính mã định danh (Ví dụ: +1-CA -> +1)
    const cleanCountryCode = phoneCountryCode.split('-')[0].trim();

    // 2. Làm sạch số điện thoại: Xoá khoảng trắng, kí tự đặc biệt và số 0 ở đầu
    let cleanPhone = phone.replace(/\D/g, ''); // Chỉ giữ lại số
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }

    // Kiểm tra định dạng mã quốc gia (Ví dụ: +84, +1) và số điện thoại (chỉ chứa số, độ dài từ 7 đến 15 ký tự)
    const countryCodePattern = /^\+?\d+$/;
    const phonePattern = /^\d{7,15}$/;

    if (!cleanCountryCode || !countryCodePattern.test(cleanCountryCode)) {
      Alert.alert('Lỗi', 'Mã quốc gia không hợp lệ');
      setLoading(false);
      return;
    }

    if (!cleanPhone || !phonePattern.test(cleanPhone)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (yêu cầu từ 7 đến 15 chữ số)');
      setLoading(false);
      return;
    }

    try {
      // Gọi API Supabase tạo tài khoản vào hệ thống Auth độc lập
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: name.trim(),
            phone_country_code: cleanCountryCode,
            phone_number: cleanPhone,
          }
        }
      });

      if (error) {
        Alert.alert('Đăng ký thất bại', error.message);
      } else {
        router.push({
          pathname: '/otp-verification',
          params: {
            phone: cleanPhone,
            phoneCountryCode: cleanCountryCode,
            email: email.trim(),
            flow: 'register'
          }
        });
      }
    } catch (err: any) {
      Alert.alert('Lỗi hệ thống', 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return {
    name,
    setName,
    email,
    setEmail,
    phoneCountryCode,
    setPhoneCountryCode,
    phone,
    setPhone,
    password,
    setPassword,
    loading,
    isFocus,
    setIsFocus,
    handleRegister,
  };
}
