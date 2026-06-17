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
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { safeStorage } from '@/utils/safeStorage';
import { createZaloPayOrder, queryZaloPayOrder } from '@/lib/zalopay';

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

export default function DepositScreen() {
  const router = useRouter();
  const deepLinkUrl = Linking.useURL();

  const [step, setStep] = useState<'input' | 'success'>('input');
  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);

  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);

  const [successDetails, setSuccessDetails] = useState<{
    amount: number;
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

  // Check the status of a pending deposit
  const checkPendingDepositStatus = useCallback(async () => {
    const stored = await safeStorage.getItem('pending_zalopay_deposit');
    if (!stored) return;

    try {
      const pending = JSON.parse(stored);
      if (!pending || !pending.app_trans_id) return;

      setIsCheckingStatus(true);
      const res = await queryZaloPayOrder(pending.app_trans_id);

      if (res.return_code === 1) {
        // ZaloPay payment succeeded! Call Supabase RPC
        const { data: txId, error: rpcError } = await supabase.rpc('process_deposit', {
          deposit_amount: pending.amount,
        });

        if (rpcError) {
          Alert.alert(
            'Lỗi cập nhật',
            'Thanh toán ZaloPay Sandbox thành công nhưng lỗi đồng bộ ví: ' + rpcError.message
          );
        } else {
          // Clear active pending storage
          await safeStorage.setItem('pending_zalopay_deposit', '');
          setSuccessDetails({
            amount: pending.amount,
            transId: res.zalo_trans_id || pending.app_trans_id,
            date: new Date().toLocaleString('vi-VN'),
          });
          setStep('success');
          fetchBalance();
        }
      } else if (res.return_code === 2) {
        // Failed
        await safeStorage.setItem('pending_zalopay_deposit', '');
        Alert.alert('Thất bại', 'Giao dịch ZaloPay Sandbox đã bị hủy hoặc không thành công.');
      } else {
        // Still pending (return_code = 3 or other)
        console.log('Đơn hàng ZaloPay đang chờ thanh toán...');
      }
    } catch (err: any) {
      console.error('Lỗi check pending ZaloPay:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [fetchBalance]);

  // Trigger status check when deep link matches or on mount / screen focus
  useEffect(() => {
    if (deepLinkUrl) {
      const parsed = Linking.parse(deepLinkUrl);
      if (parsed.path && parsed.path.includes('deposit-callback')) {
        checkPendingDepositStatus();
      }
    }
  }, [deepLinkUrl, checkPendingDepositStatus]);

  // Also check on mount in case the user switched back manually
  useEffect(() => {
    checkPendingDepositStatus();
  }, [checkPendingDepositStatus]);

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

  const handleDeposit = async () => {
    const rawAmt = getRawAmount();
    if (rawAmt < 10000) {
      Alert.alert('Lỗi', 'Số tiền nạp tối thiểu qua ZaloPay Sandbox là 10.000đ');
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const appUser = user ? user.email || user.id : 'ewallet_user';

      // Create ZaloPay Redirect URL
      const redirectUrl = Linking.createURL('deposit-callback');

      // Call ZaloPay CreateOrder API
      const res = await createZaloPayOrder(rawAmt, redirectUrl, appUser);

      if (res.return_code === 1 && res.order_url) {
        // Save pending deposit info to safeStorage
        await safeStorage.setItem(
          'pending_zalopay_deposit',
          JSON.stringify({
            app_trans_id: res.app_trans_id,
            amount: rawAmt,
            createdAt: Date.now(),
          })
        );

        // Redirect user to ZaloPay sandbox checkout page
        await Linking.openURL(res.order_url);
      } else {
        Alert.alert('Lỗi', res.return_message || 'Không thể khởi tạo giao dịch ZaloPay.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi kết nối', err.message || 'Không thể kết nối đến máy chủ ZaloPay.');
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
        <Text style={styles.headerTitle}>Nạp tiền vào ví</Text>
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
                <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
              </View>
              {loadingBalance ? (
                <ActivityIndicator size="small" color="#0544B3" style={{ marginTop: 8, alignSelf: 'flex-start' }} />
              ) : (
                <Text style={styles.balanceValue}>{formatNumber(balance)} đ</Text>
              )}
            </View>

            {/* Input Panel */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Nhập số tiền cần nạp (đ)</Text>
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
                <Ionicons name="card-outline" size={18} color="#0544B3" />
                <Text style={styles.methodTitle}>Phương thức thanh toán</Text>
              </View>
              <View style={styles.methodItem}>
                <View style={styles.zaloLogoContainer}>
                  <Text style={styles.zaloText}>Zalo</Text>
                  <Text style={styles.payText}>Pay</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.methodName}>ZaloPay Sandbox</Text>
                  <Text style={styles.methodDesc}>Thanh toán demo qua ứng dụng hoặc web ZaloPay</Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color="#00be00" />
              </View>
            </View>

            {/* Status Check Loader if returning */}
            {isCheckingStatus && (
              <View style={styles.checkingBox}>
                <ActivityIndicator size="small" color="#008fe5" style={{ marginRight: 8 }} />
                <Text style={styles.checkingText}>Đang kiểm tra kết quả thanh toán...</Text>
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={[styles.primaryButton, isProcessing && styles.primaryButtonDisabled]}
              onPress={handleDeposit}
              disabled={isProcessing || getRawAmount() <= 0}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Nạp tiền qua ZaloPay Sandbox</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Manual Verification Action */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={checkPendingDepositStatus}
              disabled={isCheckingStatus}
            >
              <Ionicons name="refresh-outline" size={18} color="#0544B3" style={{ marginRight: 6 }} />
              <Text style={styles.secondaryButtonText}>Kiểm tra lại giao dịch đang chờ</Text>
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
            <Text style={styles.successTitle}>Nạp tiền thành công!</Text>
            <Text style={styles.successSubtitle}>Số tiền đã được ghi nhận vào ví E-Wallet của bạn.</Text>

            <View style={styles.receiptContainer}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Hình thức:</Text>
                <Text style={styles.receiptValue}>Nạp tiền (ZaloPay Sandbox)</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Số tiền:</Text>
                <Text style={[styles.receiptValue, { color: '#2E7D32', fontWeight: 'bold' }]}>
                  +{formatNumber(successDetails?.amount || 0)} đ
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
    backgroundColor: '#E3F2FD',
    borderColor: '#0544B3',
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  quickBtnTextActive: {
    color: '#0544B3',
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
    backgroundColor: '#008fe5',
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
    color: '#00be00',
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
  checkingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F7FA',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#B2EBF2',
  },
  checkingText: {
    fontSize: 13,
    color: '#006064',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#0544B3',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0544B3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: '#A0BCEB',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#0544B3',
    fontSize: 14,
    fontWeight: '600',
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
