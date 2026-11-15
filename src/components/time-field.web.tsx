import { useState } from 'react';

import { Field } from '@/components/ui';
import { parseTimeOfDay } from '@/lib/time-of-day';

import type { TimeFieldProps } from './time-field';

/** Web has no system time picker in React Native, so the time is typed. */
export function TimeField({ label, value, onChange }: TimeFieldProps) {
  const [text, setText] = useState(value);
  const usable = parseTimeOfDay(text) !== null;
  return (
    <Field
      label={label}
      value={text}
      onChangeText={(next) => {
        setText(next);
        onChange(parseTimeOfDay(next));
      }}
      placeholder="HH:MM"
      autoCorrect={false}
      error={usable ? null : 'Enter a time such as 07:30.'}
    />
  );
}
