import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TEXT } from '@/constants/text';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { acquireNavLock, navReplace } from '@/utils/navigation';

type NavTopBarProps = {
  title: string;
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
    <View style={[styles.container, { paddingTop: insets.top + 8, backgroundColor }]}>
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

      <ThemedText lightColor={contentColor} darkColor={contentColor} type="defaultSemiBold" numberOfLines={1} style={styles.title}>
        {title}
      </ThemedText>

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
  leftActions: {
    width: 48,
    alignItems: 'flex-start',
  },
  rightActions: {
    minWidth: 48,
    alignItems: 'flex-end',
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
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
  },
});
