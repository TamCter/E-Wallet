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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useServicesLogic, ServiceType } from '@/logic/useServicesLogic';
import { formatCurrency, calculateRemainingDays } from '@/utils/math';

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
    subscriptionCycle,
    setSubscriptionCycle,
    activeSubscriptions,
    handleSelectService,
    handleLookupBill,
    handlePay,
    handleCancelSubscription,
    resetStates,
  } = useServicesLogic();

  const getRemainingDays = (expiresAtStr: string) => {
    const expiresAt = new Date(expiresAtStr);
    const diffTime = expiresAt.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const renderPremiumCard = (
    serviceId: ServiceType,
    monthlyPrice: number,
    desc: string,
    icon: any,
    bgColor: string,
    iconColor: string
  ) => {
    const sub = activeSubscriptions[serviceId];
    const isSubscribed = sub && getRemainingDays(sub.expiresAt) > 0;
    const isAutoRenew = isSubscribed && sub.autoRenew !== false;

    return (
      <TouchableOpacity
        style={[
          styles.premiumListItem,
          isSubscribed && (isAutoRenew ? styles.premiumListItemActive : styles.premiumListItemPending)
        ]}
        onPress={() => handleSelectService(serviceId)}
      >
        <View style={[styles.premiumIconContainer, { backgroundColor: bgColor }]}>
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
        <View style={styles.premiumTextContainer}>
          <Text style={styles.premiumName}>{getServiceDetails(serviceId).title}</Text>
          {isSubscribed ? (
            isAutoRenew ? (
              <View style={styles.activeSubBadge}>
                <Ionicons name="checkmark-circle-sharp" size={12} color="#2E7D32" style={{ marginRight: 4 }} />
                <Text style={styles.activeSubText}>
                  Đang hoạt động • Còn {getRemainingDays(sub.expiresAt)} ngày
                </Text>
              </View>
            ) : (
              <View style={styles.activeSubBadge}>
                <Ionicons name="close-circle-sharp" size={12} color="#E65100" style={{ marginRight: 4 }} />
                <Text style={[styles.activeSubText, { color: '#E65100' }]}>
                  Hủy gia hạn • Còn {getRemainingDays(sub.expiresAt)} ngày
                </Text>
              </View>
            )
          ) : (
            <Text style={styles.premiumDesc} numberOfLines={1}>{desc}</Text>
          )}
        </View>
        <Text style={[
          styles.premiumPrice,
          isSubscribed && (isAutoRenew ? styles.premiumPriceActive : styles.premiumPricePending)
        ]}>
          {isSubscribed ? 'Đang dùng' : `${formatCurrency(monthlyPrice)} đ`}
        </Text>
      </TouchableOpacity>
    );
  };

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
        const finalPrice = subscriptionCycle === 'yearly' ? details.price * 10 : details.price;
        const cycleText = subscriptionCycle === 'yearly' ? 'Đăng ký Premium 1 năm' : 'Đăng ký Premium hàng tháng';
        handlePay(
          finalPrice,
          details.title,
          cycleText
        );
      }
    }
  };

  const handleCancelSubClick = () => {
    if (!selectedService) return;
    Alert.alert(
      'Xác nhận hủy',
      `Bạn có chắc chắn muốn hủy đăng ký gói dịch vụ này?`,
      [
        { text: 'Quay lại', style: 'cancel' },
        { text: 'Hủy đăng ký', style: 'destructive', onPress: () => handleCancelSubscription(selectedService) }
      ]
    );
  };

  const isUtility = selectedService && ['electricity', 'water', 'wifi'].includes(selectedService);
  const activeDetails = selectedService ? getServiceDetails(selectedService) : null;
  const hasActiveSub = selectedService && activeSubscriptions[selectedService] && getRemainingDays(activeSubscriptions[selectedService].expiresAt) > 0;
  const isCancelledSuccess = isSuccess && selectedService && !isUtility && (!activeSubscriptions[selectedService] || getRemainingDays(activeSubscriptions[selectedService].expiresAt) === 0);

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
        {renderPremiumCard('youtube', 79000, 'Xem video không quảng cáo & phát nền', 'logo-youtube', '#FFEBEE', '#FF0000')}

        {/* Spotify Premium Card */}
        {renderPremiumCard('spotify', 59000, 'Nghe nhạc chất lượng cao & offline', 'headset-outline', '#E8F5E9', '#1DB954')}

        {/* Netflix Premium Card */}
        {renderPremiumCard('netflix', 180000, 'Xem phim bom tấn chất lượng 4K HDR', 'videocam-outline', '#FFE5E5', '#E50914')}
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
                {isSuccess
                  ? (isCancelledSuccess ? 'Hủy gói thành công' : 'Thanh toán thành công')
                  : (hasActiveSub ? 'Quản lý gói Premium' : activeDetails?.title)}
              </Text>
              {!isProcessing && !isSuccess && (
                <TouchableOpacity onPress={resetStates}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ width: '100%' }}
              contentContainerStyle={{ flexGrow: 1 }}
            >
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
                  {isCancelledSuccess ? (
                    <>
                      <View style={[styles.successBadge, { backgroundColor: '#FFEBEE' }]}>
                        <Ionicons name="trash-outline" size={44} color="#D32F2F" />
                      </View>
                      <Text style={[styles.successTitle, { color: '#D32F2F' }]}>Hủy đăng ký thành công</Text>
                      
                      <View style={styles.receiptContainer}>
                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptLabel}>Dịch vụ:</Text>
                          <Text style={styles.receiptValue}>{activeDetails?.title}</Text>
                        </View>
                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptLabel}>Trạng thái:</Text>
                          <Text style={[styles.receiptValue, { color: '#D32F2F', fontWeight: 'bold' }]}>Đã hủy tự động gia hạn</Text>
                        </View>
                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptLabel}>Ngày thực hiện:</Text>
                          <Text style={styles.receiptValue}>{new Date().toLocaleDateString('vi-VN')}</Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <>
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
                            {formatCurrency(isUtility ? simulatedBill?.amount || 0 : (subscriptionCycle === 'yearly' ? (activeDetails?.price || 0) * 10 : (activeDetails?.price || 0)))} đ
                          </Text>
                        </View>
                        {!isUtility && (
                          <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Hạn sử dụng:</Text>
                            <Text style={[styles.receiptValue, { color: '#2E7D32', fontWeight: 'bold' }]}>
                              Đến {new Date(new Date().getTime() + (subscriptionCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN')}
                            </Text>
                          </View>
                        )}
                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptLabel}>Mã giao dịch:</Text>
                          <Text style={[styles.receiptValue, { fontSize: 11, color: '#666' }]}>{lastTransactionId}</Text>
                        </View>
                      </View>
                    </>
                  )}

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
                            disabled={isProcessing || !customerCode.trim()}
                          >
                            {isProcessing ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={styles.primaryButtonText}>Tra cứu hóa đơn</Text>
                            )}
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
                  ) : hasActiveSub ? (
                    /* MANAGE ACTIVE PREMIUM SUBSCRIPTION */
                    <View>
                      <View style={styles.billDetailsCard}>
                        <View style={styles.billRow}>
                          <Text style={styles.billLabel}>Trạng thái:</Text>
                          <Text style={[styles.billVal, { color: activeSubscriptions[selectedService].autoRenew !== false ? '#2E7D32' : '#E65100' }]}>
                            {activeSubscriptions[selectedService].autoRenew !== false ? 'Đang hoạt động' : 'Đang chờ hủy'}
                          </Text>
                        </View>
                        <View style={styles.billRow}>
                          <Text style={styles.billLabel}>Gói đăng ký:</Text>
                          <Text style={styles.billVal}>
                            {activeSubscriptions[selectedService].cycle === 'yearly' ? '1 Năm (Đã giảm giá)' : '1 Tháng'}
                          </Text>
                        </View>
                        <View style={styles.billRow}>
                          <Text style={styles.billLabel}>Giá cước cũ:</Text>
                          <Text style={styles.billVal}>{formatCurrency(activeSubscriptions[selectedService].price)} đ</Text>
                        </View>
                        <View style={styles.billRow}>
                          <Text style={styles.billLabel}>Ngày hết hạn:</Text>
                          <Text style={[styles.billVal, { color: '#D32F2F', fontWeight: 'bold' }]}>
                            {new Date(activeSubscriptions[selectedService].expiresAt).toLocaleDateString('vi-VN')}
                          </Text>
                        </View>
                        <View style={styles.billRow}>
                          <Text style={styles.billLabel}>Còn lại:</Text>
                          <Text style={styles.billVal}>
                            {getRemainingDays(activeSubscriptions[selectedService].expiresAt)} ngày
                          </Text>
                        </View>
                        <View style={styles.billDivider} />
                        <Text style={styles.premiumConfirmDesc}>
                          {activeSubscriptions[selectedService].autoRenew !== false
                            ? 'Gói cước premium của bạn đang hoạt động bình thường. Khi bạn bấm hủy, dịch vụ sẽ dừng tự động gia hạn khi hết hạn dùng hiện tại.'
                            : 'Bạn đã hủy tự động gia hạn cho gói này. Gói vẫn tiếp tục sử dụng bình thường cho đến khi hết hạn. Bạn không thể đăng ký lại cho đến khi hết thời hạn.'}
                        </Text>
                      </View>

                      {activeSubscriptions[selectedService].autoRenew !== false ? (
                        <TouchableOpacity
                          style={[styles.primaryButton, { backgroundColor: '#C62828' }]}
                          onPress={handleCancelSubClick}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.primaryButtonText}>Hủy đăng ký gói</Text>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.primaryButton, { backgroundColor: '#B0BEC5' }]}>
                          <Text style={styles.primaryButtonText}>Đã hủy gia hạn</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    /* PREMIUM SUBSCRIPTION CONFIRMATION */
                    <View>
                      <Text style={styles.inputLabel}>Chọn thời hạn đăng ký:</Text>
                      <View style={styles.cycleSelector}>
                        <TouchableOpacity
                          style={[
                            styles.cycleOption,
                            subscriptionCycle === 'monthly' && styles.cycleOptionActive
                          ]}
                          onPress={() => setSubscriptionCycle('monthly')}
                        >
                          <Text style={[
                            styles.cycleOptionText,
                            subscriptionCycle === 'monthly' && styles.cycleOptionTextActive
                          ]}>1 Tháng</Text>
                          <Text style={[
                            styles.cycleOptionSubtext,
                            subscriptionCycle === 'monthly' && styles.cycleOptionSubtextActive
                          ]}>
                            {formatCurrency(activeDetails?.price || 0)} đ
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.cycleOption,
                            subscriptionCycle === 'yearly' && styles.cycleOptionActive
                          ]}
                          onPress={() => setSubscriptionCycle('yearly')}
                        >
                          <View style={styles.saveBadge}>
                            <Text style={styles.saveBadgeText}>Tiết kiệm 2 tháng</Text>
                          </View>
                          <Text style={[
                            styles.cycleOptionText,
                            subscriptionCycle === 'yearly' && styles.cycleOptionTextActive
                          ]}>1 Năm</Text>
                          <Text style={[
                            styles.cycleOptionSubtext,
                            subscriptionCycle === 'yearly' && styles.cycleOptionSubtextActive
                          ]}>
                            {formatCurrency((activeDetails?.price || 0) * 10)} đ
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.billDetailsCard}>
                        <Text style={styles.premiumConfirmDesc}>{activeDetails?.desc}</Text>
                        <View style={styles.billDivider} />
                        <View style={styles.billRow}>
                          <Text style={styles.billLabelTotal}>Tổng tiền thanh toán:</Text>
                          <Text style={styles.billValTotal}>
                            {formatCurrency(subscriptionCycle === 'yearly' ? (activeDetails?.price || 0) * 10 : (activeDetails?.price || 0))} đ
                          </Text>
                        </View>
                        <View style={styles.billRow}>
                          <Text style={styles.billLabel}>Chu kỳ:</Text>
                          <Text style={styles.billVal}>
                            {subscriptionCycle === 'yearly' ? '12 tháng (Gia hạn sau 1 năm)' : 'Hàng tháng (Gia hạn tự động)'}
                          </Text>
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
            </ScrollView>
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
    borderWidth: 1.5,
    borderColor: 'transparent',
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
    width: '100%',
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
    width: '100%',
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
  cycleSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    width: '100%',
  },
  cycleOption: {
    flex: 0.48,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#FAFAFA',
  },
  cycleOptionActive: {
    borderColor: '#0544B3',
    backgroundColor: '#F0F5FF',
  },
  cycleOptionText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  cycleOptionTextActive: {
    color: '#0544B3',
  },
  cycleOptionSubtext: {
    fontSize: 13,
    color: '#666666',
  },
  cycleOptionSubtextActive: {
    color: '#0544B3',
    fontWeight: '600',
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#E50914',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  saveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeSubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  activeSubText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
  },
  premiumListItemActive: {
    borderColor: '#C8E6C9',
    backgroundColor: '#F4FBF7',
  },
  premiumListItemPending: {
    borderColor: '#FFE0B2',
    backgroundColor: '#FFFDE7',
  },
  premiumPriceActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  premiumPricePending: {
    color: '#E65100',
    fontWeight: '600',
  },
});
