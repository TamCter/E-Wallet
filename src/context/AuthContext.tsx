import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  hasPin: boolean | null;
  refreshHasPin: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  hasPin: null,
  refreshHasPin: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  const checkPinStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('payment_pin')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching payment_pin, database column may not exist yet:', error.message);
        setHasPin(true); // Fallback to avoid blocking users
        return;
      }

      setHasPin(!!data?.payment_pin);
    } catch (err) {
      console.warn('Exception fetching payment_pin:', err);
      setHasPin(true);
    }
  };

  const refreshHasPin = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await checkPinStatus(currentUser.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.warn('getSession error:', error.message);
          // If the token is invalid, clear the session and force sign out to clean local storage
          supabase.auth.signOut().catch((err) => {
            console.warn('Failed to sign out on getSession error:', err);
          });
          setSession(null);
          setUser(null);
          setHasPin(null);
        } else {
          if (session?.user) {
            // Save email of restored session on cold start, then force sign out
            const email = session.user.email;
            if (email) {
              if (Platform.OS === 'web') {
                localStorage.setItem('lastEmail', email);
              } else {
                SecureStore.setItemAsync('lastEmail', email).catch(() => {});
              }
            }
            supabase.auth.signOut().catch((err) => {
              console.warn('Failed to sign out on session restoration:', err);
            });
            setSession(null);
            setUser(null);
            setHasPin(null);
          } else {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
              checkPinStatus(session.user.id);
            } else {
              setHasPin(true);
            }
          }
        }
      })
      .catch((err) => {
        console.warn('getSession exception caught:', err);
        // Clear storage on hard exception
        supabase.auth.signOut().catch((signOutErr) => {
          console.warn('Failed to sign out on getSession exception:', signOutErr);
        });
        setSession(null);
        setUser(null);
        setHasPin(null);
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'INITIAL_SESSION') {
        const email = session.user.email;
        if (email) {
          if (Platform.OS === 'web') {
            localStorage.setItem('lastEmail', email);
          } else {
            SecureStore.setItemAsync('lastEmail', email).catch(() => {});
          }
        }
        supabase.auth.signOut().catch((err) => {
          console.warn('Failed to sign out on initial session event:', err);
        });
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkPinStatus(session.user.id);
      } else {
        setHasPin(true);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, hasPin, refreshHasPin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
