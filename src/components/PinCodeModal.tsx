import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableWithoutFeedback, ActivityIndicator, TouchableOpacity, Keyboard, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/context/AuthContext';

interface PinCodeModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => Promise<boolean>;
  loading: boolean;
  errorText?: string;
  setErrorText: (text: string) => void;
}

export function PinCodeModal({ isVisible, onClose, onSuccess, loading, errorText, setErrorText }: PinCodeModalProps) {
  const { user } = useAuth();
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [isBiometricAllowed, setIsBiometricAllowed] = useState(false);
  const [mode, setMode] = useState<'select' | 'pin'>('pin');

  const pinKey = user ? `saved_payment_pin_${user.id}` : 'saved_payment_pin';
  const enabledKey = user ? `biometric_payment_enabled_${user.id}` : 'biometric_payment_enabled';

  const handleBiometricsAuth = async () => {
    if (loading) return;
    try {
      // Retrieve PIN securely
      const savedPin = await SecureStore.getItemAsync(pinKey, {
        requireAuthentication: true,
        authenticationPrompt: 'Xác thực sinh trắc học để giao dịch',
      });

      if (savedPin) {
        setPin(savedPin);
        try {
          const success = await onSuccess(savedPin);
          if (!success) {
            setPin('');
          }
        } catch {
          setPin('');
        }
      } else {
        setErrorText('Không tìm thấy mã PIN sinh trắc học.');
      }
    } catch (err) {
      console.warn('Biometrics auth exception:', err);
      setErrorText('Xác thực sinh trắc học không thành công.');
    }
  };

  useEffect(() => {
    let timerId: any = null;
    if (isVisible) {
      timerId = setTimeout(() => {
        setPin('');
        setErrorText('');
      }, 0);
      
      const checkBiometrics = async () => {
        if (Platform.OS === 'web') {
          setIsBiometricAllowed(false);
          setMode('pin');
          return;
        }
        try {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          const enabled = await SecureStore.getItemAsync(enabledKey);

          const allowed = hasHardware && isEnrolled && enabled === 'true';
          setIsBiometricAllowed(allowed);
          if (allowed) {
            setMode('select');
          } else {
            setMode('pin');
          }
        } catch (err) {
          console.warn('checkBiometrics error in modal:', err);
          setIsBiometricAllowed(false);
          setMode('pin');
        }
      };

      checkBiometrics();
    }
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [isVisible, setErrorText, enabledKey, pinKey]);

  useEffect(() => {
    if (isVisible && mode === 'pin') {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isVisible, mode]);

  const handleTextChange = async (text: string) => {
    if (loading) return;
    const cleanText = text.replace(/[^0-9]/g, '');
    if (cleanText.length <= 6) {
      setPin(cleanText);
      setErrorText('');
      if (cleanText.length === 6) {
        try {
          const success = await onSuccess(cleanText);
          if (!success) {
            setPin('');
          }
        } catch {
          setPin('');
        }
      }
    }
  };

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < 6; i++) {
      const isFilled = i < pin.length;
      dots.push(
        <View key={i} style={[styles.dot, isFilled && styles.dotFilled, errorText ? styles.dotError : null]}>
          {isFilled && <View style={[styles.dotInner, errorText ? styles.dotInnerError : null]} />}
        </View>
      );
    }
    return dots;
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!loading) {
          onClose();
        }
      }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {mode === 'select' ? 'Xác thực giao dịch' : 'Mã PIN giao dịch'}
              </Text>
              <TouchableOpacity onPress={onClose} disabled={loading} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            {mode === 'select' ? (
              <View style={styles.choiceContainer}>
                <Text style={styles.choiceDescription}>
                  Chọn phương thức xác thực để hoàn tất thanh toán của bạn.
                </Text>

                <TouchableOpacity
                  style={[styles.choiceButton, styles.primaryChoice]}
                  onPress={handleBiometricsAuth}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="finger-print" size={28} color="#ffffff" />
                  <Text style={styles.primaryChoiceText}>Dùng vân tay / Face ID</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.choiceButton, styles.secondaryChoice]}
                  onPress={() => setMode('pin')}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="keypad" size={24} color="#0544B3" />
                  <Text style={styles.secondaryChoiceText}>Nhập mã PIN giao dịch</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pinContainer}>
                <Text style={styles.description}>
                  Vui lòng nhập mã PIN gồm 6 chữ số để xác nhận thanh toán bảo mật.
                </Text>

                <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
                  <View style={styles.dotsContainer}>{renderDots()}</View>
                </TouchableWithoutFeedback>

                {errorText ? (
                  <Text style={styles.errorText}>{errorText}</Text>
                ) : null}

                {isBiometricAllowed && (
                  <TouchableOpacity
                    style={styles.biometricSwitchButton}
                    onPress={() => setMode('select')}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="finger-print" size={20} color="#0544B3" />
                    <Text style={styles.biometricSwitchText}>Dùng vân tay / Face ID</Text>
                  </TouchableOpacity>
                )}

                {loading ? (
                  <ActivityIndicator size="large" color="#0544B3" style={styles.loader} />
                ) : null}

                <TextInput
                  ref={inputRef}
                  style={styles.hiddenInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={pin}
                  onChangeText={handleTextChange}
                  secureTextEntry
                  editable={!loading}
                />
              </View>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  choiceContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
  },
  choiceDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  primaryChoice: {
    backgroundColor: '#0544B3',
  },
  primaryChoiceText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  secondaryChoice: {
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#D0E0FF',
  },
  secondaryChoiceText: {
    color: '#0544B3',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  pinContainer: {
    width: '100%',
    alignItems: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 240,
    marginBottom: 24,
    height: 40,
    alignItems: 'center',
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
  dotError: {
    borderColor: '#D32F2F',
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0544B3',
  },
  dotInnerError: {
    backgroundColor: '#D32F2F',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  biometricSwitchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F0F4FF',
    marginTop: 8,
    marginBottom: 8,
  },
  biometricSwitchText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#0544B3',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  loader: {
    marginTop: 8,
  },
});
