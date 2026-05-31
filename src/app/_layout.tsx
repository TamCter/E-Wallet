import { DarkTheme, DefaultTheme, ThemeProvider, Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/context/AuthContext';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key || loading) return;

    const isAuthScreen = ['login', 'register', 'forgot-password', 'otp-verification', 'reset-password', 'onboarding', 'index'].includes(segments[0] || '');
    
    // Nếu chưa đăng nhập và cố truy cập màn hình cần bảo vệ (không phải auth screen)
    if (!session && !isAuthScreen) {
      router.replace('/login');
    } 
    // Nếu đã đăng nhập và đang cố truy cập màn hình auth (login, register...)
    else if (session && isAuthScreen) {
      router.replace('/(tabs)');
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
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
