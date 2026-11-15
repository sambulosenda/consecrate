import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import {
  Button,
  Card,
  CenteredSpinner,
  Choice,
  ChoiceGroup,
  ErrorNote,
  Field,
  Screen,
  Stack,
  T,
} from '@/components/ui';
import { describeError } from '@/lib/api';
import {
  FAST_TYPES,
  fastTypeInfo,
  HEALTH_REASONS,
  REMINDER_TIMES,
  type FastType,
} from '@/lib/fast-types';
import { normalizeJoinCode } from '@/lib/join-code';
import { useFastPreview, useJoinFast } from '@/lib/queries';
import { requestReminderPermission } from '@/lib/reminders';

/**
 * Joining, in at most three short steps: who you are and how you will fast,
 * the health notice (food fasts only), then the reminder time. Also the
 * target of share links: consecrate://join/K7M2QX.
 */

type Step = 'details' | 'health' | 'reminder';

export default function Join() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = normalizeJoinCode(params.code ?? '');
  const preview = useFastPreview(code);
  const join = useJoinFast();

  const [step, setStep] = useState<Step>('details');
  const [firstName, setFirstName] = useState('');
  const [fastType, setFastType] = useState<FastType | null>(null);
  const [reminderTime, setReminderTime] = useState<string>(REMINDER_TIMES[0].time);

  if (preview.isPending && preview.fetchStatus !== 'idle') return <CenteredSpinner />;

  if (!preview.data) {
    return (
      <Screen footer={<Button label="Enter a different code" onPress={() => router.replace('/')} />}>
        <Stack gap="md">
          <T variant="display">We could not find that fast</T>
          <T variant="bodyMuted">
            {preview.isError
              ? describeError(preview.error)
              : 'No fast has that code. Check it with your leader and try again.'}
          </T>
        </Stack>
      </Screen>
    );
  }

  const fast = preview.data;

  const submit = async (time: string | null) => {
    if (!fastType) return;
    // Ask for notification permission at the moment it makes sense: right
    // after choosing a reminder time. Declining still joins the fast.
    if (time) await requestReminderPermission().catch(() => false);
    join.mutate(
      { code, firstName: firstName.trim(), fastType, reminderTime: time },
      { onSuccess: (member) => router.replace(`/fast/${member.fast_id}`) },
    );
  };

  if (step === 'health' && fastType) {
    const chosen = fastTypeInfo(fastType);
    return (
      <Screen
        footer={
          <>
            <Button label={`Continue with ${chosen.name}`} onPress={() => setStep('reminder')} />
            <Button
              kind="secondary"
              label="Choose a non-food fast"
              onPress={() => {
                setFastType('non_food');
                setStep('reminder');
              }}
            />
          </>
        }>
        <Stack gap="md">
          <T variant="display">Before you fast from food</T>
          <T variant="bodyMuted">
            Please speak to a doctor first, or choose a non-food fast, if you:
          </T>
        </Stack>
        <Card>
          {HEALTH_REASONS.map((reason) => (
            <T key={reason}>• {reason}</T>
          ))}
        </Card>
        <T variant="small">
          A non-food fast is a full part of this fast. Consecrate never asks about weight, calories
          or hours without food.
        </T>
      </Screen>
    );
  }

  if (step === 'reminder') {
    return (
      <Screen
        footer={
          <>
            <ErrorNote message={join.isError ? describeError(join.error) : null} />
            <Button label="Join the fast" busy={join.isPending} onPress={() => submit(reminderTime)} />
            <Button
              kind="quiet"
              label="Join without reminders"
              disabled={join.isPending}
              onPress={() => submit(null)}
            />
          </>
        }>
        <T variant="small">Step 2 of 2 · {fast.name}</T>
        <Stack gap="md">
          <T variant="display">When should we remind you?</T>
          <T variant="bodyMuted">
            One notification a day with the day&apos;s scripture and prayer focus. Nothing else.
          </T>
        </Stack>
        <ChoiceGroup label="Reminder time">
          {REMINDER_TIMES.map((option) => (
            <Choice
              key={option.time}
              title={option.time}
              description={option.label}
              selected={reminderTime === option.time}
              onPress={() => setReminderTime(option.time)}
            />
          ))}
        </ChoiceGroup>
      </Screen>
    );
  }

  const canContinue = firstName.trim().length > 0 && fastType !== null;

  return (
    <Screen
      footer={
        <Button
          label="Continue"
          disabled={!canContinue}
          onPress={() => {
            if (!fastType) return;
            setStep(fastTypeInfo(fastType).involvesFood ? 'health' : 'reminder');
          }}
        />
      }>
      <T variant="small">
        Step 1 of 2 · {fast.name} · {fast.church_name}
      </T>
      {fast.welcome_message ? <T variant="bodyMuted">{fast.welcome_message}</T> : null}
      <Field
        label="First name"
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        maxLength={40}
        returnKeyType="done"
      />
      <Stack gap="md">
        <T variant="title">How will you fast?</T>
        <ChoiceGroup label="How will you fast?">
          {FAST_TYPES.map((option) => (
            <Choice
              key={option.id}
              title={option.name}
              description={option.rule}
              selected={fastType === option.id}
              onPress={() => setFastType(option.id)}
            />
          ))}
        </ChoiceGroup>
        <T variant="small">Every option counts the same. You can change it later.</T>
      </Stack>
    </Screen>
  );
}
