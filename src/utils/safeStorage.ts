import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isBrowser = typeof window !== 'undefined';

export const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (isBrowser) {
          return window.localStorage.getItem(key);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.error('Error in safeStorage.getItem for key <redacted_key>:', err);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (isBrowser) {
          window.localStorage.setItem(key, value);
        } else {
          throw new Error('localStorage is not available (not in browser)');
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('Error in safeStorage.setItem for key <redacted_key>:', err);
      throw err;
    }
  }
};
