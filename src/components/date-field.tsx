import DateTimePicker from '@react-native-community/datetimepicker';
import { Text, View } from 'react-native';

import type { IsoDate } from '@/lib/dates';
import { colors, space, type } from '@/theme';

export type DateFieldProps = {
  label: string;
  value: IsoDate | null;
  onChange: (date: IsoDate) => void;
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
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}>
        <Text style={type.label} maxFontSizeMultiplier={1.8}>
          {label}
        </Text>
        <DateTimePicker
          accessibilityLabel={label}
          mode="date"
          display="compact"
          accentColor={colors.accent}
          value={toDate(value ?? minimum ?? toIso(new Date()))}
          minimumDate={minimum ? toDate(minimum) : undefined}
          onValueChange={(_event, date) => onChange(toIso(date))}
        />
      </View>
      {error ? <Text style={[type.small, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}
