import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import RNQRGenerator from 'rn-qr-generator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';

export default function ScanQrScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<boolean>(false);
  const [enableTorch, setEnableTorch] = useState<boolean>(false);

  // User details for "My QR"
  const [userPhone, setUserPhone] = useState<string>('');
  const [userCountryCode, setUserCountryCode] = useState<string>('+84');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [isMyQrVisible, setIsMyQrVisible] = useState<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // General scanned text modal
  const [scannedText, setScannedText] = useState<string>('');
  const [isTextModalVisible, setIsTextModalVisible] = useState<boolean>(false);

  // Scanning Line animation values
  const scanLineY = useSharedValue(0);

  useEffect(() => {
    isMountedRef.current = true;

    // Start scanning line animation
    scanLineY.value = withRepeat(
      withSequence(
        withTiming(230, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      false
    );
    
    // Fetch current user details
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (isMountedRef.current && user) {
          setUserPhone(user.user_metadata?.phone_number || '');
          setUserCountryCode(user.user_metadata?.phone_country_code || '+84');
          setUserName(user.user_metadata?.full_name || 'Thành viên E-Wallet');
        }
      } catch (err) {
        console.warn('Lỗi lấy thông tin người dùng:', err);
      }
    };
    fetchUser();

    return () => {
      isMountedRef.current = false;
    };
  }, [scanLineY]);

  // Generate QR code locally when user details are available
  useEffect(() => {
    if (!userPhone) {
      if (isMountedRef.current) {
        setQrError('Không tìm thấy thông tin số điện thoại của người dùng.');
      }
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQrError(null);
    RNQRGenerator.generate({
      value: `ewallet:transfer:${userPhone}:${userCountryCode}`,
      height: 300,
      width: 300,
      base64: true,
    })
      .then((response) => {
        if (isMountedRef.current) {
          setQrCodeDataUrl(`data:image/png;base64,${response.base64}`);
          setQrError(null);
        }
      })
      .catch((err) => {
        console.error('Lỗi sinh mã QR:', err);
        if (isMountedRef.current) {
          setQrError('Lỗi khi sinh mã QR. Vui lòng thử lại.');
        }
      });
  }, [userPhone, userCountryCode]);

  const handleRetryQrGeneration = async () => {
    setQrError(null);
    setQrCodeDataUrl('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (isMountedRef.current && user) {
        const phone = user.user_metadata?.phone_number || '';
        setUserPhone(phone);
        setUserCountryCode(user.user_metadata?.phone_country_code || '+84');
        setUserName(user.user_metadata?.full_name || 'Thành viên E-Wallet');
        
        if (phone) {
          return;
        }
      }
    } catch (err) {
      console.warn('Lỗi lấy thông tin người dùng:', err);
    }
    
    if (!userPhone) {
      setQrError('Không tìm thấy thông tin số điện thoại của người dùng.');
      return;
    }
    
    try {
      const response = await RNQRGenerator.generate({
        value: `ewallet:transfer:${userPhone}:${userCountryCode}`,
        height: 300,
        width: 300,
        base64: true,
      });
      if (isMountedRef.current) {
        setQrCodeDataUrl(`data:image/png;base64,${response.base64}`);
        setQrError(null);
      }
    } catch (err) {
      console.error('Lỗi sinh mã QR:', err);
      if (isMountedRef.current) {
        setQrError('Lỗi khi sinh mã QR. Vui lòng thử lại.');
      }
    }
  };

  const animatedLineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: scanLineY.value }],
    };
  });

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0544B3" />
        <Text style={styles.loadingText}>Đang khởi tạo Camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={64} color="#0544B3" style={{ marginBottom: 16 }} />
          <Text style={styles.permissionTitle}>Quyền truy cập Camera</Text>
          <Text style={styles.permissionDesc}>
            Chúng tôi cần quyền sử dụng camera để quét mã QR chuyển tiền của bạn.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Cấp quyền truy cập</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtnText} onPress={() => router.back()}>
            <Text style={styles.backLink}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  // Handle barcode scanned callback
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || isMyQrVisible || isTextModalVisible) return;
    setScanned(true);

    // 1. Check if the QR code is for internal E-Wallet transfer
    if (data.startsWith('ewallet:transfer:')) {
      const payload = data.replace('ewallet:transfer:', '');
      const parts = payload.split(':');
      const targetPhone = parts[0];
      const targetCountryCode = parts[1] || '+84';
      router.replace({
        pathname: '/transfer',
        params: { phone: targetPhone, countryCode: targetCountryCode, flow: 'qr' },
      });
      return;
    }

    // 2. Otherwise, treat as general QR code/text scan
    setScannedText(data);
    setIsTextModalVisible(true);
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(scannedText);
    Alert.alert('Thành công', 'Đã sao chép nội dung vào khay nhớ tạm.');
  };

  const handleCloseTextModal = () => {
    setIsTextModalVisible(false);
    setScannedText('');
    // delay a bit to prevent immediate re-scan
    setTimeout(() => {
      if (isMountedRef.current) {
        setScanned(false);
      }
    }, 1000);
  };

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView
        style={StyleSheet.absoluteFill}
        enableTorch={enableTorch}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Overlay Mask */}
      <View style={styles.overlayContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quét mã QR</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Center Target Frame */}
        <View style={styles.maskMiddle}>
          <View style={styles.maskSide} />
          <View style={styles.scannerTarget}>
            {/* Corner Indicators */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Scanning Line */}
            <Animated.View style={[styles.scanningLine, animatedLineStyle]} />
          </View>
          <View style={styles.maskSide} />
        </View>

        {/* Bottom Description & Actions */}
        <View style={styles.bottomSection}>
          <Text style={styles.helperText}>Đặt mã QR chuyển tiền vào giữa khung hình</Text>

          <View style={styles.actionRow}>
            {/* Flashlight toggle */}
            <TouchableOpacity
              style={[styles.circleBtn, enableTorch && styles.circleBtnActive]}
              onPress={() => setEnableTorch(!enableTorch)}
            >
              <Ionicons name={enableTorch ? 'flash' : 'flash-outline'} size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* My QR code */}
            <TouchableOpacity
              style={styles.myQrButton}
              onPress={() => setIsMyQrVisible(true)}
            >
              <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.myQrButtonText}>Mã QR của tôi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modal: My QR Code */}
      <Modal
        visible={isMyQrVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMyQrVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrCard}>
            <TouchableOpacity style={styles.qrCloseBtn} onPress={() => setIsMyQrVisible(false)}>
              <Ionicons name="close-circle" size={28} color="#999" />
            </TouchableOpacity>

            <View style={styles.appBadge}>
              <Text style={styles.appBadgeText}>E-Wallet QR</Text>
            </View>

            <Text style={styles.qrName}>{userName}</Text>
            <Text style={styles.qrPhone}>SĐT: {userPhone}</Text>
            {qrError ? (
              <View style={styles.qrImagePlaceholder}>
                <Ionicons name="alert-circle-outline" size={36} color="#D32F2F" style={{ marginBottom: 8 }} />
                <Text style={[styles.loadingTextSmall, { color: '#D32F2F', textAlign: 'center', paddingHorizontal: 16, marginBottom: 12 }]}>
                  {qrError}
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#0544B3',
                    paddingVertical: 6,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                  }}
                  onPress={handleRetryQrGeneration}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : qrCodeDataUrl ? (
              <View style={styles.qrImageContainer}>
                <Image
                  source={{ uri: qrCodeDataUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={styles.qrImagePlaceholder}>
                <ActivityIndicator size="small" color="#0544B3" />
                <Text style={styles.loadingTextSmall}>Đang tải mã...</Text>
              </View>
            )}
            <Text style={styles.qrFooterText}>Quét mã này bằng ví E-Wallet để chuyển tiền</Text>
          </View>
        </View>
      </Modal>

      {/* Modal: Scanned text content */}
      <Modal
        visible={isTextModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseTextModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.textCard}>
            <Text style={styles.textCardTitle}>Kết quả quét QR</Text>
            <Text style={styles.textCardContent}>{scannedText}</Text>

            <View style={styles.textCardActions}>
              <TouchableOpacity style={[styles.textBtn, styles.textBtnCancel]} onPress={handleCloseTextModal}>
                <Text style={styles.textBtnCancelText}>Quét lại</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.textBtn, styles.textBtnCopy]} onPress={copyToClipboard}>
                <Text style={styles.textBtnCopyText}>Sao chép</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 15,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  permissionDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: '#0544B3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  backBtnText: {
    padding: 4,
  },
  backLink: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  maskMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 250,
  },
  maskSide: {
    flex: 1,
    height: '100%',
  },
  scannerTarget: {
    width: 250,
    height: 250,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#0544B3',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanningLine: {
    height: 3,
    backgroundColor: '#00E676',
    width: '100%',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  bottomSection: {
    alignItems: 'center',
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  helperText: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    gap: 16,
  },
  circleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  circleBtnActive: {
    backgroundColor: '#0544B3',
    borderColor: '#0544B3',
  },
  myQrButton: {
    flexDirection: 'row',
    backgroundColor: '#0544B3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myQrButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  qrCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  qrCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  appBadge: {
    backgroundColor: '#E8EDF5',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  appBadgeText: {
    color: '#0544B3',
    fontSize: 11,
    fontWeight: 'bold',
  },
  qrName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  qrPhone: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    marginBottom: 20,
  },
  qrImageContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrImagePlaceholder: {
    width: 224,
    height: 224,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingTextSmall: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
  },
  qrFooterText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  textCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  textCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  textCardContent: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  textCardActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  textBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBtnCancel: {
    backgroundColor: '#F5F5F5',
  },
  textBtnCancelText: {
    color: '#666',
    fontWeight: 'bold',
  },
  textBtnCopy: {
    backgroundColor: '#0544B3',
  },
  textBtnCopyText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
