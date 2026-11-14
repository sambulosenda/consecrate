import * as Haptics from 'expo-haptics';

/** A gentle confirmation tap. Never lets a missing haptic engine break a flow. */
export function confirmTap(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
