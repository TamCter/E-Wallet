import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { safeStorage } from '@/utils/safeStorage';
import { PinCodeModal } from '@/components/PinCodeModal';

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

export default function WithdrawScreen() {
  const router = useRouter();

  const [step, setStep] = useState<'input' | 'success'>('input');
  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);

  const [phone, setPhone] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // PIN code modal states
  const [isPinModalVisible, setIsPinModalVisible] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>('');

  const [successDetails, setSuccessDetails] = useState<{
    amount: number;
    phone: string;
    transId: string;
    date: string;
  } | null>(null);

  // Fetch current wallet balance
  const fetchBalance = useCallback(async () => {
    try {
      setLoadingBalance(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: wallet, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Lỗi truy vấn ví:', error.message);
        return;
      }
      if (wallet) {
        setBalance(wallet.balance);
      }
    } catch (err) {
      console.error('Lỗi lấy số dư:', err);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const handleQuickAmountPress = (val: number) => {
    setAmount(val.toString());
  };

  const formatCurrencyInput = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) return '';
    return new Intl.NumberFormat('vi-VN').format(parseInt(clean, 10));
  };

  const getRawAmount = () => {
    return parseInt(amount.replace(/\./g, ''), 10) || 0;
  };

  const handleOpenPinModal = () => {
    const rawAmt = getRawAmount();
    if (!phone || phone.replace(/\D/g, '').length < 9) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại ZaloPay nhận hợp lệ');
      return;
    }
    if (rawAmt < 10000) {
      Alert.alert('Lỗi', 'Số tiền chuyển tối thiểu là 10.000đ');
      return;
    }
    if (rawAmt > balance) {
      Alert.alert('Lỗi', 'Số dư tài khoản không đủ để thực hiện chuyển tiền');
      return;
    }
    setPinError('');
    setIsPinModalVisible(true);
  };

  const handleVerifyPinAndWithdraw = async (pinInput: string): Promise<boolean> => {
    setIsProcessing(true);
    setPinError('');

    try {
      // 1. Verify PIN via Supabase
      const { data: isValid, error: rpcError } = await supabase.rpc('verify_payment_pin', {
        pin_input: pinInput,
      });

      if (rpcError) {
        Alert.alert('Lỗi', 'Không thể xác thực mã PIN của bạn lúc này.');
        setIsProcessing(false);
        return false;
      }

      if (!isValid) {
        setPinError('Mã PIN giao dịch không chính xác.');
        setIsProcessing(false);
        return false;
      }

      // PIN is valid, perform withdrawal/transfer out
      const rawAmt = getRawAmount();
      const cleanPhone = phone.replace(/\D/g, '');

      // 2. Call RPC function process_withdrawal
      const { data: transactionId, error: withdrawError } = await supabase.rpc('process_withdrawal', {
        withdrawal_amount: rawAmt,
      });

      if (withdrawError) {
        Alert.alert('Giao dịch thất bại', withdrawError.message || 'Lỗi khi rút tiền khỏi ví.');
        setIsPinModalVisible(false);
        setIsProcessing(false);
        return false;
      }

      // Success
      await safeStorage.setItem(
        `services_payments_${transactionId}`,
        JSON.stringify({
          title: 'Chuyển tiền ZaloPay Sandbox',
          subtitle: `SĐT: ${cleanPhone}`,
          iconName: 'arrow-forward-outline',
          iconColor: '#00be00',
          iconBgColor: '#E8F8E8',
        })
      );

      // Save custom presentation data for success receipt
      setSuccessDetails({
        amount: rawAmt,
        phone: cleanPhone,
        transId: transactionId || `ZPW_${Date.now().toString().slice(-8)}`,
        date: new Date().toLocaleString('vi-VN'),
      });

      setIsPinModalVisible(false);
      setStep('success');
      fetchBalance();
      return true;
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể thực hiện giao dịch.');
      setIsProcessing(false);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chuyển tiền sang ZaloPay</Text>
        <View style={{ width: 40 }} />
      </View>

      {step === 'input' ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Balance Panel */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceRow}>
                <Ionicons name="wallet-outline" size={20} color="#666" />
                <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
              </View>
              {loadingBalance ? (
                <ActivityIndicator size="small" color="#0544B3" style={{ marginTop: 8, alignSelf: 'flex-start' }} />
              ) : (
                <Text style={styles.balanceValue}>{formatNumber(balance)} đ</Text>
              )}
            </View>

            {/* Recipient Account Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Thông tin người nhận</Text>
              <Text style={styles.inputTitle}>Số điện thoại ZaloPay Sandbox</Text>
              <TextInput
                style={styles.phoneInput}
                keyboardType="phone-pad"
                placeholder="Nhập số điện thoại ZaloPay..."
                placeholderTextColor="#CCCCCC"
                value={phone}
                onChangeText={setPhone}
                editable={!isProcessing}
              />
            </View>

            {/* Amount Input Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Nhập số tiền cần chuyển (đ)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#CCCCCC"
                  value={formatCurrencyInput(amount)}
                  onChangeText={(val) => setAmount(val.replace(/\./g, ''))}
                  editable={!isProcessing}
                />
                <Text style={styles.currencyText}>VND</Text>
              </View>

              {/* Quick Select Buttons */}
              <View style={styles.quickGrid}>
                {QUICK_AMOUNTS.map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.quickBtn,
                      getRawAmount() === val && styles.quickBtnActive,
                    ]}
                    onPress={() => handleQuickAmountPress(val)}
                    disabled={isProcessing}
                  >
                    <Text
                      style={[
                        styles.quickBtnText,
                        getRawAmount() === val && styles.quickBtnTextActive,
                      ]}
                    >
                      {formatNumber(val)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Payment Method Card */}
            <View style={styles.methodCard}>
              <View style={styles.methodHeader}>
                <Ionicons name="paper-plane-outline" size={18} color="#00be00" />
                <Text style={styles.methodTitle}>Kênh giao dịch</Text>
              </View>
              <View style={styles.methodItem}>
                <View style={[styles.zaloLogoContainer, { backgroundColor: '#00be00' }]}>
                  <Text style={styles.zaloText}>Zalo</Text>
                  <Text style={[styles.payText, { color: '#ffffff' }]}>Pay</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.methodName}>ZaloPay Sandbox API</Text>
                  <Text style={styles.methodDesc}>Chuyển liên kết app-to-app qua hệ thống Sandbox</Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color="#00be00" />
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[styles.primaryButton, isProcessing && styles.primaryButtonDisabled]}
              onPress={handleOpenPinModal}
              disabled={isProcessing || getRawAmount() <= 0 || !phone}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Chuyển sang ZaloPay Sandbox</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /* Success State Screen */
        <ScrollView contentContainerStyle={styles.successScroll}>
          <View style={styles.successContainer}>
            <View style={styles.successBadge}>
              <Ionicons name="checkmark-sharp" size={48} color="#2E7D32" />
            </View>
            <Text style={styles.successTitle}>Chuyển tiền thành công!</Text>
            <Text style={styles.successSubtitle}>Giao dịch đã được gửi và xử lý trên ví ZaloPay Sandbox.</Text>

            <View style={styles.receiptContainer}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Hình thức:</Text>
                <Text style={styles.receiptValue}>Chuyển tiền đi (ZaloPay Sandbox)</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Tài khoản nhận:</Text>
                <Text style={styles.receiptValue}>{successDetails?.phone}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Số tiền:</Text>
                <Text style={[styles.receiptValue, { color: '#C62828', fontWeight: 'bold' }]}>
                  -{formatNumber(successDetails?.amount || 0)} đ
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Mã giao dịch:</Text>
                <Text style={[styles.receiptValue, { fontSize: 11, color: '#666' }]}>
                  {successDetails?.transId}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Thời gian:</Text>
                <Text style={styles.receiptValue}>{successDetails?.date}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.successButton} onPress={() => router.replace('/(tabs)')}>
              <Text style={styles.successButtonText}>Quay về Trang chủ</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Pin verification modal */}
      <PinCodeModal
        isVisible={isPinModalVisible}
        onClose={() => setIsPinModalVisible(false)}
        onSuccess={handleVerifyPinAndWithdraw}
        loading={isProcessing}
        errorText={pinError}
        setErrorText={setPinError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  scrollContent: {
    padding: 20,
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
    marginBottom: 12,
  },
  inputTitle: {
    fontSize: 12,
    color: '#777',
    marginBottom: 8,
  },
  phoneInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    backgroundColor: '#F9FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1a1a1a',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 8,
    marginBottom: 24,
  },
  textInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    padding: 0,
  },
  currencyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 8,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickBtn: {
    width: '31%',
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickBtnActive: {
    backgroundColor: '#E8F8E8',
    borderColor: '#00be00',
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  quickBtnTextActive: {
    color: '#00be00',
    fontWeight: 'bold',
  },
  methodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  zaloLogoContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  zaloText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  payText: {
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 1,
  },
  methodName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  methodDesc: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: '#00be00',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00be00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: '#A3E2A3',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  successScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  successContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  successBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  receiptContainer: {
    width: '100%',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  receiptLabel: {
    fontSize: 13,
    color: '#666',
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'right',
  },
  successButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
