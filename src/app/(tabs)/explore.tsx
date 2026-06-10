import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabTwoScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">Khám phá</ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            Ứng dụng mẫu này bao gồm mã ví dụ{'\n'}giúp bạn bắt đầu dễ dàng hơn.
          </ThemedText>

          <ExternalLink href="https://docs.expo.dev" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.linkButton}>
                <ThemedText type="link">Tài liệu Expo</ThemedText>
                <SymbolView
                  tintColor={theme.text}
                  name={{ ios: 'arrow.up.right.square', android: 'link', web: 'link' }}
                  size={12}
                />
              </ThemedView>
            </Pressable>
          </ExternalLink>
        </ThemedView>

        <ThemedView style={styles.sectionsWrapper}>
          <Collapsible title="Định tuyến dựa trên file (File-based routing)">
            <ThemedText type="small">
              Ứng dụng này có hai màn hình chính: <ThemedText type="code">src/app/index.tsx</ThemedText> và{' '}
              <ThemedText type="code">src/app/(tabs)/explore.tsx</ThemedText>
            </ThemedText>
            <ThemedText type="small">
              File layout tại <ThemedText type="code">src/app/(tabs)/_layout.tsx</ThemedText> thiết lập
              thanh điều hướng tab.
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/router/introduction">
              <ThemedText type="linkPrimary">Tìm hiểu thêm</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="Hỗ trợ Android, iOS và Web">
            <ThemedView type="backgroundElement" style={styles.collapsibleContent}>
              <ThemedText type="small">
                Bạn có thể khởi chạy dự án này trên Android, iOS và trình duyệt web. Để mở phiên bản web,
                hãy nhấn phím <ThemedText type="smallBold">w</ThemedText> trong cửa sổ terminal đang chạy
                dự án này.
              </ThemedText>
              <Image
                source={require('@/assets/images/tutorial-web.png')}
                style={styles.imageTutorial}
              />
            </ThemedView>
          </Collapsible>

          <Collapsible title="Hình ảnh">
            <ThemedText type="small">
              Đối với hình ảnh tĩnh, bạn có thể sử dụng các hậu tố <ThemedText type="code">@2x</ThemedText> và{' '}
              <ThemedText type="code">@3x</ThemedText> để cung cấp hình ảnh phù hợp cho các mật độ điểm ảnh khác nhau.
            </ThemedText>
            <Image source={require('@/assets/images/react-logo.png')} style={styles.imageReact} />
            <ExternalLink href="https://reactnative.dev/docs/images">
              <ThemedText type="linkPrimary">Tìm hiểu thêm</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="Giao diện sáng và tối">
            <ThemedText type="small">
              Mẫu ứng dụng này có sẵn hỗ trợ chế độ sáng và tối. Hook{' '}
              <ThemedText type="code">useColorScheme()</ThemedText> cho phép bạn kiểm tra chế độ
              màu hiện tại của hệ thống để điều chỉnh màu sắc giao diện tương ứng.
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
              <ThemedText type="linkPrimary">Tìm hiểu thêm</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="Hiệu ứng động (Animations)">
            <ThemedText type="small">
              Dự án này bao gồm một ví dụ về thành phần có hiệu ứng động. Thành phần{' '}
              <ThemedText type="code">src/components/ui/collapsible.tsx</ThemedText> sử dụng thư viện
              mạnh mẽ <ThemedText type="code">react-native-reanimated</ThemedText> để tạo hoạt ảnh
              mở/đóng phần gợi ý này.
            </ThemedText>
          </Collapsible>
        </ThemedView>
        {Platform.OS === 'web' && <WebBadge />}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  titleContainer: {
    gap: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  linkButton: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    justifyContent: 'center',
    gap: Spacing.one,
    alignItems: 'center',
  },
  sectionsWrapper: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  collapsibleContent: {
    alignItems: 'center',
  },
  imageTutorial: {
    width: '100%',
    aspectRatio: 296 / 171,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  imageReact: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
});
