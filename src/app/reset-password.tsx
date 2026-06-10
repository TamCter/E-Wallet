import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { AuthInput } from '@/components/ui/AuthInput';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Validate the short-lived verification artifact (token)
  const isTokenValid = useMemo(() => {
    if (!token) return false;
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let decoded = '';
      let i = 0;
      while (i < token.length) {
        const byte1 = chars.indexOf(token.charAt(i++));
        const byte2 = chars.indexOf(token.charAt(i++));
        const byte3 = chars.indexOf(token.charAt(i++));
        const byte4 = chars.indexOf(token.charAt(i++));
        if (byte1 === -1 || byte2 === -1 || byte3 === -1 || byte4 === -1) return false;
        const c1 = (byte1 << 2) | (byte2 >> 4);
        const c2 = ((byte2 & 15) << 4) | (byte3 >> 2);
        const c3 = ((byte3 & 3) << 6) | byte4;
        decoded += String.fromCharCode(c1);
        if (byte3 !== 64) decoded += String.fromCharCode(c2);
        if (byte4 !== 64) decoded += String.fromCharCode(c3);
      }
      const payload = JSON.parse(decoded);
      if (payload.verified === true && payload.phone && payload.timestamp) {
        const age = Date.now() - payload.timestamp;
        // Token valid for 5 minutes
        return age > 0 && age < 5 * 60 * 1000;
      }
      return false;
    } catch {
      return false;
    }
  }, [token]);

  if (!isTokenValid) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { justifyContent: 'center', padding: 24 }]}>
          <Ionicons name="alert-circle-outline" size={48} color="#D32F2F" style={{ marginBottom: 16 }} />
          <Text style={{ color: '#D32F2F', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 }}>
            Yêu cầu xác thực OTP trước khi đặt lại mật khẩu.
          </Text>
          <Button
            title="Quay lại"
            onPress={() => router.replace('/forgot-password')}
            style={{ width: '100%' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Simple validation logic
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const isFormValid = hasMinLength && hasUpperCase && hasNumber && password === confirmPassword && password !== '';

  const handleUpdatePassword = () => {
    if (isFormValid) {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setLoading(false);
        // Usually you show a success message here, but we'll just go back to login
        router.replace('/login');
      }, 1500);
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed-outline" size={32} color="#0544B3" />
              <View style={styles.refreshBadge}>
                <Ionicons name="refresh" size={14} color="#fff" />
              </View>
            </View>
            
            <Text style={styles.title}>Tạo mật khẩu mới</Text>
            <Text style={styles.description}>
              Vui lòng thiết lập mật khẩu mới để bảo vệ tài khoản của bạn
            </Text>

            <View style={styles.form}>
              <Text style={styles.label}>Mật khẩu mới</Text>
              <AuthInput
                icon="lock-closed-outline"
                placeholder="Nhập mật khẩu mới"
                isPassword
                value={password}
                onChangeText={setPassword}
              />

              <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
              <AuthInput
                icon="lock-closed-outline"
                placeholder="Nhập lại mật khẩu mới"
                isPassword
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <View style={styles.requirementsBox}>
                <Text style={styles.requirementsTitle}>YÊU CẦU BẢO MẬT</Text>
                
                <View style={styles.requirementRow}>
                  <Ionicons name="checkmark-circle" size={16} color={hasMinLength ? "#0544B3" : "#A0A0A0"} />
                  <Text style={[styles.requirementText, hasMinLength && styles.requirementTextMet]}>Ít nhất 8 ký tự</Text>
                </View>

                <View style={styles.requirementRow}>
                  <Ionicons name="checkmark-circle" size={16} color={hasUpperCase ? "#0544B3" : "#A0A0A0"} />
                  <Text style={[styles.requirementText, hasUpperCase && styles.requirementTextMet]}>Có chứa chữ hoa</Text>
                </View>

                <View style={styles.requirementRow}>
                  <Ionicons name="checkmark-circle" size={16} color={hasNumber ? "#0544B3" : "#A0A0A0"} />
                  <Text style={[styles.requirementText, hasNumber && styles.requirementTextMet]}>Có chứa chữ số</Text>
                </View>
              </View>

              <Button
                title="Cập nhật mật khẩu →"
                onPress={handleUpdatePassword}
                loading={loading}
                disabled={!isFormValid}
                style={[styles.updateBtn, !isFormValid && styles.updateBtnDisabled]}
              />
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
  },
  header: {
    height: 56,
    justifyContent: 'center',
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#F5F8FF',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  refreshBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#0544B3',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: '#F5F8FF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 32,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    color: '#1a1a1a',
    fontWeight: '600',
    marginBottom: 8,
  },
  requirementsBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
    marginTop: 8,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  requirementTextMet: {
    color: '#1a1a1a',
    fontWeight: '500',
  },
  updateBtn: {
    marginTop: 8,
    marginBottom: 24,
  },
  updateBtnDisabled: {
    backgroundColor: '#A0BBEB',
  },
});
