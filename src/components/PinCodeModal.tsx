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

  const pinKey = user ? `saved_payment_pin_${user.id}` : 'saved_payment_pin';
  const enabledKey = user ? `biometric_payment_enabled_${user.id}` : 'biometric_payment_enabled';

  const handleBiometricsAuth = async () => {
    if (loading) return;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Xác thực sinh trắc học để giao dịch',
        fallbackLabel: 'Nhập mã PIN',
      });

      if (result.success) {
        const savedPin = await SecureStore.getItemAsync(pinKey);
        if (savedPin) {
          setPin(savedPin);
          try {
            const success = await onSuccess(savedPin);
            if (!success) {
              setPin('');
            }
          } catch (err) {
            setPin('');
          }
        } else {
          setErrorText('Không tìm thấy mã PIN sinh trắc học.');
        }
      }
    } catch (err) {
      console.warn('Biometrics auth exception:', err);
    }
  };

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setPin('');
        setErrorText('');
        inputRef.current?.focus();
      }, 300);

      const checkBiometrics = async () => {
        if (Platform.OS === 'web') {
          setIsBiometricAllowed(false);
          return;
        }
        try {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          const enabled = await SecureStore.getItemAsync(enabledKey);
          const hasSavedPin = await SecureStore.getItemAsync(pinKey);

          const allowed = hasHardware && isEnrolled && enabled === 'true' && !!hasSavedPin;
          setIsBiometricAllowed(allowed);

          if (allowed) {
            setTimeout(() => {
              handleBiometricsAuth();
            }, 450);
          }
        } catch (err) {
          console.warn('checkBiometrics error in modal:', err);
          setIsBiometricAllowed(false);
        }
      };

      checkBiometrics();

      return () => clearTimeout(timer);
    }
  }, [isVisible, setErrorText]);

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
        } catch (err) {
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
              <Text style={styles.title}>Mã PIN giao dịch</Text>
              <TouchableOpacity onPress={onClose} disabled={loading} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

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
                style={styles.biometricButton} 
                onPress={handleBiometricsAuth}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons name="finger-print" size={24} color="#0544B3" />
                <Text style={styles.biometricButtonText}>Xác thực bằng vân tay / Face ID</Text>
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
              autoFocus
              editable={!loading}
            />
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
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  loader: {
    marginTop: 8,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#E6EDFF',
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D0E0FF',
  },
  biometricButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#0544B3',
  },
});
