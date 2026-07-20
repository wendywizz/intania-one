import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

type ScreenHeaderProps = {
  /** Large title shown in the content, below a minimal blended nav bar. */
  title: string;
  backHref?: Href;
  onBackPress?: () => void;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  rightContent?: ReactNode;
  /** Optional content rendered inline at the end of the big title row. */
  titleTrailing?: ReactNode;
  /** Horizontal padding of the big title, to align it with the screen content. */
  titlePaddingHorizontal?: number;
};

// Shared screen header used across the app: a status bar + a minimal nav bar
// that blends into the canvas (no boxed title), with the screen title rendered
// large in the content. Centralises the look and the nav-bar → title spacing so
// every screen matches. Place it as the first child of the screen container;
// render the rest of the screen below it.
export function ScreenHeader({
  title,
  backHref,
  onBackPress,
  showBackButton,
  showHomeButton,
  rightContent,
  titleTrailing,
  titlePaddingHorizontal = 16,
}: ScreenHeaderProps) {
  const c = useColors();
  const { isDarkMode } = useTheme();
  const { height } = useWindowDimensions();
  const styles = useThemedStyles(makeStyles);
  // Scale the title with device height (clamped) so it stays proportional.
  const titleSize = Math.round(Math.min(26, Math.max(20, height * 0.028)));

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavTopBar
        title=""
        backHref={backHref}
        onBackPress={onBackPress}
        showBackButton={showBackButton}
        showHomeButton={showHomeButton}
        rightContent={rightContent}
        backgroundColor={c.surface}
        contentColor={c.text}
      />
      <View style={[styles.titleRow, { paddingHorizontal: titlePaddingHorizontal }]}>
        <ThemedText style={[styles.title, { fontSize: titleSize, lineHeight: titleSize + 6 }]}>
          {title}
        </ThemedText>
        {titleTrailing}
      </View>
    </>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    flex: 1,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
});
