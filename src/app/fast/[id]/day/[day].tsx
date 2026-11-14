import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, CenteredSpinner, ErrorNote, Field, Screen, Stack, T } from '@/components/ui';
import { describeError } from '@/lib/api';
import type { FastDay } from '@/lib/database.types';
import { addDays, formatLongDate } from '@/lib/dates';
import { useFastDay, useUpdateFastDay } from '@/lib/queries';
import { useFast } from '@/lib/use-fast';

/** The leader edits one day's scripture, prayer focus and devotional. */
export default function EditDay() {
  const params = useLocalSearchParams<{ id: string; day: string }>();
  const id = params.id;
  const dayNumber = Number(params.day);
  const { query, fast, isLeader } = useFast(id);
  const validDay = Number.isInteger(dayNumber) && dayNumber >= 1;
  const day = useFastDay(id, validDay ? dayNumber : null);

  if (query.isPending || (validDay && day.isPending)) return <CenteredSpinner />;
  if (!fast) return <Redirect href="/" />;
  if (!isLeader || !validDay || dayNumber > fast.length_days) {
    return <Redirect href={`/fast/${id}`} />;
  }
  if (!day.data) {
    return (
      <Screen footer={<Button label="Back" onPress={() => router.back()} />}>
        <T variant="display">We could not load this day</T>
        <T variant="bodyMuted">{day.isError ? describeError(day.error) : 'Please try again.'}</T>
      </Screen>
    );
  }

  return (
    <EditDayForm
      // Remount when moving between days so the form starts from that day's content.
      key={dayNumber}
      fastId={id}
      day={day.data}
      lengthDays={fast.length_days}
      date={formatLongDate(addDays(fast.start_date, dayNumber - 1))}
    />
  );
}

function EditDayForm({
  fastId,
  day,
  lengthDays,
  date,
}: {
  fastId: string;
  day: FastDay;
  lengthDays: number;
  date: string;
}) {
  const update = useUpdateFastDay(fastId);
  const [scriptureRef, setScriptureRef] = useState(day.scripture_ref);
  const [prayerFocus, setPrayerFocus] = useState(day.prayer_focus);
  const [devotional, setDevotional] = useState(day.devotional);

  const changed =
    scriptureRef !== day.scripture_ref ||
    prayerFocus !== day.prayer_focus ||
    devotional !== day.devotional;

  const save = () =>
    update.mutate(
      {
        dayNumber: day.day_number,
        content: {
          scripture_ref: scriptureRef.trim(),
          prayer_focus: prayerFocus.trim(),
          devotional: devotional.trim(),
        },
      },
      { onSuccess: () => router.back() },
    );

  return (
    <Screen
      footer={
        <>
          <ErrorNote message={update.isError ? describeError(update.error) : null} />
          <Button label="Save day" disabled={!changed} busy={update.isPending} onPress={save} />
        </>
      }>
      <Stack gap="xs">
        <T variant="display">
          Day {day.day_number} of {lengthDays}
        </T>
        <T variant="small">{date}</T>
      </Stack>
      <Field
        label="Scripture reference"
        value={scriptureRef}
        onChangeText={setScriptureRef}
        placeholder="Matthew 6:16–18"
        maxLength={120}
      />
      <Field
        label="Prayer focus"
        multiline
        value={prayerFocus}
        onChangeText={setPrayerFocus}
        maxLength={500}
      />
      <Field
        label="Devotional"
        multiline
        value={devotional}
        onChangeText={setDevotional}
        maxLength={4000}
        hint="Members see changes straight away."
      />
    </Screen>
  );
}
