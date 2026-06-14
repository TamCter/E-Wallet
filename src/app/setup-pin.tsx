import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableWithoutFeedback, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function SetupPinScreen() {
  const router = useRouter();
  const { user, refreshHasPin } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Focus input on load and when switching steps
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [step]);

  const handleTextChange = async (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    if (cleanText.length <= 6) {
      if (step === 1) {
        setPin(cleanText);
        if (cleanText.length === 6) {
          // Go to step 2 after a small delay for smooth visual transition
          setTimeout(() => {
            setStep(2);
          }, 300);
        }
      } else {
        setConfirmPin(cleanText);
        if (cleanText.length === 6) {
          // Verify and save
          if (pin === cleanText) {
            await savePin(pin);
          } else {
            setTimeout(() => {
              Alert.alert(
                'Mã PIN không khớp',
                'Mã PIN xác nhận không chính xác. Vui lòng thử lại.',
                [
                  {
                    text: 'Thử lại',
                    onPress: () => {
                      setConfirmPin('');
                      setPin('');
                      setStep(1);
                    },
                  },
                ]
              );
            }, 200);
          }
        }
      }
    }
  };

  const savePin = async (newPin: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ payment_pin: newPin })
        .eq('id', user.id);

      if (error) {
        Alert.alert('Lỗi lưu mã PIN', error.message);
        setLoading(false);
      } else {
        await refreshHasPin();
        setLoading(false);
        Alert.alert(
          'Thành công',
          'Đã thiết lập mã PIN giao dịch thành công!',
          [{ text: 'Bắt đầu dùng ví', onPress: () => router.replace('/(tabs)') }]
        );
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Lỗi', err.message || 'Không thể kết nối đến máy chủ.');
    }
  };

  const renderDots = () => {
    const currentVal = step === 1 ? pin : confirmPin;
    const dots = [];
    for (let i = 0; i < 6; i++) {
      const isFilled = i < currentVal.length;
      dots.push(
        <View key={i} style={[styles.dot, isFilled && styles.dotFilled]}>
          {isFilled && <View style={styles.dotInner} />}
        </View>
      );
    }
    return dots;
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark-outline" size={40} color="#0544B3" />
          </View>

          <Text style={styles.title}>
            {step === 1 ? 'Thiết lập mã PIN mới' : 'Xác nhận mã PIN mới'}
          </Text>
          <Text style={styles.description}>
            {step === 1
              ? 'Mã PIN gồm 6 chữ số dùng để xác thực khi chuyển tiền hoặc thanh toán dịch vụ.'
              : 'Vui lòng nhập lại mã PIN vừa tạo để hoàn tất xác nhận.'}
          </Text>

          <View style={styles.dotsContainer}>{renderDots()}</View>

          {loading && <ActivityIndicator size="large" color="#0544B3" style={styles.loader} />}

          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            keyboardType="number-pad"
            maxLength={6}
            value={step === 1 ? pin : confirmPin}
            onChangeText={handleTextChange}
            autoFocus
            secureTextEntry
          />
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 240,
    marginBottom: 40,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotFilled: {
    borderColor: '#0544B3',
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0544B3',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  loader: {
    marginTop: 20,
  },
});
