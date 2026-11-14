/**
 * The app's small set of building blocks. Screens compose these and do not
 * style raw primitives themselves, which keeps every screen on the theme and
 * keeps the accessibility rules (labels, roles, touch sizes) in one place.
 */
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, controlHeight, radius, space, type } from '@/theme';

// --- Layout ----------------------------------------------------------------

type ScreenProps = {
  children: ReactNode;
  /** Pinned below the scrolling content, e.g. the primary action. */
  footer?: ReactNode;
  /**
   * Set on screens that sit inside the tab bar. The system insets the scroll
   * view for the bar, so the footer scrolls with the content (pushed to the
   * bottom) instead of being pinned underneath it.
   */
  inTabs?: boolean;
};

export function Screen({ children, footer, inTabs }: ScreenProps) {
  return (
    <SafeAreaView style={styles.screen} edges={inTabs ? ['top', 'left', 'right'] : undefined}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.screenContent}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior={inTabs ? 'automatic' : undefined}
          showsVerticalScrollIndicator={false}>
          {children}
          {inTabs && footer ? <View style={styles.inlineFooter}>{footer}</View> : null}
        </ScrollView>
        {!inTabs && footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Stack({
  gap = 'lg',
  style,
  children,
}: {
  gap?: keyof typeof space;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return <View style={[{ gap: space[gap] }, style]}>{children}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CenteredSpinner() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.accent} size="large" accessibilityLabel="Loading" />
    </View>
  );
}

// --- Text ------------------------------------------------------------------

type Variant = keyof typeof type;

export function T({
  variant = 'body',
  style,
  ...rest
}: TextProps & { variant?: Variant }) {
  const isHeading = variant === 'display' || variant === 'title';
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      // Let text grow with the system setting, but stop before layouts break.
      maxFontSizeMultiplier={isHeading ? 1.6 : 2}
      {...rest}
      style={[type[variant], style]}
    />
  );
}

// --- Buttons ---------------------------------------------------------------

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  busy?: boolean;
};

export function Button({ label, onPress, kind = 'primary', disabled, busy }: ButtonProps) {
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(busy) }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        kind === 'primary' && styles.buttonPrimary,
        kind === 'secondary' && styles.buttonSecondary,
        kind === 'primary' && pressed && styles.buttonPrimaryPressed,
        kind !== 'primary' && pressed && styles.buttonPressed,
        inactive && styles.buttonDisabled,
      ]}>
      {busy ? (
        <ActivityIndicator color={kind === 'primary' ? colors.onAccent : colors.accent} />
      ) : (
        <Text
          maxFontSizeMultiplier={1.5}
          style={[
            type.button,
            { color: kind === 'primary' ? colors.onAccent : kind === 'quiet' ? colors.accent : colors.ink },
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

// --- Inputs ----------------------------------------------------------------

type FieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  /** Large, spaced, centred text for the join code. */
  codeStyle?: boolean;
};

export function Field({ label, hint, error, optional, codeStyle, multiline, ...input }: FieldProps) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={type.label} maxFontSizeMultiplier={1.8}>
        {label}
        {optional ? <Text style={{ color: colors.muted, fontFamily: type.body.fontFamily }}> (optional)</Text> : null}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        maxFontSizeMultiplier={1.6}
        {...input}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          codeStyle && styles.inputCode,
          error ? { borderColor: colors.danger } : null,
        ]}
      />
      {error ? (
        <Text style={[type.small, { color: colors.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={type.small}>{hint}</Text>
      ) : null}
    </View>
  );
}

type ChoiceProps = {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** Compact, centred layout for short options such as a number of days. */
  compact?: boolean;
};

/** One option in a pick-one group. Wrap the group in <ChoiceGroup>. */
export function Choice({ title, description, selected, onPress, compact }: ChoiceProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        compact && styles.choiceCompact,
        selected && styles.choiceSelected,
        compact && selected && { backgroundColor: colors.accent },
        pressed && !selected && styles.buttonPressed,
      ]}>
      <View style={[styles.flex, compact && { alignItems: 'center' }]}>
        <Text
          maxFontSizeMultiplier={1.6}
          style={[
            type.button,
            { color: compact && selected ? colors.onAccent : colors.ink },
          ]}>
          {title}
        </Text>
        {description ? <Text style={[type.small, { marginTop: space.xs }]}>{description}</Text> : null}
      </View>
      {compact ? null : (
        <View style={[styles.radio, selected && styles.radioSelected]} importantForAccessibility="no" />
      )}
    </Pressable>
  );
}

export function ChoiceGroup({
  label,
  row,
  children,
}: {
  label: string;
  row?: boolean;
  children: ReactNode;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={row ? { flexDirection: 'row', gap: space.sm } : { gap: 10 }}>
      {children}
    </View>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text style={[type.small, { color: colors.danger }]} accessibilityRole="alert">
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.ground },
  screenContent: {
    flexGrow: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.xxl,
    paddingBottom: space.xl,
    gap: space.xl,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.lg,
    gap: space.md,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  inlineFooter: { flexGrow: 1, justifyContent: 'flex-end', gap: space.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ground },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1.5,
    borderRadius: radius.card,
    padding: 20,
    gap: space.md,
  },
  button: {
    minHeight: controlHeight,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonPrimaryPressed: { backgroundColor: colors.accentPressed },
  buttonSecondary: { borderWidth: 1.5, borderColor: colors.lineStrong },
  buttonPressed: { backgroundColor: colors.accentTint },
  buttonDisabled: { opacity: 0.45 },
  input: {
    ...type.body,
    lineHeight: undefined,
    minHeight: controlHeight,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  inputCode: {
    minHeight: 68,
    borderWidth: 2,
    borderColor: colors.accent,
    fontFamily: type.button.fontFamily,
    fontSize: 30,
    letterSpacing: 8,
    textAlign: 'center',
  },
  choice: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  choiceCompact: { flex: 1, minHeight: controlHeight, paddingHorizontal: space.sm, borderColor: colors.lineStrong },
  choiceSelected: { borderWidth: 2, borderColor: colors.accent },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#7B8A82',
    backgroundColor: colors.surface,
  },
  radioSelected: { borderWidth: 7, borderColor: colors.accent },
});
