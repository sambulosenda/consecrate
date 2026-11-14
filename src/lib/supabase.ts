import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** False until .env has the project's URL and anon key (see README). */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient<Database> | null = null;

export function supabase(): SupabaseClient<Database> {
  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  client ??= createClient<Database>(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

let pendingSession: Promise<string> | null = null;

/**
 * Makes sure this device has a session and returns the user id. First launch
 * creates an anonymous user, which is what keeps joining under a minute;
 * Sign in with Apple is linked later only to restore data on a new phone.
 *
 * Callers that overlap share one attempt, so two anonymous users are never
 * created. Nothing is remembered after that: each later call reads the
 * current session, so a sign-out or account change is picked up.
 */
export function ensureSession(): Promise<string> {
  pendingSession ??= (async () => {
    const auth = supabase().auth;
    const existing = await auth.getSession();
    if (existing.error) throw existing.error;
    if (existing.data.session) return existing.data.session.user.id;

    const created = await auth.signInAnonymously();
    if (created.error) throw created.error;
    if (!created.data.user) throw new Error('Anonymous sign-in returned no user.');
    return created.data.user.id;
  })().finally(() => {
    pendingSession = null;
  });
  return pendingSession;
}
