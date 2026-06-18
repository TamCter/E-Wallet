import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ----------------------------------------------------------------
// Storage Adapter compatible with Expo Go (mobile) and Web
// ----------------------------------------------------------------
const isBrowser = typeof window !== 'undefined';
const CHUNK_SIZE = 2000;

const secureStoreChunked = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const chunksCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
      if (chunksCountStr) {
        const chunksCount = parseInt(chunksCountStr, 10);
        const promises = [];
        for (let i = 0; i < chunksCount; i++) {
          promises.push(SecureStore.getItemAsync(`${key}_chunk_${i}`));
        }
        const chunks = await Promise.all(promises);
        if (chunks.some(chunk => chunk === null)) {
          return null;
        }
        return chunks.join('');
      }
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn('Error in secureStoreChunked.getItem:', e);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      // Get current chunks count of the old stored item to know what needs cleaning up
      const oldChunksCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
      const oldChunksCount = oldChunksCountStr ? parseInt(oldChunksCountStr, 10) : 0;

      if (value.length <= CHUNK_SIZE) {
        // Write the single value first. If it succeeds, the old values are safe to clear
        await SecureStore.setItemAsync(key, value);
        if (oldChunksCount > 0) {
          await SecureStore.deleteItemAsync(`${key}_chunks`);
          for (let i = 0; i < oldChunksCount; i++) {
            await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
          }
        }
      } else {
        // Write the new chunks first
        const chunksCount = Math.ceil(value.length / CHUNK_SIZE);
        for (let i = 0; i < chunksCount; i++) {
          const chunk = value.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk);
        }
        // Write the chunks count indicator to finalize/commit the write operation
        await SecureStore.setItemAsync(`${key}_chunks`, chunksCount.toString());

        // Clean up old obsolete key or leftover chunks
        if (oldChunksCount === 0) {
          await SecureStore.deleteItemAsync(key);
        } else if (oldChunksCount > chunksCount) {
          for (let i = chunksCount; i < oldChunksCount; i++) {
            await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
          }
        }
      }
    } catch (e) {
      console.warn('Error in secureStoreChunked.setItem:', e);
      throw e;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      const chunksCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
      if (chunksCountStr) {
        const chunksCount = parseInt(chunksCountStr, 10);
        await SecureStore.deleteItemAsync(`${key}_chunks`);
        for (let i = 0; i < chunksCount; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (e) {
      console.warn('Error in secureStoreChunked.removeItem:', e);
    }
  }
};

const storageAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (isBrowser) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    return secureStoreChunked.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (isBrowser) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    return secureStoreChunked.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (isBrowser) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    return secureStoreChunked.removeItem(key);
  },
};

// Validate required environment variables at startup
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: EXPO_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
