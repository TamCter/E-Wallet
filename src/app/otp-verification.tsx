import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { backendApi } from '@/lib/backendApi';

const OTP_LENGTH = 6;

export default function OTPVerificationScreen() {
  const router = useRouter();
  const { phone, phoneCountryCode, flow } = useLocalSearchParams<{
    phone?: string;
    phoneCountryCode?: string;
    flow?: string;
  }>();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(7); // "00:07" as per design
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  // Fail closed if phone is missing
  if (!phone) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { justifyContent: 'center', padding: 24 }]}>
          <Ionicons name="alert-circle-outline" size={48} color="#D32F2F" style={{ marginBottom: 16 }} />
          <Text style={{ color: '#D32F2F', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 }}>
            Không tìm thấy thông tin số điện thoại xác thực.
          </Text>
          <Button
            title="Quay lại"
            onPress={() => router.back()}
            style={{ width: '100%' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Move to next input
    if (text !== '' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const getMaskedPhone = () => {
    const cc = phoneCountryCode || '+84';

    const cleanNum = phone.replace(/\D/g, '');
    let finalNum = cleanNum;
    if (finalNum.startsWith('0')) {
      finalNum = finalNum.substring(1);
    }

    if (finalNum.length < 5) {
      return `${cc} ${finalNum}`;
    }

    const start = finalNum.substring(0, 1);
    const end = finalNum.substring(finalNum.length - 3);
    const middleLen = finalNum.length - 4;
    const part1 = '*'.repeat(Math.min(2, middleLen));
    const part2 = '*'.repeat(Math.max(0, middleLen - 2));

    return `${cc} ${start}${part1} ${part2} ${end}`;
  };

  const handleVerify = () => {
    const otpString = otp.join('');
    if (otpString.length === OTP_LENGTH) {
      setLoading(true);
      // Simulate API call
      setTimeout(async () => {
        if (flow === 'register') {
          setLoading(false);
          Alert.alert(
            'Thành công',
            'Đăng ký tài khoản thành công! Bạn có thể tiến hành đăng nhập.',
            [{ text: 'OK', onPress: () => router.replace('/login') }]
          );
        } else {
          try {
            // Call backend API endpoint to issue a signed token
            const token = await backendApi.issueVerificationToken(phone);
            setLoading(false);
            router.replace({
              pathname: '/reset-password',
              params: { token }
            });
          } catch (e) {
            setLoading(false);
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi xác thực OTP.');
          }
        }
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
            <Text style={styles.title}>Xác thực OTP</Text>
            <Text style={styles.description}>
              Mã xác thực đã được gửi đến số điện thoại của bạn{'\n'}
              <Text style={styles.phoneNumber}>{getMaskedPhone()}</Text>
            </Text>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[styles.otpInput, digit !== '' && styles.otpInputFilled]}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Gửi lại mã sau </Text>
              <Text style={styles.countdownText}>
                00:{countdown < 10 ? `0${countdown}` : countdown}
              </Text>
            </View>

            <View style={styles.bottomSection}>
               <Button
                  title="Xác thực"
                  onPress={handleVerify}
                  loading={loading}
                  disabled={otp.join('').length !== OTP_LENGTH}
                  style={otp.join('').length !== OTP_LENGTH ? styles.verifyBtnDisabled : styles.verifyBtnActive}
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
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
    marginBottom: 32,
    textAlign: 'center',
  },
  phoneNumber: {
    fontWeight: 'bold',
    color: '#0544B3',
    fontSize: 16,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    color: '#333',
    backgroundColor: '#fff',
  },
  otpInputFilled: {
    borderColor: '#0544B3',
    backgroundColor: '#F5F8FF',
  },
  resendContainer: {
    flexDirection: 'row',
    marginBottom: 48,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  countdownText: {
    fontSize: 14,
    color: '#0544B3',
    fontWeight: 'bold',
  },
  bottomSection: {
    width: '100%',
    marginTop: 'auto',
    paddingBottom: 40,
  },
  verifyBtnActive: {
    backgroundColor: '#0544B3',
  },
  verifyBtnDisabled: {
    backgroundColor: '#A0BBEB',
  },
});
