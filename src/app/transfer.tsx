import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import { COUNTRY_CODES } from '@/constants/countryCodes';
import { useTransferLogic } from '@/logic/useTransferLogic';
import { PinCodeModal } from '@/components/PinCodeModal';

export default function TransferScreen() {
  const {
    router,
    step,
    setStep,
    phoneCountryCode,
    setPhoneCountryCode,
    phone,
    setPhone,
    recipientName,
    isLookingUp,
    amount,
    setAmount,
    note,
    setNote,
    txnId,
    realBalance,
    isDropdownFocus,
    setIsDropdownFocus,
    isTransferring,
    recentContacts,
    handlePhoneLookup,
    handleConfirm,
    handleTransfer,
    handleReset,
    isPinModalVisible,
    setIsPinModalVisible,
    pinError,
    setPinError,
    handleVerifyPinAndTransfer,
  } = useTransferLogic();

  const formatCurrency = (val: string | number) => {
    const stringVal = typeof val === 'number' ? String(val) : val;
    const num = stringVal.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => step === 'input' ? router.back() : setStep(step === 'amount' ? 'input' : step === 'review' ? 'amount' : 'input')} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Chuyển tiền</Text>
      <View style={{ width: 38 }} />
    </View>
  );

  const renderInputStep = () => (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      {renderPhoneTab()}
    </ScrollView>
  );

  const renderPhoneTab = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Thông tin người nhận</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Số điện thoại</Text>
        <View style={styles.inputRow}>
          <Dropdown
            style={[styles.dropdown, isDropdownFocus && { borderColor: '#0544B3' }]}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            inputSearchStyle={styles.inputSearchStyle}
            data={COUNTRY_CODES}
            search
            maxHeight={250}
            labelField="label"
            valueField="value"
            placeholder={!isDropdownFocus ? 'Mã' : '...'}
            searchPlaceholder="Tìm..."
            value={phoneCountryCode}
            onFocus={() => setIsDropdownFocus(true)}
            onBlur={() => setIsDropdownFocus(false)}
            onChange={item => {
              setPhoneCountryCode(item.value);
              setIsDropdownFocus(false);
            }}
            renderLeftIcon={() => (
              <Ionicons name="call-outline" size={16} color="#A0A0A0" style={{ marginRight: 2 }} />
            )}
          />
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={11}
            />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, isLookingUp && styles.btnDisabled]}
        onPress={() => handlePhoneLookup()}
        disabled={isLookingUp}
      >
        <Text style={styles.primaryBtnText}>
          {isLookingUp ? 'Đang tìm trên hệ thống...' : 'Tiếp tục →'}
        </Text>
      </TouchableOpacity>

      {recentContacts.length > 0 && (
        <>
          <Text style={[styles.cardTitle, { marginTop: 24 }]}>Gần đây</Text>
          {recentContacts.map((c, i) => (
            <TouchableOpacity
              key={i}
              style={styles.contactRow}
              onPress={() => handlePhoneLookup(c.phone, c.phoneCountryCode)}
            >
              <View style={styles.contactAvatar}>
                <Text style={styles.contactInitial}>{c.name ? c.name[0] : 'U'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactPhone}>{c.phoneCountryCode} {c.phone}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );



  const renderAmountStep = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.recipientBadge}>
          <View style={styles.recipientAvatar}>
            <Text style={styles.recipientInitial}>{recipientName[0]}</Text>
          </View>
          <View>
            <Text style={styles.recipientName}>{recipientName}</Text>
            <Text style={styles.recipientPhone}>{phoneCountryCode} {phone}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nhập số tiền</Text>
          <View style={styles.amountInputWrapper}>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor="#ccc"
              keyboardType="numeric"
              value={amount}
              onChangeText={(t) => setAmount(formatCurrency(t))}
            />
            <Text style={styles.amountCurrency}>đ</Text>
          </View>

          <Text style={styles.balanceHint}>Số dư khả dụng: {formatCurrency(realBalance)}đ</Text>

          <View style={styles.quickAmounts}>
            {['50.000', '100.000', '200.000', '500.000'].map((q) => (
              <TouchableOpacity key={q} style={styles.quickAmountBtn} onPress={() => setAmount(q)}>
                <Text style={styles.quickAmountText}>{q}đ</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Lời nhắn (không bắt buộc)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#0544B3" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Nhập lời nhắn..."
                placeholderTextColor="#aaa"
                value={note}
                onChangeText={setNote}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirm}>
            <Text style={styles.primaryBtnText}>Xem lại →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderReviewStep = () => (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.card}>
        <Text style={styles.reviewTitle}>Xác nhận giao dịch</Text>
        <View style={styles.reviewAmountBox}>
          <Text style={styles.reviewAmountLabel}>SỐ TIỀN CHUYỂN</Text>
          <Text style={styles.reviewAmount}>{amount}đ</Text>
        </View>
        <View style={styles.divider} />
        {[
          { label: 'Người nhận', value: recipientName },
          { label: 'Số điện thoại', value: `${phoneCountryCode} ${phone}` },
          { label: 'Phí giao dịch', value: '0đ' },
          { label: 'Tổng thanh toán', value: `${amount}đ`, bold: true },
          ...(note ? [{ label: 'Lời nhắn', value: note }] : []),
        ].map((row, i) => (
          <View key={i} style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{row.label}</Text>
            <Text style={[styles.reviewValue, row.bold && styles.reviewValueBold]}>{row.value}</Text>
          </View>
        ))}

        <Text style={styles.reviewNote}>🔒 Giao dịch được bảo vệ bởi mã hóa biệt lập</Text>

        <TouchableOpacity
          style={[styles.primaryBtn, isTransferring && styles.btnDisabled]}
          onPress={handleTransfer}
          disabled={isTransferring}
        >
          {isTransferring ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Xác nhận chuyển tiền →</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('amount')} disabled={isTransferring}>
          <Text style={styles.cancelBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIconWrapper}>
        <Ionicons name="checkmark-circle" size={80} color="#fff" />
      </View>
      <Text style={styles.successTitle}>Chuyển tiền thành công!</Text>
      <Text style={styles.successSub}>Tiền đang trên đường đến người nhận</Text>

      <View style={styles.successCard}>
        <Text style={styles.successAmountLabel}>SỐ TIỀN ĐÃ CHUYỂN</Text>
        <Text style={styles.successAmount}>{amount}đ</Text>
        <View style={styles.divider} />
        {[
          { label: 'Đến', value: recipientName },
          { label: 'Số điện thoại', value: `${phoneCountryCode} ${phone}` },
          { label: 'Phí', value: '0đ' },
          { label: 'Mã tham chiếu', value: txnId, isTxn: true },
        ].map((row, i) => (
          <View key={i} style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{row.label}</Text>
            <Text 
              style={styles.reviewValue}
              numberOfLines={row.isTxn ? 1 : undefined}
              ellipsizeMode={row.isTxn ? 'middle' : undefined}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.primaryBtnText}>Về trang chủ</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelBtn} onPress={handleReset}>
        <Text style={styles.cancelBtnText}>Chuyển tiền mới</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIconWrapper}>
        <Ionicons name="close-circle" size={80} color="#FFD2D2" />
      </View>
      <Text style={styles.successTitle}>Giao dịch thất bại!</Text>
      <Text style={styles.successSub}>Đã có lỗi xảy ra trong quá trình xử lý giao dịch</Text>

      <View style={styles.successCard}>
        <Text style={{ textAlign: 'center', fontSize: 16, color: '#D32F2F', fontWeight: 'bold', marginVertical: 12 }}>
          Không nhận được mã giao dịch hợp lệ
        </Text>
        <Text style={{ textAlign: 'center', fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 12 }}>
          Hệ thống không phản hồi mã giao dịch để đối soát. Vui lòng kiểm tra lại số dư hoặc thử lại sau.
        </Text>
        <View style={styles.divider} />
        {[
          { label: 'Người nhận', value: recipientName },
          { label: 'Số điện thoại', value: `${phoneCountryCode} ${phone}` },
        ].map((row, i) => (
          <View key={i} style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{row.label}</Text>
            <Text style={styles.reviewValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24, backgroundColor: '#D32F2F', shadowColor: '#D32F2F' }]} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.primaryBtnText}>Về trang chủ</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelBtn} onPress={handleReset}>
        <Text style={styles.cancelBtnText}>Thử lại giao dịch</Text>
      </TouchableOpacity>
    </View>
  );

  if (step === 'success') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0544B3' }]}>
        {renderSuccessStep()}
      </SafeAreaView>
    );
  }

  if (step === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#D32F2F' }]}>
        {renderErrorStep()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {step === 'input' && renderInputStep()}
      {step === 'amount' && renderAmountStep()}
      {step === 'review' && renderReviewStep()}

      <PinCodeModal
        isVisible={isPinModalVisible}
        onClose={() => setIsPinModalVisible(false)}
        onSuccess={handleVerifyPinAndTransfer}
        loading={isTransferring}
        errorText={pinError}
        setErrorText={setPinError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  body: { padding: 16, paddingBottom: 40 },
  tabContainer: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 14, padding: 4, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 11, borderRadius: 11, gap: 6,
  },
  tabActive: { backgroundColor: '#EEF3FF' },
  tabLabel: { fontSize: 14, fontWeight: '500', color: '#999' },
  tabLabelActive: { color: '#0544B3', fontWeight: '700' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 8 },
  inputRow: { flexDirection: 'row', gap: 8 },
  dropdown: {
    height: 50,
    width: 105,
    borderWidth: 1.5,
    borderColor: '#E8EDF5',
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: '#FAFBFF',
  },
  placeholderStyle: { fontSize: 14, color: '#aaa' },
  selectedTextStyle: { fontSize: 14, color: '#1a1a1a', fontWeight: '600' },
  inputSearchStyle: { height: 40, fontSize: 14, borderRadius: 6 },
  inputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E8EDF5', borderRadius: 10,
    paddingHorizontal: 12, height: 50, backgroundColor: '#FAFBFF',
  },
  inputIcon: { marginRight: 4 },
  textInput: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  primaryBtn: {
    backgroundColor: '#0544B3', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#0544B3', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: '#0544B3', fontSize: 15, fontWeight: '600' },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  contactAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EEF3FF', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  contactInitial: { fontSize: 18, fontWeight: '700', color: '#0544B3' },
  contactName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  contactPhone: { fontSize: 12, color: '#888', marginTop: 2 },
  recipientBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  recipientAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#0544B3', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  recipientInitial: { fontSize: 20, fontWeight: '700', color: '#fff' },
  recipientName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  recipientPhone: { fontSize: 13, color: '#888', marginTop: 2 },
  amountInputWrapper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 2, borderBottomColor: '#0544B3', paddingBottom: 8, marginVertical: 16,
  },
  amountInput: { fontSize: 36, fontWeight: '700', color: '#0544B3', textAlign: 'center', minWidth: 60 },
  amountCurrency: { fontSize: 22, fontWeight: '700', color: '#0544B3', marginLeft: 6 },
  balanceHint: { textAlign: 'center', fontSize: 13, color: '#888', marginBottom: 16 },
  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  quickAmountBtn: {
    borderWidth: 1.5, borderColor: '#0544B3', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  quickAmountText: { color: '#0544B3', fontSize: 13, fontWeight: '600' },
  reviewTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 20 },
  reviewAmountBox: { backgroundColor: '#F0F4FF', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16 },
  reviewAmountLabel: { fontSize: 11, fontWeight: '600', color: '#0544B3', letterSpacing: 0.5 },
  reviewAmount: { fontSize: 28, fontWeight: '800', color: '#0544B3', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 16 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  reviewLabel: { fontSize: 14, color: '#888' },
  reviewValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', textAlign: 'right', flex: 1, marginLeft: 16 },
  reviewValueBold: { fontSize: 15, fontWeight: '800', color: '#0544B3' },
  reviewNote: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 12, marginBottom: 4 },
  successContainer: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 40 },
  successIconWrapper: { marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8 },
  successSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 32 },
  successCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  successAmountLabel: { fontSize: 11, fontWeight: '600', color: '#0544B3', letterSpacing: 0.5, textAlign: 'center' },
  successAmount: { fontSize: 30, fontWeight: '800', color: '#0544B3', textAlign: 'center', marginTop: 4 },
  qrPlaceholder: { alignItems: 'center', paddingVertical: 40 },
  qrFrame: {
    width: 160, height: 160, borderRadius: 20,
    backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#0544B3', marginBottom: 20,
  },
  qrTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  qrSub: { fontSize: 14, color: '#888', textAlign: 'center' },
});