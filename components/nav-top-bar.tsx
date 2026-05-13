import { Link, router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TEXT } from '@/constants/text';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

type NavTopBarProps = {
  title: string;
  backHref?: Href;
  onBackPress?: () => void;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  rightContent?: ReactNode;
};

export function NavTopBar({
  title,
  backHref,
  onBackPress,
  showBackButton = true,
  showHomeButton = false,
  rightContent,
}: NavTopBarProps) {
  const goBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }

    if (backHref) {
      router.replace(backHref);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  return (
    <ThemedView style={styles.container} lightColor="#FFFFFF" darkColor="#151718">
      <View style={styles.leftActions}>
        {showBackButton ? (
          <Pressable
            accessibilityLabel={TEXT.TEXT_6}
            accessibilityRole="button"
            onPress={goBack}
            style={styles.iconButton}>
            <IconSymbol name="arrow.left" size={24} color="#0A6E8A" />
          </Pressable>
        ) : (
          <View style={styles.iconButtonSpacer} />
        )}
      </View>

      <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.title}>
        {title}
      </ThemedText>

      <View style={[styles.rightActions, rightContent ? styles.customRightActions : undefined]}>
        {rightContent ? (
          rightContent
        ) : showHomeButton ? (
          <Link href="/" asChild>
            <Pressable accessibilityLabel={TEXT.ACCESSIBILITYLABEL} accessibilityRole="button" style={styles.iconButton}>
              <IconSymbol name="house.fill" size={23} color="#0A6E8A" />
            </Pressable>
          </Link>
        ) : (
          <View style={styles.iconButtonSpacer} />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D7E6EC',
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
