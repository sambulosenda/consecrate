import { useState } from 'react';

import { Field } from '@/components/ui';
import { formatLongDate, parseDayMonthYear, type IsoDate } from '@/lib/dates';

import type { DateFieldProps } from './date-field';

function toDayMonthYear(iso: IsoDate): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Web has no system date picker in React Native, so the date is typed. */
export function DateField({ label, value, onChange, minimum, error }: DateFieldProps) {
  const [text, setText] = useState(() => (value ? toDayMonthYear(value) : ''));
  return (
    <Field
      label={label}
      value={text}
      onChangeText={(next) => {
        setText(next);
        // Anything that is not a usable date clears the value, so the form
        // never submits a date the person can no longer see in the field.
        const parsed = parseDayMonthYear(next);
        onChange(parsed && (!minimum || parsed >= minimum) ? parsed : null);
      }}
      placeholder="DD/MM/YYYY"
      autoCorrect={false}
      hint={value ? formatLongDate(value, { year: true }) : undefined}
      error={error}
    />
  );
}
