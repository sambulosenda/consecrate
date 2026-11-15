import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Newsreader_400Regular, Newsreader_500Medium } from '@expo-google-fonts/newsreader';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { SetupNeeded } from '@/components/setup-needed';
import { CACHE_MAX_AGE, persister, queryClient } from '@/lib/query-client';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Newsreader_400Regular,
    Newsreader_500Medium,
  });

  // If a font fails to load we still show the app, in the system font.
  const ready = fontsLoaded || fontError !== null;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: CACHE_MAX_AGE }}
      // Send anything saved while offline, then refresh what is on screen.
      onSuccess={() =>
        queryClient.resumePausedMutations().then(() => queryClient.invalidateQueries())
      }>
      <StatusBar style="dark" />
      {isSupabaseConfigured ? (
        // The native stack: system transitions, back swipe and back button.
        <Stack
          screenOptions={{
            title: '',
            headerBackButtonDisplayMode: 'minimal',
            headerShadowVisible: false,
            headerTintColor: colors.accent,
            headerStyle: { backgroundColor: colors.ground },
            contentStyle: { backgroundColor: colors.ground },
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="fast/[id]/(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="fast/[id]/settings" options={{ title: 'Settings' }} />
        </Stack>
      ) : (
        <SetupNeeded />
      )}
    </PersistQueryClientProvider>
  );
}
