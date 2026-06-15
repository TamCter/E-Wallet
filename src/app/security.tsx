import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthInput } from '@/components/ui/AuthInput';
import { useSecurityLogic } from '@/logic/useSecurityLogic';
import { PinCodeModal } from '@/components/PinCodeModal';

export default function SecurityScreen() {
  const router = useRouter();
  const {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    hasMinLength,
    hasUpperCase,
    hasNumber,
    isFormValid,
    handleUpdatePassword,
    isBiometricsSupported,
    isBiometricsEnabled,
    handleToggleBiometrics,
    isPinModalVisible,
    setIsPinModalVisible,
    pinError,
    setPinError,
    pinModalLoading,
    handleVerifyPinForBiometrics,
  } = useSecurityLogic();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color="#0544B3" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Bảo mật & Quyền riêng tư</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Biometrics Section */}
          <Text style={styles.sectionTitle}>SINH TRẮC HỌC</Text>
          <View style={styles.biometricsCard}>
            <View style={styles.biometricsLeft}>
              <View style={[styles.biometricsIconBg, isBiometricsEnabled && styles.biometricsIconBgEnabled]}>
                <Ionicons name="finger-print" size={24} color={isBiometricsEnabled ? "#0544B3" : "#A0A0A0"} />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.biometricsTitle, isBiometricsEnabled && styles.biometricsTitleEnabled]}>
                  Xác thực bằng vân tay / Face ID
                </Text>
                <Text style={styles.biometricsSubtitle}>
                  {isBiometricsSupported 
                    ? (isBiometricsEnabled ? 'Đã kích hoạt cho giao dịch' : 'Chưa kích hoạt')
                    : 'Thiết bị không hỗ trợ sinh trắc học'}
                </Text>
              </View>
            </View>
            <Switch
              value={isBiometricsEnabled}
              onValueChange={handleToggleBiometrics}
              disabled={!isBiometricsSupported}
              trackColor={{ false: '#E0E0E0', true: '#A0BBEB' }}
              thumbColor={isBiometricsEnabled ? '#0544B3' : '#f4f3f4'}
            />
          </View>

          {/* Change Password Section */}
          <Text style={styles.sectionTitle}>ĐỔI MẬT KHẨU</Text>
          <View style={styles.passwordCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu hiện tại</Text>
              <AuthInput
                icon="lock-closed-outline"
                placeholder="Nhập mật khẩu hiện tại"
                isPassword
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu mới</Text>
              <AuthInput
                icon="lock-closed-outline"
                placeholder="Nhập mật khẩu mới"
                isPassword
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
              <AuthInput
                icon="lock-closed-outline"
                placeholder="Nhập lại mật khẩu mới"
                isPassword
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {/* Password Requirements */}
            <View style={styles.requirementsBox}>
              <Text style={styles.requirementsTitle}>YÊU CẦU MẬT KHẨU MỚI</Text>
              
              <View style={styles.requirementRow}>
                <Ionicons
                  name={hasMinLength ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={hasMinLength ? "#2E7D32" : "#A0A0A0"}
                />
                <Text style={[styles.requirementText, hasMinLength && styles.requirementTextMet]}>
                  Ít nhất 8 ký tự
                </Text>
              </View>

              <View style={styles.requirementRow}>
                <Ionicons
                  name={hasUpperCase ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={hasUpperCase ? "#2E7D32" : "#A0A0A0"}
                />
                <Text style={[styles.requirementText, hasUpperCase && styles.requirementTextMet]}>
                  Có chứa chữ viết hoa (A-Z)
                </Text>
              </View>

              <View style={styles.requirementRow}>
                <Ionicons
                  name={hasNumber ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={hasNumber ? "#2E7D32" : "#A0A0A0"}
                />
                <Text style={[styles.requirementText, hasNumber && styles.requirementTextMet]}>
                  Có chứa chữ số (0-9)
                </Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, (!isFormValid || loading) && styles.submitButtonDisabled]}
              activeOpacity={0.8}
              onPress={handleUpdatePassword}
              disabled={!isFormValid || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <><Ionicons name="key-outline" size={20} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.submitButtonText}>Cập nhật mật khẩu</Text></>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <PinCodeModal
        isVisible={isPinModalVisible}
        onClose={() => setIsPinModalVisible(false)}
        onSuccess={handleVerifyPinForBiometrics}
        loading={pinModalLoading}
        errorText={pinError}
        setErrorText={setPinError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0544B3',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#A0A0A0',
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.8,
  },
  biometricsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  biometricsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  biometricsIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  biometricsIconBgEnabled: {
    backgroundColor: '#E6EDFF',
  },
  biometricsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#A0A0A0',
  },
  biometricsTitleEnabled: {
    color: '#333333',
  },
  biometricsSubtitle: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 2,
  },
  disabledSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  disabledSwitchCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  passwordCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  requirementsBox: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 14,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: '#A0A0A0',
    marginLeft: 8,
  },
  requirementTextMet: {
    color: '#2E7D32',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#0544B3',
    flexDirection: 'row',
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0544B3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 4px 6px rgba(5, 68, 179, 0.15)',
      },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: '#A0BBEB',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
