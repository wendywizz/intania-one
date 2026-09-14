import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import * as mailAuthService from '@/services/mailAuthService';

/**
 * The explicit "connect your email" step. Mail is a second, independent
 * identity system from the app's own PSU SSO login (see
 * services/mailAuthService.ts), so this deliberately does not piggyback a
 * silent Microsoft consent popup onto the app's normal sign-in — the person
 * has to choose to link their mailbox, and sees why before Microsoft's own
 * consent screen appears.
 */
export default function MailConnectScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Landing here while already connected (a stale link, or racing the list
  // screen's own redirect) — skip straight to the inbox instead of asking
  // to connect again.
  useEffect(() => {
    let cancelled = false;
    mailAuthService.isConnected().then((connected) => {
      if (connected && !cancelled) router.replace('/mail');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConnect = useCallback(async () => {
    setErrorMessage('');
    setIsConnecting(true);
    try {
      await mailAuthService.connect();
      router.replace('/mail');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : TEXT.MAIL_CONNECT_FAILED);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar title={TEXT.MAIL_HEADER_TITLE} backHref="/" tone="primary" />
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <IconSymbol name="envelope.fill" size={40} color={c.primary} />
        </View>
        <ThemedText type="subtitle" style={styles.title}>
          {TEXT.MAIL_CONNECT_TITLE}
        </ThemedText>
        <ThemedText style={styles.description}>{TEXT.MAIL_CONNECT_DESCRIPTION}</ThemedText>

        {errorMessage ? <ThemedText style={styles.errorText}>{errorMessage}</ThemedText> : null}

        {mailAuthService.MAIL_SUPPORTED_ON_PLATFORM ? (
          <Button
            title={isConnecting ? TEXT.MAIL_CONNECT_CONNECTING : TEXT.MAIL_CONNECT_BUTTON}
            onPress={handleConnect}
            loading={isConnecting}
            icon="envelope.fill"
            size="lg"
            style={styles.button}
          />
        ) : (
          <ThemedText style={styles.webNotice}>{TEXT.MAIL_CONNECT_WEB_UNSUPPORTED}</ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: c.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    textAlign: 'center',
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 320,
    marginBottom: 28,
  },
  errorText: {
    textAlign: 'center',
    color: c.danger,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
    maxWidth: 320,
  },
  button: {
    marginTop: 4,
    minWidth: 220,
  },
  webNotice: {
    textAlign: 'center',
    color: c.textFaint,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 320,
  },
});
