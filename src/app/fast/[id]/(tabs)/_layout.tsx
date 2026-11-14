import { NativeTabs } from 'expo-router/native-tabs';

import { colors, fonts } from '@/theme';

/**
 * The system tab bar for everything inside a fast. Native on purpose: it gets
 * the platform's look, large-text behaviour and VoiceOver support for free.
 * Leaders reach their own screen from a card on Today rather than a third
 * tab, so the bar is the same for everyone.
 */
export default function FastTabsLayout() {
  return (
    <NativeTabs
      tintColor={colors.accent}
      labelStyle={{ fontFamily: fonts.sansSemiBold }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="group">
        <NativeTabs.Trigger.Label>Group</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
