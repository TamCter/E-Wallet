import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import { Button } from '@/components/ui/Button';
import { AuthInput } from '@/components/ui/AuthInput';
import { COUNTRY_CODES } from '@/constants/countryCodes';
import { useRegisterLogic } from '@/logic/useRegisterLogic';

export default function RegisterScreen() {
  const router = useRouter();
  const {
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
  } = useRegisterLogic();

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
            <Text style={styles.title}>Tạo tài khoản</Text>
            <Text style={styles.subtitle}>Tham gia Ví điện tử để quản lý tài chính của bạn một cách an toàn.</Text>
          </View>

          <View style={styles.form}>
            <AuthInput
              label="Họ và tên"
              icon="person-outline"
              placeholder="Nguyễn Văn A"
              value={name}
              onChangeText={setName}
            />

            <AuthInput
              label="Địa chỉ Email"
              icon="mail-outline"
              placeholder="user@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.phoneLabel}>Số điện thoại</Text>
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
              label="Mật khẩu"
              icon="lock-closed-outline"
              placeholder="••••••••"
              isPassword
              value={password}
              onChangeText={setPassword}
            />
            <Text style={styles.hint}>Mật khẩu phải dài ít nhất 8 ký tự.</Text>
            <Text style={styles.hint}>Phải chứa ít nhất một chữ cái viết hoa.</Text>
            <Text style={styles.hint}>Phải chứa ít nhất một chữ số.</Text>

            <Button
              title="Đăng ký →"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerBtn}
            />

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}>Đăng nhập</Text>
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