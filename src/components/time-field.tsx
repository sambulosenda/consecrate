import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { dateToTime, formatTimeOfDay, timeToDate, type TimeOfDay } from '@/lib/time-of-day';
import { colors, radius, space, type } from '@/theme';

export type TimeFieldProps = {
  label: string;
  value: TimeOfDay;
  /** Null means the field no longer holds a usable time. */
  onChange: (time: TimeOfDay | null) => void;
};

/** The system time picker. The web build uses time-field.web.tsx instead. */
export function TimeField({ label, value, onChange }: TimeFieldProps) {
  // As with the date field: Android's picker is a dialog that opens when it
  // is mounted, while iOS shows a compact control that stays on the screen.
  const [open, setOpen] = useState(false);

  const picker = (
    <DateTimePicker
      accessibilityLabel={label}
      mode="time"
      display={Platform.OS === 'ios' ? 'compact' : 'default'}
      accentColor={colors.accent}
      value={timeToDate(value)}
      onValueChange={(_event, date) => {
        setOpen(false);
        onChange(dateToTime(date));
      }}
      onDismiss={() => setOpen(false)}
    />
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}>
      <Text style={type.body} maxFontSizeMultiplier={1.8}>
        {label}
      </Text>
      {Platform.OS === 'ios' ? (
        picker
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${formatTimeOfDay(value)}`}
          onPress={() => setOpen(true)}
          style={{
            minHeight: 48,
            justifyContent: 'center',
            paddingHorizontal: space.md,
            borderRadius: radius.control,
            backgroundColor: colors.accentTint,
          }}>
          <Text style={[type.body, { color: colors.accent }]}>{formatTimeOfDay(value)}</Text>
        </Pressable>
      )}
      {Platform.OS !== 'ios' && open ? picker : null}
    </View>
  );
}
