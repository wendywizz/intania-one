import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors, useScreenGutter, useScreenTitleGap, useThemedStyles } from '@/constants/theme';
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
  /** Render the title inside the top nav bar instead of as a large content title. */
  titleInNavBar?: boolean;
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
  titlePaddingHorizontal,
  titleInNavBar,
}: ScreenHeaderProps) {
  const c = useColors();
  const { isDarkMode } = useTheme();
  const { height } = useWindowDimensions();
  const gutter = useScreenGutter();
  const titlePad = titlePaddingHorizontal ?? gutter;
  const titleGap = useScreenTitleGap();
  const styles = useThemedStyles(makeStyles);
  // Scale the title with device height (clamped) so it stays proportional.
  const titleSize = Math.round(Math.min(26, Math.max(20, height * 0.028)));

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavTopBar
        title={titleInNavBar ? title : ''}
        titleStyle={titleInNavBar ? { fontSize: 20, lineHeight: 26 } : undefined}
        backHref={backHref}
        onBackPress={onBackPress}
        showBackButton={showBackButton}
        showHomeButton={showHomeButton}
        rightContent={rightContent}
        backgroundColor={c.surface}
        contentColor={c.text}
      />
      {titleInNavBar ? (
        titleTrailing ? (
          <View style={[styles.titleRow, { paddingHorizontal: titlePad, paddingBottom: titleGap, paddingTop: 0 }]}>
            {titleTrailing}
          </View>
        ) : null
      ) : (
        <View style={[styles.titleRow, { paddingHorizontal: titlePad, paddingBottom: titleGap }]}>
          <ThemedText style={[styles.title, { fontSize: titleSize, lineHeight: titleSize + 6 }]}>
            {title}
          </ThemedText>
          {titleTrailing}
        </View>
      )}
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
