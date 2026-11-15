import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import {
  Button,
  Card,
  Choice,
  ChoiceGroup,
  ErrorNote,
  Screen,
  Stack,
  T,
} from '@/components/ui';
import { TimeField } from '@/components/time-field';
import { describeError } from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import type { Fast, Member } from '@/lib/database.types';
import { FAST_TYPES, fastTypeInfo, HEALTH_REASONS, REMINDER_TIMES, type FastType } from '@/lib/fast-types';
import { useLeaveFast, useUpdateMember } from '@/lib/queries';
import { requestReminderPermission, syncReminders } from '@/lib/reminders';
import { colors } from '@/theme';

// The database stores a time of day as HH:MM:SS; the form works in HH:MM.
const toChoice = (time: string | null) => (time ? time.slice(0, 5) : null);

// Offered when someone who had no reminder turns one on.
const DEFAULT_REMINDER = REMINDER_TIMES[0].time;

/** The form behind the settings screen. */
export function SettingsForm({ fast, member }: { fast: Fast; member: Member }) {
  const update = useUpdateMember(member.id);
  const leave = useLeaveFast(fast.id, member.id);
  const [fastType, setFastType] = useState<FastType>(member.fast_type);
  const saved = toChoice(member.reminder_time);
  const [reminderOn, setReminderOn] = useState(saved !== null);
  // Null while the reminder is on means the typed time is not usable yet.
  const [time, setTime] = useState<string | null>(saved ?? DEFAULT_REMINDER);
  const reminderTime = reminderOn ? time : null;
  const timeMissing = reminderOn && time === null;

  const changed = fastType !== member.fast_type || reminderTime !== saved;
  const [saving, setSaving] = useState(false);
  const busy = saving || update.isPending || leave.isPending;

  // The health notice, shown again whenever someone moves onto a food fast.
  const movingToFood =
    fastType !== member.fast_type && fastTypeInfo(fastType).involvesFood;

  const save = async () => {
    if (busy || timeMissing) return;
    setSaving(true);
    // Turning reminders on is the moment to ask for permission.
    if (reminderTime && !member.reminder_time) {
      await requestReminderPermission().catch(() => false);
    }
    // Today reschedules the notifications when it sees the new time.
    update.mutate(
      { fastType, reminderTime },
      { onSuccess: () => router.back(), onSettled: () => setSaving(false) },
    );
  };

  const confirmLeave = async () => {
    const yes = await confirmDestructive({
      title: `Leave ${fast.name}?`,
      message: 'Your check-ins for this fast will be removed. You can join again with the code.',
      action: 'Leave',
    });
    if (!yes || busy) return;
    leave.mutate(undefined, {
      onSuccess: () => {
        syncReminders(fast.id, []).catch(() => {});
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
          <Button label="Save" disabled={!changed || timeMissing || leave.isPending} busy={saving || update.isPending} onPress={save} />
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
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}>
            <T>Remind me each day</T>
            <Switch
              accessibilityLabel="Remind me each day"
              value={reminderOn}
              disabled={busy}
              onValueChange={(on) => {
                setReminderOn(on);
                if (on && time === null) setTime(saved ?? DEFAULT_REMINDER);
              }}
              trackColor={{ true: colors.accent }}
            />
          </View>
          {reminderOn ? <TimeField label="Time" value={time ?? saved ?? DEFAULT_REMINDER} onChange={setTime} /> : null}
        </Card>
      </Stack>

      <Stack gap="xs">
        <Button
          kind="danger"
          label="Leave this fast"
          disabled={saving || update.isPending}
          busy={leave.isPending}
          onPress={confirmLeave}
        />
      </Stack>
    </Screen>
  );
}
