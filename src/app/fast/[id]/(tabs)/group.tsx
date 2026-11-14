import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card, CenteredSpinner, ErrorNote, Screen, Stack, T } from '@/components/ui';
import { describeError } from '@/lib/api';
import { useGroup } from '@/lib/queries';
import { useFast } from '@/lib/use-fast';
import { colors, fonts, space } from '@/theme';

/**
 * Who is fasting alongside you. A count and first names only: no ranking, no
 * list of who has not checked in.
 */
export default function Group() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { query, fast, member, progress, dayNumber } = useFast(id);
  // Before the fast starts there are no check-ins; day 1 simply lists members.
  const group = useGroup(id, fast ? (dayNumber ?? 1) : null);

  if (query.isPending) return <CenteredSpinner />;
  if (!fast || !progress) return <Redirect href="/" />;

  const members = group.data ?? [];
  const checkedIn = members
    .filter((m) => m.checkedInAt !== null)
    .sort((a, b) => (a.checkedInAt as string).localeCompare(b.checkedInAt as string));
  const active = progress.phase === 'active';
  const share = members.length > 0 ? checkedIn.length / members.length : 0;

  return (
    <Screen inTabs>
      <Stack gap="xs">
        <T variant="small">
          {fast.name}
          {active ? ` · Day ${dayNumber}` : ''}
        </T>
        <T variant="display">Fasting together</T>
      </Stack>

      {group.isPending ? <CenteredSpinner /> : null}
      <ErrorNote message={group.isError ? describeError(group.error) : null} />

      {group.data ? (
        <>
          <Card>
            {active ? (
              <>
                <T
                  variant="bodyLarge"
                  accessibilityLabel={`${checkedIn.length} of ${members.length} have checked in today`}>
                  <T variant="display" style={{ color: colors.accent }}>
                    {checkedIn.length}
                  </T>{' '}
                  of {members.length} have checked in today
                </T>
                <View style={styles.track} importantForAccessibility="no">
                  <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
                </View>
              </>
            ) : (
              <T variant="bodyLarge">
                <T variant="display" style={{ color: colors.accent }}>
                  {members.length}
                </T>{' '}
                {members.length === 1 ? 'person has' : 'people have'} joined
              </T>
            )}
          </Card>

          <Stack gap="xs">
            <T variant="eyebrow">{active ? 'Checked in today' : 'In this fast'}</T>
            {(active ? checkedIn : members).map((person) => (
              <View key={person.id} style={styles.row}>
                <View style={styles.initial} importantForAccessibility="no">
                  <T style={{ fontFamily: fonts.sansBold, color: colors.accentPressed }}>
                    {person.firstName.slice(0, 1).toUpperCase()}
                  </T>
                </View>
                <T variant="bodyLarge" style={{ flex: 1 }}>
                  {person.firstName}
                </T>
                <T variant="small">
                  {person.id === member?.id
                    ? 'You'
                    : active && person.checkedInAt
                      ? formatTime(person.checkedInAt)
                      : ''}
                </T>
              </View>
            ))}
            {active && checkedIn.length === 0 ? (
              <T variant="bodyMuted">No one has checked in yet today.</T>
            ) : null}
          </Stack>
        </>
      ) : null}
    </Screen>
  );
}

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: 5, backgroundColor: colors.accentTint, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.accent },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: space.sm,
  },
  initial: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
