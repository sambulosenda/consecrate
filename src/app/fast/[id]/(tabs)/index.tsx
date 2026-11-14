import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { Button, Card, CenteredSpinner, ErrorNote, Screen, Stack, T } from '@/components/ui';
import { describeError } from '@/lib/api';
import { formatLongDate } from '@/lib/dates';
import { confirmTap } from '@/lib/haptics';
import { memberProgress, progressMessage } from '@/lib/progress';
import { useCheckedDays, useFastDay, useSetCheckedIn } from '@/lib/queries';
import { useFast } from '@/lib/use-fast';

/** Today: the day's scripture, prayer focus and devotional, and one check-in button. */
export default function Today() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { query, fast, member, isLeader, today, progress, dayNumber } = useFast(id);
  const day = useFastDay(id, dayNumber);

  if (query.isPending) return <CenteredSpinner />;
  if (query.isError) {
    return (
      <Screen footer={<Button label="Try again" onPress={() => query.refetch()} />}>
        <T variant="display">We could not load your fast</T>
        <T variant="bodyMuted">{describeError(query.error)}</T>
      </Screen>
    );
  }
  if (!fast || !progress) return <Redirect href="/" />;

  const footer =
    member && dayNumber ? (
      <CheckIn fastId={id} memberId={member.id} dayNumber={dayNumber} />
    ) : !member ? (
      <Button
        kind="secondary"
        label="Join this fast yourself"
        onPress={() => router.push(`/join/${fast.join_code}`)}
      />
    ) : undefined;

  return (
    <Screen
      inTabs
      footer={footer}>
      <Stack gap="xs">
        <T variant="small">
          {fast.name}
          {progress.phase === 'active' ? ` · ${formatLongDate(today)}` : ` · ${fast.church_name}`}
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
      </Stack>

      {isLeader ? (
        <Card>
          <T variant="small">You lead this fast</T>
          <Button
            kind="secondary"
            label="Share code and edit plan"
            onPress={() => router.push(`/fast/${id}/lead`)}
          />
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
      {progress.phase === 'active' && day.isError ? (
        <ErrorNote message={describeError(day.error)} />
      ) : null}

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

function CheckIn({
  fastId,
  memberId,
  dayNumber,
}: {
  fastId: string;
  memberId: string;
  dayNumber: number;
}) {
  const checkedDays = useCheckedDays(memberId);
  const setCheckedIn = useSetCheckedIn(fastId, memberId);

  if (!checkedDays.data) {
    return checkedDays.isError ? <ErrorNote message={describeError(checkedDays.error)} /> : null;
  }

  const mine = memberProgress(checkedDays.data, dayNumber);
  return (
    <Stack gap="sm">
      <ErrorNote message={setCheckedIn.isError ? describeError(setCheckedIn.error) : null} />
      <Button
        kind={mine.checkedInToday ? 'secondary' : 'primary'}
        label={mine.checkedInToday ? '✓ Checked in today' : 'Check in for today'}
        onPress={() => {
          if (!mine.checkedInToday) confirmTap();
          setCheckedIn.mutate({ dayNumber, checkedIn: !mine.checkedInToday });
        }}
      />
      <T variant="small" style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">
        {mine.checkedInToday ? `${progressMessage(mine)} · tap to undo` : progressMessage(mine)}
      </T>
    </Stack>
  );
}
