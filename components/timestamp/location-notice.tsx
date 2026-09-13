import { Linking, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, IconSymbol } from '@/components/ui';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import type { LocationReading } from '@/services/deviceLocation';
import { scaleFont } from '@/utils/font-scale';

/** What to tell the user, and what button will actually fix it. */
export type LocationNotice = {
  message: string;
  action: 'ask' | 'settings' | 'retry';
};

/**
 * The notice for a missing fix — or null when there is one.
 *
 * Each outcome gets the one button that can resolve it. A "เปิดการตั้งค่า"
 * button shown to someone who has simply not been asked yet sends them on a
 * pointless trip through the Settings app, and an "อนุญาต" button shown to
 * someone the OS will never prompt again does nothing at all when tapped —
 * which is the specific failure that makes permission walls feel broken.
 */
export function locationNotice(reading: LocationReading | null): LocationNotice | null {
  if (!reading || reading.outcome === 'ok') return null;

  switch (reading.outcome) {
    case 'denied':
      return reading.canAskAgain
        ? { message: TEXT.LECT_TIMESTAMP_LOCATION_DENIED, action: 'ask' }
        : { message: TEXT.LECT_TIMESTAMP_LOCATION_BLOCKED, action: 'settings' };
    case 'services_off':
      return { message: TEXT.LECT_TIMESTAMP_LOCATION_SERVICES_OFF, action: 'settings' };
    default:
      return { message: TEXT.LECT_TIMESTAMP_LOCATION_UNAVAILABLE, action: 'retry' };
  }
}

/**
 * Open the place the user can actually change the setting.
 *
 * Android can be sent straight to the location switch, which is where
 * `services_off` needs them; the app's own settings page has no such switch on
 * it and would be a dead end. iOS has no public deep link to Location
 * Services, so the app's settings page — which does carry this app's location
 * permission — is the closest thing there is.
 */
export function openLocationSettings(action: LocationNotice['action']) {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android' && action === 'settings') {
    Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => {
      void Linking.openSettings();
    });
    return;
  }

  void Linking.openSettings();
}

type LocationNoticeBannerProps = {
  reading: LocationReading | null;
  /** Spins the button while the screen re-reads the position. */
  retrying?: boolean;
  /** Read the position again. Also raises the OS prompt when it may still ask. */
  onRetry: () => void;
};

/**
 * The location banner the stamping screens show above their card.
 *
 * Above the card rather than in place of it: the day's status is still worth
 * showing to somebody who has location switched off, and a screen replaced
 * wholesale by a permission wall hides whether they have already stamped today.
 * Renders nothing when the phone gave a usable fix.
 */
export function LocationNoticeBanner({ reading, retrying = false, onRetry }: LocationNoticeBannerProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const notice = locationNotice(reading);

  if (!notice) return null;

  return (
    <View style={styles.notice}>
      <View style={styles.noticeHeader}>
        <IconSymbol size={20} name="mappin" color={c.warningOnSoft} />
        <ThemedText style={styles.noticeTitle}>{TEXT.LECT_TIMESTAMP_LOCATION_TITLE}</ThemedText>
      </View>

      <ThemedText style={styles.noticeMessage}>{notice.message}</ThemedText>

      <Button
        // 'retry' and 'ask' both come back through the same reload: the
        // permission prompt is raised by readDevicePosition() itself, so asking
        // again and trying again are one code path.
        title={
          notice.action === 'settings'
            ? TEXT.SETTINGS_OPEN_OS_SETTINGS
            : notice.action === 'ask'
              ? TEXT.LECT_TIMESTAMP_LOCATION_ALLOW
              : TEXT.LECT_TIMESTAMP_LOCATION_RETRY
        }
        icon={
          notice.action === 'settings'
            ? 'gearshape.fill'
            : notice.action === 'ask'
              ? 'mappin'
              : 'arrow.triangle.2.circlepath'
        }
        variant="primaryOutline"
        size="md"
        fullWidth
        loading={retrying}
        onPress={() => {
          if (notice.action === 'settings') {
            openLocationSettings(notice.action);
            return;
          }
          onRetry();
        }}
      />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    // Warning-tinted, not danger: nothing has gone wrong, a setting is simply
    // switched off — and it is the same soft/on-soft pair every other advisory
    // in the app uses, so it stays legible in both themes.
    notice: {
      alignSelf: 'stretch',
      backgroundColor: c.warningSoft,
      borderColor: c.border,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      gap: 10,
      padding: 16,
    },
    noticeHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    noticeTitle: {
      color: c.warningOnSoft,
      fontFamily: AppFonts.psuBold,
      fontSize: scaleFont(15),
    },
    noticeMessage: {
      color: c.text,
      fontFamily: AppFonts.psuRegular,
      fontSize: scaleFont(14),
      lineHeight: scaleFont(20),
    },
  });
