import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Share } from 'react-native';

import { Button, Card, CenteredSpinner, Screen, Stack, T } from '@/components/ui';
import { describeError } from '@/lib/api';
import { fastProgress, formatLongDate, localToday } from '@/lib/dates';
import { useFastDay, useMemberCount, useMyFast } from '@/lib/queries';
import { fonts } from '@/theme';

/**
 * The fast's home screen. This is the foundations version: it proves the
 * create-and-join loop end to end by showing today's content to members and
 * the join code to the leader. Check-in, the group view and the leader's
 * daily numbers are the next milestone.
 */
export default function FastHome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mine = useMyFast(id);

  const fast = mine.data?.fast;
  const today = localToday();
  const progress = fast ? fastProgress(fast.start_date, fast.length_days, today) : null;
  const dayNumber = progress?.phase === 'active' ? progress.dayNumber : null;

  const day = useFastDay(id, dayNumber);
  const memberCount = useMemberCount(id, Boolean(mine.data?.isLeader));

  if (mine.isPending) return <CenteredSpinner />;
  if (mine.isError) {
    return (
      <Screen footer={<Button label="Try again" onPress={() => mine.refetch()} />}>
        <T variant="display">We could not load your fast</T>
        <T variant="bodyMuted">{describeError(mine.error)}</T>
      </Screen>
    );
  }
  if (!mine.data || !fast || !progress) return <Redirect href="/" />;

  const { isLeader, member } = mine.data;

  const share = () =>
    Share.share({
      message: `Join ${fast.name} on Consecrate with the code ${fast.join_code}, or tap consecrate://join/${fast.join_code}`,
    });

  return (
    <Screen
      footer={
        isLeader && !member ? (
          <Button
            kind="secondary"
            label="Join this fast yourself"
            onPress={() => router.push(`/join/${fast.join_code}`)}
          />
        ) : undefined
      }>
      <Stack gap="xs">
        <T variant="small">
          {fast.name} · {fast.church_name}
        </T>
        {progress.phase === 'active' ? (
          <T variant="display">
            Day {progress.dayNumber} of {fast.length_days}
          </T>
        ) : progress.phase === 'upcoming' ? (
          <T variant="display">
            Starts in {progress.daysUntilStart} {progress.daysUntilStart === 1 ? 'day' : 'days'}
          </T>
        ) : (
          <T variant="display">The fast is complete</T>
        )}
        {progress.phase === 'active' ? <T variant="small">{formatLongDate(today)}</T> : null}
      </Stack>

      {isLeader ? (
        <Card>
          <T variant="small">Join code</T>
          <T
            style={{ fontFamily: fonts.sansBold, fontSize: 28, lineHeight: 36, letterSpacing: 5 }}
            accessibilityLabel={`Join code ${fast.join_code.split('').join(' ')}`}
            selectable>
            {fast.join_code}
          </T>
          <T variant="small">
            {memberCount.data === undefined
              ? ' '
              : memberCount.data === 1
                ? '1 member has joined'
                : `${memberCount.data} members have joined`}
          </T>
          <Button label="Share the code" onPress={share} />
        </Card>
      ) : null}

      {progress.phase === 'upcoming' ? (
        <T variant="bodyMuted">
          {fast.welcome_message ??
            `We begin together on ${formatLongDate(fast.start_date)}. You will see each day's scripture and prayer focus here.`}
        </T>
      ) : null}

      {progress.phase === 'finished' ? (
        <T variant="bodyMuted">Thank you for fasting and praying with {fast.church_name}.</T>
      ) : null}

      {progress.phase === 'active' && day.isPending ? <CenteredSpinner /> : null}

      {progress.phase === 'active' && day.data ? (
        <>
          <Card>
            <T variant="eyebrow">Scripture</T>
            <T variant="scripture">{day.data.scripture_ref || 'No scripture set for today.'}</T>
          </Card>
          <Stack gap="xs">
            <T variant="eyebrow">Prayer focus</T>
            <T variant="bodyLarge">{day.data.prayer_focus || 'No prayer focus set for today.'}</T>
          </Stack>
          {day.data.devotional ? (
            <Stack gap="xs">
              <T variant="eyebrow">Devotional</T>
              <T>{day.data.devotional}</T>
            </Stack>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
