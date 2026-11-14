import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, CenteredSpinner, ErrorNote, Field, Screen, Stack, T } from '@/components/ui';
import { describeError } from '@/lib/api';
import { formatLongDate } from '@/lib/dates';
import { isValidJoinCode, normalizeJoinCode } from '@/lib/join-code';
import { useFastPreview, useMyFasts } from '@/lib/queries';
import { colors, type } from '@/theme';

/**
 * The front door. Someone already in a fast goes straight to it ("today
 * first"); everyone else lands on the join screen.
 */
export default function Welcome() {
  const myFasts = useMyFasts();
  const [code, setCode] = useState('');
  const preview = useFastPreview(code);

  if (myFasts.isPending && myFasts.fetchStatus === 'paused') {
    return (
      <Screen>
        <T variant="display">You are offline</T>
        <T variant="bodyMuted">Connect to the internet to join or create a fast.</T>
      </Screen>
    );
  }
  if (myFasts.isPending) return <CenteredSpinner />;

  const current = myFasts.data?.[0];
  if (current) return <Redirect href={`/fast/${current.fast.id}`} />;

  const complete = isValidJoinCode(code);
  const found = complete ? (preview.data ?? null) : null;
  const notFound = complete && preview.isSuccess && !preview.data;

  return (
    <Screen
      footer={
        <View style={{ alignItems: 'center' }}>
          <T variant="bodyMuted">
            Leading a fast?{' '}
            <Link href="/create" style={[type.button, { color: colors.accent }]}>
              Create one
            </Link>
          </T>
        </View>
      }>
      <T variant="label">Consecrate</T>
      <Stack gap="md">
        <T variant="display">Join your church&apos;s fast</T>
        <T variant="bodyMuted">Enter the six-character code your leader shared.</T>
      </Stack>

      <Field
        label="Join code"
        codeStyle
        value={code}
        onChangeText={(text) => setCode(normalizeJoinCode(text))}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={12}
        returnKeyType="go"
        onSubmitEditing={() => found && router.push(`/join/${code}`)}
        hint={
          found
            ? `${found.name} · ${found.church_name}, starting ${formatLongDate(found.start_date)}`
            : undefined
        }
        error={notFound ? 'No fast has that code. Check it with your leader.' : null}
      />
      <ErrorNote message={preview.isError ? describeError(preview.error) : null} />
      <ErrorNote message={myFasts.isError ? describeError(myFasts.error) : null} />

      <Button
        label="Continue"
        disabled={!found}
        busy={complete && preview.isFetching}
        onPress={() => router.push(`/join/${code}`)}
      />
    </Screen>
  );
}
