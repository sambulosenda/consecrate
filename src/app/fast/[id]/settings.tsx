import { Redirect, useLocalSearchParams } from 'expo-router';

import { SettingsForm } from '@/components/settings-form';
import { CenteredSpinner } from '@/components/ui';
import { useFast } from '@/lib/use-fast';

/** A member's own settings for one fast: how they fast, their reminder, leaving. */
export default function Settings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { query, fast, member } = useFast(id);

  if (query.isPending) return <CenteredSpinner />;
  if (!fast) return <Redirect href="/" />;
  if (!member) return <Redirect href={`/fast/${id}`} />;
  return <SettingsForm fast={fast} member={member} />;
}
