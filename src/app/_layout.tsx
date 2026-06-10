import { DarkTheme, DefaultTheme, ThemeProvider, Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useColorScheme, View, Text, StyleSheet, Alert, BackHandler, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import * as Updates from 'expo-updates';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '@/context/ToastContext';
import { NotificationsProvider } from '@/context/NotificationsContext';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key || loading) return;

    const guestOnlyScreens = ['login', 'register', 'onboarding', 'index'];
    const publicScreens = ['reset-password', 'otp-verification', 'forgot-password'];

    const isGuestOnly = guestOnlyScreens.includes(segments[0] || '');
    const isPublic = publicScreens.includes(segments[0] || '');

    const isAdmin = session?.user?.email?.toLowerCase() === 'admin@gmail.com';
    const isAdminScreen = segments[0] === 'admin';

    // Nếu chưa đăng nhập và cố truy cập màn hình cần bảo vệ (không phải guest-only và không phải public)
    if (!session && !isGuestOnly && !isPublic) {
      router.replace('/login');
    }
    // Nếu đã đăng nhập
    else if (session) {
      if (isAdminScreen && !isAdmin) {
        router.replace('/(tabs)');
      } else if (isGuestOnly) {
        if (isAdmin) {
          router.replace('/admin');
        } else {
          router.replace('/(tabs)');
        }
      }
    }
  }, [session, loading, segments, router, navigationState?.key]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="otp-verification" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="transfer" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="security" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="admin" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkAndApplyUpdates() {
      if (__DEV__) {
        setIsChecking(false);
        return;
      }

      try {
        setIsChecking(true);
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          Alert.alert(
            "Cập Nhật Bắt Buộc",
            "Đã có phiên bản mới ổn định hơn. Vui lòng cập nhật để tiếp tục sử dụng ví điện tử.",
            [
              {
                text: "Cập nhật ngay",
                onPress: async () => {
                  setIsChecking(true);
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                }
              },
              {
                text: "Thoát app",
                onPress: () => {
                  BackHandler.exitApp();
                },
                style: "destructive"
              }
            ],
            { cancelable: false }
          );
        } else {
          setIsChecking(false);
        }
      } catch (error) {
        console.log("Lỗi check update:", error);
        setIsChecking(false);
      }
    }

    checkAndApplyUpdates();
  }, []);

  if (isChecking) {
    return (
      <View style={styles.updateContainer}>
        <ActivityIndicator size="large" color="#0544B3" />
        <Text style={styles.updateText}>Đang kiểm tra hệ thống...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <NotificationsProvider>
            <RootLayoutNav />
          </NotificationsProvider>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  updateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  updateText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
});
