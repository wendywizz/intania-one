import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { CompOtSwapsTab } from '@/components/comp-ot/comp-ot-swaps-tab';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import { type AppColors, useThemedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { loadCompOtSwaps, useCompOtSwaps } from '@/stores/compOtSwaps';

/**
 * The exchange/sale requests the caller sent or was sent - where a tapped
 * exchange/sale notification lands (utils/notification-link.ts). The roster
 * tab reloads on focus, so a shift moved by answering one here shows there
 * the next time it is opened.
 */
export default function CompOtSwapsScreen() {
  const { isDarkMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId ?? '';
  const swaps = useCompOtSwaps();

  const reload = useCallback(() => loadCompOtSwaps(staffId), [staffId]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return (
    <ThemedView style={styles.container}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavTopBar
        title={TEXT.COMP_OT_TAB_SWAPS}
        subtitle={TEXT.COMP_OT_HEADER_TITLE}
        backHref="/"
        showHomeButton={false}
        tone="primary"
      />
      <CompOtSwapsTab
        staffId={staffId}
        requests={swaps.requests}
        isLoading={swaps.isLoading}
        error={swaps.error}
        onReload={reload}
        onChanged={reload}
      />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
});
