import { router } from 'expo-router';
import { useState } from 'react';

import { DateField } from '@/components/date-field';
import { Button, Choice, ChoiceGroup, ErrorNote, Field, Screen, Stack, T } from '@/components/ui';
import { describeError } from '@/lib/api';
import { localToday, type IsoDate } from '@/lib/dates';
import { FAST_LENGTHS, type FastLength } from '@/lib/fast-types';
import { useCreateFast } from '@/lib/queries';

/** A leader sets up their church's fast. The default plan fills in the days. */
export default function CreateFast() {
  const create = useCreateFast();
  const [name, setName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [startDate, setStartDate] = useState<IsoDate | null>(null);
  const [lengthDays, setLengthDays] = useState<FastLength>(21);
  const [welcome, setWelcome] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const today = localToday();

  const errors = {
    name: name.trim() ? null : 'Give the fast a name.',
    churchName: churchName.trim() ? null : "Add your church's name.",
    start: !startDate
      ? 'Choose the day the fast starts.'
      : startDate < today
        ? 'Choose today or a later date.'
        : null,
  };
  const valid = !errors.name && !errors.churchName && !errors.start;

  const submit = () => {
    setShowErrors(true);
    if (!valid || !startDate) return;
    create.mutate(
      {
        name: name.trim(),
        churchName: churchName.trim(),
        startDate,
        lengthDays,
        welcomeMessage: welcome.trim() || null,
      },
      { onSuccess: (fast) => router.replace(`/fast/${fast.id}`) },
    );
  };

  return (
    <Screen
      footer={
        <>
          <ErrorNote message={create.isError ? describeError(create.error) : null} />
          <Button label="Create fast" busy={create.isPending} onPress={submit} />
        </>
      }>
      <T variant="display">Create your church&apos;s fast</T>
      <Field
        label="Name of the fast"
        value={name}
        onChangeText={setName}
        placeholder="21 Days of Prayer"
        maxLength={80}
        error={showErrors ? errors.name : null}
      />
      <Field
        label="Church"
        value={churchName}
        onChangeText={setChurchName}
        placeholder="Your church's name"
        autoCapitalize="words"
        maxLength={80}
        error={showErrors ? errors.churchName : null}
      />
      <DateField
        label="Start date"
        value={startDate}
        onChange={setStartDate}
        minimum={today}
        error={showErrors ? errors.start : null}
      />
      <Stack gap="sm">
        <T variant="label">Length in days</T>
        <ChoiceGroup label="Length in days" row>
          {FAST_LENGTHS.map((days) => (
            <Choice
              key={days}
              compact
              title={String(days)}
              selected={lengthDays === days}
              onPress={() => setLengthDays(days)}
            />
          ))}
        </ChoiceGroup>
      </Stack>
      <Field
        label="Welcome message"
        optional
        multiline
        value={welcome}
        onChangeText={setWelcome}
        placeholder="A few words to your congregation"
        maxLength={500}
      />
      <T variant="small">A daily plan is filled in for you. Every day can be edited.</T>
    </Screen>
  );
}
