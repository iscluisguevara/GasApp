import React, { createContext, useContext, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import { colors } from '@/theme/colors';

interface SessionContextValue {
  session: Session | null;
  isAuthReady: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  isAuthReady: false,
});

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}

/**
 * Root Layout de Expo Router con SafeAreaProvider y escucha global de sesión Supabase.
 */
export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthReady(true);
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted) {
          setSession(data.session ?? null);
          setIsAuthReady(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAuthReady(true);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SessionContext.Provider value={{ session, isAuthReady }}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.textPrimary,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="station/[id]"
            options={{
              title: 'Detalle de estación',
              headerBackTitle: 'Atrás',
            }}
          />
        </Stack>
      </SessionContext.Provider>
    </SafeAreaProvider>
  );
}
