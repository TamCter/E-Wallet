import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Image, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import { AuthInput } from '@/components/ui/AuthInput';
import { COUNTRY_CODES } from '@/constants/countryCodes';
import { useEditProfileLogic } from '@/logic/useEditProfileLogic';

export default function EditProfileScreen() {
  const router = useRouter();
  const {
    fullName,
    setFullName,
    phoneCountryCode,
    phoneNumber,
    email,
    setEmail,
    loading,
    isFetching,
    isFocus,
    setIsFocus,
    userId,
    handleSaveChanges,
  } = useEditProfileLogic();

  // Hiển thị phần đuôi ID người dùng hoặc mặc định là #882910 như bản vẽ mẫu
  const displayId = userId ? `#${userId.substring(userId.length - 6).toUpperCase()}` : '#882910';

  if (isFetching) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0544B3" />
        <Text style={styles.loadingText}>Đang tải thông tin hồ sơ...</Text>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Profile Picture */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={require('@/assets/images/default_avatar.png')}
                style={styles.avatarImage}
              />
              <TouchableOpacity style={styles.editBadge} activeOpacity={0.7}>
                <Ionicons name="pencil" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.userIdText}>ID người dùng: {displayId}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <AuthInput
                icon="person-outline"
                placeholder="Nguyễn Minh Đức"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số điện thoại</Text>
              <View style={styles.phoneInputRow}>
                <Dropdown
                  style={[styles.dropdown, isFocus && { borderColor: '#0544B3' }]}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  inputSearchStyle={styles.inputSearchStyle}
                  data={COUNTRY_CODES}
                  search
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  placeholder={!isFocus ? 'Chọn' : '...'}
                  searchPlaceholder="Tìm kiếm..."
                  value={phoneCountryCode}
                  onFocus={() => setIsFocus(true)}
                  onBlur={() => setIsFocus(false)}
                  onChange={() => { }}
                  renderLeftIcon={() => (
                    <Ionicons name="call-outline" size={16} color="#A0A0A0" style={{ marginRight: 4 }} />
                  )}
                  disable={true}
                />

                <View style={[styles.phoneNumberInputContainer, { backgroundColor: '#F5F5F5' }]}>
                  <TextInput
                    style={[styles.phoneNumberInput, { color: '#666' }]}
                    placeholder="901 234 567"
                    placeholderTextColor="#A0A0A0"
                    keyboardType="phone-pad"
                    value={phoneNumber ?? ''}
                    editable={false}
                  />
                  <Ionicons name="checkmark-circle" size={20} color="#A0A0A0" style={styles.verifiedIcon} />
                </View>
              </View>
              <Text style={styles.phoneHelperText}>Số điện thoại đã xác thực không thể thay đổi</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <AuthInput
                icon="mail-outline"
                placeholder="duc.nguyen@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* PCI DSS Info Card */}
            <View style={styles.disclaimerCard}>
              <Ionicons name="information-circle" size={22} color="#1B5E20" style={styles.disclaimerIcon} />
              <Text style={styles.disclaimerText}>
                Thông tin cá nhân được bảo mật theo tiêu chuẩn quốc tế PCI DSS. Việc thay đổi sẽ được cập nhật ngay lập tức.
              </Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              activeOpacity={0.8}
              onPress={handleSaveChanges}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <><Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.saveButtonText}>Lưu thay đổi</Text></>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
    marginBottom: 24,
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#0544B3',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0544B3',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FAFAFA',
  },
  userIdText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dropdown: {
    height: 50,
    width: 110,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
  placeholderStyle: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  selectedTextStyle: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 14,
    borderRadius: 4,
  },
  phoneNumberInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    backgroundColor: '#fff',
  },
  phoneNumberInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  verifiedIcon: {
    marginLeft: 8,
  },
  phoneHelperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  disclaimerCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 28,
  },
  disclaimerIcon: {
    marginRight: 10,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 18,
    fontWeight: '500',
  },
  saveButton: {
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
