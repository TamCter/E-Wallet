import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ProfileMenuItem } from '@/components/ui/ProfileMenuItem';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';

export default function ProfileScreen() {
  const router = useRouter();

  // Các state để lưu thông tin người dùng và trạng thái loading
  const [userData, setUserData] = useState<{ fullName: string; phoneNumber: string } | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchProfileAndWallet();
  }, []);

  const fetchProfileAndWallet = async () => {
    try {
      setIsLoading(true);

      // 1. Lấy thông tin user hiện tại từ Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('Lỗi lấy thông tin Auth hoặc chưa đăng nhập:', authError);
        router.replace('/login');
        return;
      }

      // SỬA TẠI ĐÂY: Trích xuất chính xác cấu trúc Metadata đã ẩn trong Auth
      const fullName = user.user_metadata?.full_name || 'Người dùng';
      const countryCode = user.user_metadata?.phone_country_code || '';
      const phoneNum = user.user_metadata?.phone_number || '';

      // Khâu xử lý hiển thị: Ghép mã quốc gia với số điện thoại (Ví dụ: +84 987654321)
      const phoneNumber = countryCode ? `${countryCode} ${phoneNum}` : phoneNum || 'Chưa cập nhật';

      setUserData({ fullName, phoneNumber });

      // 2. Lấy thông tin ví (Số dư) từ bảng 'wallets' dựa trên ID người dùng hiện tại
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id) // Lọc chính xác theo ID người dùng đang đăng nhập
        .maybeSingle();        // Đổi .single() thành .maybeSingle() để an toàn dữ liệu, chống crash Coerce JSON

      if (walletError) {
        console.error('Lỗi lấy số dư ví:', walletError.message);
      } else if (wallet) {
        setBalance(wallet.balance); // Gán số dư thực tế
      } else {
        setBalance(0); // Mặc định nếu chưa đồng bộ kịp ví
      }

    } catch (error) {
      console.error('Đã xảy ra lỗi hệ thống khi tải profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear Supabase session
      await supabase.auth.signOut();
      // Clear any stored tokens (SecureStore)
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync('supabase.auth.token');
      }
      // Navigate only after successful sign-out
      router.replace('/login');
    } catch (e) {
      console.error('Logout error', e);
      // Do not navigate if sign-out failed
    }
  };

  // Định dạng số tiền thành chuỗi hiển thị tiền tệ Việt Nam (Ví dụ: 12,500,000)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
          <TouchableOpacity style={styles.bellButton}>
            <Ionicons name="notifications-outline" size={24} color="#1a1a1a" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          // Hiển thị vòng xoay khi đang tải dữ liệu từ API
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0544B3" />
            <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
          </View>
        ) : (
          <>
            {/* Profile Info */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={48} color="#0544B3" />
                </View>
                <TouchableOpacity style={styles.editBadge}>
                  <Ionicons name="pencil" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
              {/* Hiển thị Tên người dùng từ API */}
              <Text style={styles.userName}>{userData?.fullName}</Text>
              {/* Hiển thị Số điện thoại từ API */}
              <Text style={styles.userPhone}>{userData?.phoneNumber}</Text>
            </View>

            {/* Balance & Rank Card */}
            <View style={styles.balanceCard}>
              <View>
                <Text style={styles.balanceLabel}>SỐ DƯ KHẢ DỤNG</Text>
                {/* Hiển thị Số dư từ API */}
                <Text style={styles.balanceAmount}>
                  {formatCurrency(balance)} <Text style={styles.currency}>VND</Text>
                </Text>
              </View>
              <View style={styles.rankBadge}>
                <Ionicons name="star" size={14} color="#FFC107" />
                <View style={styles.rankTextContainer}>
                  <Text style={styles.rankTitle}>Hạng Vàng</Text>
                  <Text style={styles.rankPoints}>2,000 điểm</Text>
                </View>
              </View>
            </View>

            {/* Settings Menu */}
            <Text style={styles.sectionTitle}>CÀI ĐẶT TÀI KHOẢN</Text>
            <View style={styles.menuGroup}>
              <ProfileMenuItem title="Thông tin cá nhân" icon="person-outline" />
              <ProfileMenuItem
                title="Bảo mật & Quyền riêng tư"
                subtitle="Mật khẩu, Sinh trắc học"
                icon="shield-checkmark-outline"
              />
              <ProfileMenuItem
                title="Ngân hàng liên kết"
                subtitle="2 ngân hàng đang liên kết"
                icon="card-outline"
              />
              <ProfileMenuItem title="Cài đặt thông báo" icon="notifications-outline" isLast />
            </View>

            {/* Support Menu */}
            <Text style={styles.sectionTitle}>HỖ TRỢ & TIỆN ÍCH</Text>
            <View style={styles.menuGroup}>
              <ProfileMenuItem title="Trung tâm trợ giúp" icon="help-circle-outline" />
              <ProfileMenuItem title="Điều khoản & Chính sách" icon="document-text-outline" isLast />
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>

            {/* App Version */}
            <Text style={styles.versionText}>Phiên bản 2.4.1 (Build 1084)</Text>
          </>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  bellButton: {
    position: 'relative',
    padding: 8,
    marginRight: -8,
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
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0544B3',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FAFAFA',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
  },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  currency: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'normal',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rankTextContainer: {
    marginLeft: 6,
  },
  rankTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFB300',
  },
  rankPoints: {
    fontSize: 10,
    color: '#FFB300',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#A0A0A0',
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  menuGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#A0A0A0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});