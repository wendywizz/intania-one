import type { ReactNode } from 'react';
import {
  CircleAlert,
  Inbox,
  RotateCw,
  WifiOff,
  type LucideIcon,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import {
  EmptyIllustration,
  type EmptyIllustrationName,
} from '@/components/empty-illustration';
import { ThemedText } from '@/components/themed-text';
import {
  isModuleDisabledText as isModuleDisabled,
  moduleDisabledText,
} from '@/constants/module-status';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

export type ErrorStateVariant = 'error' | 'empty' | 'offline';

export type ErrorStateAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  icon?: LucideIcon;
};

type VariantStyle = {
  icon: LucideIcon;
  iconColor: string;
  circleColor: string;
  /**
   * The picture drawn instead of the medallion. `error` keeps the medallion:
   * a red-tinted alert circle is a signal in its own right, and a grey drawing
   * would soften something that is meant to read as a fault.
   */
  art?: EmptyIllustrationName;
};

function getVariants(c: AppColors): Record<ErrorStateVariant, VariantStyle> {
  return {
    error: { icon: CircleAlert, iconColor: c.primary, circleColor: c.primarySoft },
    empty: { icon: Inbox, iconColor: c.textMuted, circleColor: c.surfaceAlt, art: 'positive' },
    offline: {
      icon: WifiOff,
      iconColor: c.warning,
      circleColor: c.warningSoft,
      art: 'offline',
    },
  };
}

type ErrorStateProps = {
  variant?: ErrorStateVariant;
  title?: string;
  message?: string;
  /** Convenience: renders a primary "retry" action when provided. */
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  /** Convenience: renders a secondary "back" action when provided. */
  onBack?: () => void;
  backLabel?: string;
  /** Full control over the rendered actions; overrides onRetry/onBack. */
  actions?: ErrorStateAction[];
  /**
   * The picture above the title. Comes from the variant; pass it to override,
   * or `null` to fall back to the icon medallion. A screen whose load failure
   * is really a lost connection can pass `art="offline"`.
   */
  art?: EmptyIllustrationName | null;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

function ActionButton({ action, compact }: { action: ErrorStateAction; compact?: boolean }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const isPrimary = (action.variant ?? 'primary') === 'primary';
  const IconComponent = action.icon;
  const tint = isPrimary ? c.textOnPrimary : c.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={action.loading}
      onPress={action.onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && styles.buttonPressed,
        action.loading && styles.buttonDisabled,
      ]}
    >
      {action.loading ? (
        <ActivityIndicator size="small" color={tint} />
      ) : IconComponent ? (
        <IconComponent size={18} color={tint} />
      ) : null}
      <ThemedText lightColor={tint} darkColor={tint} type="defaultSemiBold" style={styles.buttonText}>
        {action.label}
      </ThemedText>
    </Pressable>
  );
}

export function ErrorState({
  variant = 'error',
  title,
  message,
  onRetry,
  retryLabel,
  retrying,
  onBack,
  backLabel,
  actions,
  art,
  fill = true,
  style,
  children,
}: ErrorStateProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);

  /**
   * A module switched off in the admin panel is not a fault, and must not be
   * dressed as one: the red alert medallion and "something went wrong" tell
   * people to retry and then to report a bug, when in fact somebody turned the
   * module off on purpose and there is nothing to fix.
   *
   * Handled here rather than at each call site because every screen already
   * funnels its failure into `message`, so one place covers all of them —
   * including screens added later, which is what keeps this from drifting.
   */
  const disabled = isModuleDisabled(message);
  const effectiveVariant = disabled ? 'offline' : variant;
  const variantStyle = getVariants(c)[effectiveVariant];
  const IconComponent = variantStyle.icon;
  // `null` is a deliberate "no picture"; `undefined` leaves it to the variant.
  const illustration = art === null ? undefined : (art ?? variantStyle.art);

  const resolvedMessage = disabled ? moduleDisabledText(message) : message;
  const resolvedTitle = disabled
    ? TEXT.SHARED_MODULE_DISABLED_TITLE
    : (title ?? (variant === 'empty' ? TEXT.SHARED_EMPTY_DATA : TEXT.SHARED_ERROR_TITLE_THAI));

  let resolvedActions: ErrorStateAction[];
  if (actions) {
    resolvedActions = actions;
  } else {
    resolvedActions = [];
    if (onRetry) {
      resolvedActions.push({
        label: retryLabel ?? TEXT.SHARED_RETRY_THAI,
        onPress: onRetry,
        variant: 'primary',
        loading: retrying,
        icon: RotateCw,
      });
    }
    if (onBack) {
      resolvedActions.push({
        label: backLabel ?? TEXT.SHARED_BACK_THAI,
        onPress: onBack,
        variant: onRetry ? 'secondary' : 'primary',
      });
    }
  }

  return (
    <View style={[styles.container, fill && styles.fill, style]}>
      {illustration ? (
        <EmptyIllustration name={illustration} style={styles.art} />
      ) : (
        <View style={[styles.iconCircle, { backgroundColor: variantStyle.circleColor }]}>
          <IconComponent size={34} color={variantStyle.iconColor} />
        </View>
      )}

      {/* With a drawing above them the two lines are set in the drawing's own
          greys, so the state reads as one tone rather than as art with a
          full-strength headline under it. */}
      <ThemedText type="subtitle" style={[styles.title, illustration && styles.titleWithArt]}>
        {resolvedTitle}
      </ThemedText>

      {resolvedMessage ? (
        <ThemedText style={[styles.message, illustration && styles.messageWithArt]}>
          {resolvedMessage}
        </ThemedText>
      ) : null}

      {children}

      {resolvedActions.length ? (
        <View style={styles.actions}>
          {resolvedActions.map((action, index) => (
            <ActionButton
              key={`${action.label}-${index}`}
              action={action}
              compact={resolvedActions.length === 1}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  fill: {
    flex: 1,
  },
  // Sits where the medallion sat, less the space the drawing already carries
  // under its own ground shadow.
  art: {
    marginBottom: 8,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 23,
  },
  titleWithArt: {
    color: c.textMuted,
  },
  message: {
    marginTop: 8,
    maxWidth: 320,
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  messageWithArt: {
    color: c.textFaint,
  },
  actions: {
    marginTop: 24,
    width: '100%',
    maxWidth: 360,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    flexGrow: 1,
    flexBasis: 140,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  // A lone action shouldn't stretch full width — size it to its content.
  buttonCompact: {
    flexGrow: 0,
    flexBasis: 'auto',
    paddingHorizontal: 32,
  },
  buttonPrimary: {
    backgroundColor: c.pomegranate,
  },
  buttonSecondary: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 15,
  },
});
