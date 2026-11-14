import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { localToday, type IsoDate } from './dates';

/**
 * Today's calendar date on this device, kept current. It changes at midnight
 * while the app is open, and is checked again whenever the app comes back to
 * the foreground, so a screen left open overnight shows the new day.
 */
export function useToday(): IsoDate {
  const [today, setToday] = useState<IsoDate>(() => localToday());

  useEffect(() => {
    const refresh = () => setToday(localToday());

    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    // A second past midnight, so the clock has certainly rolled over.
    const timer = setTimeout(refresh, nextMidnight.getTime() - now.getTime() + 1000);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
    // Re-run when the day changes, to arm the timer for the following midnight.
  }, [today]);

  return today;
}
