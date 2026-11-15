import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { QrCode } from '@/components/qr-code';
import { Button, Card, CenteredSpinner, ErrorNote, Screen, Stack, T } from '@/components/ui';
import { describeError } from '@/lib/api';
import { addDays, formatLongDate } from '@/lib/dates';
import { joinLink } from '@/lib/join-link';
import { useCheckInCounts, useFastDays, useMemberCount } from '@/lib/queries';
import { useFast } from '@/lib/use-fast';
import { colors, fonts, space } from '@/theme';

/** The leader's screen: the join code to share and the daily plan to edit. */
export default function Lead() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { query, fast, isLeader, progress, dayNumber } = useFast(id);
  const memberCount = useMemberCount(id, isLeader);
  const days = useFastDays(id);
  const counts = useCheckInCounts(id, isLeader);

  if (query.isPending) return <CenteredSpinner />;
  if (!fast) return <Redirect href="/" />;
  if (!isLeader) return <Redirect href={`/fast/${id}`} />;

  // How many days have check-ins worth showing: up to today while the fast
  // runs, every day once it is over, none before it starts.
  const reportedDays = dayNumber ?? (progress?.phase === 'finished' ? fast.length_days : 0);

  const share = () =>
    Share.share({
      message: `Join ${fast.name} on Consecrate with the code ${fast.join_code}, or tap ${joinLink(fast.join_code)}`,
    });

  return (
    <Screen>
      <Stack gap="xs">
        <T variant="small">Leader · {fast.church_name}</T>
        <T variant="display">{fast.name}</T>
      </Stack>

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
        <QrCode
          value={joinLink(fast.join_code)}
          size={200}
          label={`QR code to join ${fast.name}`}
        />
        <T variant="small" style={{ textAlign: 'center' }}>
          Show this on a screen. Anyone with the app can point their phone&apos;s camera at it to
          join.
        </T>
      </Card>

      {reportedDays > 0 && counts.data ? (
        <Card>
          <T variant="eyebrow">Check-ins each day</T>
          {Array.from({ length: reportedDays }, (_, i) => i + 1).map((n) => {
            const checkIns = counts.data.find((c) => c.dayNumber === n)?.checkIns ?? 0;
            const joined = memberCount.data ?? 0;
            const share = joined > 0 ? Math.min(checkIns / joined, 1) : 0;
            return (
              <View
                key={n}
                style={styles.barRow}
                accessible
                accessibilityLabel={`Day ${n}: ${checkIns} of ${joined} checked in${n === dayNumber ? ' so far' : ''}`}>
                <T variant="small" style={{ width: 56, color: colors.ink }}>
                  Day {n}
                </T>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${Math.round(share * 100)}%` },
                      n === dayNumber && { backgroundColor: '#6E9C8C' },
                    ]}
                  />
                </View>
                <T variant="label" style={{ width: 32, textAlign: 'right' }}>
                  {checkIns}
                </T>
              </View>
            );
          })}
          {dayNumber ? <T variant="small">Day {dayNumber} is still in progress.</T> : null}
        </Card>
      ) : null}

      <Stack gap="xs">
        <T variant="eyebrow">Daily plan</T>
        <T variant="small">Tap a day to edit its scripture, prayer focus and devotional.</T>
        {days.isPending ? <CenteredSpinner /> : null}
        <ErrorNote message={days.isError ? describeError(days.error) : null} />
        {days.data?.map((day) => (
          <Pressable
            key={day.day_number}
            accessibilityRole="button"
            accessibilityLabel={`Edit day ${day.day_number}, ${day.scripture_ref || 'no scripture yet'}`}
            onPress={() => router.push(`/fast/${id}/day/${day.day_number}`)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.accentTint }]}>
            <View style={{ flex: 1 }}>
              <T variant="bodyLarge">
                Day {day.day_number}
                {day.day_number === dayNumber ? ' · today' : ''}
              </T>
              <T variant="small">
                {formatLongDate(addDays(fast.start_date, day.day_number - 1))} ·{' '}
                {day.scripture_ref || 'No scripture yet'}
              </T>
            </View>
            <T variant="bodyMuted" importantForAccessibility="no">
              ›
            </T>
          </Pressable>
        ))}
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 28 },
  track: { flex: 1, height: 16, borderRadius: 8, backgroundColor: colors.accentTint, overflow: 'hidden' },
  fill: { height: 16, borderRadius: 8, backgroundColor: colors.accent },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
});
