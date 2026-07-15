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

import { ThemedText } from '@/components/themed-text';
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
};

function getVariants(c: AppColors): Record<ErrorStateVariant, VariantStyle> {
  return {
    error: { icon: CircleAlert, iconColor: c.primary, circleColor: c.primarySoft },
    empty: { icon: Inbox, iconColor: c.textMuted, circleColor: c.surfaceAlt },
    offline: { icon: WifiOff, iconColor: c.warning, circleColor: c.warningSoft },
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
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

function ActionButton({ action }: { action: ErrorStateAction }) {
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
  fill = true,
  style,
  children,
}: ErrorStateProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const variantStyle = getVariants(c)[variant];
  const IconComponent = variantStyle.icon;

  const resolvedTitle =
    title ?? (variant === 'empty' ? TEXT.SHARED_EMPTY_DATA : TEXT.SHARED_ERROR_TITLE_THAI);

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
      <View style={[styles.iconCircle, { backgroundColor: variantStyle.circleColor }]}>
        <IconComponent size={34} color={variantStyle.iconColor} />
      </View>

      <ThemedText type="subtitle" style={styles.title}>
        {resolvedTitle}
      </ThemedText>

      {message ? <ThemedText style={styles.message}>{message}</ThemedText> : null}

      {children}

      {resolvedActions.length ? (
        <View style={styles.actions}>
          {resolvedActions.map((action, index) => (
            <ActionButton key={`${action.label}-${index}`} action={action} />
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
    fontSize: 18,
    lineHeight: 26,
  },
  message: {
    marginTop: 8,
    maxWidth: 320,
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
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
  buttonPrimary: {
    backgroundColor: c.primary,
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
