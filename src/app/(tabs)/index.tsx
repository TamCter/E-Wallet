import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { TransactionItem } from '@/components/ui/TransactionItem';
import { useHomeLogic } from '@/logic/useHomeLogic';
import { useNotificationsLogic } from '@/logic/useNotificationsLogic';
import { useAISpendingLogic } from '@/logic/useAISpendingLogic';

export default function HomepageScreen() {
  const router = useRouter();
  const {
    userData,
    balance,
    showBalance,
    setShowBalance,
    isLoading,
    recentTransactions,
    weeklyNetFlow,
    weeklyChartBars,
    fetchHomeData,
  } = useHomeLogic();

  const { hasUnread } = useNotificationsLogic();

  // AI Spending states and logic
  const {
    monthlyLimit,
    currentSpent,
    isAILoading,
    forecastMessage,
    installmentAlert,
    aiShoppingAlert,
    hasExceeded,
    spendingRatio,
    forecastType,
    fetchAISpendingData,
    updateSpendingLimit,
  } = useAISpendingLogic();

  const [isLimitModalVisible, setIsLimitModalVisible] = useState(false);
  const [limitInput, setLimitInput] = useState('');
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchHomeData();
      fetchAISpendingData();
    }, [fetchHomeData, fetchAISpendingData])
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const handleOpenLimitModal = () => {
    setLimitInput(monthlyLimit > 0 ? monthlyLimit.toString() : '');
    setIsLimitModalVisible(true);
  };

  const handleSaveLimit = async () => {
    const limitNum = parseFloat(limitInput.replace(/[^0-9]/g, ''));
    if (isNaN(limitNum) || limitNum < 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hạn mức hợp lệ.');
      return;
    }
    if (limitNum > 9999999999999.99) {
      Alert.alert('Lỗi', 'Hạn mức vượt quá giới hạn tối đa cho phép.');
      return;
    }

    setIsUpdatingLimit(true);
    const success = await updateSpendingLimit(limitNum);
    setIsUpdatingLimit(false);

    if (success) {
      Alert.alert('Thành công', 'Đã cập nhật hạn mức chi tiêu tháng này.');
      setIsLimitModalVisible(false);
    } else {
      Alert.alert('Lỗi', 'Không thể lưu hạn mức. Vui lòng thử lại.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#0544B3" />
            </View>
            <View>
              <Text style={styles.greeting}>Xin chào,</Text>
              <Text style={styles.userName}>{userData?.fullName || 'Người dùng'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellButton} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={24} color="#1a1a1a" />
            {hasUnread && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>SỐ DƯ KHẢ DỤNG</Text>
            <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
              <Ionicons name={showBalance ? "eye-outline" : "eye-off-outline"} size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>
            {showBalance ? `${formatCurrency(balance)} VND` : '********'}
          </Text>
          
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.cardButton} onPress={() => Alert.alert('Nạp tiền', 'Tính năng nạp tiền đang được phát triển.')}>
              <Ionicons name="add" size={20} color="#0544B3" />
              <Text style={styles.cardButtonText}>Nạp tiền</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <ActionIcon icon="paper-plane-outline" label="Chuyển tiền" onPress={() => router.push('/transfer' as any)} />
          <ActionIcon icon="qr-code-outline" label="Quét mã QR" />
          <ActionIcon icon="phone-portrait-outline" label="Nạp ĐT" />
          <ActionIcon icon="grid-outline" label="Dịch vụ" onPress={() => router.push('/services' as any)} />
        </View>

        {/* Weekly Flow Chart */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Biến động tuần này</Text>
            <View style={weeklyNetFlow.startsWith('-') ? styles.badgeNegative : styles.badgePositive}>
              <Text style={weeklyNetFlow.startsWith('-') ? styles.badgeNegativeText : styles.badgePositiveText}>
                {weeklyNetFlow}
              </Text>
            </View>
          </View>
          <View style={styles.chartContainer}>
            {weeklyChartBars.map((bar, index) => (
              <ChartBar key={index} day={bar.day} height={bar.height} rawAmount={bar.rawAmount} />
            ))}
          </View>
        </View>

        {/* AI Spending Insights Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.aiHeaderTitle}>
              <Ionicons name="sparkles" size={18} color="#7E57C2" style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: '#4527A0' }]}>Trợ lý Chi tiêu AI</Text>
            </View>
            <TouchableOpacity onPress={handleOpenLimitModal}>
              <Text style={[styles.seeAllText, { color: '#7E57C2' }]}>Thiết lập</Text>
            </TouchableOpacity>
          </View>

          {isAILoading ? (
            <ActivityIndicator size="small" color="#7E57C2" style={{ paddingVertical: 12 }} />
          ) : (
            <View>
              {monthlyLimit > 0 ? (
                <View>
                  {/* Progress Bar Info */}
                  <View style={styles.aiBudgetRow}>
                    <Text style={styles.aiBudgetLabel}>
                      Đã tiêu: <Text style={styles.aiBudgetBold}>{formatCurrency(currentSpent)} đ</Text>
                    </Text>
                    <Text style={styles.aiBudgetLabel}>
                      Hạn mức: <Text style={styles.aiBudgetBold}>{formatCurrency(monthlyLimit)} đ</Text>
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.aiProgressBg}>
                    <View
                      style={[
                        styles.aiProgressFill,
                        {
                          width: `${spendingRatio * 100}%`,
                          backgroundColor: hasExceeded ? '#D32F2F' : spendingRatio > 0.8 ? '#EF6C00' : '#7E57C2'
                        }
                      ]}
                    />
                  </View>

                  <View style={styles.aiBudgetMeta}>
                    <Text style={[styles.aiBudgetPercent, { color: hasExceeded ? '#D32F2F' : '#7E57C2' }]}>
                      {Math.round(spendingRatio * 100)}%
                    </Text>
                    <Text style={styles.aiBudgetRemaining}>
                      {hasExceeded 
                        ? `Vượt hạn mức: ${formatCurrency(currentSpent - monthlyLimit)} đ` 
                        : `Còn lại: ${formatCurrency(monthlyLimit - currentSpent)} đ`}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noLimitContainer}>
                  <Text style={styles.noLimitText}>
                    Bạn chưa đặt hạn mức chi tiêu tháng này. Hãy đặt hạn mức để AI tự động phân tích và cảnh báo.
                  </Text>
                  <TouchableOpacity style={[styles.setupLimitBtn, { backgroundColor: '#7E57C2' }]} onPress={handleOpenLimitModal}>
                    <Text style={styles.setupLimitBtnText}>Đặt hạn mức ngay</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* AI Forecast Banner */}
              {monthlyLimit > 0 && (
                <View style={[
                  styles.aiForecastBox,
                  forecastType === 'danger' && styles.aiForecastDanger,
                  forecastType === 'warning' && styles.aiForecastWarning,
                  forecastType === 'success' && styles.aiForecastSuccess,
                ]}>
                  <Ionicons
                    name={
                      forecastType === 'danger' ? "alert-circle" :
                      forecastType === 'warning' ? "warning" :
                      forecastType === 'success' ? "checkmark-circle" : "information-circle"
                    }
                    size={18}
                    color={
                      forecastType === 'danger' ? "#C62828" :
                      forecastType === 'warning' ? "#E65100" :
                      forecastType === 'success' ? "#2E7D32" : "#512DA8"
                    }
                    style={{ marginRight: 8, marginTop: 2 }}
                  />
                  <Text style={[
                    styles.aiForecastText,
                    forecastType === 'danger' && styles.aiForecastTextDanger,
                    forecastType === 'warning' && styles.aiForecastTextWarning,
                    forecastType === 'success' && styles.aiForecastTextSuccess,
                  ]}>
                    {forecastMessage}
                  </Text>
                </View>
              )}

              {/* Recurring Installments Alert */}
              {installmentAlert && (
                <View style={styles.aiInstallmentBox}>
                  <Ionicons name="repeat" size={18} color="#00838F" style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={styles.aiInstallmentText}>
                    {installmentAlert}
                  </Text>
                </View>
              )}

              {/* AI Supermarket Shopping Alert */}
              {aiShoppingAlert && (
                <View style={[styles.aiInstallmentBox, { backgroundColor: '#F3E5F5', borderColor: '#CE93D8' }]}>
                  <Ionicons name="cart" size={18} color="#8E24AA" style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={[styles.aiInstallmentText, { color: '#4A148C' }]}>
                    {aiShoppingAlert}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/history' as any)}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          
          {isLoading ? (
            <ActivityIndicator size="small" color="#0544B3" style={{ paddingVertical: 12 }} />
          ) : recentTransactions.length === 0 ? (
            <Text style={styles.noTransactionsText}>Chưa có giao dịch nào gần đây</Text>
          ) : (
            recentTransactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                title={tx.title}
                subtitle={tx.subtitle}
                amount={tx.amount}
                displayAmount={tx.displayAmount}
                icon={tx.iconName as any}
                iconBgColor={tx.iconBgColor}
                iconColor={tx.iconColor}
              />
            ))
          )}
        </View>

      </ScrollView>

      {/* Modal Thiết lập Hạn mức Chi tiêu */}
      <Modal
        visible={isLimitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLimitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hạn mức chi tiêu tháng</Text>
              <TouchableOpacity onPress={() => setIsLimitModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Nhập hạn mức chi tiêu bạn mong muốn trong tháng này. Trợ lý AI sẽ tự động theo dõi và gửi cảnh báo sớm nếu bạn tiêu dùng quá nhanh.
            </Text>

            <View style={styles.modalInputContainer}>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                placeholder="Ví dụ: 10,000,000"
                value={limitInput}
                onChangeText={setLimitInput}
                editable={!isUpdatingLimit}
              />
              <Text style={styles.modalInputSuffix}>VND</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setIsLimitModalVisible(false)}
                disabled={isUpdatingLimit}
              >
                <Text style={styles.modalBtnCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave, { backgroundColor: '#7E57C2' }]}
                onPress={handleSaveLimit}
                disabled={isUpdatingLimit}
              >
                {isUpdatingLimit ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalBtnSaveText}>Lưu lại</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Subcomponents for the screen to keep it clean
const ActionIcon = ({ icon, label, onPress }: { icon: any, label: string, onPress?: () => void }) => (
  <TouchableOpacity style={styles.actionItem} onPress={onPress}>
    <View style={styles.actionIconContainer}>
      <Ionicons name={icon} size={24} color="#0544B3" />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const ChartBar = ({ day, height, rawAmount }: { day: string, height: number, rawAmount: number }) => {
  const isNegative = rawAmount < 0;
  const barColor = isNegative ? '#D32F2F' : '#388E3C'; // Red if minus money, Green if positive/neutral
  
  return (
    <View style={styles.chartBarWrapper}>
      <View style={styles.chartBarBg}>
        <View style={[styles.chartBarFill, { height: `${height}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={styles.chartDay}>{day}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  greeting: {
    fontSize: 12,
    color: '#666',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  bellButton: {
    position: 'relative',
    padding: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D32F2F',
    borderWidth: 1,
    borderColor: '#FAFAFA',
  },
  balanceCard: {
    backgroundColor: '#0544B3',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#0544B3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
  },
  cardButtonText: {
    color: '#0544B3',
    fontWeight: '600',
    marginLeft: 8,
  },
  cardButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 0.48,
    justifyContent: 'center',
  },
  cardButtonOutlineText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  badgePositive: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePositiveText: {
    color: '#388E3C',
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeNegative: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeNegativeText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: 'bold',
  },
  seeAllText: {
    color: '#0544B3',
    fontSize: 12,
    fontWeight: '600',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 10,
  },
  chartBarWrapper: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBarBg: {
    width: 32,
    height: 90,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: '#0544B3',
    borderRadius: 4,
  },
  chartDay: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  noTransactionsText: {
    color: '#A0A0A0',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  aiHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiBudgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiBudgetLabel: {
    fontSize: 13,
    color: '#666',
  },
  aiBudgetBold: {
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  aiProgressBg: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  aiProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  aiBudgetMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiBudgetPercent: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  aiBudgetRemaining: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  noLimitContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noLimitText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  setupLimitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  setupLimitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  aiForecastBox: {
    flexDirection: 'row',
    backgroundColor: '#F3E5F5',
    borderWidth: 1,
    borderColor: '#E1BEE7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  aiForecastDanger: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  aiForecastWarning: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFE0B2',
  },
  aiForecastSuccess: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  aiForecastText: {
    flex: 1,
    fontSize: 13,
    color: '#4A148C',
    lineHeight: 18,
    fontWeight: '500',
  },
  aiForecastTextDanger: {
    color: '#C62828',
  },
  aiForecastTextWarning: {
    color: '#E65100',
  },
  aiForecastTextSuccess: {
    color: '#2E7D32',
  },
  aiInstallmentBox: {
    flexDirection: 'row',
    backgroundColor: '#E0F7FA',
    borderWidth: 1,
    borderColor: '#B2EBF2',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  aiInstallmentText: {
    flex: 1,
    fontSize: 13,
    color: '#006064',
    lineHeight: 18,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  modalInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalInputSuffix: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    flex: 0.48,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalBtnCancelText: {
    color: '#666',
    fontWeight: '600',
  },
  modalBtnSave: {
    backgroundColor: '#0544B3',
  },
  modalBtnSaveText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
