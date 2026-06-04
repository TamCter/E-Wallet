import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { AuthInput } from '@/components/ui/AuthInput';
import { useLoginLogic } from '@/logic/useLoginLogic';

export default function LoginScreen() {
  const router = useRouter();
  const {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    errorMessage,
    handleLogin,
    handleBiometric,
  } = useLoginLogic();

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
            <Text style={styles.title}>Chào mừng trở lại</Text>
            <Text style={styles.subtitle}>Vui lòng đăng nhập để tiếp tục</Text>
          </View>

          <View style={styles.form}>
            <AuthInput
                label="Email"
                icon="mail-outline"
                placeholder="Nhập email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />

            <View style={styles.passwordHeader}>
              <Text style={styles.label}>Mật khẩu</Text>
              <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                <Text style={styles.forgotPassword}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>
            <AuthInput
              icon="lock-closed-outline"
              placeholder="••••••••"
              isPassword
              value={password}
              onChangeText={setPassword}
            />

            {errorMessage && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={16} color="#D32F2F" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <Button
              title="Đăng nhập"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginBtn}
            />

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric}>
              <Ionicons name="finger-print-outline" size={24} color="#0544B3" style={styles.biometricIcon} />
              <Text style={styles.biometricText}>Đăng nhập bằng Sinh trắc học</Text>
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.registerLink}>Đăng ký ngay</Text>
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
    marginBottom: 40,
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
  },
  form: {
    width: '100%',
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  forgotPassword: {
    fontSize: 12,
    color: '#0544B3',
    fontWeight: '600',
  },
  loginBtn: {
    marginTop: 8,
    marginBottom: 24,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#A0A0A0',
    fontSize: 14,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 32,
  },
  biometricIcon: {
    marginRight: 8,
  },
  biometricText: {
    color: '#0544B3',
    fontSize: 16,
    fontWeight: '500',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    color: '#666666',
    fontSize: 14,
  },
  registerLink: {
    color: '#0544B3',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEbee',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '600',
  },
});
