import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    id: '1',
    title: 'Chuyển tiền nhanh chóng',
    description: 'Gửi và nhận tiền chỉ trong vài giây với vài thao tác chạm đơn giản.',
    icon: 'send' as const,
  },
  {
    id: '2',
    title: 'Thanh toán QR tiện lợi',
    description: 'Quét mã QR để thanh toán tại hàng ngàn điểm dịch vụ trên toàn quốc.',
    icon: 'qr-code' as const,
  },
  {
    id: '3',
    title: 'Bảo mật tuyệt đối',
    description: 'Tài khoản của bạn được bảo vệ bởi công nghệ mã hóa và xác thực sinh trắc học hiện đại.',
    icon: 'shield-checkmark' as const,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.replace('/login');
    }
  };

  const handleSkip = () => {
    router.replace('/login');
  };

  const renderItem = ({ item }: { item: typeof ONBOARDING_DATA[0] }) => (
    <View style={styles.slide}>
      <View style={styles.imageContainer}>
        <Ionicons name={item.icon} size={120} color="#0544B3" />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {currentIndex === 2 ? (
          <TouchableOpacity onPress={() => flatListRef.current?.scrollToIndex({ index: currentIndex - 1 })}>
             <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        ) : (
          <View /> // Placeholder for alignment
        )}
        {currentIndex < 2 && (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Bỏ qua</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {ONBOARDING_DATA.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <Button
          title={currentIndex === ONBOARDING_DATA.length - 1 ? 'Bắt đầu ngay' : 'Tiếp theo'}
          onPress={handleNext}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    height: 50,
  },
  skipText: {
    fontSize: 16,
    color: '#0544B3',
    fontWeight: '600',
  },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  imageContainer: {
    width: 240,
    height: 240,
    backgroundColor: '#F5F8FF',
    borderRadius: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#0544B3',
  },
  inactiveDot: {
    backgroundColor: '#E0E0E0',
  },
});
