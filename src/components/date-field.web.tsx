import { useState } from 'react';

import { Field } from '@/components/ui';
import { formatLongDate, parseDayMonthYear } from '@/lib/dates';

import type { DateFieldProps } from './date-field';

/** Web has no system date picker in React Native, so the date is typed. */
export function DateField({ label, value, onChange, minimum, error }: DateFieldProps) {
  const [text, setText] = useState('');
  return (
    <Field
      label={label}
      value={text}
      onChangeText={(next) => {
        setText(next);
        const parsed = parseDayMonthYear(next);
        if (parsed && (!minimum || parsed >= minimum)) onChange(parsed);
      }}
      placeholder="DD/MM/YYYY"
      autoCorrect={false}
      hint={value ? formatLongDate(value, { year: true }) : undefined}
      error={error}
    />
  );
}
