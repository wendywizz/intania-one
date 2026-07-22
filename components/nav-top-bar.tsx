import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TEXT } from '@/constants/text';
import { useColors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
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
  /** Optional style override for the title text (e.g. a larger font size). */
  titleStyle?: StyleProp<TextStyle>;
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
  titleStyle,
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
    <View style={[styles.container, subtitle ? styles.containerWithSubtitle : null, { paddingTop: insets.top + 14, backgroundColor: barColor }]}>
      <View style={styles.leftActions}>
        {showBackButton ? (
          <Pressable
            accessibilityLabel={TEXT.SHARED_BACK_THAI}
            accessibilityRole="button"
            onPress={goBack}
            style={styles.iconButton}>
            <IconSymbol name="chevron.left" size={26} color={barContent} />
          </Pressable>
        ) : (
          <View style={styles.iconButtonSpacer} />
        )}
      </View>

      <View style={styles.titleContainer}>
          {moduleIcon ? (
          <View style={[styles.iconCircle, { backgroundColor: `${barContent}20`, borderColor: `${barContent}40`, borderWidth: 2 }]}>
          <IconSymbol name={moduleIcon} size={20} color={barContent} />
          </View>
        ) : null}
        <View style={styles.textContainer}>
          <ThemedText lightColor={barContent} darkColor={barContent} type="defaultSemiBold" numberOfLines={1} style={[styles.title, titleStyle]}>
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
          <Pressable
            accessibilityLabel={TEXT.NAV_HOME_ACCESSIBILITY_LABEL}
            accessibilityRole="button"
            onPress={() => navReplace('/')}
            style={({ pressed }) => [
              styles.iconButton,
              pressed ? styles.homeButtonPressed : undefined,
            ]}>
            <IconSymbol name="house.fill" size={22} color={barContent} />
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
    paddingBottom: 14,
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
    borderRadius: 20,
  },
  iconButtonSpacer: {
    width: 40,
    height: 40,
  },
  homeButtonPressed: {
    opacity: 0.6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.9,
    lineHeight: 17,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

