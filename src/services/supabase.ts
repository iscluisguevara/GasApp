import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, Session } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('tu-proyecto.supabase.co')
);

/**
 * Cliente singleton de Supabase configurado con persistencia en AsyncStorage
 * para React Native / Expo.
 */
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

/**
 * Garantiza una sesión autenticada (inicia sesión anónima si no existe una activa)
 * para cumplir con las políticas RLS al enviar reseñas.
 */
export async function ensureAuthenticatedSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Error al verificar la sesión: ${error.message}`);
  }

  if (session) {
    return session;
  }

  const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
  if (anonError) {
    throw new Error(
      `No se pudo iniciar sesión anónima en Supabase. Activa Anonymous Sign-Ins en Auth > Providers: ${anonError.message}`
    );
  }

  return anonData.session;
}
