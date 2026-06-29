import { useDesignSystem } from "@/constants/theme";
import React from "react";
import {
    GestureResponderEvent,
    Pressable,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { ThemedText } from "./themed-text";

interface ModernCardProps {
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
  children?: React.ReactNode;
}

/**
 * Base modern card with elevation and smooth shadows
 */
export function ModernCard({ onPress, style, children }: ModernCardProps) {
  const { colors, shadows, spacing, borderRadius } = useDesignSystem();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          ...shadows.md,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

interface MenuCardProps {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  badge?: string;
  gradient?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  accentColor?: string;
}

/**
 * Menu action card with icon, title, and optional gradient
 */
export function MenuCard({
  title,
  icon,
  description,
  badge,
  gradient,
  onPress,
  accentColor,
}: MenuCardProps) {
  const { colors, spacing, borderRadius, shadows } = useDesignSystem();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: accentColor || colors.primary,
          borderRadius: borderRadius.lg,
          ...shadows.lg,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.menuCard, { padding: spacing.lg }]}>
        {icon && <View style={styles.menuCardIcon}>{icon}</View>}

        <View style={{ flex: 1 }}>
          <ThemedText
            style={[
              styles.menuCardTitle,
              { color: "#FFFFFF", marginBottom: spacing.xs },
            ]}
          >
            {title}
          </ThemedText>

          {description && (
            <ThemedText
              style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}
            >
              {description}
            </ThemedText>
          )}
        </View>

        {badge && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: "rgba(255,255,255,0.3)",
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <ThemedText
              style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "600" }}
            >
              {badge}
            </ThemedText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

interface ProgressCardProps {
  title: string;
  value: number;
  max?: number;
  unit?: string;
  icon?: React.ReactNode;
  color?: string;
}

/**
 * Progress tracking card with visual bar
 */
export function ProgressCard({
  title,
  value,
  max = 100,
  unit = "%",
  icon,
  color,
}: ProgressCardProps) {
  const { colors, spacing, borderRadius, shadows } = useDesignSystem();
  const percentage = (value / max) * 100;

  return (
    <ModernCard
      style={{
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
      }}
    >
      <View style={styles.progressCardHeader}>
        {icon && <View style={{ marginRight: spacing.md }}>{icon}</View>}

        <View style={{ flex: 1 }}>
          <ThemedText
            style={{
              fontSize: 14,
              fontWeight: "500",
              marginBottom: spacing.xs,
            }}
          >
            {title}
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: color || colors.primary,
            }}
          >
            {value}
            <ThemedText style={{ fontSize: 14, color: colors.textSecondary }}>
              {" "}
              {unit}
            </ThemedText>
          </ThemedText>
        </View>
      </View>

      <View
        style={[
          styles.progressBar,
          {
            backgroundColor: colors.border,
            borderRadius: borderRadius.full,
            marginTop: spacing.md,
            height: 8,
          },
        ]}
      >
        <View
          style={[
            {
              width: `${percentage}%`,
              backgroundColor: color || colors.primary,
              borderRadius: borderRadius.full,
              height: 8,
            },
          ]}
        />
      </View>
    </ModernCard>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  trend?: "up" | "down";
  trendValue?: string;
}

/**
 * Stat card for displaying key metrics
 */
export function StatCard({
  label,
  value,
  icon,
  color,
  trend,
  trendValue,
}: StatCardProps) {
  const { colors, spacing, shadows, borderRadius } = useDesignSystem();

  return (
    <ModernCard
      style={{
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
      }}
    >
      <View style={styles.statCardContent}>
        {icon && (
          <View
            style={[
              {
                width: 40,
                height: 40,
                borderRadius: borderRadius.md,
                backgroundColor: color ? `${color}15` : `${colors.primary}15`,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: spacing.md,
              },
            ]}
          >
            {icon}
          </View>
        )}

        <View>
          <ThemedText
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              fontWeight: "500",
              marginBottom: spacing.xs,
            }}
          >
            {label}
          </ThemedText>

          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <ThemedText
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: color || colors.primary,
              }}
            >
              {value}
            </ThemedText>

            {trend && trendValue && (
              <ThemedText
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  marginLeft: spacing.md,
                  color: trend === "up" ? colors.tertiary : colors.danger,
                }}
              >
                {trend === "up" ? "↑" : "↓"} {trendValue}
              </ThemedText>
            )}
          </View>
        </View>
      </View>
    </ModernCard>
  );
}

interface ModernButtonProps {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "small" | "medium" | "large";
  icon?: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
}

/**
 * Modern, energetic button with multiple variants
 */
export function ModernButton({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  icon,
  style,
  disabled = false,
}: ModernButtonProps) {
  const { colors, spacing, borderRadius, shadows } = useDesignSystem();

  const sizeStyles = {
    small: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 12,
    },
    medium: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 14,
    },
    large: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      fontSize: 16,
    },
  };

  const variantStyles = {
    primary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.secondary,
      borderColor: colors.secondary,
    },
    outline: {
      backgroundColor: "transparent",
      borderColor: colors.primary,
    },
    ghost: {
      backgroundColor: "transparent",
      borderColor: "transparent",
    },
  };

  const textColor = {
    primary: "#FFFFFF",
    secondary: "#FFFFFF",
    outline: colors.primary,
    ghost: colors.primary,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          borderRadius: borderRadius.lg,
          borderWidth: variant === "outline" ? 2 : 0,
          ...sizeStyles[size],
          ...variantStyles[variant],
          ...(variant === "primary" || variant === "secondary"
            ? shadows.md
            : {}),
          opacity: pressed || disabled ? 0.7 : 1,
        },
        style,
      ]}
    >
      <View style={styles.buttonContent}>
        {icon && <View style={{ marginRight: spacing.sm }}>{icon}</View>}

        <ThemedText
          style={{
            fontSize: sizeStyles[size].fontSize,
            fontWeight: "600",
            color: textColor[variant],
            textAlign: "center",
          }}
        >
          {title}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuCardIcon: {
    marginRight: 8,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  menuCardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  badge: {
    alignSelf: "flex-start",
  },
  progressCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  progressBar: {
    overflow: "hidden",
  },
  statCardContent: {
    flex: 1,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
