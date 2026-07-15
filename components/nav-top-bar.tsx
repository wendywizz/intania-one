import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TEXT } from '@/constants/text';
import { useColors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { acquireNavLock, navReplace } from '@/utils/navigation';

type NavTopBarProps = {
  title: string;
  subtitle?: string;
  moduleIcon?: string;
  backHref?: Href;
  onBackPress?: () => void;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  rightContent?: ReactNode;
  backgroundColor?: string;
  contentColor?: string;
};

export function NavTopBar({
  title,
  subtitle,
  moduleIcon,
  backHref,
  onBackPress,
  showBackButton = true,
  showHomeButton = true,
  rightContent,
  backgroundColor,
  contentColor,
}: NavTopBarProps) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const barColor = backgroundColor ?? c.navBar;
  const barContent = contentColor ?? c.navBarText;

  const goBack = () => {
    if (!acquireNavLock()) return;

    if (onBackPress) {
      onBackPress();
      return;
    }

    if (backHref) {
      router.navigate(backHref);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.navigate('/');
  };

  return (
    <View style={[styles.container, subtitle ? styles.containerWithSubtitle : null, { paddingTop: insets.top + 8, backgroundColor: barColor }]}>
      <View style={styles.leftActions}>
        {showBackButton ? (
          <Pressable
            accessibilityLabel={TEXT.SHARED_BACK_THAI}
            accessibilityRole="button"
            onPress={goBack}
            style={styles.iconButton}>
            <IconSymbol name="arrow.left" size={24} color={barContent} />
          </Pressable>
        ) : (
          <View style={styles.iconButtonSpacer} />
        )}
      </View>

      <View style={styles.titleContainer}>
          {moduleIcon ? (
          <View style={[styles.iconCircle, { backgroundColor: `${barContent}20`, borderColor: `${barContent}40`, borderWidth: 2 }]}>
          <IconSymbol name={moduleIcon} size={28} color={barContent} />
          </View>
        ) : null}
        <View style={styles.textContainer}>
          <ThemedText lightColor={barContent} darkColor={barContent} type="defaultSemiBold" numberOfLines={1} style={styles.title}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText lightColor={barContent} darkColor={barContent} numberOfLines={2} style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          ) : null}
    </View>
      </View>

      <View style={[styles.rightActions, rightContent ? styles.customRightActions : undefined]}>
        {rightContent}
        {showHomeButton ? (
          <Pressable accessibilityLabel={TEXT.NAV_HOME_ACCESSIBILITY_LABEL} accessibilityRole="button" onPress={() => navReplace('/')} style={styles.iconButton}>
            <IconSymbol name="house.fill" size={23} color={barContent} />
          </Pressable>
        ) : rightContent ? null : (
          <View style={styles.iconButtonSpacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  containerWithSubtitle: {
    minHeight: 88,
    alignItems: 'center',
    paddingVertical: 10,
  },
  leftActions: {
    width: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  rightActions: {
    minWidth: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  customRightActions: {
    minWidth: 116,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  iconButtonSpacer: {
    width: 40,
    height: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 18,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

