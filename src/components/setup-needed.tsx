import { Screen, Stack, T } from '@/components/ui';

/** Shown instead of the app when the build has no backend configured. */
export function SetupNeeded() {
  return (
    <Screen>
      <Stack gap="md">
        <T variant="display">Almost there</T>
        <T variant="bodyMuted">
          This build is not connected to a backend yet. Copy .env.example to .env, add the Supabase
          project URL and anon key, then restart the app.
        </T>
      </Stack>
    </Screen>
  );
}
