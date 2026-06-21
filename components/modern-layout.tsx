import { useDesignSystem } from "@/constants/designSystem";
import React from "react";
import { View, ViewStyle } from "react-native";
import { ThemedText } from "./themed-text";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

/**
 * Modern section header with title and optional subtitle
 */
export function SectionHeader({ title, subtitle, style }: SectionHeaderProps) {
  const { spacing } = useDesignSystem();

  return (
    <View style={[{ marginBottom: spacing.lg }, style]}>
      <ThemedText
        style={{
          fontSize: 22,
          fontWeight: "700",
          marginBottom: subtitle ? spacing.xs : 0,
        }}
      >
        {title}
      </ThemedText>

      {subtitle && (
        <ThemedText
          style={{
            fontSize: 14,
            fontWeight: "400",
          }}
          lightColor="#64748B"
          darkColor="#CBD5E1"
        >
          {subtitle}
        </ThemedText>
      )}
    </View>
  );
}

interface ModernContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Container with proper padding and spacing
 */
export function ModernContainer({ children, style }: ModernContainerProps) {
  const { spacing } = useDesignSystem();

  return (
    <View style={[{ paddingHorizontal: spacing.lg }, style]}>{children}</View>
  );
}

interface GridCardProps {
  title: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  color?: string;
  accentColor?: string;
  style?: ViewStyle;
}

/**
 * Grid-friendly card for home screen
 */
export function GridCard({
  title,
  onPress,
  icon,
  color,
  accentColor,
  style,
}: GridCardProps) {
  const { colors, spacing, borderRadius, shadows } = useDesignSystem();

  return (
    <View
      style={[
        {
          flex: 1,
          marginRight: spacing.md,
        },
        style,
      ]}
    >
      <View
        style={[
          {
            backgroundColor: accentColor || colors.secondary,
            borderRadius: borderRadius.lg,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.xl,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 140,
            ...shadows.lg,
          },
        ]}
      >
        {icon && (
          <View
            style={{
              marginBottom: spacing.md,
              width: 48,
              height: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </View>
        )}

        <ThemedText
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#FFFFFF",
            textAlign: "center",
          }}
        >
          {title}
        </ThemedText>
      </View>
    </View>
  );
}

interface WelcomeBannerProps {
  name?: string;
  greeting?: string;
  style?: ViewStyle;
}

/**
 * Welcome banner with gradient background
 */
export function WelcomeBanner({ name, greeting, style }: WelcomeBannerProps) {
  const { spacing, borderRadius, shadows } = useDesignSystem();

  return (
    <View
      style={[
        {
          backgroundColor: "#6366F1",
          borderRadius: borderRadius.xl,
          padding: spacing.xl,
          marginBottom: spacing.xl,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <ThemedText
        style={{
          fontSize: 14,
          fontWeight: "500",
          color: "rgba(255,255,255,0.9)",
          marginBottom: spacing.sm,
        }}
      >
        {greeting || "Welcome back! 👋"}
      </ThemedText>

      <ThemedText
        style={{
          fontSize: 28,
          fontWeight: "700",
          color: "#FFFFFF",
        }}
      >
        {name || "User"}
      </ThemedText>

      <ThemedText
        style={{
          fontSize: 13,
          fontWeight: "400",
          color: "rgba(255,255,255,0.8)",
          marginTop: spacing.md,
        }}
      >
        Ready to manage your tasks today?
      </ThemedText>
    </View>
  );
}
