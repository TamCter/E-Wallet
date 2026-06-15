import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableWithoutFeedback, ActivityIndicator, TouchableOpacity, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PinCodeModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => Promise<boolean>;
  loading: boolean;
  errorText?: string;
  setErrorText: (text: string) => void;
}

export function PinCodeModal({ isVisible, onClose, onSuccess, loading, errorText, setErrorText }: PinCodeModalProps) {
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setPin('');
        setErrorText('');
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, setErrorText]);

  const handleTextChange = async (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    if (cleanText.length <= 6) {
      setPin(cleanText);
      setErrorText('');
      if (cleanText.length === 6) {
        const success = await onSuccess(cleanText);
        if (!success) {
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
      onRequestClose={onClose}
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
});
