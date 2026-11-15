import { Alert, Platform } from 'react-native';

type Confirmation = {
  title: string;
  message: string;
  /** The label of the button that goes ahead. */
  action: string;
};

/**
 * Asks before something that cannot be undone, with the system alert. The web
 * build, which has no such alert, falls back to the browser's own.
 */
export function confirmDestructive({ title, message, action }: Confirmation): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: action, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
