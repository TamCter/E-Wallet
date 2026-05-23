import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TransactionItem } from '@/components/ui/TransactionItem';

export default function HomepageScreen() {
  const [showBalance, setShowBalance] = useState(true);

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
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>Digital Wallet</Text>
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
            <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
            <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
              <Ionicons name={showBalance ? "eye-outline" : "eye-off-outline"} size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>
            {showBalance ? '$12,450.00' : '********'}
          </Text>
          
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.cardButton}>
              <Ionicons name="add" size={20} color="#0544B3" />
              <Text style={styles.cardButtonText}>Top Up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cardButtonOutline}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
              <Text style={styles.cardButtonOutlineText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <ActionIcon icon="paper-plane-outline" label="Transfer" />
          <ActionIcon icon="qr-code-outline" label="Scan QR" />
          <ActionIcon icon="phone-portrait-outline" label="Mobile" />
          <ActionIcon icon="receipt-outline" label="Bills" />
        </View>

        {/* Weekly Flow Chart */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weekly Flow</Text>
            <View style={styles.badgePositive}>
              <Text style={styles.badgePositiveText}>+$650.00</Text>
            </View>
          </View>
          <View style={styles.chartContainer}>
            {/* Simple mock bar chart */}
            <ChartBar day="Mon" height={60} />
            <ChartBar day="Tue" height={100} />
            <ChartBar day="Wed" height={40} />
            <ChartBar day="Thu" height={120} />
            <ChartBar day="Fri" height={80} />
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <TransactionItem
            title="Starbucks"
            subtitle="Today, 08:30 AM"
            amount={-5.40}
            icon="cafe-outline"
            iconBgColor="#FFE8E8"
            iconColor="#D32F2F"
          />
          <TransactionItem
            title="Salary Deposit"
            subtitle="Yesterday, 09:00 AM"
            amount={3200.00}
            icon="briefcase-outline"
            iconBgColor="#E8F5E9"
            iconColor="#388E3C"
          />
          <TransactionItem
            title="Grocery Store"
            subtitle="Oct 24, 18:45 PM"
            amount={-142.50}
            icon="cart-outline"
            iconBgColor="#F5F5F5"
            iconColor="#616161"
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// Subcomponents for the screen to keep it clean
const ActionIcon = ({ icon, label }: { icon: any, label: string }) => (
  <TouchableOpacity style={styles.actionItem}>
    <View style={styles.actionIconContainer}>
      <Ionicons name={icon} size={24} color="#0544B3" />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const ChartBar = ({ day, height }: { day: string, height: number }) => (
  <View style={styles.chartBarWrapper}>
    <View style={styles.chartBarBg}>
      <View style={[styles.chartBarFill, { height: `${(height / 150) * 100}%` }]} />
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
});
