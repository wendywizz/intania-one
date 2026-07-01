import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TEXT } from '@/constants/text';
import { colors } from '@/constants/theme';
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
  showHomeButton = false,
  rightContent,
  backgroundColor = '#b33939',
  contentColor = '#FFFFFF',
}: NavTopBarProps) {
  const insets = useSafeAreaInsets();

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
    <View style={[styles.container, subtitle ? styles.containerWithSubtitle : null, { paddingTop: insets.top + 8, backgroundColor }]}>
      <View style={styles.leftActions}>
        {showBackButton ? (
          <Pressable
            accessibilityLabel={TEXT.SHARED_BACK_THAI}
            accessibilityRole="button"
            onPress={goBack}
            style={styles.iconButton}>
            <IconSymbol name="arrow.left" size={24} color={contentColor} />
          </Pressable>
        ) : (
          <View style={styles.iconButtonSpacer} />
        )}
      </View>

      <View style={styles.titleContainer}>
          {moduleIcon ? (
          <View style={[styles.iconCircle, { backgroundColor: `${contentColor}20`, borderColor: colors.iconCircleBorder, borderWidth: 2 }]}>
          <IconSymbol name={moduleIcon} size={28} color={contentColor} />
          </View>
        ) : null}
        <View style={styles.textContainer}>
          <ThemedText lightColor={contentColor} darkColor={contentColor} type="defaultSemiBold" numberOfLines={1} style={styles.title}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText lightColor={contentColor} darkColor={contentColor} numberOfLines={2} style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          ) : null}
    </View>
      </View>

      <View style={[styles.rightActions, rightContent ? styles.customRightActions : undefined]}>
        {rightContent ? (
          rightContent
        ) : showHomeButton ? (
          <Pressable accessibilityLabel={TEXT.NAV_HOME_ACCESSIBILITY_LABEL} accessibilityRole="button" onPress={() => navReplace('/')} style={styles.iconButton}>
            <IconSymbol name="house.fill" size={23} color={contentColor} />
          </Pressable>
        ) : (
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
    alignItems: 'flex-end',
    justifyContent: 'center',
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

