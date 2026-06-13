import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useServicesLogic, ServiceType } from '@/logic/useServicesLogic';

export default function ServicesScreen() {
  const router = useRouter();
  const {
    balance,
    loadingBalance,
    selectedService,
    customerCode,
    setCustomerCode,
    simulatedBill,
    isProcessing,
    isSuccess,
    error,
    lastTransactionId,
    handleSelectService,
    handleLookupBill,
    handlePay,
    resetStates,
  } = useServicesLogic();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const getServiceDetails = (service: ServiceType) => {
    switch (service) {
      case 'electricity':
        return { title: 'Tiền điện EVN', icon: 'flash-outline', color: '#EF6C00', placeholder: 'Ví dụ: PE12000341' };
      case 'water':
        return { title: 'Tiền nước SAWACO', icon: 'water-outline', color: '#0288D1', placeholder: 'Ví dụ: DB382103' };
      case 'wifi':
        return { title: 'Internet FPT', icon: 'wifi-outline', color: '#4CAF50', placeholder: 'Ví dụ: FT98311' };
      case 'youtube':
        return { title: 'YouTube Premium', icon: 'logo-youtube', color: '#FF0000', price: 79000, desc: 'Xem video không quảng cáo, chạy nền và tải ngoại tuyến' };
      case 'spotify':
        return { title: 'Spotify Premium', icon: 'headset-outline', color: '#1DB954', price: 59000, desc: 'Nghe nhạc chất lượng cao không quảng cáo, tải offline' };
      case 'netflix':
        return { title: 'Netflix Premium', icon: 'videocam-outline', color: '#E50914', price: 180000, desc: 'Xem hàng ngàn bộ phim bom tấn với chất lượng 4K HDR' };
      default:
        return { title: '', icon: 'cube-outline', color: '#666', placeholder: '' };
    }
  };

  const handlePayClick = () => {
    if (!selectedService) return;

    if (['electricity', 'water', 'wifi'].includes(selectedService)) {
      if (!simulatedBill) return;
      const details = getServiceDetails(selectedService);
      handlePay(
        simulatedBill.amount,
        details.title,
        `Mã KH: ${customerCode.toUpperCase()}`
      );
    } else {
      const details = getServiceDetails(selectedService);
      if (details.price) {
        handlePay(
          details.price,
          details.title,
          'Đăng ký Premium hàng tháng'
        );
      }
    }
  };

  const isUtility = selectedService && ['electricity', 'water', 'wifi'].includes(selectedService);
  const activeDetails = selectedService ? getServiceDetails(selectedService) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dịch vụ & Tiện ích</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Balance Bar */}
      <View style={styles.balanceContainer}>
        <View style={styles.balanceInfo}>
          <Ionicons name="wallet-outline" size={20} color="#0544B3" />
          <Text style={styles.balanceLabel}>Số dư khả dụng:</Text>
        </View>
        {loadingBalance ? (
          <ActivityIndicator size="small" color="#0544B3" />
        ) : (
          <Text style={styles.balanceValue}>{formatCurrency(balance)} đ</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Utilities Section */}
        <Text style={styles.sectionTitle}>Thanh toán hóa đơn</Text>
        <View style={styles.utilityGrid}>
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => handleSelectService('electricity')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="flash-outline" size={28} color="#EF6C00" />
            </View>
            <Text style={styles.cardLabel}>Tiền điện</Text>
            <Text style={styles.cardSublabel}>EVN</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => handleSelectService('water')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#E1F5FE' }]}>
              <Ionicons name="water-outline" size={28} color="#0288D1" />
            </View>
            <Text style={styles.cardLabel}>Tiền nước</Text>
            <Text style={styles.cardSublabel}>SAWACO</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => handleSelectService('wifi')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="wifi-outline" size={28} color="#4CAF50" />
            </View>
            <Text style={styles.cardLabel}>Internet / WiFi</Text>
            <Text style={styles.cardSublabel}>FPT Telecom</Text>
          </TouchableOpacity>
        </View>

        {/* Premium Subscriptions Section */}
        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Gói dịch vụ Premium</Text>
        
        {/* YouTube Premium Card */}
        <TouchableOpacity
          style={styles.premiumListItem}
          onPress={() => handleSelectService('youtube')}
        >
          <View style={[styles.premiumIconContainer, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="logo-youtube" size={24} color="#FF0000" />
          </View>
          <View style={styles.premiumTextContainer}>
            <Text style={styles.premiumName}>YouTube Premium</Text>
            <Text style={styles.premiumDesc} numberOfLines={1}>Xem video không quảng cáo & phát nền</Text>
          </View>
          <Text style={styles.premiumPrice}>79.000 đ</Text>
        </TouchableOpacity>

        {/* Spotify Premium Card */}
        <TouchableOpacity
          style={styles.premiumListItem}
          onPress={() => handleSelectService('spotify')}
        >
          <View style={[styles.premiumIconContainer, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="headset-outline" size={24} color="#1DB954" />
          </View>
          <View style={styles.premiumTextContainer}>
            <Text style={styles.premiumName}>Spotify Premium</Text>
            <Text style={styles.premiumDesc} numberOfLines={1}>Nghe nhạc chất lượng cao & offline</Text>
          </View>
          <Text style={styles.premiumPrice}>59.000 đ</Text>
        </TouchableOpacity>

        {/* Netflix Premium Card */}
        <TouchableOpacity
          style={styles.premiumListItem}
          onPress={() => handleSelectService('netflix')}
        >
          <View style={[styles.premiumIconContainer, { backgroundColor: '#FFE5E5' }]}>
            <Ionicons name="videocam-outline" size={24} color="#E50914" />
          </View>
          <View style={styles.premiumTextContainer}>
            <Text style={styles.premiumName}>Netflix Premium</Text>
            <Text style={styles.premiumDesc} numberOfLines={1}>Xem phim bom tấn chất lượng 4K HDR</Text>
          </View>
          <Text style={styles.premiumPrice}>180.000 đ</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Payment Overlay Sheet (Acts as Modal) */}
      {selectedService && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlayContainer}
        >
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={isProcessing ? undefined : resetStates} />
          
          <View style={styles.sheetContent}>
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {isSuccess ? 'Thanh toán thành công' : activeDetails?.title}
              </Text>
              {!isProcessing && !isSuccess && (
                <TouchableOpacity onPress={resetStates}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {/* Error Banner */}
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color="#C62828" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Success State */}
            {isSuccess ? (
              <View style={styles.successContainer}>
                <View style={styles.successBadge}>
                  <Ionicons name="checkmark-sharp" size={48} color="#2E7D32" />
                </View>
                <Text style={styles.successTitle}>Giao dịch hoàn tất</Text>
                
                <View style={styles.receiptContainer}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Dịch vụ:</Text>
                    <Text style={styles.receiptValue}>{activeDetails?.title}</Text>
                  </View>
                  {isUtility && customerCode && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Mã khách hàng:</Text>
                      <Text style={[styles.receiptValue, { textTransform: 'uppercase' }]}>{customerCode}</Text>
                    </View>
                  )}
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Số tiền đã trả:</Text>
                    <Text style={[styles.receiptValue, { color: '#0544B3', fontWeight: 'bold' }]}>
                      {formatCurrency(isUtility ? simulatedBill?.amount || 0 : activeDetails?.price || 0)} đ
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Mã giao dịch:</Text>
                    <Text style={[styles.receiptValue, { fontSize: 11, color: '#666' }]}>{lastTransactionId}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={resetStates}>
                  <Text style={styles.primaryButtonText}>Xong</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Input/Confirm State */
              <View>
                {isUtility ? (
                  /* UTILITY INPUT PANEL */
                  <View>
                    {!simulatedBill ? (
                      <View>
                        <Text style={styles.inputLabel}>Nhập mã khách hàng / số hợp đồng:</Text>
                        <TextInput
                          style={styles.textInput}
                          value={customerCode}
                          onChangeText={setCustomerCode}
                          placeholder={activeDetails?.placeholder}
                          placeholderTextColor="#999"
                          autoCapitalize="characters"
                          editable={!isProcessing}
                        />
                        <Text style={styles.inputTip}>
                          * Nhập đúng mã định dạng nhà cung cấp yêu cầu để tra cứu tiền nợ cước.
                        </Text>
                        <TouchableOpacity
                          style={styles.primaryButton}
                          onPress={handleLookupBill}
                          disabled={isProcessing}
                        >
                          <Text style={styles.primaryButtonText}>Tra cứu hóa đơn</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      /* UTILITY BILL CONFIRMATION */
                      <View>
                        <View style={styles.billDetailsCard}>
                          <View style={styles.billRow}>
                            <Text style={styles.billLabel}>Nhà cung cấp:</Text>
                            <Text style={styles.billVal}>{simulatedBill.provider}</Text>
                          </View>
                          <View style={styles.billRow}>
                            <Text style={styles.billLabel}>Khách hàng:</Text>
                            <Text style={styles.billVal}>{simulatedBill.customerName}</Text>
                          </View>
                          <View style={styles.billRow}>
                            <Text style={styles.billLabel}>Mã số:</Text>
                            <Text style={[styles.billVal, { textTransform: 'uppercase' }]}>{customerCode}</Text>
                          </View>
                          <View style={styles.billDivider} />
                          <View style={styles.billRow}>
                            <Text style={styles.billLabelTotal}>Cước cần thanh toán:</Text>
                            <Text style={styles.billValTotal}>{formatCurrency(simulatedBill.amount)} đ</Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[styles.primaryButton, { backgroundColor: '#2E7D32' }]}
                          onPress={handlePayClick}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.primaryButtonText}>Thanh toán ngay</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  /* PREMIUM SUBSCRIPTION CONFIRMATION */
                  <View>
                    <View style={styles.billDetailsCard}>
                      <Text style={styles.premiumConfirmDesc}>{activeDetails?.desc}</Text>
                      <View style={styles.billDivider} />
                      <View style={styles.billRow}>
                        <Text style={styles.billLabelTotal}>Cước dịch vụ:</Text>
                        <Text style={styles.billValTotal}>{formatCurrency(activeDetails?.price || 0)} đ / tháng</Text>
                      </View>
                      <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Chu kỳ:</Text>
                        <Text style={styles.billVal}>Hàng tháng (Gia hạn tự động)</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.primaryButton, { backgroundColor: '#2E7D32' }]}
                      onPress={handlePayClick}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Đăng ký ngay</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
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
    color: '#333333',
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#0D47A1',
    marginLeft: 8,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D47A1',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  utilityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
  },
  cardSublabel: {
    fontSize: 10,
    color: '#888888',
    marginTop: 2,
    textAlign: 'center',
  },
  premiumListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  premiumIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  premiumName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  premiumDesc: {
    fontSize: 12,
    color: '#777777',
    marginTop: 2,
  },
  premiumPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0544B3',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  overlayBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 42 : 24,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#C62828',
    marginLeft: 8,
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 10,
    fontWeight: '500',
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  inputTip: {
    fontSize: 11,
    color: '#777777',
    marginBottom: 24,
    lineHeight: 16,
  },
  primaryButton: {
    height: 50,
    backgroundColor: '#0544B3',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  billDetailsCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  billLabel: {
    fontSize: 13,
    color: '#666666',
  },
  billVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333333',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  billLabelTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  billValTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C62828',
  },
  premiumConfirmDesc: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 24,
  },
  receiptContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    backgroundColor: '#FAFAFA',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  receiptLabel: {
    fontSize: 13,
    color: '#777777',
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333333',
  },
});
