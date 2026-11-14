import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Newsreader_400Regular, Newsreader_500Medium } from '@expo-google-fonts/newsreader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { SetupNeeded } from '@/components/setup-needed';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  );
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
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      {isSupabaseConfigured ? (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.ground },
          }}
        />
      ) : (
        <SetupNeeded />
      )}
    </QueryClientProvider>
  );
}
