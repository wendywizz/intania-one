import { useDesignSystem } from "@/constants/theme";
import React from "react";
import { SafeAreaView, StyleSheet, View, ViewStyle } from "react-native";
import { ThemedText } from "./themed-text";

interface ModernNavBarProps {
  title?: string;
  subtitle?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Modern navigation bar with clean design
 */
export function ModernNavBar({
  title,
  subtitle,
  leftContent,
  rightContent,
  style,
}: ModernNavBarProps) {
  const { colors, spacing, shadows, borderRadius } = useDesignSystem();

  return (
    <SafeAreaView
      style={[
        {
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.container,
          {
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          },
        ]}
      >
        <View style={styles.left}>{leftContent}</View>

        <View style={styles.center}>
          {title && (
            <ThemedText
              style={{
                fontSize: 18,
                fontWeight: "600",
              }}
            >
              {title}
            </ThemedText>
          )}
          {subtitle && (
            <ThemedText
              lightColor="#64748B"
              darkColor="#CBD5E1"
              style={{
                fontSize: 12,
                marginTop: spacing.xs,
              }}
            >
              {subtitle}
            </ThemedText>
          )}
        </View>

        <View style={styles.right}>{rightContent}</View>
      </View>
    </SafeAreaView>
  );
}

interface ModernTabBarProps {
  tabs: Array<{
    name: string;
    icon?: React.ReactNode;
    badge?: number | string;
  }>;
  activeIndex: number;
  onTabPress: (index: number) => void;
  style?: ViewStyle;
}

/**
 * Modern tab bar with energy and visual appeal
 */
export function ModernTabBar({
  tabs,
  activeIndex,
  onTabPress,
  style,
}: ModernTabBarProps) {
  const { colors, spacing, borderRadius } = useDesignSystem();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.lg,
          paddingTop: spacing.md,
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
        },
        style,
      ]}
    >
      {tabs.map((tab, index) => (
        <TabBarItem
          key={`tab-${index}`}
          tab={tab}
          isActive={index === activeIndex}
          onPress={() => onTabPress(index)}
          accentColor={colors.primary}
        />
      ))}
    </View>
  );
}

interface TabBarItemProps {
  tab: {
    name: string;
    icon?: React.ReactNode;
    badge?: number | string;
  };
  isActive: boolean;
  onPress: () => void;
  accentColor: string;
}

function TabBarItem({ tab, isActive, onPress, accentColor }: TabBarItemProps) {
  const { colors, spacing, borderRadius } = useDesignSystem();

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: borderRadius.md,
          backgroundColor: isActive ? `${accentColor}15` : "transparent",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {tab.icon && (
          <View
            style={{
              opacity: isActive ? 1 : 0.6,
            }}
          >
            {tab.icon}
          </View>
        )}

        {tab.badge && (
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              backgroundColor: "#EF4444",
              borderRadius: borderRadius.full,
              width: 20,
              height: 20,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ThemedText
              style={{
                color: "#FFFFFF",
                fontSize: 10,
                fontWeight: "700",
              }}
            >
              {tab.badge}
            </ThemedText>
          </View>
        )}
      </View>

      <ThemedText
        style={{
          fontSize: 11,
          fontWeight: isActive ? "600" : "400",
          marginTop: spacing.xs,
          color: isActive ? accentColor : colors.textSecondary,
        }}
      >
        {tab.name}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
  },
  left: {
    flex: 0,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  right: {
    flex: 0,
  },
});
