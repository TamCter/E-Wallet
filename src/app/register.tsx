import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import { Button } from '@/components/ui/Button';
import { AuthInput } from '@/components/ui/AuthInput';
import { supabase } from '@/lib/supabase';
import { COUNTRY_CODES } from '@/constants/countryCodes';

export default function RegisterScreen() {
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

    if (password.length < 8) {
      Alert.alert('Lỗi', 'Mật khẩu phải chứa ít nhất 8 ký tự');
      return;
    }

    setLoading(true);

    // 1. Làm sạch Country Code phòng trường hợp dính mã định danh (Ví dụ: +1-CA -> +1)
    const cleanCountryCode = phoneCountryCode.split('-')[0].trim();

    // 2. Làm sạch số điện thoại: Xoá khoảng trắng, kí tự đặc biệt và số 0 ở đầu 
    // Việc cắt số 0 ở đầu giúp đồng bộ định dạng lưu trữ quốc tế (Ví dụ: +84 và 987654321)
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
        Alert.alert(
          'Thành công',
          'Đăng ký tài khoản thành công! Bạn có thể tiến hành đăng nhập.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
      }
    } catch (err: any) {
      Alert.alert('Lỗi hệ thống', 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="wallet-outline" size={32} color="#0544B3" />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Digital Wallet to manage your finances securely.</Text>
          </View>

          <View style={styles.form}>
            <AuthInput
              label="Full Name"
              icon="person-outline"
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
            />

            <AuthInput
              label="Email Address"
              icon="mail-outline"
              placeholder="john@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.phoneLabel}>Phone Number</Text>
            <View style={styles.phoneInputContainer}>
              <Dropdown
                style={[styles.dropdown, isFocus && { borderColor: '#0544B3' }]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                data={COUNTRY_CODES}
                search
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder={!isFocus ? 'Chọn' : '...'}
                searchPlaceholder="Tìm kiếm..."
                value={phoneCountryCode}
                onFocus={() => setIsFocus(true)}
                onBlur={() => setIsFocus(false)}
                onChange={item => {
                  setPhoneCountryCode(item.value);
                  setIsFocus(false);
                }}
                renderLeftIcon={() => (
                  <Ionicons name="call-outline" size={16} color="#A0A0A0" style={{ marginRight: 4 }} />
                )}
              />

              <View style={styles.phoneNumberContainer}>
                <TextInput
                  style={styles.phoneNumberInput}
                  placeholder="987654321"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            <AuthInput
              label="Password"
              icon="lock-closed-outline"
              placeholder="••••••••"
              isPassword
              value={password}
              onChangeText={setPassword}
            />
            <Text style={styles.hint}>Must be at least 8 characters.</Text>

            <Button
              title="Sign Up →"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerBtn}
            />

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#F5F8FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0544B3',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  phoneLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  dropdown: {
    height: 50,
    width: 115,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
  placeholderStyle: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  selectedTextStyle: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 14,
    borderRadius: 4,
  },
  phoneNumberContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    backgroundColor: '#fff',
  },
  phoneNumberInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  hint: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: -8,
    marginBottom: 24,
    marginLeft: 4,
  },
  registerBtn: {
    marginBottom: 24,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    color: '#666666',
    fontSize: 14,
  },
  loginLink: {
    color: '#0544B3',
    fontSize: 14,
    fontWeight: 'bold',
  },
});