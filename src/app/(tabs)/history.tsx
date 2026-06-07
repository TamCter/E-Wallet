import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  SectionList,
  Modal,
  ActivityIndicator,
  Clipboard,
  Alert,
  ToastAndroid,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHistoryLogic, FormattedTransaction, FilterType } from '@/logic/useHistoryLogic';

interface FilterOption {
  label: string;
  value: FilterType;
  icon?: keyof typeof Ionicons.glyphMap;
}

const FILTER_OPTIONS: FilterOption[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Chuyển tiền', value: 'transfer', icon: 'paper-plane-outline' },
  { label: 'Nhận tiền', value: 'received', icon: 'download-outline' },
  { label: 'Nạp tiền', value: 'deposit', icon: 'add-circle-outline' },
  { label: 'Rút tiền', value: 'withdrawal', icon: 'remove-circle-outline' },
];

export default function HistoryScreen() {
  const {
    groupedTransactions,
    loading,
    isRefreshing,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    selectedTx,
    setSelectedTx,
    handleRefresh,
  } = useHistoryLogic();

  const handleCopyTxId = (id: string) => {
    Clipboard.setString(id);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Đã sao chép mã giao dịch!', ToastAndroid.SHORT);
    } else {
      Alert.alert('Đã sao chép', 'Mã giao dịch đã được lưu vào danh sách nhớ tạm.');
    }
  };

  const getFullTypeLabel = (type: string, isIncoming: boolean) => {
    switch (type) {
      case 'deposit':
        return 'Nạp tiền vào ví';
      case 'withdrawal':
        return 'Rút tiền khỏi ví';
      case 'transfer':
        return isIncoming ? 'Nhận tiền chuyển khoản' : 'Chuyển tiền đến tài khoản khác';
      default:
        return 'Giao dịch';
    }
  };

  const formatFullDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const renderTransactionItem = ({ item }: { item: FormattedTransaction }) => {
    const amountColor = item.isIncoming ? '#00A86B' : '#1a1a1a';
    
    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => setSelectedTx(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          <View style={[styles.iconContainer, { backgroundColor: item.iconBgColor }]}>
            <Ionicons name={item.iconName as any} size={20} color={item.iconColor} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
          </View>
        </View>
        
        <View style={styles.itemRight}>
          <Text style={[styles.itemAmount, { color: amountColor }]}>
            {item.displayAmount}
          </Text>
          <View style={styles.statusBadge}>
            <Ionicons
              name={item.statusIcon as any}
              size={12}
              color={item.statusColor}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.statusText, { color: item.statusColor }]}>
              {item.statusText}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name={Platform.OS === 'ios' ? 'wallet-outline' : 'wallet'} size={24} color="#0544B3" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Digital Wallet</Text>
        </View>
        <TouchableOpacity style={styles.bellButton}>
          <Ionicons name="notifications-outline" size={24} color="#0544B3" />
        </TouchableOpacity>
      </View>

      {/* Search Box */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#A0A0A0" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm giao dịch"
          placeholderTextColor="#A0A0A0"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#A0A0A0" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={{ height: 48, marginBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTER_OPTIONS.map((option) => {
            const isSelected = activeFilter === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                onPress={() => setActiveFilter(option.value)}
              >
                {option.icon && (
                  <Ionicons
                    name={option.icon as any}
                    size={15}
                    color={isSelected ? '#ffffff' : '#666666'}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0544B3" />
          <Text style={styles.loadingText}>Đang tải lịch sử giao dịch...</Text>
        </View>
      ) : (
        <SectionList
          sections={groupedTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransactionItem}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="receipt-outline" size={48} color="#A0A0A0" />
              </View>
              <Text style={styles.emptyText}>Không tìm thấy giao dịch nào</Text>
              <Text style={styles.emptySubtext}>Hãy thực hiện giao dịch đầu tiên hoặc điều chỉnh bộ lọc tìm kiếm.</Text>
            </View>
          }
        />
      )}

      {/* Transaction Details Modal */}
      <Modal
        visible={selectedTx !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết giao dịch</Text>
              <TouchableOpacity onPress={() => setSelectedTx(null)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                {/* Big Icon */}
                <View style={styles.modalBanner}>
                  <View style={[styles.modalIconContainer, { backgroundColor: selectedTx.iconBgColor }]}>
                    <Ionicons name={selectedTx.iconName as any} size={36} color={selectedTx.iconColor} />
                  </View>
                  <Text style={styles.modalTxTitle}>{selectedTx.title}</Text>
                  
                  {/* Amount */}
                  <Text style={[styles.modalAmount, { color: selectedTx.isIncoming ? '#00A86B' : '#1a1a1a' }]}>
                    {selectedTx.displayAmount}
                  </Text>

                  {/* Status */}
                  <View style={[styles.modalStatusBadge, { backgroundColor: selectedTx.statusColor + '15' }]}>
                    <Ionicons name={selectedTx.statusIcon as any} size={14} color={selectedTx.statusColor} style={{ marginRight: 4 }} />
                    <Text style={[styles.modalStatusText, { color: selectedTx.statusColor }]}>
                      {selectedTx.statusText}
                    </Text>
                  </View>
                </View>

                {/* Details Section */}
                <View style={styles.detailsSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Loại giao dịch</Text>
                    <Text style={styles.detailValue}>{getFullTypeLabel(selectedTx.type, selectedTx.isIncoming)}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Thời gian</Text>
                    <Text style={styles.detailValue}>{formatFullDateTime(selectedTx.createdAt)}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mã giao dịch</Text>
                    <View style={styles.txIdContainer}>
                      <Text style={styles.txIdText} numberOfLines={1} ellipsizeMode="middle">
                        {selectedTx.id}
                      </Text>
                      <TouchableOpacity onPress={() => handleCopyTxId(selectedTx.id)} style={styles.copyButton}>
                        <Ionicons name="copy-outline" size={16} color="#0544B3" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {selectedTx.type === 'transfer' && (
                    <>
                      <View style={styles.divider} />
                      
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Người gửi</Text>
                        <Text style={styles.detailValue}>
                          {selectedTx.rawSender?.full_name || 'Hệ thống'} 
                          {selectedTx.rawSender?.phone_number && ` (${selectedTx.rawSender.phone_country_code}${selectedTx.rawSender.phone_number})`}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Người nhận</Text>
                        <Text style={styles.detailValue}>
                          {selectedTx.rawReceiver?.full_name || 'Hệ thống'}
                          {selectedTx.rawReceiver?.phone_number && ` (${selectedTx.rawReceiver.phone_country_code}${selectedTx.rawReceiver.phone_number})`}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.modalActionBtn}
                  onPress={() => setSelectedTx(null)}
                >
                  <Text style={styles.modalActionBtnText}>Đóng</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0544B3',
  },
  bellButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F0F4FF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    paddingVertical: 8,
  },
  filtersContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    height: 36,
  },
  filterChipSelected: {
    backgroundColor: '#0544B3',
    borderColor: '#0544B3',
  },
  filterText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  filterTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A8A8F',
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#8A8A8F',
  },
  itemRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#8A8A8F',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalBanner: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTxTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalAmount: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailsSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  txIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    marginLeft: 16,
  },
  txIdText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 6,
    flex: 1,
    textAlign: 'right',
  },
  copyButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 10,
  },
  modalActionBtn: {
    backgroundColor: '#0544B3',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalActionBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
