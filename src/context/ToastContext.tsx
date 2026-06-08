import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  useColorScheme,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'incoming' | 'outgoing' | 'info';

const DEBUG = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

interface ToastOptions {
  title: string;
  subtitle: string;
  type: ToastType;
  amount?: number;
}

interface ToastContextType {
  showToast: (title: string, subtitle: string, type: ToastType, amount?: number) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation values
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      setToast(null);
    });
  }, [translateY, opacity]);

  const showToast = useCallback(
    (title: string, subtitle: string, type: ToastType, amount?: number) => {
      if (DEBUG) console.warn('[ToastProvider] showToast called:', { title, subtitle, type, amount });
      
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }

      // If a toast is already visible, hide it first, then show the new one
      if (isVisible) {
        if (DEBUG) console.warn('[ToastProvider] Toast is already visible, hiding first');
        hideToast();
        pendingTimeoutRef.current = setTimeout(() => {
          if (DEBUG) console.warn('[ToastProvider] Showing new toast after hiding previous');
          setToast({ title, subtitle, type, amount });
          setIsVisible(true);
          pendingTimeoutRef.current = null;
        }, 350);
        return;
      }

      if (DEBUG) console.warn('[ToastProvider] Showing toast:', { title, subtitle });
      setToast({ title, subtitle, type, amount });
      setIsVisible(true);
    },
    [isVisible, hideToast]
  );

  useEffect(() => {
    if (DEBUG) console.warn('[ToastProvider] useEffect triggered. isVisible:', isVisible, 'toast:', !!toast);
    if (isVisible && toast) {
      // Calculate active top position based on notch/safe area
      const activeTop = insets.top > 0 ? insets.top + 8 : 16;
      if (DEBUG) console.warn('[ToastProvider] Animating toast to activeTop:', activeTop);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: activeTop,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start((result) => {
        if (DEBUG) console.warn('[ToastProvider] Toast animation finished. Result:', result);
      });

      // Auto dismiss after 5 seconds
      timerRef.current = setTimeout(() => {
        if (DEBUG) console.warn('[ToastProvider] Auto dismiss triggered');
        hideToast();
      }, 5000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
      }
    };
  }, [isVisible, toast, insets.top, translateY, opacity, hideToast]);

  const isDark = colorScheme === 'dark';

  // Get dynamic styles based on type
  const getTypeConfig = (type: ToastType) => {
    switch (type) {
      case 'incoming':
        return {
          stripeColor: '#00A86B',
          iconBg: isDark ? '#143A24' : '#E8F5E9',
          iconColor: '#00A86B',
          iconName: 'arrow-down-circle' as keyof typeof Ionicons.glyphMap,
          amountColor: '#00A86B',
          prefix: '+',
        };
      case 'outgoing':
        return {
          stripeColor: '#EF4444',
          iconBg: isDark ? '#3F1B1B' : '#FEE2E2',
          iconColor: '#EF4444',
          iconName: 'arrow-up-circle' as keyof typeof Ionicons.glyphMap,
          amountColor: isDark ? '#F9FAFB' : '#111827',
          prefix: '-',
        };
      default:
        return {
          stripeColor: '#3B82F6',
          iconBg: isDark ? '#1E293B' : '#DBEAFE',
          iconColor: '#3B82F6',
          iconName: 'information-circle' as keyof typeof Ionicons.glyphMap,
          amountColor: isDark ? '#F9FAFB' : '#111827',
          prefix: '',
        };
    }
  };

  const config = toast ? getTypeConfig(toast.type) : null;
  const formattedAmount =
    toast?.amount !== undefined
      ? `${config?.prefix}${new Intl.NumberFormat('vi-VN').format(toast.amount)}đ`
      : null;

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {isVisible && toast && config && (
        <Animated.View
          style={[
            styles.toastWrapper,
            {
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.toastContainer,
              isDark ? styles.toastDark : styles.toastLight,
              { borderLeftColor: config.stripeColor },
            ]}
            onPress={hideToast}
          >
            {/* Left Icon */}
            <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
              <Ionicons name={config.iconName} size={24} color={config.iconColor} />
            </View>

            {/* Middle Content */}
            <View style={styles.textContainer}>
              <Text style={[styles.title, isDark ? styles.textDark : styles.textLight]} numberOfLines={1}>
                {toast.title}
              </Text>
              <Text style={[styles.subtitle, isDark ? styles.subDark : styles.subLight]} numberOfLines={2}>
                {toast.subtitle}
              </Text>
            </View>

            {/* Right Content: Amount and Close Button */}
            <View style={styles.rightContainer}>
              {formattedAmount && (
                <Text style={[styles.amount, { color: config.amountColor }]}>
                  {formattedAmount}
                </Text>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={hideToast}>
                <Ionicons name="close-outline" size={20} color={isDark ? '#8A8A8F' : '#666'} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingHorizontal: 16,
    // Fix layout issue on Web where it might overflow or stretching
    width: Platform.OS === 'web' ? '100%' : width,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: Platform.OS === 'web' && width > 500 ? 500 : '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderLeftWidth: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      },
    }),
  },
  toastLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  toastDark: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  textLight: {
    color: '#111827',
  },
  textDark: {
    color: '#F9FAFB',
  },
  subLight: {
    color: '#4B5563',
  },
  subDark: {
    color: '#9CA3AF',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: 14,
    fontWeight: '800',
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
});
