import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { TransactionItem } from '@/components/ui/TransactionItem';
import { useHomeLogic } from '@/logic/useHomeLogic';

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

  useFocusEffect(
    React.useCallback(() => {
      fetchHomeData();
    }, [fetchHomeData])
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
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
          <TouchableOpacity style={styles.bellButton}>
            <Ionicons name="notifications-outline" size={24} color="#1a1a1a" />
            <View style={styles.notificationDot} />
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
            <TouchableOpacity style={styles.cardButton} onPress={() => {}}>
              <Ionicons name="add" size={20} color="#0544B3" />
              <Text style={styles.cardButtonText}>Nạp tiền</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cardButtonOutline} onPress={() => router.push('/transfer' as any)}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
              <Text style={styles.cardButtonOutlineText}>Chuyển tiền</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <ActionIcon icon="paper-plane-outline" label="Chuyển tiền" onPress={() => router.push('/transfer' as any)} />
          <ActionIcon icon="qr-code-outline" label="Quét mã QR" />
          <ActionIcon icon="phone-portrait-outline" label="Nạp ĐT" />
          <ActionIcon icon="receipt-outline" label="Hóa đơn" />
        </View>

        {/* Weekly Flow Chart */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Biến động tuần này</Text>
            <View style={styles.badgePositive}>
              <Text style={styles.badgePositiveText}>{weeklyNetFlow}</Text>
            </View>
          </View>
          <View style={styles.chartContainer}>
            {weeklyChartBars.map((bar, index) => (
              <ChartBar key={index} day={bar.day} height={bar.height} />
            ))}
          </View>
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

const ChartBar = ({ day, height }: { day: string, height: number }) => (
  <View style={styles.chartBarWrapper}>
    <View style={styles.chartBarBg}>
      <View style={[styles.chartBarFill, { height: `${height}%` }]} />
    </View>
    <Text style={styles.chartDay}>{day}</Text>
  </View>
);

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
    flex: 0.48,
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
});
