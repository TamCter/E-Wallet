import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import * as SecureStore from 'expo-secure-store';

interface UserWithWallet {
  id: string;
  full_name: string;
  phone_country_code: string;
  phone_number: string;
  email: string;
  wallet_id: string;
  balance: number;
}

export default function AdminScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'stats' | 'complaints'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserWithWallet[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal edit balance states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithWallet | null>(null);
  const [newBalanceText, setNewBalanceText] = useState('');
  const [updatingBalance, setUpdatingBalance] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. Fetch users from public.users
      const { data: dbUsers, error: usersError } = await supabase
        .from('users')
        .select('*');

      // 2. Fetch wallets from public.wallets
      const { data: dbWallets, error: walletsError } = await supabase
        .from('wallets')
        .select('*');

      // 3. Fetch transactions from public.transactions
      const { data: dbTransactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*');

      if (usersError || walletsError) {
        console.log('Could not fetch complete DB records:', usersError || walletsError);
        setErrorMessage('Không thể truy xuất dữ liệu từ cơ sở dữ liệu.');
        setUsers([]);
        return;
      }

      if (transactionsError) {
        console.log('Could not fetch transaction records:', transactionsError);
      } else {
        setTransactions(dbTransactions || []);
      }

      if (!dbUsers || dbUsers.length === 0) {
        setUsers([]);
        return;
      }

      // Lọc bỏ tài khoản admin hiện tại ra khỏi danh sách hiển thị quản lý
      const currentUser = session?.user;
      const filteredDbUsers = currentUser
        ? dbUsers.filter(u => u.id !== currentUser.id)
        : dbUsers;

      if (filteredDbUsers.length === 0) {
        setUsers([]);
        return;
      }

      // Merge users with their wallets
      const merged: UserWithWallet[] = filteredDbUsers.map(u => {
        const w = dbWallets?.find(wallet => wallet.user_id === u.id);
        return {
          id: u.id,
          full_name: u.full_name || 'Người dùng',
          phone_country_code: u.phone_country_code || '+84',
          phone_number: u.phone_number || '',
          email: u.email || 'unknown',
          wallet_id: w?.id || '',
          balance: w ? parseFloat(w.balance) : 0,
        };
      });

      setUsers(merged);
    } catch (e) {
      console.error('Error fetching admin data:', e);
      setErrorMessage('Đã xảy ra lỗi trong quá trình tải dữ liệu.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [session, authLoading, fetchData, router]);

  const handleOpenEditBalance = (user: UserWithWallet) => {
    setSelectedUser(user);
    setNewBalanceText(user.balance.toString());
    setIsModalVisible(true);
  };

  const handleSaveBalance = async () => {
    if (!selectedUser) return;
    const balanceNum = parseFloat(newBalanceText);
    if (isNaN(balanceNum) || balanceNum < 0) {
      Alert.alert('Lỗi', 'Số dư không hợp lệ (yêu cầu số lớn hơn hoặc bằng 0)');
      return;
    }

    setUpdatingBalance(true);
    try {
      // Cập nhật Database ví của đúng user đó
      const { data, error: updateError } = await supabase
        .from('wallets')
        .update({ balance: balanceNum })
        .eq('user_id', selectedUser.id)
        .select();

      if (updateError) {
        throw new Error(updateError.message);
      }

      if (!data || data.length === 0) {
        Alert.alert('Lỗi', 'Không có tài khoản nào được cập nhật số dư.');
        setUpdatingBalance(false);
        return;
      }

      // Cập nhật state cục bộ để giao diện đổi ngay lập tức
      setUsers(prev =>
        prev.map(u => (u.id === selectedUser.id ? { ...u, balance: balanceNum } : u))
      );

      Alert.alert('Thành công', `Đã cập nhật số dư cho ${selectedUser.full_name} thành công!`);
      setIsModalVisible(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Lỗi', `Không thể lưu thay đổi: ${err.message || err}`);
    } finally {
      setUpdatingBalance(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Clear lastEmail on explicit logout
      if (Platform.OS === 'web') {
        localStorage.removeItem('lastEmail');
      } else {
        await SecureStore.deleteItemAsync('lastEmail').catch(() => {});
      }
      router.replace('/login');
    } catch {
      router.replace('/login');
    }
  };

  // Lọc danh sách người dùng theo query
  const filteredUsers = users.filter(
    u =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone_number.includes(searchQuery)
  );

  // Định dạng số tiền tệ VND
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  // Tính toán thống kê dòng tiền thực tế từ cơ sở dữ liệu
  const totalMoney = users.reduce((sum, u) => sum + u.balance, 0);
  const totalTrans = transactions.length;
  const totalDeposit = transactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalWithdraw = transactions
    .filter(t => t.type === 'withdrawal')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const totalSum = totalDeposit + totalWithdraw;
  const progressPercent = totalSum > 0 ? (totalDeposit / totalSum) * 100 : 50;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={styles.headerSubtitle}>Quản trị hệ thống ví E-Wallet</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}><Ionicons name="log-out-outline" size={20} color="#D32F2F" /><Text style={styles.logoutText}>Thoát</Text></TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'users' && styles.tabButtonActive]}
          onPress={() => setActiveTab('users')}
        ><Ionicons name="people" size={18} color={activeTab === 'users' ? '#0544B3' : '#666'} /><Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Người dùng</Text></TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'stats' && styles.tabButtonActive]}
          onPress={() => setActiveTab('stats')}
        ><Ionicons name="analytics" size={18} color={activeTab === 'stats' ? '#0544B3' : '#666'} /><Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Dòng tiền</Text></TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'complaints' && styles.tabButtonActive]}
          onPress={() => setActiveTab('complaints')}
        ><Ionicons name="alert-circle" size={18} color={activeTab === 'complaints' ? '#0544B3' : '#666'} /><Text style={[styles.tabText, activeTab === 'complaints' && styles.tabTextActive]}>Khiếu nại</Text></TouchableOpacity>
      </View>

      {/* View Content */}
      <View style={{ flex: 1 }}>{loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#0544B3" />
            <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
          </View>
        )}{!loading && activeTab === 'users' && (
          <View style={{ flex: 1 }}>
            {/* Search Box */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#A0A0A0" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm tên hoặc số điện thoại..."
                placeholderTextColor="#A0A0A0"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#A0A0A0" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
              {errorMessage ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="alert-circle-outline" size={48} color="#D32F2F" />
                  <Text style={[styles.emptyText, { color: '#D32F2F', marginTop: 8 }]}>{errorMessage}</Text>
                </View>
              ) : filteredUsers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color="#D0D0D0" />
                  <Text style={styles.emptyText}>Không tìm thấy người dùng phù hợp</Text>
                </View>
              ) : (
                filteredUsers.map(user => (
                  <View key={user.id} style={styles.userCard}>
                    <View style={styles.userCardHeader}>
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarChar}>{user.full_name.charAt(0)}</Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.full_name}</Text>
                        <Text style={styles.userSub}>{user.email}</Text>
                        <Text style={styles.userSub}>SĐT: {user.phone_country_code} {user.phone_number}</Text>
                      </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.userCardFooter}>
                      <View>
                        <Text style={styles.balanceLabel}>SỐ DƯ HIỆN TẠI</Text>
                        <Text style={styles.balanceAmount}>{formatCurrency(user.balance)} VND</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.editBalanceBtn}
                        onPress={() => handleOpenEditBalance(user)}
                      ><Ionicons name="create-outline" size={16} color="#fff" style={{ marginRight: 4 }} /><Text style={styles.editBalanceText}>Sửa số dư</Text></TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}{!loading && activeTab === 'stats' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Main Stats Widgets */}
            <View style={styles.statsGrid}>
              <View style={styles.statsCard}>
                <Ionicons name="wallet" size={24} color="#0544B3" style={styles.statsCardIcon} />
                <Text style={styles.statsLabel}>TỔNG TIỀN HỆ THỐNG</Text>
                <Text style={styles.statsValue}>{formatCurrency(totalMoney)} VND</Text>
              </View>

              <View style={styles.statsCard}>
                <Ionicons name="swap-horizontal" size={24} color="#2E7D32" style={styles.statsCardIcon} />
                <Text style={styles.statsLabel}>TỔNG SỐ GIAO DỊCH</Text>
                <Text style={styles.statsValue}>{totalTrans} GD</Text>
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Cơ cấu dòng tiền thực tế</Text>
              
              <View style={styles.flowRow}>
                <View style={styles.flowLabelRow}>
                  <Text style={styles.flowName}>Nạp tiền (Deposit)</Text>
                  <Text style={styles.flowVal}>{formatCurrency(totalDeposit)} VND</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: '#2E7D32' }]} />
                </View>
              </View>

              <View style={styles.flowRow}>
                <View style={styles.flowLabelRow}>
                  <Text style={styles.flowName}>Rút tiền (Withdrawal)</Text>
                  <Text style={styles.flowVal}>{formatCurrency(totalWithdraw)} VND</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${100 - progressPercent}%`, backgroundColor: '#C62828' }]} />
                </View>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="shield-checkmark" size={20} color="#2E7D32" style={{ marginRight: 8 }} /><Text style={styles.infoBoxText}>Hệ thống sao lưu tự động và phân tích rủi ro đang hoạt động ở chế độ thời gian thực.</Text>
            </View>
          </ScrollView>
        )}{!loading && activeTab === 'complaints' && (
          <View style={styles.comingSoonContainer}>
            <View style={styles.comingSoonCard}>
              <Ionicons name="construct" size={48} color="#0544B3" style={{ marginBottom: 16 }} />
              <Text style={styles.comingSoonTitle}>Hệ thống xử lý khiếu nại</Text>
              <Text style={styles.comingSoonSubtitle}>Tính năng đang được phát triển</Text>
              <Text style={styles.comingSoonDesc}>
                Phần xử lý tranh chấp giao dịch, báo lỗi chuyển tiền và hoàn tiền tự động đang được thiết lập. Tính năng sẽ có mặt ở phiên bản tiếp theo.
              </Text>
            </View>
          </View>
        )}</View>

      {/* Edit Balance Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cập nhật số dư ví</Text>{selectedUser && (
              <>
                <Text style={styles.modalUser}>Người dùng: {selectedUser.full_name}</Text>
                <Text style={styles.modalCurrentBalance}>
                  Số dư hiện tại: {formatCurrency(selectedUser.balance)} VND
                </Text>

                <View style={styles.modalInputContainer}>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    placeholder="Nhập số dư mới (VND)"
                    value={newBalanceText}
                    onChangeText={setNewBalanceText}
                  />
                  <Text style={styles.modalInputSuffix}>VND</Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnCancel]}
                    onPress={() => setIsModalVisible(false)}
                  >
                    <Text style={styles.modalBtnCancelText}>Hủy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnSave]}
                    onPress={handleSaveBalance}
                    disabled={updatingBalance}
                  >
                    {updatingBalance ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalBtnSaveText}>Lưu lại</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}</View>
        </View>
      </Modal>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#0544B3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0544B3',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#FFEBEE',
  },
  logoutText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#F0F4FF',
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#0544B3',
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  scrollList: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    color: '#A0A0A0',
    fontSize: 14,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0544B3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarChar: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  userSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 12,
  },
  userCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 10,
    color: '#A0A0A0',
    fontWeight: 'bold',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 2,
  },
  editBalanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0544B3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  editBalanceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  statsCardIcon: {
    marginBottom: 12,
  },
  statsLabel: {
    fontSize: 9,
    color: '#A0A0A0',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statsValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  flowRow: {
    marginBottom: 16,
  },
  flowLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  flowName: {
    fontSize: 13,
    color: '#666',
  },
  flowVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 18,
    fontWeight: '500',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  comingSoonCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  comingSoonSubtitle: {
    fontSize: 14,
    color: '#0544B3',
    fontWeight: '500',
    marginBottom: 12,
  },
  comingSoonDesc: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalUser: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0544B3',
    marginBottom: 4,
  },
  modalCurrentBalance: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 20,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  modalInputSuffix: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#A0A0A0',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalBtnCancelText: {
    color: '#666',
    fontWeight: 'bold',
  },
  modalBtnSave: {
    backgroundColor: '#0544B3',
  },
  modalBtnSaveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
