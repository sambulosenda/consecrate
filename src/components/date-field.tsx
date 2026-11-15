import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { formatLongDate, type IsoDate } from '@/lib/dates';
import { colors, radius, space, type } from '@/theme';

export type DateFieldProps = {
  label: string;
  value: IsoDate | null;
  /** Null means the field no longer holds a usable date. */
  onChange: (date: IsoDate | null) => void;
  /** Earliest date that can be picked. */
  minimum?: IsoDate;
  error?: string | null;
};

// The picker works in Date objects; the app works in calendar-date strings.
// Both conversions use the device's local calendar so the day never shifts.
function toDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

function toIso(date: Date): IsoDate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The system date picker. The web build uses date-field.web.tsx instead. */
export function DateField({ label, value, onChange, minimum, error }: DateFieldProps) {
  // Android's picker is a dialog that opens the moment it is mounted, so it
  // is only mounted while the person is choosing. iOS shows a compact control
  // that stays on the screen.
  const [open, setOpen] = useState(false);
  const shown = value ?? minimum ?? toIso(new Date());

  const picker = (
    <DateTimePicker
      accessibilityLabel={label}
      mode="date"
      display={Platform.OS === 'ios' ? 'compact' : 'default'}
      accentColor={colors.accent}
      value={toDate(shown)}
      minimumDate={minimum ? toDate(minimum) : undefined}
      onValueChange={(_event, date) => {
        setOpen(false);
        onChange(toIso(date));
      }}
      onDismiss={() => setOpen(false)}
    />
  );

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}>
        <Text style={type.label} maxFontSizeMultiplier={1.8}>
          {label}
        </Text>
        {Platform.OS === 'ios' ? (
          picker
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${formatLongDate(shown, { year: true })}`}
            onPress={() => setOpen(true)}
            style={{
              minHeight: 48,
              justifyContent: 'center',
              paddingHorizontal: space.md,
              borderRadius: radius.control,
              backgroundColor: colors.accentTint,
            }}>
            <Text style={[type.body, { color: colors.accent }]}>
              {formatLongDate(shown, { year: true })}
            </Text>
          </Pressable>
        )}
      </View>
      {Platform.OS !== 'ios' && open ? picker : null}
      {error ? <Text style={[type.small, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}
