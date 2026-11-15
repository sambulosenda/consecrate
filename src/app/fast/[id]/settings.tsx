import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import {
  Button,
  Card,
  CenteredSpinner,
  Choice,
  ChoiceGroup,
  ErrorNote,
  Screen,
  Stack,
  T,
} from '@/components/ui';
import { describeError } from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import type { Fast, Member } from '@/lib/database.types';
import { FAST_TYPES, fastTypeInfo, HEALTH_REASONS, REMINDER_TIMES, type FastType } from '@/lib/fast-types';
import { useLeaveFast, useUpdateMember } from '@/lib/queries';
import { requestReminderPermission, syncReminders } from '@/lib/reminders';
import { useFast } from '@/lib/use-fast';

/** A member's own settings for one fast: how they fast, their reminder, leaving. */
export default function Settings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { query, fast, member } = useFast(id);

  if (query.isPending) return <CenteredSpinner />;
  if (!fast) return <Redirect href="/" />;
  if (!member) return <Redirect href={`/fast/${id}`} />;
  return <SettingsForm fast={fast} member={member} />;
}

// The database stores a time of day as HH:MM:SS; the choices are HH:MM.
const toChoice = (time: string | null) => (time ? time.slice(0, 5) : null);

function SettingsForm({ fast, member }: { fast: Fast; member: Member }) {
  const update = useUpdateMember(member.id);
  const leave = useLeaveFast(fast.id, member.id);
  const [fastType, setFastType] = useState<FastType>(member.fast_type);
  const [reminderTime, setReminderTime] = useState<string | null>(toChoice(member.reminder_time));

  const changed =
    fastType !== member.fast_type || reminderTime !== toChoice(member.reminder_time);
  const busy = update.isPending || leave.isPending;

  // The health notice, shown again whenever someone moves onto a food fast.
  const movingToFood =
    fastType !== member.fast_type && fastTypeInfo(fastType).involvesFood;

  const save = async () => {
    // Turning reminders on is the moment to ask for permission.
    if (reminderTime && !member.reminder_time) {
      await requestReminderPermission().catch(() => false);
    }
    // Today reschedules the notifications when it sees the new time.
    update.mutate({ fastType, reminderTime }, { onSuccess: () => router.back() });
  };

  const confirmLeave = async () => {
    const yes = await confirmDestructive({
      title: `Leave ${fast.name}?`,
      message: 'Your check-ins for this fast will be removed. You can join again with the code.',
      action: 'Leave',
    });
    if (!yes) return;
    leave.mutate(undefined, {
      onSuccess: () => {
        syncReminders([]).catch(() => {});
        router.dismissTo('/');
      },
    });
  };

  const error = update.isError ? update.error : leave.isError ? leave.error : null;

  return (
    <Screen
      footer={
        <>
          <ErrorNote message={error ? describeError(error) : null} />
          <Button label="Save" disabled={!changed || leave.isPending} busy={update.isPending} onPress={save} />
        </>
      }>
      <Stack gap="xs">
        <T variant="small">{fast.name}</T>
        <T variant="display">Your fast</T>
      </Stack>

      <Stack gap="sm">
        <T variant="label">How you are fasting</T>
        <ChoiceGroup label="How you are fasting">
          {FAST_TYPES.map((option) => (
            <Choice
              key={option.id}
              title={option.name}
              description={option.rule}
              selected={fastType === option.id}
              onPress={() => !busy && setFastType(option.id)}
            />
          ))}
        </ChoiceGroup>
      </Stack>

      {movingToFood ? (
        <Card>
          <T variant="label">Before you fast from food</T>
          <T variant="bodyMuted">Please speak to a doctor first, or choose a non-food fast, if you:</T>
          {HEALTH_REASONS.map((reason) => (
            <T key={reason}>• {reason}</T>
          ))}
        </Card>
      ) : null}

      <Stack gap="sm">
        <T variant="label">Daily reminder</T>
        <ChoiceGroup label="Daily reminder">
          {REMINDER_TIMES.map((option) => (
            <Choice
              key={option.time}
              title={option.time}
              description={option.label}
              selected={reminderTime === option.time}
              onPress={() => !busy && setReminderTime(option.time)}
            />
          ))}
          <Choice
            title="No reminder"
            selected={reminderTime === null}
            onPress={() => !busy && setReminderTime(null)}
          />
        </ChoiceGroup>
      </Stack>

      <Stack gap="xs">
        <Button
          kind="quiet"
          label="Leave this fast"
          disabled={update.isPending}
          busy={leave.isPending}
          onPress={confirmLeave}
        />
      </Stack>
    </Screen>
  );
}
