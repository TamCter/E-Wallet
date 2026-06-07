import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotificationsLogic, NotificationItem, NotificationTab } from '@/logic/useNotificationsLogic';

export default function NotificationsScreen() {
  const router = useRouter();
  const [claimed, setClaimed] = useState(false);

  const handleClaimCoupon = () => {
    if (claimed) return;
    setClaimed(true);
    Alert.alert(
      'Nhận ưu đãi thành công',
      'Mã giảm giá đã được lưu vào ví của bạn!'
    );
  };
  const {
    groupedNotifications,
    activeTab,
    setActiveTab,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
  } = useNotificationsLogic();

  const tabs: { key: NotificationTab; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'transaction', label: 'Giao dịch' },
    { key: 'promo', label: 'Khuyến mãi' },
    { key: 'system', label: 'Hệ thống' },
  ];

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getIconDetails = (type: string, title: string) => {
    if (type === 'promo') {
      return {
        name: 'gift-outline' as const,
        color: '#E65100',
        bgColor: '#FFE0B2',
      };
    }
    if (type === 'system') {
      return {
        name: 'settings-outline' as const,
        color: '#37474F',
        bgColor: '#ECEFF1',
      };
    }
    // Transaction notifications
    if (title.includes('Nạp')) {
      return {
        name: 'arrow-down-outline' as const,
        color: '#2E7D32',
        bgColor: '#E8F5E9',
      };
    }
    if (title.includes('Rút')) {
      return {
        name: 'arrow-up-outline' as const,
        color: '#C62828',
        bgColor: '#FFEBEE',
      };
    }
    return {
      name: 'wallet-outline' as const,
      color: '#0D47A1',
      bgColor: '#E3F2FD',
    };
  };

  const renderCouponCard = () => (
    <View style={styles.couponContainer}>
      <View style={styles.couponCard}>
        {/* Left dotted design */}
        <View style={styles.couponLeft}>
          <Text style={styles.couponTitle}>$000</Text>
          <Text style={styles.couponSubtitle}>VÔ DƯỚI 1s</Text>
          <TouchableOpacity
            style={[styles.couponBtn, claimed && styles.couponBtnClaimed]}
            onPress={handleClaimCoupon}
            disabled={claimed}
          >
            <Text style={styles.couponBtnText}>{claimed ? 'ĐÃ NHẬN' : 'NHẬN NGAY'}</Text>
          </TouchableOpacity>
        </View>
        {/* Divider line */}
        <View style={styles.couponDivider}>
          <View style={styles.couponDotTop} />
          <View style={styles.couponDottedLine} />
          <View style={styles.couponDotBottom} />
        </View>
        {/* Right brand name rotated */}
        <View style={styles.couponRight}>
          <Text style={styles.couponBrand}>COUPIOZ</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0544B3" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={markAllAsRead}>
            <Ionicons name="checkmark-done" size={24} color="#0544B3" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton} onPress={deleteAllNotifications}>
            <Ionicons name="trash-outline" size={22} color="#D32F2F" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshNotifications} colors={['#0544B3']} />
        }
      >
        {groupedNotifications.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Không có thông báo nào</Text>
          </View>
        ) : (
          groupedNotifications.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.data.map((item: NotificationItem) => {
                const icon = getIconDetails(item.type, item.title);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
                    onPress={() => markAsRead(item.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardHeader}>
                      {/* Icon */}
                      <View style={[styles.iconCircle, { backgroundColor: icon.bgColor }]}>
                        <Ionicons name={icon.name} size={22} color={icon.color} />
                      </View>

                      {/* Main details */}
                      <View style={styles.cardBody}>
                        <View style={styles.titleRow}>
                          <Text style={styles.cardTitle}>{item.title}</Text>
                          <View style={styles.timeContainer}>
                            <Text style={styles.timeText}>
                              {section.title === 'TRƯỚC ĐÓ'
                                ? new Date(item.createdAt).toLocaleDateString('vi-VN')
                                : formatTime(item.createdAt)}
                            </Text>
                            {!item.isRead && <View style={styles.unreadDot} />}
                          </View>
                        </View>
                        <Text style={styles.cardSubtitle}>{item.subtitle}</Text>

                        {/* Render Special Coupon UI if it's the Promo offer item */}
                        {item.id === 'promo-1' && renderCouponCard()}

                        {/* Card Action / Footer */}
                        <View style={styles.cardFooter}>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => deleteNotification(item.id)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="trash-outline" size={15} color="#888" style={{ marginRight: 4 }} />
                            <Text style={styles.deleteButtonText}>Xóa</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
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
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  readAllButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#0544B3',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0544B3',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadCard: {
    borderColor: '#D2E3FC',
    backgroundColor: '#F8F9FA',
  },
  cardHeader: {
    flexDirection: 'row',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    color: '#888',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0544B3',
    marginLeft: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  // Coupon Styles
  couponContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  couponCard: {
    width: '100%',
    height: 95,
    backgroundColor: '#0F2B36',
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  couponLeft: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  couponTitle: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  couponSubtitle: {
    color: '#E0F2F1',
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
    opacity: 0.8,
  },
  couponBtn: {
    backgroundColor: '#00B8D4',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  couponBtnText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  couponBtnClaimed: {
    backgroundColor: '#78909C',
  },
  couponDivider: {
    width: 20,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  couponDotTop: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: -8,
  },
  couponDotBottom: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    position: 'absolute',
    bottom: -8,
  },
  couponDottedLine: {
    height: '60%',
    width: 1,
    borderWidth: 1,
    borderColor: '#78909C',
    borderStyle: 'dashed',
  },
  couponRight: {
    width: 60,
    backgroundColor: '#1E3E4B',
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#0F2B36',
  },
  couponBrand: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
    transform: [{ rotate: '-90deg' }],
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    padding: 6,
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    paddingTop: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
});
